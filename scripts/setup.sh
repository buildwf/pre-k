#!/bin/sh
# One-time setup (`sh scripts/setup.sh`): make sure a built Point checkout sits next to this repo, then install.
# pre-k uses bun. Point isn't on npm; package.json links to ../cloudflare-point, which is its own pnpm repo and is
# built with its committed lockfile.
set -e
cd "$(dirname "$0")/.."
POINT=../cloudflare-point
if [ ! -d "$POINT/.git" ]; then
  git clone https://github.com/buildwf/cloudflare-point.git "$POINT"
fi
(cd "$POINT" && pnpm install --frozen-lockfile && pnpm build)
bun install
bunx install-electron
echo "pre-k is ready: bun run dev (desktop), bunx point smoke (headless), bun run verify (merge gate)"
