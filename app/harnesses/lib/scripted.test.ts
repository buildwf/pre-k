import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { HarnessEvent, HarnessStart, Proc } from "point/app";
import builderHarness from "../scripted-builder.harness";
import coordinatorHarness from "../scripted-coordinator.harness";
import { scriptedSession, targetFileOf, titleOf, urlOf } from "./scripted";

// Real git in a temp worktree with a bare origin, and a fake `$POINT_CLI` that records its arguments, so the
// scripted agents' commands run for real. Point's runtime would run them through the thread's sandbox (o.spawn).
let dir: string;
let work: string;
let cliLog: string;

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: work, encoding: "utf8" }).trim();

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "prek-scripted-"));
  work = path.join(dir, "work");
  cliLog = path.join(dir, "cli.log");
  execFileSync("git", ["init", "-q", "--bare", path.join(dir, "origin.git")]);
  execFileSync("git", ["init", "-q", "-b", "prek/test-1234", work]);
  git("config", "user.email", "builder@pre-k.test");
  git("config", "user.name", "pre-k builder");
  fs.writeFileSync(path.join(work, "README.md"), "# test repo\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  const cli = path.join(dir, "point-cli");
  fs.writeFileSync(
    cli,
    // One log line per call: newlines inside an argument (the PR body) become "|".
    `#!/bin/sh\n{ printf '%s' "$*" | tr '\\n' '|'; echo; } >> ${JSON.stringify(cliLog)}\n` +
      // PREK_FAKE_NAME_CRASHES=n: the first n `coordinator name` calls crash with no output, like cloudflare-point#740.
      `if [ "$1 $2" = "coordinator name" ]; then c=$(grep -c '^coordinator name' ${JSON.stringify(cliLog)}); ` +
      `[ "$c" -le "\${PREK_FAKE_NAME_CRASHES:-0}" ] && exit 139; echo Zack; exit 0; fi\n` +
      `[ -n "$PREK_FAKE_CLI_SLEEP" ] && sleep "$PREK_FAKE_CLI_SLEEP"\n` +
      `[ -n "$PREK_FAKE_CLI_CRASH" ] && [ ! -e "$PREK_FAKE_CLI_CRASH" ] && { touch "$PREK_FAKE_CLI_CRASH"; exit 139; }\n` +
      `[ "$PREK_FAKE_CLI_FAIL" = 1 ] && { echo 'push rejected' >&2; exit 1; }\n` +
      `echo 'Electron noise on stderr' >&2\n` +
      `echo '{"sha":"abc1234","url":"https://github.com/test/repo/commit/abc1234"}'\n`,
  );
  fs.chmodSync(cli, 0o755);
  process.env.POINT_CLI = cli;
});

afterEach(() => {
  delete process.env.POINT_CLI;
  delete process.env.PREK_FAKE_CLI_FAIL;
  delete process.env.PREK_FAKE_CLI_CRASH;
  delete process.env.PREK_FAKE_CLI_SLEEP;
  delete process.env.PREK_FAKE_NAME_CRASHES;
  fs.rmSync(dir, { recursive: true, force: true });
});

function start(): HarnessStart & { events: HarnessEvent[] } {
  const events: HarnessEvent[] = [];
  const o = {
    threadId: "t1",
    cwd: work,
    confined: false,
    events,
    onEvent: (e: HarnessEvent) => events.push(e),
    onPermission: async () => "allow" as const,
    async spawn(
      cmd: string,
      args: string[],
      env?: Record<string, string>,
    ): Promise<Proc> {
      const p = spawn(cmd, args, {
        cwd: work,
        env: { ...process.env, ...env },
      });
      const lines: ((l: string) => void)[] = [];
      const emit = (prefix: string) => (b: Buffer) =>
        b
          .toString()
          .split("\n")
          .filter(Boolean)
          .forEach((l) => lines.forEach((cb) => cb(prefix + l)));
      p.stdout.on("data", emit(""));
      p.stderr.on("data", emit("\u0000"));

      return {
        write: (l) => p.stdin.write(`${l}\n`),
        onLine: (cb) => lines.push(cb),
        onExit: (cb) => p.on("exit", cb), // as Point's local sandbox does
        kill: () => p.kill(),
      };
    },
  };

  return o as unknown as HarnessStart & { events: HarnessEvent[] };
}

const turnEnd = (o: { events: HarnessEvent[] }, n = 1) =>
  new Promise<HarnessEvent[]>((resolve) => {
    const t = setInterval(() => {
      if (o.events.filter((e) => e.type === "turn.end").length >= n) {
        clearInterval(t);
        resolve(o.events);
      }
    }, 10);
  });

const status = (events: HarnessEvent[]) =>
  events.flatMap((e) => (e.type === "turn.end" ? [e.status] : [])).at(-1);
const texts = (events: HarnessEvent[]) =>
  events.flatMap((e) => (e.type === "text" ? [e.text] : []));

