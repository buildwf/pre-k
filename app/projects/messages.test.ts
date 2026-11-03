import { describe, expect, it } from "vitest";
import { linkFailure, repoFromInput } from "./messages";

describe("repoFromInput", () => {
  it("accepts owner/name, a GitHub URL, or a clone URL", () => {
    expect(repoFromInput(" buildwf/pre-k ")).toBe("buildwf/pre-k");
    expect(repoFromInput("https://github.com/buildwf/pre-k")).toBe("buildwf/pre-k");
    expect(repoFromInput("https://github.com/buildwf/pre-k/pulls")).toBe("buildwf/pre-k");
    expect(repoFromInput("github.com/buildwf/pre-k.git")).toBe("buildwf/pre-k");
  });
});

describe("linkFailure", () => {
  it("says what to do for each failure", () => {
    expect(linkFailure("REPO_NOT_VISIBLE", { repo: "acme/x" }, "acme/x")).toContain("can't see acme/x");
    expect(linkFailure("CONNECTOR_NOT_CONNECTED", { connector: "github" }, "acme/x")).toContain("no GitHub token");
    expect(linkFailure("CLONE_FAILED", { message: "disk full" }, "acme/x")).toContain("disk full");
    expect(linkFailure("GITHUB_FAILED", { status: 401, message: "Bad credentials" }, "acme/x")).toContain("wrong or expired");
    expect(linkFailure("WEIRD", undefined, "acme/x")).toBe("Linking acme/x failed (WEIRD).");
  });
});

import { CONTEXT_LIMIT, contextText } from "./caller";

describe("contextText", () => {
  const project = { name: "Alpha", instructions: "i".repeat(16_000) };

  it("fits Point's limit, keeping the newest notes and saying how many were left out", () => {
    const notes = Array.from({ length: 40 }, (_, k) => ({ text: `${k}:${"n".repeat(1_990)}`, savedBy: "t", at: k }));
    const text = contextText(project, notes);

    expect(text.length).toBeLessThanOrEqual(CONTEXT_LIMIT);
    expect(text).toContain("39:");
    expect(text).not.toContain("\n- 0:");
    expect(text).toMatch(/\(\d+ older notes left out for length/);
  });

  it("keeps everything when it fits", () => {
    const text = contextText({ name: "B", instructions: "" }, [{ text: "one", savedBy: "t", at: 1 }]);

    expect(text).toContain("- one");
    expect(text).not.toContain("left out");
  });
});
