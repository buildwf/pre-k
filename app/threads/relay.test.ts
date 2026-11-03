import type { ThreadStatus } from "point/agent";
import { describe, expect, it } from "vitest";
import { createRelay, type RelayThread } from "./relay";

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
    expect(relay([t()], s("idle"))[0]?.text).toContain("without opening a PR");
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
