import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { testClient } from "point/rpc/testing";
import { z } from "zod";
import { afterEach, describe, expect, it } from "vitest";
import threads from "../collections/threads.collection";
import outputs from "../collections/thread-outputs.collection";
import router, { THREAD_AGENT } from "./threads";

type Answer = { ok: true; value: unknown } | { ok: false; failure: { code: string; detail: unknown } };
const ok = (value: unknown): Answer => ({ ok: true, value });
const no = (code: string, detail: unknown = {}): Answer => ({ ok: false, failure: { code, detail } });

const workspace = { repo: "buildwf/test-repo", baseBranch: "main", branch: "prek/add-badge-1", worktree: "/w/1" };

/** A fake main: records every call and answers from `answers` (default: everything works). */
function fakeMain(answers: Record<string, Answer> = {}) {
  const calls: { path: string; input: unknown }[] = [];
  const defaults: Record<string, Answer> = {
    "workspaces.prepare": ok(workspace),
    "workspaces.release": ok(undefined),
    "agents.start": ok("t1"),
    "agents.send": ok("delivered"),
    "coordinator.projectOf": no("NOT_A_COORDINATOR"),
    "projects.context": ok("Project instructions\n\nMemory"),
  };
  const call = async (path: string, input: unknown) => {
    calls.push({ path, input });
    return answers[path] ?? defaults[path] ?? no("NOT_FOUND");
  };
  return { call, calls };
}

const input = { projectId: "p1", title: "Add a README badge", request: "Add a CI badge to the README", requestedBy: "Zack" };
const open: { close: () => void }[] = [];
const client = (caller: string, main: ReturnType<typeof fakeMain>) => {
  const c = testClient(router, { caller, collections: { threads, "thread-outputs": outputs }, rpc: { call: main.call } });
  open.push(c);
  return c;
};
afterEach(() => open.splice(0).forEach((c) => c.close()));

