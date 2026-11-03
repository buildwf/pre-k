# pre-k

A project workspace for directing AI agents: a project holds repos, instructions and memory; you talk to one
coordinator in the project chat, it splits work into threads, each thread runs an agent on the repo, and results
(PRs, files) come back to the project. Modeled on the project features of Claude and Cursor, with its own name and
look. Built on [Cloudflare Point](https://github.com/buildwf/cloudflare-point).

Try it: `git clone https://github.com/buildwf/pre-k && cd pre-k && sh scripts/start.sh`. That clones and builds Point
next to it if needed, installs, and opens the app. See the [UI tour](docs/ui-tour/README.md) for what each screen looks like.

## Project guide

| | |
|---|---|
| Repo | https://github.com/buildwf/pre-k, Work on a branch from `main` and merge straight to `main` once `bun run verify` passes. No PRs (Zack, 2026-11-03: he is the only user). |
| Framework | Point, linked from a sibling checkout: `"point": "link:../cloudflare-point"`. `point.lock` pins the Point commit and its check rules. Bump with `bunx point upgrade`. |
| Package manager | bun (Zack, 2026-11-03). `bun install`, `bun run <script>`, `bunx point <command>`. Use `bun run test`, not `bun test` (that is bun's own runner, not Point's Vitest). Point builds with bun too (older Point checkouts with pnpm). |
| Start | `sh scripts/start.sh` brings everything up to date and opens the app, in five numbered steps: pulls pre-k main (when on main with no local changes), clones Point next to this repo at the `point.lock` commit if missing or updates a stale clean one (a checkout on another branch only gets a warning), rebuilds Point when needed, `bun install` and Electron, then `bun run dev`. Command output goes to `.point/start.log`, and a failed step prints the fix and the end of the log. `--no-launch` stops before opening. |
| Run | `bun run dev` opens the desktop app with reload. Needs `claude` on `PATH`, and `ANTHROPIC_API_KEY` or the keychain item `point`/`anthropic` (metered by the gateway), or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` (your Claude subscription, not metered by pre-k). Claude Code's saved `/login` does not work for thread builders: their sandbox can't read the macOS keychain. |
| Headless check | `bunx point smoke --screenshot .point/smoke/shots [steps]`, e.g. `--click "New thread" --wait-text "idle"`. Runs under `xvfb-run` on Linux. |
| Checks | `bun run lint` (`point check` with types), `bun run test`, `bun run verify` (lint, test, then `bun run tour`: build and a headless smoke of every screen that refreshes [docs/ui-tour](docs/ui-tour/README.md) when the UI changed). `bun run verify` passing with current `main` merged in is the merge gate. There is no cloud CI. |
| Package (local) | `bun run package` builds an unsigned app on this machine and smokes it headless once: on a Mac `release/mac-arm64/pre-k.app` (and a `.dmg`) to drag into Applications, on Linux an AppImage. Unsigned on purpose (it ignores any Developer ID in the keychain), so the first open is right-click, Open. Nothing is uploaded. The installed app's agents run under launchd, which doesn't see shell variables, so put the model key in the keychain: `security add-generic-password -s point -a anthropic -w 'sk-ant-...'` (or rely on Claude Code's login). |
| Release | Not set up and not granted: no `point release`, update feed, signing or Cloudflare account. |
| Execution | Cloud sessions (clone both repos side by side under one folder). Zack's Mac: `~/Projects/pre-k` next to `~/Projects/cloudflare-point`. |
| Authority | Merging to `main`: yes. Deploy and spending: not granted. Dev apps stay closed (Zack, 2026-11-01): verify headless with `point smoke` and screenshots, never launch or focus a window on Zack's machine. |
| Point gaps | File them as issues on `buildwf/cloudflare-point`; don't patch Point from pre-k. |

## What a thread's builder may do without asking

The sandbox is the guard, not per-call prompts (Zack, 2026-11-03: no ceremony). See `app/sandboxes/builder.sandbox.ts`.

| Action | Policy | Why |
|---|---|---|
| Read, edit, run checks, `git commit`, `bun install` in its worktree | Runs without asking | The sandbox confines writes to the worktree and temp, and the network to the model APIs and npm. If Claude Code's own settings ask for a tool, pre-k shows Allow and Deny in the thread. |
| Anything outside the worktree: other folders, userData, `~/.ssh`, the keychain, GitHub | Impossible, not asked | The sandbox has no path, host or credential for it. |
| Land on `main` (`github landOnMain`) | Runs without asking, the only step that leaves the Mac | Zack chose no PRs. Main rebases and pushes with its token, never forced; a conflict or a newer `main` fails the call instead of overwriting. Undo is a revert on `main`. |
| Opening PRs, force-pushing, deleting branches, deploying, spending beyond the model call | Not available to the builder | No tool exists for it. Adding one means deciding its approval here first. |

Cost: the thread shows what its turns cost. On a `CLAUDE_CODE_OAUTH_TOKEN` that is Claude Code's estimate at API
prices; your subscription is what's actually charged. On the gateway it is the metered cost.

## Domains

Each has an owner thread in the pre-k project. Keep changes inside your domain's files and coordinate shared ones
(`point.config.ts`, `app/windows/main/`, stores) in your PR description.

- Project setup and context: projects, attached repos and files, instructions and memory every agent sees.
- Coordinator chat: the project chat and the coordinator that answers or starts threads.
- Threads and agent runs: one thread per task with progress, questions, decisions and results.
- Review and delivery: PRs, files and artifacts each thread produced.
- Integrations: GitHub (sign-in, repos, PR summaries), agent harnesses and sandboxes, the Point dependency.

Coding agents: read [AGENTS.md](AGENTS.md) for Point's rules.
