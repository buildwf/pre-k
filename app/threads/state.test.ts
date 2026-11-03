import { describe, expect, it } from "vitest";
import { callerThread, outputKey, threadState } from "./state";

describe("threadState", () => {
  it.each([
    ["starting", undefined, 0, "working"],
    ["running", undefined, 1, "working"],
    ["parked", undefined, 0, "blocked"],
    ["paused", undefined, 0, "blocked"],
    ["idle", undefined, 0, "idle"],
    ["idle", undefined, 1, "review_ready"],
    [undefined, undefined, 1, "review_ready"],
    [undefined, undefined, 0, "idle"],
    ["stopped", undefined, 0, "interrupted"],
    ["interrupted", undefined, 1, "interrupted"],
    ["running", "done", 1, "done"],
    ["idle", "failed", 0, "failed"],
    [undefined, "stopped", 0, "stopped"],
  ] as const)("%s, ended %s, %d outputs: %s", (status, endedAs, outputs, want) => {
    expect(threadState(status, endedAs, outputs)).toBe(want);
  });
});

describe("helpers", () => {
  it("keys an output by thread, kind, repo and number", () => {
    expect(outputKey({ threadId: "t1", kind: "pr", repo: "o/r", number: 3 })).toBe("t1:pr:o/r#3");
  });

  it("finds the thread of an agent caller only", () => {
    expect(callerThread("agent:t1")).toBe("t1");
    expect(callerThread("agent:")).toBeUndefined();
    expect(callerThread("window:main")).toBeUndefined();
    expect(callerThread("cli")).toBeUndefined();
  });
});
