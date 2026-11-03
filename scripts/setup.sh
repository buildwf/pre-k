#!/bin/sh
# One-time setup (`pnpm run setup` or `sh scripts/setup.sh`): make sure a built Point checkout sits next to this repo,
# then install. Point isn't on npm; package.json links to ../cloudflare-point.
set -e
cd "$(dirname "$0")/.."
POINT=../cloudflare-point
if [ ! -d "$POINT/.git" ]; then
  git clone https://github.com/buildwf/cloudflare-point.git "$POINT"
fi
(cd "$POINT" && pnpm install && pnpm build)
pnpm install
pnpm exec install-electron
echo "pre-k is ready: pnpm dev (desktop), pnpm exec point smoke (headless), pnpm verify (merge gate)"
