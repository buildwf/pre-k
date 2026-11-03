import { testClient } from "point/rpc/testing";
import { afterEach, describe, expect, it } from "vitest";
import memory from "../collections/memory.collection";
import projects from "../collections/projects.collection";
import threads from "../collections/threads.collection";
import memoryRouter from "./memory";
import projectsRouter from "./projects";

type Answer = { ok: true; value: unknown } | { ok: false; failure: { code: string; detail: unknown } };
type Call = (path: string, input: unknown) => Promise<Answer>;
const notCoordinator: Call = async () => ({ ok: false, failure: { code: "NOT_A_COORDINATOR", detail: {} } });
const open: { close: () => void }[] = [];
afterEach(() => open.splice(0).forEach((c) => c.close()));

const now = Date.now();
const note = (id: string, projectId: string, text: string) => ({ id, projectId, text, savedBy: "person", at: now });

/** A client for `router` called as `caller`, seeded with projects A and B, thread t1 in A, and a note in each. */
async function client<R extends typeof memoryRouter | typeof projectsRouter>(router: R, caller: string, call = notCoordinator) {
  const c = testClient(router, { caller, collections: { projects, threads, memory }, rpc: { call } });
  open.push(c);
  await c.collections.upsert("projects", [
    { id: "A", name: "Alpha", instructions: "Use pnpm, never npm.", createdAt: now, lastOpenedAt: now, repo: "acme/alpha", defaultBranch: "main" },
    { id: "B", name: "Beta", instructions: "", createdAt: now, lastOpenedAt: now },
  ]);
  await c.collections.upsert("threads", [
    { threadId: "t1", projectId: "A", title: "Badge", request: "Add a badge", requestedBy: "Zack", createdAt: now, updatedAt: now },
  ]);
  await c.collections.upsert("memory", [note("m1", "A", "CI badge lives in README.md"), note("m2", "B", "Beta secret plan")]);
  return c;
}

describe("projects.context", () => {
  it("gives an agent its project's instructions and memory, never another project's", async () => {
    const { rpc } = await client(projectsRouter, "agent:t1");
    const r = await rpc.context({ projectId: "B" });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toContain("Use pnpm, never npm.");
    expect(r.value).toContain("acme/alpha");
    expect(r.value).toContain("CI badge lives in README.md");
    expect(r.value).not.toContain("Beta secret plan");
  });

  it("finds a coordinator thread's project through coordinator.projectOf", async () => {
    const { rpc } = await client(projectsRouter, "agent:c1", async (path, input) =>
      path === "coordinator.projectOf" && JSON.stringify(input) === '{"threadId":"c1"}'
        ? { ok: true, value: "B" }
        : notCoordinator(path, input),
    );
    const r = await rpc.context(); // as `"$POINT_CLI" projects context` sends it: no flags, no input

    expect(r.ok && r.value).toContain("# Project: Beta");
  });

  it("refuses a thread that isn't in a project, even when it names one", async () => {
    const { rpc } = await client(projectsRouter, "agent:stray");
    const r = await rpc.context({ projectId: "A" });

    expect(r.ok ? null : r.failure.code).toBe("NOT_IN_PROJECT");
  });

  it("answers the CLI for a named project", async () => {
    const { rpc } = await client(projectsRouter, "cli");
    const r = await rpc.context({ projectId: "B" });

    expect(r.ok && r.value).toContain("Beta secret plan");
  });
});

describe("memory", () => {
  it("an agent saves to its own project, recorded as that thread, whatever projectId it passes", async () => {
    const { rpc, collections } = await client(memoryRouter, "agent:t1");
    const r = await rpc.save({ text: "Tests need pnpm exec install-electron first", projectId: "B" });

    if (!r.ok) throw new Error(r.failure.code);
    expect(collections.get("memory", r.value.id)).toMatchObject({ projectId: "A", savedBy: "t1" });
    const list = await rpc.list({ projectId: "B" });
    expect(list.ok && list.value.map((n) => n.text)).toEqual([
      "CI badge lives in README.md",
      "Tests need pnpm exec install-electron first",
    ]);
  });

  it("refuses an agent thread that isn't in a project", async () => {
    const { rpc } = await client(memoryRouter, "agent:stray");
    const r = await rpc.save({ text: "x", projectId: "A" });

    expect(r.ok ? null : r.failure.code).toBe("NOT_IN_PROJECT");
  });

  it("the person saves, edits and removes notes", async () => {
    const { rpc, collections } = await client(memoryRouter, "window:main");
    const r = await rpc.save({ projectId: "A", text: "old" });

    if (!r.ok) throw new Error(r.failure.code);
    expect(collections.get("memory", r.value.id)?.savedBy).toBe("person");
    await rpc.update({ id: r.value.id, text: "new" });
    expect(collections.get("memory", r.value.id)?.text).toBe("new");
    await rpc.remove({ id: r.value.id });
    expect(collections.get("memory", r.value.id)).toBeUndefined();
  });
});
