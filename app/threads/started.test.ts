import { describe, expect, it } from "vitest";
import { startedThread } from "./started";

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
});
