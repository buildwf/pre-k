import { randomUUID } from "node:crypto";
import type { HarnessSession, HarnessStart } from "point/app";
import { attachmentsIn } from "../../attachments/store";
import { parseMention } from "../../threads/mentions";

/**
 * The scripted harnesses behind `PREK_HARNESS=scripted` (#17): the coordinator and builder do the first journey's real
 * steps (edit the worktree, commit, call pre-k's own tools through `$POINT_CLI`) with no model, so tests and
 * `point smoke` need no key and spend nothing. Every command goes through `o.spawn`, inside the thread's sandbox.
 */

/** The app commands the scripted agents run, kept in one place so a renamed procedure is one edit. */
export const commands = {
  /** Land the thread's branch on the default branch (Zack: no PRs); main reads repo, branch and base from the thread. */
  landOnMain: (message: string) => `"$POINT_CLI" github landOnMain --message ${sh(message)} --json`,
  /**
   * #6/#13: the coordinator starts a thread for a request. The project comes from the caller (#25); `requestedBy` is
   * required by #6. A harness isn't told who sent a message, so it asks pre-k (`coordinator name`, #25's follow-up).
   */
  // The name is read first and once more if empty (the CLI can crash with no output, cloudflare-point#740), and an
  // empty name stops here rather than reach threads start. threads start itself isn't retried: it may have started one.
  startThread: (title: string, request: string, attachments: readonly string[] = []) =>
    `n="$("$POINT_CLI" coordinator name)"; [ -n "$n" ] || n="$("$POINT_CLI" coordinator name)"; ` +
    `[ -n "$n" ] || { echo "pre-k couldn't say who asked; ask again" >&2; exit 1; }; ` +
    `exec "$POINT_CLI" threads start --title ${sh(title)} --request ${sh(request)} --requestedBy "$n"${attachments.length ? ` --attachments ${sh(attachments.join(","))}` : ""} --json`,
  /** An @-mentioned thread gets the rest of the message as a follow-up (reopened if it had finished). */
  followUp: (threadId: string, text: string) =>
    `n="$("$POINT_CLI" coordinator name)"; exec "$POINT_CLI" threads followUp --threadId ${sh(threadId)} --text ${sh(text)} \${n:+--by "$n"} --json`,
};

