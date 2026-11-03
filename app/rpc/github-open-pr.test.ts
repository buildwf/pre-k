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
const sh = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

describe("github.openPullRequest", () => {
  const remotes = fakeGitHub({ repos: [TEST_REPO] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pre-k-open-pr-"));
  const dir = path.join(root, "checkout");
  let bare = "";
  let n = 0;
  const open: { close: () => void }[] = [];
  const pulls: { number: number; head: string; title: string }[] = [];

  const gh = fakeConnector(githubConnector, {
    me: { login: "octo-pre-k", name: null, url: "https://github.com/octo-pre-k" },
    findOpenPullRequest: ({ head }: { head: string }) => {
      const p = pulls.find((x) => x.head === head);
      return p ? pr(p) : null;
    },
    createPullRequest: ({ head, title }: { head: string; title: string }) => {
      const p = { number: pulls.length + 1, head, title };
      pulls.push(p);
      return pr(p);
    },
  });
  const pr = (p: { number: number; head: string; title: string }) => ({
    number: p.number,
    title: p.title,
    state: "open",
    draft: false,
    url: `https://github.com/${repo}/pull/${p.number}`,
    head: p.head,
    base: "main",
  });

  /** A tracked thread with its own worktree, as threads.start leaves it. */
  async function thread(change?: string) {
    const id = `t${++n}`;
    const branch = `pre-k/work-${id}`;
    const worktree = path.join(root, "wt", id);

    await addWorktree({ dir, base: "main", branch, worktree });
    if (change) fs.writeFileSync(path.join(worktree, change), `${id}\n`);
    const reports: unknown[] = [];
    const c = testClient(github, {
      caller: `agent:${id}`,
      connectors: [gh],
      collections: { threads, "thread-outputs": outputs },
      rpc: {
        call: async (p: string, input: unknown) => {
          if (p === "threads.report") reports.push(input);
          return { ok: true as const, value: { id: "x", recorded: "new" } };
        },
      },
    });
    open.push(c);
    await c.collections.upsert("threads", [
      {
        threadId: id,
        projectId: "p1",
        title: "Work",
        request: "Do the work",
        requestedBy: "Zack",
        repo,
        baseBranch: "main",
        branch,
        worktree,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    return { id, branch, worktree, rpc: c.rpc, reports };
  }

  beforeAll(async () => {
    bare = remotes.remote(repo);
    await ensureClone({ url: bare, dir, token: null });
  });
  afterEach(() => open.splice(0).forEach((c) => c.close()));
  afterAll(() => {
    remotes.cleanup();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("commits, pushes the thread's branch, opens the PR and records it", async () => {
    const t = await thread("NOTES.md");
    const r = await t.rpc.openPullRequest({ title: "Add notes", body: "From pre-k." });

    expect(r.ok && r.value).toEqual({ number: 1, url: `https://github.com/${repo}/pull/1`, created: true });
    expect(sh(bare, "log", "-1", "--format=%s|%an|%ae", t.branch)).toBe(
      "Add notes|pre-k agent|octo-pre-k@users.noreply.github.com",
    );
    expect(gh.callsTo("createPullRequest")).toContainEqual({
      repo,
      head: t.branch,
      base: "main",
      title: "Add notes",
      body: "From pre-k.",
    });
    expect(t.reports).toEqual([
      { threadId: t.id, kind: "pr", repo, number: 1, url: `https://github.com/${repo}/pull/1`, title: "Add notes" },
    ]);
  });

  it("returns the open PR on a second call instead of opening another", async () => {
    const t = await thread("A.md");
    const first = await t.rpc.openPullRequest({ title: "A" });
    fs.writeFileSync(path.join(t.worktree, "B.md"), "b\n");
    const again = await t.rpc.openPullRequest({ title: "A, again" });

    expect(first.ok && again.ok && again.value).toEqual(first.ok && { ...first.value, created: false });
    expect(sh(bare, "log", "-1", "--format=%s", t.branch)).toBe("A, again");
  });

  it("refuses a branch with no changes", async () => {
    const t = await thread();
    const r = await t.rpc.openPullRequest({ title: "Nothing" });

    expect(r.ok ? null : r.failure.code).toBe("NO_CHANGES");
  });

  it("only serves a tracked thread's own agent", async () => {
    const stranger = testClient(github, {
      caller: "agent:unknown",
      connectors: [gh],
      collections: { threads, "thread-outputs": outputs },
    });
    open.push(stranger);
    const r = await stranger.rpc.openPullRequest({ title: "X" });

    expect(r.ok ? null : r.failure.code).toBe("NOT_A_THREAD");
  });
});
