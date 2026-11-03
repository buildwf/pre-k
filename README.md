# pre-k

A project workspace for directing AI agents: a project holds repos, instructions and memory; you talk to one
coordinator in the project chat, it splits work into threads, each thread runs an agent on the repo, and results
(PRs, files) come back to the project. Modeled on the project features of Claude and Cursor, with its own name and
look. Built on [Cloudflare Point](https://github.com/buildwf/cloudflare-point).

Current state: the Point `chat` template (one window, a coder agent on Claude Code with approvals, cancel, pause and
resume, a git worker, the `agents` daemon). Domain work builds on it from here.

## Project guide

| | |
|---|---|
| Repo | https://github.com/buildwf/pre-k, Work on a branch from `main` and merge straight to `main` once `bun run verify` passes. No PRs (Zack, 2026-11-03: he is the only user). |
| Framework | Point, linked from a sibling checkout: `"point": "link:../cloudflare-point"`. `point.lock` pins the Point commit and its check rules. Bump with `bunx point upgrade`. |
| Package manager | bun (Zack, 2026-11-03). `bun install`, `bun run <script>`, `bunx point <command>`. Use `bun run test`, not `bun test` (that is bun's own runner, not Point's Vitest). Point's checkout keeps its own pnpm. |
| Setup | `sh scripts/setup.sh` (clones and builds Point next to this repo if missing, runs `bun install`, fetches Electron). |
| Run | `bun run dev` opens the desktop app with reload. Needs `claude` on `PATH`, and `ANTHROPIC_API_KEY` or the keychain item `point`/`anthropic` (metered by the gateway), or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` (your Claude subscription, not metered by pre-k). Claude Code's saved `/login` does not work for thread builders: their sandbox can't read the macOS keychain. |
| Headless check | `bunx point smoke --screenshot .point/smoke/shots [steps]`, e.g. `--click "New thread" --wait-text "idle"`. Runs under `xvfb-run` on Linux. |
| Checks | `bun run lint` (`point check` with types), `bun run test`, `bun run verify` (lint, test, build). `bun run verify` passing with current `main` merged in is the merge gate. There is no cloud CI. |
| Release | `point build` then `point release`. Not set up: no update feed, signing or Cloudflare account configured. |
| Execution | Cloud sessions (clone both repos side by side under one folder). Zack's Mac: `~/Projects/pre-k` next to `~/Projects/cloudflare-point`. |
| Authority | Merging to `main`: yes. Deploy and spending: not granted. Dev apps stay closed (Zack, 2026-11-01): verify headless with `point smoke` and screenshots, never launch or focus a window on Zack's machine. |
| Point gaps | File them as issues on `buildwf/cloudflare-point`; don't patch Point from pre-k. |

## Domains

Each has an owner thread in the pre-k project. Keep changes inside your domain's files and coordinate shared ones
(`point.config.ts`, `app/windows/main/`, stores) in your PR description.

- Project setup and context: projects, attached repos and files, instructions and memory every agent sees.
- Coordinator chat: the project chat and the coordinator that answers or starts threads.
- Threads and agent runs: one thread per task with progress, questions, decisions and results.
- Review and delivery: PRs, files and artifacts each thread produced.
- Integrations: GitHub (sign-in, repos, PR summaries), agent harnesses and sandboxes, the Point dependency.

Coding agents: read [AGENTS.md](AGENTS.md) for Point's rules.
