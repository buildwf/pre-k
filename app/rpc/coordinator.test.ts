import type { MainCalls } from "point/app";
import { testClient } from "point/rpc/testing";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import coordinator from "./coordinator";

// The coordinator folder lives under the home folder; point it at a scratch one.
const home = await fs.mkdtemp(path.join(os.tmpdir(), "prek-home-"));
vi.spyOn(os, "homedir").mockReturnValue(home);

let threads: { id: string }[] = [];
type Answer = Awaited<ReturnType<MainCalls["call"]>>;
let startResult: Answer = { ok: true, value: "t1" };
const calls: { path: string; input: unknown }[] = [];
const call: MainCalls["call"] = async (p, input) => {
  calls.push({ path: p, input });
  if (p === "agents.threads") return { ok: true, value: threads };
  if (p === "agents.start") return startResult;
  return { ok: false, failure: { code: "NOT_FOUND", detail: { path: p } } };
};

const { rpc, stores, close } = testClient(coordinator, {
  rpc: { call },
  stores: { coordinators: { threads: {} } },
});
afterAll(close);

beforeEach(() => {
  calls.length = 0;
});

describe("coordinator.ensure", () => {
  it("starts the coordinator once and returns the same thread after", async () => {
    expect(await rpc.ensure({ projectId: "p1" })).toEqual({ ok: true, value: { threadId: "t1" } });
    expect(calls.find((c) => c.path === "agents.start")?.input).toMatchObject({
      agent: "coordinator",
      cwd: path.join(home, ".pre-k", "projects", "p1", "coordinator"),
    });
    expect((await fs.stat(path.join(home, ".pre-k", "projects", "p1", "coordinator"))).isDirectory()).toBe(true);
    expect(stores.get("coordinators").threads).toEqual({ p1: "t1" });

    threads = [{ id: "t1" }];
    calls.length = 0;
    expect(await rpc.ensure({ projectId: "p1" })).toEqual({ ok: true, value: { threadId: "t1" } });
    expect(calls.map((c) => c.path)).toEqual(["agents.threads"]);
  });

  it("starts a new coordinator when the stored thread was removed", async () => {
    threads = [];
    startResult = { ok: true, value: "t2" };
    expect(await rpc.ensure({ projectId: "p1" })).toEqual({ ok: true, value: { threadId: "t2" } });
    expect(stores.get("coordinators").threads).toEqual({ p1: "t2" });
  });

  it("keeps each project's coordinator separate", async () => {
    startResult = { ok: true, value: "t3" };
    await rpc.ensure({ projectId: "p2" });
    expect(stores.get("coordinators").threads).toEqual({ p1: "t2", p2: "t3" });
  });

  it("retries once when the agents daemon was still coming up", async () => {
    let attempts = 0;
    const flaky: MainCalls["call"] = async () =>
      ++attempts === 1
        ? { ok: false, failure: { code: "INTERNAL", detail: { message: "agents restarted" } } }
        : { ok: true, value: "t9" };
    const c = testClient(coordinator, { rpc: { call: flaky }, stores: { coordinators: { threads: {} } } });
    expect(await c.rpc.ensure({ projectId: "p9" })).toEqual({ ok: true, value: { threadId: "t9" } });
    expect(attempts).toBe(2);
    c.close();
  });

  it("keeps the stored coordinator when the thread lookup fails", async () => {
    const down: MainCalls["call"] = async () => ({
      ok: false,
      failure: { code: "INTERNAL", detail: { message: "agents unavailable" } },
    });
    const c = testClient(coordinator, { rpc: { call: down }, stores: { coordinators: { threads: { p8: "t8" } } } });
    expect(await c.rpc.ensure({ projectId: "p8" })).toEqual({ ok: true, value: { threadId: "t8" } });
    c.close();
  });

  it("reports a failed start without recording a thread", async () => {
    startResult = { ok: false, failure: { code: "INTERNAL", detail: { message: "no harness" } } };
    const r = await rpc.ensure({ projectId: "p3" });
    expect(r.ok ? null : r.failure).toEqual({ code: "AGENT_START_FAILED", detail: { code: "INTERNAL", detail: { message: "no harness" } },
    });
    expect(stores.get("coordinators").threads.p3).toBeUndefined();
  });

  it("refuses a project id that isn't a plain name", async () => {
    const r = await rpc.ensure({ projectId: "../x" });
    expect(r.ok ? null : r.failure.code).toBe("BAD_INPUT");
  });
});
