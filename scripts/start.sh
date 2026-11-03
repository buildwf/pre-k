#!/bin/sh
# Get pre-k running in one command, from a fresh clone or an old one:
#
#   sh scripts/start.sh             # set up whatever is missing, then open the app (bun run dev)
#   sh scripts/start.sh --no-launch # set up only (cloud sessions, CI-style checks)
#
# It clones Point next to this repo if it isn't there (Point isn't on npm; package.json links ../cloudflare-point),
# builds it when its dist/ is missing or older than its checkout, installs pre-k with bun and fetches Electron.
# An existing Point checkout is never switched to another branch or commit.
set -e
cd "$(dirname "$0")/.."
launch=1
[ "$1" = "--no-launch" ] && launch=0

need() { command -v "$1" >/dev/null 2>&1 || { echo "pre-k needs $1: $2" >&2; exit 1; }; }
need git "install Xcode's command line tools (xcode-select --install)"
need node "install Node.js 22 or newer (https://nodejs.org)"
need bun "curl -fsSL https://bun.sh/install | bash"

POINT=../cloudflare-point
if [ ! -d "$POINT/.git" ]; then
  echo "pre-k: cloning Point into $POINT"
  git clone https://github.com/buildwf/cloudflare-point.git "$POINT"
  # A fresh clone starts at the Point commit pre-k was made with (point.lock), so the check rules match.
  pinned=$(sed -n 's/.*"point": "\([0-9a-f]*\)".*/\1/p' point.lock | head -1)
  [ -n "$pinned" ] && git -C "$POINT" checkout -q "$pinned"
fi

pinned=$(sed -n 's/.*"point": "\([0-9a-f]*\)".*/\1/p' point.lock | head -1)
if ! git -C "$POINT" merge-base --is-ancestor "$pinned" HEAD 2>/dev/null; then
  echo "pre-k: note: $POINT is older than the Point pre-k pins ($pinned); pull it if the app misbehaves" >&2
fi
head=$(git -C "$POINT" rev-parse HEAD)
built=$(cat "$POINT/dist/.pre-k-built" 2>/dev/null || true)
if [ ! -f "$POINT/dist/cli/index.js" ] || [ "$head" != "$built" ]; then
  echo "pre-k: building Point at ${head%"${head#???????}"}"
  if [ -f "$POINT/bun.lock" ]; then
    (cd "$POINT" && bun install --frozen-lockfile && bun run build)
  else # a Point checkout from before it moved to bun
    need pnpm "this Point checkout builds with pnpm: corepack enable pnpm, or brew install pnpm"
    (cd "$POINT" && pnpm install --frozen-lockfile && pnpm build)
  fi
  echo "$head" >"$POINT/dist/.pre-k-built"
fi

bun install
bunx install-electron

if [ "$launch" = 1 ]; then
  echo "pre-k: opening the app (Ctrl-C to quit)"
  exec bun run dev
fi
echo "pre-k is ready: bun run dev (desktop), bunx point smoke (headless), bun run verify (merge gate)"
