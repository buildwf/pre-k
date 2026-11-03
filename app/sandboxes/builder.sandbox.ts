import { defineSandbox } from "point/app";

// Where a pre-k thread's builder runs (#19). Reads and writes stay in the thread's worktree (plus toolchains); the
// network reaches only the model APIs and the npm registry. No GitHub host and no git credentials: pushing the branch
// and opening the pull request happen in main through the GitHub tool (#14), so a prompt-injected agent can't publish.
// Seatbelt confines this on macOS only; on Linux Point runs it unconfined and says so on stderr.
export default defineSandbox({
  provider: "local",
  read: "workspace",
  readAllow: ["/opt/homebrew", "~/.nvm", "~/.local/share/pnpm", "~/Library/pnpm", "~/.local/share/vite-plus"],
  network: { allow: ["*.anthropic.com", "*.openai.com", "*.chatgpt.com", "registry.npmjs.org"] },
});
