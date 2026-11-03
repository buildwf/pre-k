import { defineSandbox } from "point/app";

// Where a pre-k thread's builder runs (#19). Reads and writes stay in the thread's worktree (plus toolchains); the
// network reaches only the model APIs and the npm registry. No GitHub host and no git credentials: pushing the branch
// and opening the pull request happen in main through the GitHub tool (#14), so a prompt-injected agent can't publish.
// Seatbelt confines this on macOS only; on Linux Point runs it unconfined and says so on stderr.
// `read: "workspace"` also hides the macOS keychain, so Claude Code's saved /login can't be used here: give the
// daemon an Anthropic key (gateway) or CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token`, which Point passes through.
export default defineSandbox({
  provider: "local",
  read: "workspace",
  // Toolchains under home: bun (pre-k and most repos it works on), nvm, pnpm (Point and pnpm repos), vite-plus. And
  // the person's git config, read-only, so `git commit` works and keeps their name; git can't push from here anyway.
  readAllow: ["~/.gitconfig", "~/.config/git", "/opt/homebrew", "~/.bun", "~/.nvm", "~/.local/share/pnpm", "~/Library/pnpm", "~/.local/share/vite-plus"],
  network: { allow: ["*.anthropic.com", "*.openai.com", "*.chatgpt.com", "registry.npmjs.org"] },
});
