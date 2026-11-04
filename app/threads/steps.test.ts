import type { Message } from "point/agent";
import { describe, expect, it } from "vitest";
import { describeTool, groupTranscript, oneLine, summarize } from "./steps";

const tool = (id: string, name: string, input: unknown, done = true, output?: unknown): Message => ({
  id,
  role: "tool",
  text: "",
  name,
  input,
  done,
  ...(output !== undefined ? { output } : {}),
});
const say = (id: string, role: "user" | "assistant", text: string): Message => ({ id, role, text, done: true });

describe("describeTool", () => {
  it.each([
    ["Bash", { command: "bun run test\nsecond line" }, { kind: "command", target: "bun run test" }],
    ["shell", { command: ["git", "status"] }, { kind: "command", target: "git status" }],
    ["Edit", { file_path: "/w/1/src/a.ts" }, { kind: "edit", target: "src/a.ts" }],
    ["Write", { file_path: "/elsewhere/b.ts" }, { kind: "edit", target: "/elsewhere/b.ts" }],
    ["apply_patch", { command: "*** Begin Patch\n*** Update File: src/c.ts\n" }, { kind: "edit", target: "src/c.ts" }],
    ["Read", { file_path: "/w/1/README.md" }, { kind: "read", target: "README.md" }],
    ["Grep", { pattern: "TODO" }, { kind: "search", target: "TODO" }],
    ["WebFetch", { url: "https://example.com" }, { kind: "web", target: "https://example.com" }],
    ["mcp__point__run_tests", {}, { kind: "tool", target: "run_tests" }],
    ["Mystery", 42, { kind: "tool", target: "Mystery" }],
    ["Task", { description: "Find the config" }, { kind: "tool", target: "Task · Find the config" }],
  ])("%s", (name, input, want) => {
    expect(describeTool(name, input, "/w/1")).toEqual(want);
  });

  it("cuts a long line", () => {
    expect(oneLine("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
  });
});

describe("groupTranscript", () => {
  it("folds each run of tool calls into one group between messages, live while one runs", () => {
    const items = groupTranscript(
      [
        say("u", "user", "Add a badge"),
        tool("a", "Read", { file_path: "/w/1/README.md" }, true, "# repo"),
        tool("b", "Edit", { file_path: "/w/1/README.md" }, true, { ok: true }),
        say("t", "assistant", "Now committing."),
        tool("c", "Bash", { command: "git commit" }, false),
      ],
      new Set(["b"]),
      "/w/1",
    );
    expect(items.map((i) => (i.item === "message" ? i.message.id : i.steps.map((s) => s.id).join("+")))).toEqual([
      "u",
      "a+b",
      "t",
      "c",
    ]);
    const [, first, , second] = items;
    expect(first).toMatchObject({ item: "steps", running: false });
    expect(first?.item === "steps" && first.steps).toEqual([
      { id: "a", kind: "read", verb: "Read", target: "README.md", output: "# repo", running: false, failed: false },
      { id: "b", kind: "edit", verb: "Edited", target: "README.md", output: '{\n  "ok": true\n}', running: false, failed: true },
    ]);
    expect(second).toMatchObject({ item: "steps", running: true, steps: [{ verb: "Running", target: "git commit" }] });
  });
});

describe("summarize", () => {
  it("counts by kind, each edited file once, and the failures", () => {
    const steps = groupTranscript(
      [
        tool("a", "Bash", { command: "ls" }),
        tool("b", "Edit", { file_path: "a.ts" }),
        tool("c", "Edit", { file_path: "a.ts" }),
        tool("d", "Write", { file_path: "b.ts" }),
        tool("e", "Bash", { command: "bun run test" }),
      ],
      new Set(["e"]),
    ).flatMap((i) => (i.item === "steps" ? i.steps : []));
    expect(summarize(steps)).toBe("Ran 2 commands, edited 2 files · 1 failed");
    expect(summarize(steps.slice(1, 2))).toBe("Edited 1 file");
  });
});
