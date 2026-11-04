import { describe, expect, it } from "vitest";
import { startedThread, threadStart } from "./started";

const cmd = { command: `exec "$POINT_CLI" threads start --title 'Add badge' --request 'Add a badge' --requestedBy Zack --json` };

describe("startedThread", () => {
  it("finds the thread a threads start call made", () => {
    expect(startedThread(cmd, '{"threadId":"t1","branch":"prek/add-badge","firstMessage":"queued"}')).toBe("t1");
  });

  it("skips output before the JSON reply", () => {
    expect(startedThread(cmd, 'warning: something\n{"threadId":"t2"}')).toBe("t2");
  });

  it("ignores other commands, failures and non-JSON output", () => {
    expect(startedThread({ command: "ls" }, '{"threadId":"t1"}')).toBeUndefined();
    expect(startedThread(cmd, "NO_PROJECT")).toBeUndefined();
    expect(startedThread(cmd, '{"code":"NO_PROJECT"}')).toBeUndefined();
    expect(startedThread(cmd, undefined)).toBeUndefined();
    expect(startedThread({ file_path: "x" }, '{"threadId":"t1"}')).toBeUndefined();
  });

  it("says why a start failed, without Electron's log noise", () => {
    expect(
      threadStart(
        cmd,
        "[10450:1103/194030.479976:ERROR:dbus/bus.cc:406] Failed to connect to the bus\nNO_REPO: attach a repository",
      ),
    ).toEqual({ failed: "NO_REPO: attach a repository" });
    expect(threadStart(cmd, "[1:1103/1.2:ERROR:dbus/bus.cc:406] x")).toEqual({ failed: "the command printed nothing" });
    expect(threadStart(cmd, '{"code":"NO_PROJECT"}')).toEqual({ failed: '{"code":"NO_PROJECT"}' });
  });
});

describe("threadStart for a follow-up", () => {
  const follow = { command: `"$POINT_CLI" threads followUp --threadId 't1' --text 'also a CI badge' --json` };

  it("finds the thread a follow-up went to", () => {
    expect(threadStart(follow, '{"reopened":true,"message":"queued"}')).toEqual({ followedUp: "t1" });
  });

  it("says why a follow-up failed", () => {
    expect(threadStart(follow, "could not send the follow-up: NOT_A_THREAD")).toEqual({ failed: "NOT_A_THREAD" });
  });
});
