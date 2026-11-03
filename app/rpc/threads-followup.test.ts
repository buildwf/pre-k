import { testClient } from "point/rpc/testing";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import threads from "../collections/threads.collection";
import outputs from "../collections/thread-outputs.collection";
import router from "./threads";

const row = {
  threadId: "t1",
  projectId: "p1",
  title: "Add a README badge",
  request: "Add a README badge",
  requestedBy: "Zack",
  createdAt: 1,
  updatedAt: 1,
};

// What agents.send was asked, and what it answers.
const sends: unknown[] = [];
let answer: { ok: true; value: unknown } | { ok: false; failure: { code: string; detail: unknown } } = { ok: true, value: "delivered" };
const call = async (path: string, input: unknown) => {
  if (path === "agents.send") {
    sends.push(input);
    return answer;
  }
  return { ok: false as const, failure: { code: "NOT_FOUND", detail: {} } };
};

const opts = (caller: string) => ({ caller, collections: { threads, "thread-outputs": outputs }, rpc: { call } });
const window = testClient(router, opts("window:main"));
const builder = testClient(router, opts("agent:t2"));
const coordinator = testClient(router, opts("agent:coord"));

afterAll(() => [window, builder, coordinator].forEach((c) => c.close()));
beforeEach(async () => {
  sends.length = 0;
  answer = { ok: true, value: "delivered" };
  for (const c of [window, builder, coordinator]) await c.collections.replace("threads", [row, { ...row, threadId: "t2" }]);
});

describe("threads.followUp", () => {
  it("reopens a finished thread and queues the new request", async () => {
    await window.collections.upsert("threads", [{ ...row, endedAs: "done" }]);
    const r = await window.rpc.followUp({ threadId: "t1", text: "  Also add a license badge ", by: "Zack" });
    expect(r.ok && r.value).toEqual({ reopened: true, message: "delivered" });
    expect(sends).toEqual([{ threadId: "t1", text: "Also add a license badge", turn: "queue", by: "Zack" }]);
    const after = window.collections.get("threads", "t1");
    expect(after?.endedAs).toBeUndefined();
    expect(after?.updatedAt).toBeGreaterThan(1);
  });

  it("follows up on an open thread without reopening anything", async () => {
    answer = { ok: true, value: "queued" };
    const r = await window.rpc.followUp({ threadId: "t1", text: "Retry it" });
    expect(r.ok && r.value).toEqual({ reopened: false, message: "queued" });
    expect(sends).toEqual([{ threadId: "t1", text: "Retry it", turn: "queue" }]);
  });

  it("says why when Point can't deliver it", async () => {
    answer = { ok: false, failure: { code: "INTERNAL", detail: { message: "no API key" } } };
    const r = await window.rpc.followUp({ threadId: "t1", text: "Retry it" });
    expect(!r.ok && r.failure).toMatchObject({ code: "SEND_FAILED", detail: { message: "INTERNAL: no API key" } });
  });

  it("refuses an unknown thread, an empty message and a thread's own agent", async () => {
    const unknown = await window.rpc.followUp({ threadId: "nope", text: "hi" });
    expect(!unknown.ok && unknown.failure.code).toBe("NOT_A_THREAD");
    const empty = await window.rpc.followUp({ threadId: "t1", text: "   " });
    expect(!empty.ok && empty.failure.code).toBe("BAD_INPUT");
    const own = await builder.rpc.followUp({ threadId: "t1", text: "more" });
    expect(!own.ok && own.failure.code).toBe("FORBIDDEN_FOR_THREADS");
    expect(sends).toEqual([]);
  });

  it("lets the coordinator follow up", async () => {
    const r = await coordinator.rpc.followUp({ threadId: "t1", text: "One more thing" });
    expect(r.ok).toBe(true);
  });
});
