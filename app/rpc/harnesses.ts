import { execFile } from "node:child_process";
import { defineRouter, procedure } from "point/app";
import { z } from "zod";

/**
 * Whether a Claude Code thread builder can sign in. Its sandbox can't read the saved `/login` (the macOS keychain), so
 * `claude auth status` saying signed in isn't enough: it needs CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY or Point's
 * keychain item point/anthropic (the gateway). Says which kind is there, never a value.
 */
export async function claudeBuilderCredential(
  env: NodeJS.ProcessEnv = process.env,
  hasKeychainKey: () => Promise<boolean> = pointKeychainKey,
): Promise<"oauth-token" | "api-key" | "none"> {
  if (env.ANTHROPIC_API_KEY || (await hasKeychainKey())) return "api-key";
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return "oauth-token";

  return "none";
}

// Looks the item up without reading it (no -w), so macOS asks nothing.
const pointKeychainKey = () =>
  process.platform !== "darwin"
    ? Promise.resolve(false)
    : new Promise<boolean>((r) =>
        execFile("/usr/bin/security", ["find-generic-password", "-s", "point", "-a", "anthropic"], (e) => r(!e)),
      );

export default defineRouter({
  claudeCredentials: procedure
    .output(z.object({ credential: z.enum(["oauth-token", "api-key", "none"]) }))
    .handler(async () => ({ credential: await claudeBuilderCredential() })),
});