test("the builder commits one change on the thread's branch and lands it on main once", async () => {
  const o = start();
  const s = await builderHarness.start(o);
  await s.send("Add a setup note to docs/setup.md.", "start");
  const events = await turnEnd(o);

  expect(status(events)).toBe("completed");
  expect(git("rev-list", "--count", "HEAD")).toBe("2");
  expect(git("log", "-1", "--format=%s")).toBe(
    "Add a setup note to docs/setup.md",
  );
  expect(git("rev-parse", "--abbrev-ref", "HEAD")).toBe("prek/test-1234");
  expect(git("status", "--porcelain")).toBe("");
  expect(fs.readFileSync(path.join(work, "docs/setup.md"), "utf8")).toContain(
    "pre-k scripted builder",
  );
  const calls = fs.readFileSync(cliLog, "utf8").trim().split("\n");
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatch(
    /^github landOnMain --message Add a setup note to docs\/setup\.md\|/,
  );
  expect(texts(events).at(-1)).toBe(
    "Landed on main: https://github.com/test/repo/commit/abc1234",
  );
  // Every tool.start has its tool.end; the turn reports a zero-cost usage.
  const starts = events.filter((e) => e.type === "tool.start").length;
  expect(events.filter((e) => e.type === "tool.end")).toHaveLength(starts);
  expect(events).toContainEqual({
    type: "usage",
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
  });
  s.close();
});

test("a CLI crash (139, nothing printed) lands again once", async () => {
  process.env.PREK_FAKE_CLI_CRASH = path.join(dir, "crashed");
  const o = start();
  const s = await builderHarness.start(o);
  await s.send("Fix the typo", "start");
  const events = await turnEnd(o);

  expect(status(events)).toBe("completed");
  expect(fs.readFileSync(cliLog, "utf8").trim().split("\n")).toHaveLength(2);
  expect(texts(events).at(-1)).toBe("Landed on main: https://github.com/test/repo/commit/abc1234");
  s.close();
});

test("a rejected push fails the turn and says why", async () => {
  process.env.PREK_FAKE_CLI_FAIL = "1";
  const o = start();
  const s = await builderHarness.start(o);
  await s.send("Fix the typo", "start");
  const events = await turnEnd(o);

  expect(status(events)).toBe("failed");
  expect(events).toContainEqual({
    type: "error",
    message: "could not land on main: push rejected",
  });
  s.close();
});

test("/fail fails the turn; Stop reports exit once", async () => {
  const o = start();
  const s = await builderHarness.start(o);
  await s.send("/fail", "start");
  const events = await turnEnd(o);

  expect(status(events)).toBe("failed");
  s.close();
  s.close();
  await new Promise((r) => setTimeout(r, 10));
  expect(events.filter((e) => e.type === "exit")).toEqual([
    { type: "exit", code: 0 },
  ]);
});

test("Cancel kills a running command; Stop reports exit after the turn's last event", async () => {
  process.env.PREK_FAKE_CLI_SLEEP = "30";
  const o = start();
  const s = await builderHarness.start(o);
  await s.send("Fix the typo", "start");
  // Wait until the land command (the fake CLI, sleeping) is running.
  while (fs.existsSync(cliLog) === false)
    await new Promise((r) => setTimeout(r, 10));
  const t0 = Date.now();
  await s.interrupt();
  const events = await turnEnd(o);
  expect(Date.now() - t0).toBeLessThan(5_000);
  expect(status(events)).not.toBe("completed");
  expect(texts(events).some((x) => x.startsWith("Landed on main"))).toBe(
    false,
  );

  await s.send("/slow", "start");
  s.close();
  while (!o.events.some((e) => e.type === "exit")) await new Promise((r) => setTimeout(r, 10));
  await new Promise((r) => setTimeout(r, 50));
  expect(o.events.at(-1)).toEqual({ type: "exit", code: 0 });
  expect(o.events.at(-2)).toMatchObject({ type: "turn.end" });
});

test("/slow takes steers, stops on interrupt and resumes where it left off", async () => {
  const o = start();
  const s = scriptedSession(o, async () => {}, { stepMs: 20 });
  await s.send("/slow", "start");
  await new Promise((r) => setTimeout(r, 50));
  expect(await s.send("go faster", "steer")).toBe("delivered");
  await new Promise((r) => setTimeout(r, 30));
  await s.interrupt();
  await turnEnd(o);
  expect(status(o.events)).toBe("interrupted");
  expect(texts(o.events)).toContain("Steered: “go faster”. Adjusting course.");
  const done = o.events.filter((e) => e.type === "tool.end").length;
  expect(done).toBeLessThan(10);

  await s.send("Continue where you left off.", "start");
  const events = await turnEnd(o, 2);
  expect(status(events)).toBe("completed");
  expect(events.filter((e) => e.type === "tool.end").length).toBe(10);
  expect(texts(events).at(-1)).toBe("All 10 steps done.");
  s.close();
});

