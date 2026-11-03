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
