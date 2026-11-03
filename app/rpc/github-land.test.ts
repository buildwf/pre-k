import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fakeConnector } from "point/connectors/testing";
import { testClient } from "point/rpc/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import outputs from "../collections/thread-outputs.collection";
import threads from "../collections/threads.collection";
import githubConnector from "../connectors/github.connector";
import { addWorktree, ensureClone } from "../lib/checkout";
import { fakeGitHub, TEST_REPO } from "../testing/fake-github";
import github from "./github";

const repo = TEST_REPO.full_name;
const sh = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=o", "-c", "user.email=o@p.q", ...args], { cwd, encoding: "utf8" }).trim();

describe("github.landOnMain", () => {
  const remotes = fakeGitHub({ repos: [TEST_REPO] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pre-k-land-"));
  const dir = path.join(root, "checkout");
  const other = path.join(root, "other");
  let bare = "";
  let n = 0;
  const open: { close: () => void }[] = [];
  const gh = fakeConnector(githubConnector, {
    me: { login: "octo-pre-k", name: null, url: "https://github.com/octo-pre-k" },
  });

  /** Someone else pushes to main meanwhile. */
  function pushFromElsewhere(file: string, text = `${file}\n`) {
    sh(other, "pull", "-q", "origin", "main");
    fs.writeFileSync(path.join(other, file), text);
    sh(other, "add", file);
    sh(other, "commit", "-q", "-m", `theirs: ${file}`);
    sh(other, "push", "-q", "origin", "HEAD:main");
  }

  async function thread(files: Record<string, string>) {
    const id = `t${++n}`;
    const branch = `pre-k/land-${id}`;
    const worktree = path.join(root, "wt", id);

    await addWorktree({ dir, base: "main", branch, worktree });
    for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(worktree, f), text);
    const reports: unknown[] = [];
    const c = testClient(github, {
      caller: `agent:${id}`,
      connectors: [gh],
      collections: { threads, "thread-outputs": outputs },
      rpc: {
        call: async (p: string, input: unknown) => {
          reports.push({ p, input });
          return { ok: true as const, value: "ok" };
        },
      },
    });
    open.push(c);
    await c.collections.upsert("threads", [
      {
        threadId: id,
        projectId: "p1",
        title: `Work ${id}`,
        request: "Do it",
        requestedBy: "Zack",
        repo,
        baseBranch: "main",
        branch,
        worktree,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    return { id, worktree, rpc: c.rpc, reports };
  }

  beforeAll(async () => {
    bare = remotes.remote(repo);
    await ensureClone({ url: bare, dir, token: null });
    sh(root, "clone", "-q", bare, other);
  });
  afterEach(() => open.splice(0).forEach((c) => c.close()));
  afterAll(() => {
    remotes.cleanup();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("commits the agent's work and lands it on main, rebased past newer commits", async () => {
    const t = await thread({ "NOTES.md": "notes\n" });

    pushFromElsewhere("THEIRS.md");
    const r = await t.rpc.landOnMain({ message: "Add notes" });

    if (!r.ok) throw new Error(JSON.stringify(r.failure));
    expect(sh(bare, "rev-parse", "main")).toBe(r.value.sha);
    expect(r.value.url).toBe(`https://github.com/${repo}/commit/${r.value.sha}`);
    expect(sh(bare, "log", "--format=%s", "-2", "main").split("\n")).toEqual(["Add notes", "theirs: THEIRS.md"]);
    expect(sh(bare, "log", "-1", "--format=%an <%ae>", "main")).toBe("pre-k agent <octo-pre-k@users.noreply.github.com>");
    expect(t.reports).toEqual([
      {
        p: "threads.report",
        input: { threadId: t.id, kind: "commit", repo, sha: r.value.sha, branch: "main", url: r.value.url, title: "Add notes" },
      },
    ]);
  });

  it("uses the thread's title when no message is given, and refuses an empty landing", async () => {
    const t = await thread({ "A.md": "a\n" });
    const r = await t.rpc.landOnMain({});
    const again = await t.rpc.landOnMain({});

    expect(r.ok && sh(bare, "log", "-1", "--format=%s", "main")).toBe(`Work ${t.id}`);
    expect(again.ok ? null : again.failure.code).toBe("NO_CHANGES");
  });

  it("aborts a conflicting rebase and leaves the worktree as it was", async () => {
    const t = await thread({ "README.md": "mine\n" });

    pushFromElsewhere("README.md", "theirs\n");
    const before = sh(bare, "rev-parse", "main");
    const r = await t.rpc.landOnMain({ message: "Mine" });

    if (r.ok || r.failure.code !== "CONFLICT") throw new Error("expected CONFLICT");
    expect(r.failure.detail.files).toEqual(["README.md"]);
    expect(r.failure.detail.next).toContain("git rebase origin/main");
    expect(sh(bare, "rev-parse", "main")).toBe(before);
    expect(fs.readFileSync(path.join(t.worktree, "README.md"), "utf8")).toBe("mine\n");
    expect(sh(t.worktree, "status", "--porcelain")).toBe("");

    // The agent follows `next` offline (origin/main is already fetched), then lands.
    try {
      sh(t.worktree, "rebase", "origin/main");
    } catch {
      // Conflict expected: resolve it.
    }
    fs.writeFileSync(path.join(t.worktree, "README.md"), "theirs\nmine\n");
    sh(t.worktree, "add", "README.md");
    execFileSync("git", ["-c", "user.name=o", "-c", "user.email=o@p.q", "-c", "core.editor=true", "rebase", "--continue"], {
      cwd: t.worktree,
    });
    const landed = await t.rpc.landOnMain({ message: "Mine" });

    expect(landed.ok && sh(bare, "show", "main:README.md")).toBe("theirs\nmine");
  });

  it("only serves a tracked thread's own agent", async () => {
    const c = testClient(github, { caller: "agent:nobody", connectors: [gh], collections: { threads, "thread-outputs": outputs } });
    open.push(c);
    const r = await c.rpc.landOnMain({});

    expect(r.ok ? null : r.failure.code).toBe("NOT_A_THREAD");
  });
});
