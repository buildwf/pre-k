import { z } from "zod";

/** Which coding agent a project's threads run. One list the project schema, threads.start and the picker share. */
export const builderHarness = z.enum(["claude-code", "codex", "opencode"]);

export type BuilderHarness = z.infer<typeof builderHarness>;

/** Each harness: the label the picker shows, the app agent a thread starts (app/agents/<agent>), how to sign in. */
export const builderHarnesses: Record<BuilderHarness, { label: string; agent: string; cli: string; signIn: string }> = {
  "claude-code": {
    label: "Claude Code (Anthropic)",
    agent: "builder",
    cli: "claude",
    signIn: "Run `claude setup-token` and give pre-k CLAUDE_CODE_OAUTH_TOKEN, or add an Anthropic API key.",
  },
  codex: { label: "Codex (OpenAI)", agent: "builder-codex", cli: "codex", signIn: "Run `codex login` in a terminal." },
  opencode: { label: "OpenCode", agent: "builder-opencode", cli: "opencode", signIn: "Run `opencode auth login` in a terminal." },
};

/** The app agent a project's threads run; Claude Code when the project hasn't chosen. */
export const builderAgentFor = (h: BuilderHarness | undefined) => builderHarnesses[h ?? "claude-code"].agent;
