import type { AgentModelChoices } from "point/client";
import { builderHarnesses, type BuilderHarness } from "../schemas/harness";

/**
 * What the Coding agent setting says about sign-in: a one- or two-word badge and the sentence beside it. Claude Code's
 * saved /login isn't enough, because a thread's sandbox can't read the keychain: it needs a setup-token or a key
 * (`credential`, from rpc.harnesses.claudeCredentials, never the value).
 */
export function signInState(
  harness: BuilderHarness,
  models: Pick<AgentModelChoices, "state" | "message">,
  credential: "oauth-token" | "api-key" | "none" | undefined,
): { badge: string; tone: "success" | "warning" | "default"; text: string } {
  const { signIn, cli } = builderHarnesses[harness];

  switch (models.state) {
    case "loading":
      return { badge: "Checking", tone: "default", text: "Checking sign-in…" };
    case "unauthenticated":
      return { badge: "Not signed in", tone: "warning", text: signIn };
    case "empty":
      return { badge: "No models", tone: "warning", text: "Signed in, but this account has no models it can run." };
    case "failed":
      return models.message?.includes("does not report its models")
        ? { badge: "Unknown", tone: "default", text: `pre-k can't check this agent's sign-in. If its threads fail to start: ${signIn}` }
        : {
            badge: "Couldn't check",
            tone: "default",
            text: `${models.message ?? "Unknown error"}. Is \`${cli}\` installed and on PATH?`,
          };
    case "ready":
      if (harness !== "claude-code") return { badge: "Ready", tone: "success", text: "Signed in." };
      if (credential === "api-key")
        return { badge: "Ready", tone: "success", text: "Threads use your Anthropic API key, metered by pre-k." };
      if (credential === "oauth-token")
        return { badge: "Ready", tone: "success", text: "Threads use your Claude subscription (setup-token)." };

      return { badge: "Needs a token", tone: "warning", text: `Threads can't use the saved login. ${signIn}` };
  }
}