test("the coordinator starts a thread for a request and answers a question in text", async () => {
  const o = start();
  const s = await coordinatorHarness.start(o);
  await s.send("Add a README badge", "start");
  await turnEnd(o);
  await s.send("What is this project?", "start");
  const events = await turnEnd(o, 2);

  expect(fs.readFileSync(cliLog, "utf8").trim().split("\n")).toEqual([
    "coordinator name",
    "threads start --title Add a README badge --request Add a README badge --requestedBy Zack --json",
  ]);
  expect(texts(events)).toContain("Started a thread for “Add a README badge”.");
  expect(texts(events).at(-1)).toMatch(/^I'm the \*\*scripted coordinator\*\*/);
  // It streams: a few words at a time, then the whole reply once it is done.
  const parts = events.flatMap((e) => (e.type === "text" && !e.done ? [e.text] : []));
  expect(parts.length).toBeGreaterThan(3);
  expect(parts.join("")).toBe(texts(events).at(-1));
  s.close();
});

test("the coordinator asks for the name again after a crash, and never starts a thread without one", async () => {
  process.env.PREK_FAKE_NAME_CRASHES = "1";
  const o = start();
  const s = await coordinatorHarness.start(o);
  await s.send("Add a README badge", "start");
  await turnEnd(o);
  expect(fs.readFileSync(cliLog, "utf8").trim().split("\n")).toEqual([
    "coordinator name",
    "coordinator name",
    "threads start --title Add a README badge --request Add a README badge --requestedBy Zack --json",
  ]);

  fs.rmSync(cliLog);
  process.env.PREK_FAKE_NAME_CRASHES = "2";
  await s.send("Add a README badge", "start");
  const events = await turnEnd(o, 2);
  expect(fs.readFileSync(cliLog, "utf8").trim().split("\n")).toEqual(["coordinator name", "coordinator name"]);
  expect(status(events)).toBe("failed");
  s.close();
});

test("the coordinator sends an @-mentioned thread the rest of the message as a follow-up", async () => {
  const o = start();
  const s = await coordinatorHarness.start(o);
  await s.send("@[Add a README badge](thread:t9) also add a CI badge", "start");
  const events = await turnEnd(o);

  expect(fs.readFileSync(cliLog, "utf8").trim().split("\n")).toEqual([
    "coordinator name",
    "threads followUp --threadId t9 --text also add a CI badge --by Zack --json",
  ]);
  expect(texts(events).at(-1)).toBe("Sent “Add a README badge” your follow-up.");
  s.close();
});

test("the coordinator relays a thread update without starting a thread", async () => {
  const o = start();
  const s = await coordinatorHarness.start(o);
  await s.send('Thread update: "Add badge" is ready for review. PR: https://x.test/pull/1.', "start");
  const events = await turnEnd(o);

  expect(fs.existsSync(cliLog) ? fs.readFileSync(cliLog, "utf8").trim() : "").toBe("");
  expect(texts(events).at(-1)).toBe('"Add badge" is ready for review. PR: https://x.test/pull/1.');
  s.close();
});

test("titles, target files and PR links", () => {
  expect(titleOf("Fix the login bug.\nIt breaks on Safari")).toBe(
    "Fix the login bug",
  );
  expect(titleOf("x".repeat(80))).toHaveLength(60);
  expect(titleOf("  ")).toBe("Untitled request");
  expect(targetFileOf("Add a section to docs/setup.md, please")).toBe(
    "docs/setup.md",
  );
  expect(targetFileOf("Edit ../../etc/passwd")).toBe("README.md");
  expect(targetFileOf("Make it faster")).toBe("README.md");
  expect(urlOf('{"url":"https://x.test/pull/1"}')).toBe(
    "https://x.test/pull/1",
  );
  expect(urlOf("opened https://x.test/pull/2")).toBe("https://x.test/pull/2");
  expect(urlOf("nothing")).toBeUndefined();
  expect(urlOf('noise {"url":"https://x.test/pull/3"}')).toBe(
    "https://x.test/pull/3",
  );
});

test("PREK_HARNESS=scripted swaps an agent onto its scripted harness", async () => {
  const { harnessFor } = await import("./select");
  delete process.env.PREK_HARNESS;
  expect(harnessFor("claude-code", "scripted-builder")).toBe("claude-code");
  process.env.PREK_HARNESS = "scripted";
  expect(harnessFor("claude-code", "scripted-builder")).toBe(
    "scripted-builder",
  );
  delete process.env.PREK_HARNESS;
});

test("the coordinator passes attached files on to the thread it starts", async () => {
  const o = start();
  const s = await coordinatorHarness.start(o);
  const id = "0b4c3c8e-1111-4222-8333-444455556666";
  await s.send(`Use this logo in the README\n\n[attachment: logo.png](attachment:${id})`, "start", [
    { mime: "image/png", data: "aGk=", name: "logo.png" },
  ]);
  await turnEnd(o);
  const log = fs.readFileSync(cliLog, "utf8").trim().split("\n");
  expect(log[1]).toMatch(/^threads start --title Use this logo in the README .* --requestedBy Zack --attachments 0b4c3c8e-1111-4222-8333-444455556666 --json$/);
  s.close();
});
