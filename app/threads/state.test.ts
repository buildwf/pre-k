import { describe, expect, it } from "vitest";
import { callerThread, outputKey, outputLabel, threadState } from "./state";

const pr = { kind: "pr", repo: "o/r", number: 1 } as const;
const commit = { kind: "commit", repo: "o/r", sha: "abc1234", branch: "main" } as const;

describe("threadState", () => {
  it.each([
    ["starting", undefined, [], "working"],
    ["running", undefined, [pr], "working"],
    ["parked", undefined, [], "blocked"],
    ["paused", undefined, [], "blocked"],
    ["idle", undefined, [], "idle"],
    ["idle", undefined, [pr], "review_ready"],
    [undefined, undefined, [pr], "review_ready"],
    ["idle", undefined, [commit], "landed"],
    ["idle", undefined, [commit, pr], "review_ready"],
    [undefined, undefined, [], "idle"],
    ["stopped", undefined, [], "interrupted"],
    ["interrupted", undefined, [pr], "interrupted"],
    ["running", "done", [pr], "done"],
    ["idle", "failed", [], "failed"],
    [undefined, "stopped", [commit], "stopped"],
  ] as const)("%s, ended %s, outputs %j: %s", (status, endedAs, outputs, want) => {
    expect(threadState(status, endedAs, outputs)).toBe(want);
  });
});

describe("helpers", () => {
  it("keys an output by thread and identity, and labels it", () => {
    expect(outputKey({ threadId: "t1", kind: "pr", repo: "o/r", number: 3 })).toBe("t1:pr:o/r#3");
    expect(outputKey({ threadId: "t1", ...commit })).toBe("t1:commit:o/r@abc1234");
    expect(outputLabel(pr)).toBe("o/r#1");
    expect(outputLabel({ ...commit, sha: "abc1234def5678" })).toBe("o/r@abc1234");
  });

  it("finds the thread of an agent caller only", () => {
    expect(callerThread("agent:t1")).toBe("t1");
    expect(callerThread("agent:")).toBeUndefined();
    expect(callerThread("window:main")).toBeUndefined();
    expect(callerThread("cli")).toBeUndefined();
  });
});
