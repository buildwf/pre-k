import { expect, test } from "vitest";
import { signInState } from "./signIn";

test("Claude Code is ready only with a token or key the sandbox can use", () => {
  expect(signInState("claude-code", { state: "ready" }, "oauth-token")).toMatchObject({ badge: "Ready", tone: "success" });
  expect(signInState("claude-code", { state: "ready" }, "api-key").text).toMatch(/metered/);
  expect(signInState("claude-code", { state: "ready" }, "none")).toMatchObject({ badge: "Needs a token", tone: "warning" });
});

test("the other states say what to do", () => {
  expect(signInState("codex", { state: "unauthenticated" }, undefined)).toEqual({
    badge: "Not signed in",
    tone: "warning",
    text: "Run `codex login` in a terminal.",
  });
  expect(signInState("codex", { state: "ready" }, undefined).badge).toBe("Ready");
  expect(signInState("codex", { state: "failed", message: "the process ended" }, undefined).text).toMatch(
    /Is `codex` installed/,
  );
  expect(
    signInState("opencode", { state: "failed", message: "opencode does not report its models; set it" }, undefined).badge,
  ).toBe("Unknown");
});
