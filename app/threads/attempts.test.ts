import { testClient } from "point/rpc/testing";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import threads from "../collections/threads.collection";
import outputs from "../collections/thread-outputs.collection";
import router from "../rpc/threads";
import { createAttemptWatcher, recordAttempt } from "./attempts";

// In-memory collections through a test client of the threads router.
const client = testClient(router, { caller: "window:main", collections: { threads, "thread-outputs": outputs } });
const { collections } = client;
afterAll(() => client.close());

const row = { threadId: "t1", projectId: "p1", title: "T", request: "r", requestedBy: "Zack", createdAt: 1, updatedAt: 1 };
beforeEach(() => collections.replace("threads", [row]));

/** A fake agents.events: plays `events`, then stays open until aborted, like the live stream. */
function fakeStream(events: unknown[]) {
  const opened: string[] = [];
  return {
    opened,
    rpc: {
      stream(_path: string, input: unknown, options?: { signal?: AbortSignal }): AsyncIterable<unknown> {
        opened.push(JSON.stringify(input));
        return (async function* () {
          yield* events;
          await new Promise<void>((resolve) => options?.signal?.addEventListener("abort", () => resolve(), { once: true }));
        })();
      },
    },
  };
}

const user = (text: string) => ({ type: "user", text, turn: "start" });
const end = (status: string) => ({ type: "turn.end", turnId: "x", status });
const until = async (check: () => boolean) => {
  for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => setTimeout(r, 5));
};

describe("createAttemptWatcher", () => {
  it("records a failed turn on the row while the thread works, and only watches pre-k's threads", async () => {
    const s = fakeStream([user("a"), { type: "text", itemId: "i", text: "hi", done: true }, { type: "error", message: "boom" }, end("failed")]);
    const ac = new AbortController();
    const w = createAttemptWatcher({ rpc: s.rpc, collections, signal: ac.signal, graceMs: 1 });
    w.update(new Map([["t1", "running"], ["other", "running"]]));
    await until(() => collections.get("threads", "t1")?.lastAttempt !== undefined);
    expect(collections.get("threads", "t1")?.lastAttempt).toMatchObject({ failed: true, message: "boom" });
    expect(s.opened).toEqual([JSON.stringify({ threadId: "t1" })]);
    // Still busy: the same stream, not a second one.
    w.update(new Map([["t1", "running"]]));
    expect(s.opened).toHaveLength(1);
    ac.abort();
  });

  it("clears the failure when the next turn completes, and stops reading once the thread is at rest", async () => {
    await recordAttempt(collections, "t1", true, "boom");
    const s = fakeStream([user("a"), end("failed"), user("again"), end("completed")]);
    const ac = new AbortController();
    const w = createAttemptWatcher({ rpc: s.rpc, collections, signal: ac.signal, graceMs: 1 });
    w.update(new Map([["t1", "running"]]));
    w.update(new Map([["t1", "idle"]]));
    await until(() => collections.get("threads", "t1")?.lastAttempt?.failed === false);
    expect(collections.get("threads", "t1")?.lastAttempt).toMatchObject({ failed: false });
    // A later busy spell opens the transcript again.
    await until(() => false);
    w.update(new Map([["t1", "starting"]]));
    expect(s.opened).toHaveLength(2);
    ac.abort();
  });

  it("records an attempt whose harness never started once the thread is at rest", async () => {
    const s = fakeStream([user("a"), { type: "error", message: "missing ANTHROPIC_API_KEY" }]);
    const ac = new AbortController();
    const w = createAttemptWatcher({ rpc: s.rpc, collections, signal: ac.signal, graceMs: 1 });
    w.update(new Map([["t1", "starting"]]));
    w.update(new Map([["t1", "stopped"]]));
    await until(() => collections.get("threads", "t1")?.lastAttempt !== undefined);
    expect(collections.get("threads", "t1")?.lastAttempt).toMatchObject({ failed: true, message: "missing ANTHROPIC_API_KEY" });
    ac.abort();
  });
});

describe("recordAttempt", () => {
  it("writes a change once and leaves an unknown thread alone", async () => {
    await recordAttempt(collections, "t1", true, "boom");
    const first = collections.get("threads", "t1")?.lastAttempt?.at;
    await new Promise((r) => setTimeout(r, 2));
    await recordAttempt(collections, "t1", true, "boom");
    expect(collections.get("threads", "t1")?.lastAttempt?.at).toBe(first);
    await recordAttempt(collections, "nope", true);
    expect(collections.get("threads", "nope")).toBeUndefined();
  });
});