/** Quote one shell argument. */
export function sh(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** A short title from a request: its first line, without a trailing period, at most 60 characters. */
export function titleOf(request: string): string {
  const line = (request.trim().split("\n")[0] ?? "")
    .replace(/[.!]+$/, "")
    .trim();

  return line.length > 60
    ? `${line.slice(0, 59).trimEnd()}…`
    : line || "Untitled request";
}

/** The file a request names (`docs/setup.md`), or README.md. Only relative paths inside the worktree. */
export function targetFileOf(request: string): string {
  const named = request.match(
    /(?:^|\s)([\w-][\w./-]*\.[A-Za-z0-9]+)(?=[\s,.;:!?]|$)/,
  )?.[1];

  return named && !named.includes("..") && !named.startsWith("/")
    ? named
    : "README.md";
}

/** The `url` field of a `--json` CLI reply, if it has one. */
export function urlOf(output: string): string | undefined {
  try {
    const v: unknown = JSON.parse(output);

    if (v && typeof v === "object" && "url" in v && typeof v.url === "string")
      return v.url;
  } catch {
    // not JSON: fall through to a bare URL in the text
  }

  return output.match(/https?:\/\/[^\s"'<>]+/)?.[0];
}

const RESUME = "Continue where you left off";

/** What a scripted turn can do: talk, run a command as a visible `Bash` tool call, and check for a stop. */
export interface Turn {
  text: string;
  /** The files that came with the message: their names. */
  attached: string[];
  say(text: string): Promise<void>;
  /** Say it a few words at a time, as a model streams its reply. */
  stream(text: string): Promise<void>;
  bash(command: string): Promise<{ code: number; out: string }>;
  stopped(): boolean;
  steers: string[];
  /** Ten 400 ms steps, resumable after a pause; for showing steer, pause, resume and cancel. */
  slow(): Promise<void>;
}

/** The session scaffolding both scripted harnesses share: turn events, steer, interrupt, usage and exit. */
export function scriptedSession(
  o: HarnessStart,
  play: (t: Turn) => Promise<void>,
  opts: { stepMs?: number } = {},
): HarnessSession {
  const stepMs = opts.stepMs ?? 400;
  let busy = false;
  let interrupted = false;
  let closed = false;
  let slowAt = 0;
  const steers: string[] = [];
  // The command running now, so Pause, Cancel and Stop kill it rather than let a commit or PR open finish afterwards.
  let active: { kill(): void; done: Promise<number> } | undefined;
  let current: Promise<void> = Promise.resolve();

  const run = async (script: string) => {
    const p = await o.spawn("sh", ["-c", script]);
    // stderr arrives prefixed with \u0000; keep it apart so a noisy CLI (Electron's dbus warnings on Linux) can't
    // corrupt the JSON a command prints. It joins the output only when the command failed.
    let out = "";
    let err = "";
    p.onLine((l) =>
      l.startsWith("\u0000") ? (err += `${l.slice(1)}\n`) : (out += `${l}\n`),
    );
    const done = new Promise<number>((r) => p.onExit((c) => r(c ?? 1)));
    active = { kill: () => p.kill(), done };
    const code = await done;
    active = undefined;

    return { code, out: (code === 0 ? out : `${out}${err}`).trim() };
  };

  const turn = async (text: string, attached: string[]) => {
    const turnId = randomUUID();
    busy = true;
    interrupted = false;
    o.onEvent({ type: "turn.start", turnId });
    let status: "completed" | "interrupted" | "failed" = "completed";

    const t: Turn = {
      text,
      attached,
      steers,
      stopped: () => interrupted || closed,
      async say(s) {
        if (t.stopped()) return;

        o.onEvent({ type: "text", itemId: randomUUID(), text: s, done: true });
      },
      async stream(s) {
        const itemId = randomUUID();
        const words = s.split(/(?<=\s)/);
        for (let i = 0; i < words.length && !t.stopped(); i += 3) {
          o.onEvent({ type: "text", itemId, text: words.slice(i, i + 3).join(""), done: false });
          // PREK_SCRIPTED_STREAM_MS slows it down, so the UI tour can catch a reply mid-stream.
          await new Promise((r) => setTimeout(r, Number(process.env.PREK_SCRIPTED_STREAM_MS) || stepMs / 4));
        }
        if (!t.stopped()) o.onEvent({ type: "text", itemId, text: s, done: true });
      },
      async bash(command) {
        if (t.stopped()) return { code: 130, out: "stopped" };

        const itemId = randomUUID();
        o.onEvent({
          type: "tool.start",
          itemId,
          name: "Bash",
          input: { command },
        });
        const r = await run(`cd ${sh(o.cwd)} && ${command}`).catch(
          (e: unknown) => ({
            code: 1,
            out: e instanceof Error ? e.message : String(e),
          }),
        );
        o.onEvent({
          type: "tool.end",
          itemId,
          output: r.out,
          isError: r.code !== 0,
        });

        return r;
      },
      async slow() {
        let i = slowAt || 1;

        for (; i <= 10 && !t.stopped(); i++) {
          const itemId = randomUUID();
          o.onEvent({
            type: "tool.start",
            itemId,
            name: "Read",
            input: { step: i },
          });
          await new Promise((r) => setTimeout(r, stepMs));
          o.onEvent({
            type: "tool.end",
            itemId,
            output: `step ${i} done`,
            isError: false,
          });

          while (steers.length)
            await t.say(`Steered: “${steers.shift()}”. Adjusting course.`);
        }

        slowAt = i <= 10 ? i : 0;

        if (!slowAt) await t.say("All 10 steps done.");
      },
    };

    try {
      const cmd = text.trim().split(/\s+/)[0];

      if (cmd === "/fail") throw new Error("scripted failure");

      if (cmd === "/slow" || (text.startsWith(RESUME) && slowAt > 0))
        await t.slow();
      else await play(t);

      o.onEvent({ type: "usage", inputTokens: 0, outputTokens: 0, costUsd: 0 });

      if (interrupted) status = "interrupted";
    } catch (e) {
      o.onEvent({
        type: "error",
        message: e instanceof Error ? e.message : String(e),
      });
      status = "failed";
    } finally {
      // Always end the turn, or Point shows the thread running forever and treats new messages as steers.
      o.onEvent({ type: "turn.end", turnId, status });
      busy = false;
    }
  };

  o.onEvent({ type: "session", id: o.threadId });

  return {
    async send(text, mode, attachments) {
      if (mode === "steer" && busy) return (steers.push(text), "delivered");

      current = turn(text, (attachments ?? []).map((a) => a.name ?? a.mime));

      return "delivered";
    },
    async interrupt() {
      interrupted = true;
      const running = active;
      running?.kill();
      await running?.done;
    },
    close() {
      if (closed) return;

      closed = true;
      interrupted = true;
      active?.kill();
      // Report exit once the turn has ended, so no tool or turn event follows it.
      void current.then(() => o.onEvent({ type: "exit", code: 0 }));
    },
  };
}

/** The builder's turn: change the named file (or README.md), commit it on the thread's branch, land it on main. */
export async function builderTurn(t: Turn): Promise<void> {
  const request = attachmentsIn(t.text).text;
  const title = titleOf(request);
  const file = targetFileOf(request);

  await t.say(`Working on “${title}” in ${file}.`);
  if (t.attached.length) await t.say(`Got ${t.attached.length === 1 ? "1 attached file" : `${t.attached.length} attached files`}: ${t.attached.join(", ")}.`);

  const edit = await t.bash(
    `mkdir -p "$(dirname ${sh(file)})" && printf '%s\\n' ${sh(`- ${title} (pre-k scripted builder)`)} >> ${sh(file)}`,
  );

  if (edit.code !== 0) throw new Error(`could not edit ${file}: ${edit.out}`);

  const commit = await t.bash(
    // A machine with no git identity (a fresh CI box, a sandbox that hides ~/.gitconfig) still commits, as pre-k.
    "{ git config user.email >/dev/null || export GIT_AUTHOR_NAME='pre-k builder' GIT_AUTHOR_EMAIL=builder@pre-k.invalid " +
      "GIT_COMMITTER_NAME='pre-k builder' GIT_COMMITTER_EMAIL=builder@pre-k.invalid; } && " +
      `git add -A && git commit -q -m ${sh(title)} && git rev-parse --short HEAD`,
  );

  if (commit.code !== 0) throw new Error(`could not commit: ${commit.out}`);

  if (t.stopped()) return;

  // `exec` so the land command is the process Cancel kills, not a shell that would leave it running.
  const land = () =>
    t.bash("exec " + commands.landOnMain(`${title}\n\nMade by pre-k's scripted builder (no model).`));
  let landed = await land();

  // Point's app CLI sometimes segfaults (139) with nothing printed. Landing again is safe: it never forces, and if the
  // first call did push, the second finds no changes, which then means the work is on main already.
  if (landed.code === 139 && !t.stopped()) {
    landed = await land();
    if (landed.code !== 0 && /NO_CHANGES/.test(landed.out)) {
      await t.say("Landed on main (the first reply was lost, so there's no commit link).");

      return;
    }
  }

  if (landed.code !== 0)
    throw new Error(`could not land on main: ${landed.out || `the command exited ${landed.code} and printed nothing`}`);

  const url = urlOf(landed.out);
  await t.say(url ? `Landed on main: ${url}` : `Landed on main.\n${landed.out}`);
}

/** The coordinator's turn: a question gets a short answer; anything else becomes a thread. */
export async function coordinatorTurn(t: Turn): Promise<void> {
  const request = t.text.trim();

  // pre-k's own note about a thread (#16): relay it, never start a thread for it.
  if (request.startsWith("Thread update:")) {
    await t.say(request.slice("Thread update:".length).trim());

    return;
  }

  const mention = parseMention(request);
  if (mention) {
    const sent = await t.bash(commands.followUp(mention.threadId, mention.rest || request));
    if (sent.code !== 0) throw new Error(`could not send the follow-up: ${sent.out}`);
    await t.say(`Sent “${mention.title}” your follow-up.`);

    return;
  }

  if (request.endsWith("?")) {
    await t.stream(
      "I'm the **scripted coordinator**, so I can't answer questions. Here is what I can do:\n\n" +
        "- Ask me to change something and I'll start a thread for it.\n" +
        "- Mention a thread with `@` to send it a follow-up.",
    );

    return;
  }

  const { text, attachments } = attachmentsIn(request);
  const title = titleOf(text);
  const started = await t.bash(commands.startThread(title, request, attachments.map((a) => a.id)));

  if (started.code === 139)
    throw new Error("could not start a thread: Point's command line crashed; ask again");

  if (started.code !== 0)
    throw new Error(`could not start a thread: ${started.out}`);

  await t.say(`Started a thread for “${title}”.`);
}
