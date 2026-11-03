import { testClient } from "point/rpc/testing";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import threads from "../collections/threads.collection";
import outputs from "../collections/thread-outputs.collection";
import router from "./threads";

const row = (threadId: string, projectId: string, updatedAt: number) => ({
  threadId,
  projectId,
  title: `Thread ${threadId}`,
  request: "Add a README badge",
  requestedBy: "Zack",
  repo: "buildwf/test-repo",
  branch: `prek/${threadId}`,
  createdAt: updatedAt,
  updatedAt,
});

// Point's live list, as agents.threads answers it. t3 is in pre-k but not running here.
const live = [
  { id: "t1", agent: "builder", cwd: "/w/t1", status: "running" },
  { id: "t2", agent: "builder", cwd: "/w/t2", status: "idle" },
  { id: "untracked", agent: "coder", cwd: "/", status: "running" },
];
const call = async (path: string) =>
  path === "agents.threads" ? { ok: true as const, value: live } : { ok: false as const, failure: { code: "NOT_FOUND" as const, detail: {} } };

const asAgent = testClient(router, { caller: "agent:t2", collections: { threads, "thread-outputs": outputs }, rpc: { call } });
const { rpc: agent, collections } = asAgent;
const window = testClient(router, { caller: "window:main", collections: { threads, "thread-outputs": outputs }, rpc: { call } });
// testClient gives each client its own in-memory collections; seed both.
const seed = async () => {
  for (const c of [collections, window.collections]) {
    await c.replace("thread-outputs", []);
    await c.replace("threads", [row("t1", "p1", 1), row("t2", "p1", 2), row("t3", "p1", 0), row("t9", "p2", 3)]);
  }
};

afterAll(() => {
  asAgent.close();
  window.close();
});
beforeEach(seed);

describe("threads.list", () => {
  it("lists one project's threads, newest first, with derived state", async () => {
    const r = await window.rpc.list({ projectId: "p1" });
    expect(r.ok && r.value.map((t) => [t.threadId, t.state])).toEqual([
      ["t2", "idle"],
      ["t1", "working"],
      ["t3", "idle"],
    ]);
  });

  it("shows review_ready once an idle thread has reported a PR", async () => {
    await agent.report({ kind: "pr", repo: "buildwf/test-repo", number: 12, url: "https://github.com/buildwf/test-repo/pull/12" });
    const r = await agent.list({ projectId: "p1" });
    const t2 = r.ok ? r.value.find((t) => t.threadId === "t2") : undefined;
    expect(t2?.state).toBe("review_ready");
    expect(t2?.outputs).toEqual([
      { kind: "pr", repo: "buildwf/test-repo", number: 12, url: "https://github.com/buildwf/test-repo/pull/12", title: undefined },
    ]);
  });
});

describe("threads.report", () => {
  it("records a PR once, however often it is reported", async () => {
    const first = await agent.report({ kind: "pr", repo: "buildwf/test-repo", number: 12 });
    const again = await agent.report({ kind: "pr", repo: "buildwf/test-repo", number: 12, title: "Add badge" });
    expect(first.ok && first.value.recorded).toBe("new");
    expect(again.ok && again.value.recorded).toBe("already");
    expect(collections.all("thread-outputs")).toHaveLength(1);
    expect(collections.all("thread-outputs")[0]?.title).toBe("Add badge");
  });

  it("refuses an agent reporting for another thread", async () => {
    const r = await agent.report({ kind: "pr", repo: "buildwf/test-repo", number: 1, threadId: "t1" });
    expect(r.ok ? null : r.failure.code).toBe("OTHER_THREAD");
  });

  it("needs a threadId from callers that are not agents, and a tracked thread", async () => {
    const missing = await window.rpc.report({ kind: "pr", repo: "buildwf/test-repo", number: 1 });
    const unknown = await window.rpc.report({ kind: "pr", repo: "buildwf/test-repo", number: 1, threadId: "nope" });
    const ok = await window.rpc.report({ kind: "pr", repo: "buildwf/test-repo", number: 1, threadId: "t1" });
    expect(missing.ok ? null : missing.failure.code).toBe("NOT_A_THREAD");
    expect(unknown.ok ? null : unknown.failure.code).toBe("NOT_A_THREAD");
    expect(ok.ok).toBe(true);
  });
});

describe("threads.report for a landed commit", () => {
  it("records a commit once and shows the thread as landed", async () => {
    const commit = { kind: "commit", repo: "buildwf/test-repo", sha: "0123abc", branch: "main" } as const;
    const first = await agent.report({ ...commit, title: "Add a README badge" });
    const again = await agent.report({ ...commit, url: "https://github.com/buildwf/test-repo/commit/0123abc" });
    expect(first.ok && first.value.recorded).toBe("new");
    expect(again.ok && again.value.recorded).toBe("already");
    expect(collections.all("thread-outputs")).toEqual([
      expect.objectContaining({ ...commit, title: "Add a README badge", url: "https://github.com/buildwf/test-repo/commit/0123abc" }),
    ]);
    const r = await agent.list({ projectId: "p1" });
    expect(r.ok && r.value.find((t) => t.threadId === "t2")?.state).toBe("landed");
  });

  it("refuses a commit without a sha or branch", async () => {
    const r = await agent.report({ kind: "commit", repo: "buildwf/test-repo", sha: "not-a-sha", branch: "main" });
    expect(r.ok ? null : r.failure.code).toBe("BAD_INPUT");
  });
});

describe("threads.end", () => {
  it("lets a window close a thread, and not an agent", async () => {
    const byAgent = await agent.end({ threadId: "t2", as: "done" });
    expect(byAgent.ok ? null : byAgent.failure.code).toBe("FORBIDDEN");
    expect(await window.rpc.end({ threadId: "t1", as: "done" })).toEqual({ ok: true, value: "ended" });
    const r = await window.rpc.list({ projectId: "p1" });
    expect(r.ok && r.value.find((t) => t.threadId === "t1")?.state).toBe("done");
  });
});