describe("threads.start", () => {
  it("still starts a thread when the project has no context to give", async () => {
    const main = fakeMain({ "projects.context": no("NOT_IN_PROJECT") });
    const { rpc } = client("agent:coordinator-1", main);
    expect((await rpc.start(input)).ok).toBe(true);
    expect(main.calls.find((c) => c.path === "agents.start")?.input).toEqual({ agent: THREAD_AGENT, cwd: "/w/1", by: "Zack" });
  });

  it("prepares a worktree, starts the agent in it, records the thread and sends the request as the person", async () => {
    const main = fakeMain();
    const { rpc, collections } = client("agent:coordinator-1", main);
    const r = await rpc.start(input);
    expect(r).toEqual({ ok: true, value: { threadId: "t1", branch: "prek/add-badge-1", firstMessage: "delivered" } });
    expect(main.calls).toEqual([
      { path: "workspaces.prepare", input: { projectId: "p1", title: "Add a README badge" } },
      { path: "projects.context", input: { projectId: "p1" } },
      { path: "agents.start", input: { agent: THREAD_AGENT, cwd: "/w/1", by: "Zack", context: "Project instructions\n\nMemory" } },
      { path: "agents.send", input: { threadId: "t1", text: input.request, turn: "queue", by: "Zack" } },
    ]);
    expect(collections.get("threads", "t1")).toMatchObject({ projectId: "p1", requestedBy: "Zack", ...workspace });
  });

  it("uses the coordinator's own project when it passes none", async () => {
    const main = fakeMain({ "coordinator.projectOf": ok("p7") });
    const { rpc, collections } = client("agent:coordinator-7", main);
    const { projectId: _, ...rest } = input;
    const r = await rpc.start(rest);
    expect(r.ok).toBe(true);
    expect(main.calls[0]).toEqual({ path: "coordinator.projectOf", input: { threadId: "coordinator-7" } });
    expect(collections.get("threads", "t1")?.projectId).toBe("p7");
  });

  it("needs a projectId from anyone who isn't a coordinator", async () => {
    const main = fakeMain();
    const { projectId: _, ...rest } = input;
    const fromWindow = await client("window:main", main).rpc.start(rest);
    const fromAgent = await client("agent:stranger", main).rpc.start(rest);
    expect(fromWindow.ok ? null : fromWindow.failure.code).toBe("NO_PROJECT");
    expect(fromAgent.ok ? null : fromAgent.failure.code).toBe("NO_PROJECT");
  });

  it("gives a thread with no repo an empty scratch folder, never the app's own directory", async () => {
    const main = fakeMain({ "workspaces.prepare": no("NO_REPO") });
    const { rpc, collections } = client("window:main", main);
    const r = await rpc.start(input);
    expect(r.ok && r.value.branch).toBeUndefined();
    const cwd = z.object({ cwd: z.string() }).parse(main.calls.find((c) => c.path === "agents.start")?.input).cwd;
    expect(cwd.startsWith(path.join(os.tmpdir(), "pre-k-thread-"))).toBe(true);
    expect(cwd).not.toBe(process.cwd());
    expect(await fs.readdir(cwd)).toEqual([]);
    expect(collections.get("threads", "t1")?.worktree).toBeUndefined();
    await fs.rm(cwd, { recursive: true });
  });

  it("removes the scratch folder when the agent can't start", async () => {
    const main = fakeMain({ "workspaces.prepare": no("NO_REPO"), "agents.start": no("INTERNAL") });
    const r = await client("window:main", main).rpc.start(input);
    expect(r.ok ? null : r.failure.code).toBe("AGENT_START_FAILED");
    const cwd = z.object({ cwd: z.string() }).parse(main.calls.find((c) => c.path === "agents.start")?.input).cwd;
    await expect(fs.stat(cwd)).rejects.toThrow();
  });

  it("stops before starting an agent when the workspace can't be prepared", async () => {
    const main = fakeMain({ "workspaces.prepare": no("FETCH_FAILED", { message: "network down" }) });
    const { rpc, collections } = client("window:main", main);
    const r = await rpc.start(input);
    expect(r.ok ? null : r.failure).toEqual({
      code: "WORKSPACE_FAILED",
      detail: { code: "FETCH_FAILED", message: "FETCH_FAILED: network down" },
    });
    expect(main.calls.map((c) => c.path)).toEqual(["workspaces.prepare"]);
    expect(collections.all("threads")).toEqual([]);
  });

  it("releases the worktree and records nothing when the agent can't start", async () => {
    const main = fakeMain({ "agents.start": no("INTERNAL", { message: "no agent coder" }) });
    const { rpc, collections } = client("window:main", main);
    const r = await rpc.start(input);
    expect(r.ok ? null : r.failure.code).toBe("AGENT_START_FAILED");
    expect(main.calls.at(-1)).toEqual({ path: "workspaces.release", input: { worktree: "/w/1" } });
    expect(collections.all("threads")).toEqual([]);
  });

  it("keeps the thread when the first message fails, so the person sees the error there", async () => {
    const main = fakeMain({ "agents.send": no("INTERNAL", { message: "missing key" }) });
    const { rpc, collections } = client("window:main", main);
    const r = await rpc.start(input);
    expect(r.ok && r.value.firstMessage).toBe("failed");
    expect(collections.get("threads", "t1")).toBeDefined();
  });

  it("refuses a thread pre-k started from starting more threads", async () => {
    const main = fakeMain();
    const { rpc, collections } = client("agent:t0", main);
    await collections.upsert("threads", [
      { threadId: "t0", projectId: "p1", title: "x", request: "x", requestedBy: "Zack", createdAt: 0, updatedAt: 0 },
    ]);
    const r = await rpc.start(input);
    expect(r.ok ? null : r.failure).toEqual({ code: "FORBIDDEN_FOR_THREADS", detail: { threadId: "t0" } });
    expect(main.calls).toEqual([]);
  });
});
