import { describe, expect, it } from "vitest";
import { toolLine } from "./toolLine";

describe("toolLine", () => {
  it("shows the command or path a common tool was given, not its JSON", () => {
    expect(toolLine("Bash", { command: "git status", description: "Show status" })).toBe("git status");
    expect(toolLine("Read", { file_path: "README.md", limit: 20 })).toBe("README.md");
  });

  it("falls back to the first string field, and keeps to one line", () => {
    expect(toolLine("custom", { count: 2, title: "Add a badge" })).toBe("Add a badge");
    expect(toolLine("Bash", { command: "cd repo\ngit add -A" })).toBe("cd repo …");
    expect(toolLine("custom", { count: 2 })).toBe("");
    expect(toolLine(undefined, "plain")).toBe("plain");
  });
});
