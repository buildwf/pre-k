import { describe, expect, it } from "vitest";
import { callerThread, lastAttempt, outputKey, outputLabel, threadState } from "./state";

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
    ["stopped", undefined, [], "idle"],
    ["stopped", undefined, [commit], "landed"],
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

describe("threadState with the latest attempt", () => {
  it("is failed at rest after a failed attempt, working while it retries, and closed wins", () => {
    const failed = { failed: true };
    expect(threadState("idle", undefined, [commit], failed)).toBe("failed");
    expect(threadState("stopped", undefined, [], failed)).toBe("failed");
    expect(threadState(undefined, undefined, [], failed)).toBe("failed");
    expect(threadState("running", undefined, [], failed)).toBe("working");
    expect(threadState("paused", undefined, [], failed)).toBe("blocked");
    expect(threadState("idle", "done", [], failed)).toBe("done");
    expect(threadState("idle", undefined, [commit], { failed: false })).toBe("landed");
  });
});

describe("lastAttempt", () => {
  const user = (text: string) => ({ type: "user", text, turn: "start" }) as const;
  const end = (status: "completed" | "interrupted" | "failed") => ({ type: "turn.end", turnId: "x", status }) as const;
  const error = (message: string) => ({ type: "error", message }) as const;

  it("is not failed before anything was asked", () => {
    expect(lastAttempt([])).toEqual({ failed: false });
    expect(lastAttempt([error("boot notice")])).toEqual({ failed: false });
  });
  it("names the latest request and a turn that completed", () => {
    expect(lastAttempt([user("a"), end("failed"), user("b"), error("using its own login"), end("completed")])).toEqual({
      request: "b",
      failed: false,
    });
  });
  it("fails a turn that ended failed or interrupted, with the last error", () => {
    expect(lastAttempt([user("a"), error("one"), error("two"), end("failed")])).toEqual({ request: "a", failed: true, message: "two" });
    expect(lastAttempt([user("a"), end("interrupted")])).toEqual({ request: "a", failed: true });
  });
  it("fails an attempt whose harness never started", () => {
    expect(lastAttempt([user("a"), error("missing ANTHROPIC_API_KEY")])).toEqual({
      request: "a",
      failed: true,
      message: "missing ANTHROPIC_API_KEY",
    });
  });
  it("is not failed while the latest request hasn't run yet", () => {
    expect(lastAttempt([user("a"), end("failed"), user("b")])).toEqual({ request: "b", failed: false });
  });
});
