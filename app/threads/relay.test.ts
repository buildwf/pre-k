import type { ThreadStatus } from "point/agent";
import { describe, expect, it } from "vitest";
import { createOutbox, createRelay, type RelayThread } from "./relay";

const t = (over: Partial<RelayThread> = {}): RelayThread => ({
  threadId: "t1",
  projectId: "p1",
  title: "Add badge",
  prs: [],
  ...over,
});
const s = (status: ThreadStatus) => new Map([["t1", status]]);

describe("relay", () => {
  it("says nothing for a thread that hasn't started work", () => {
    const relay = createRelay();
    expect(relay([t()], s("idle"))).toEqual([]);
  });

  it("reports a PR once the thread has worked, and only once", () => {
    const relay = createRelay();
    expect(relay([t()], s("running"))).toEqual([]);
    const pr = { kind: "pr" as const, repo: "o/r", number: 12, url: "https://github.com/o/r/pull/12" };
    expect(relay([t({ prs: [pr] })], s("idle"))).toEqual([
      {
        projectId: "p1",
        threadId: "t1",
        text: 'Thread update: "Add badge" is ready for review. PR: https://github.com/o/r/pull/12.',
      },
    ]);
    expect(relay([t({ prs: [pr] })], s("idle"))).toEqual([]);
  });

  it("reports a thread waiting for an approval, then the next change", () => {
    const relay = createRelay();
    relay([t()], s("running"));
    expect(relay([t()], s("parked"))[0]?.text).toContain("waiting for you");
    expect(relay([t()], s("running"))).toEqual([]);
    expect(relay([t()], s("idle"))[0]?.text).toContain("without landing any work");
  });

  it("reports a thread someone ended even if it never ran", () => {
    const relay = createRelay();
    expect(relay([t({ endedAs: "failed" })], s("stopped"))[0]?.text).toContain('"Add badge" failed.');
  });

  it("stays quiet about what it saw when seeded after a restart", () => {
    const relay = createRelay();
    expect(relay([t({ prs: [{ kind: "pr" as const, repo: "o/r", number: 1 }] })], s("idle"), { seed: true })).toEqual([]);
    expect(relay([t({ prs: [{ kind: "pr" as const, repo: "o/r", number: 1 }] })], s("idle"))).toEqual([]);
    expect(relay([t({ prs: [{ kind: "pr" as const, repo: "o/r", number: 1 }, { kind: "pr" as const, repo: "o/r", number: 2 }] })], s("idle"))).toHaveLength(1);
  });
});

describe("relay failures", () => {
  it("says a thread whose latest attempt failed failed, and why", () => {
    const relay = createRelay();
    relay([t()], s("running"));
    const notes = relay([t({ lastAttempt: { failed: true, message: "could not commit:\nnothing to commit." } })], s("idle"));
    expect(notes.map((n) => n.text)).toEqual(['Thread update: "Add badge" failed: could not commit: nothing to commit.']);
  });
});

describe("outbox", () => {
  const note = { coordinator: "c1", threadId: "t1", text: "Thread update: done" };
  const idle = new Map([["c1", "idle" as const]]);

  it("holds a note while the coordinator is mid-turn and sends it once it's idle", () => {
    const outbox = createOutbox(100);
    outbox.hold(note, 0);
    expect(outbox.take(new Map([["c1", "running"]]), 200)).toEqual([]);
    expect(outbox.take(idle, 200)).toEqual([note]);
    expect(outbox.take(idle, 300)).toEqual([]);
  });

  it("waits for the thread to settle, and sends only its latest note", () => {
    const outbox = createOutbox(100);
    outbox.hold({ ...note, text: "Thread update: finished" }, 0);
    outbox.hold({ ...note, text: "Thread update: failed" }, 50);
    expect(outbox.take(idle, 120)).toEqual([]);
    expect(outbox.take(idle, 150)).toEqual([{ ...note, text: "Thread update: failed" }]);
  });

  it("sends to a coordinator Point doesn't list", () => {
    const outbox = createOutbox(0);
    outbox.hold(note, 0);
    expect(outbox.take(new Map(), 0)).toEqual([note]);
  });
});
