#!/bin/sh
# Get pre-k running in one command, from a fresh clone or an old one:
#
#   sh scripts/start.sh             # bring everything up to date, then open the app
#   sh scripts/start.sh --no-launch # the same, without opening it (cloud sessions, scripts)
#
# 1. pre-k: pulls main when this checkout is on main with no local changes (and restarts on the new script).
# 2. Point: clones it next to this repo if missing (Point isn't on npm; package.json links ../cloudflare-point).
#    A fresh clone starts at point.lock's commit. An existing Point checkout on main with no local changes is pulled when it's older than point.lock's commit;
#    one on another branch or with changes is left alone, with a warning if it's too old.
# 3. Builds Point when its build is older than its checkout.
# 4. Clones sevenyears (the design system) next to this repo if missing, installs pre-k (bun) and Electron.
# 5. Opens the app (bun run dev). Quit with Ctrl-C.
#
# Command output goes to .point/start.log; a failing step prints its end and the fix.
set -e
cd "$(dirname "$0")/.."
launch=1
[ "$1" = "--no-launch" ] && launch=0
total=5
[ "$launch" = 1 ] || total=4
POINT=../cloudflare-point
mkdir -p .point
log=.point/start.log
: >"$log"

if [ -t 1 ]; then
  bold=$(printf '\033[1m') dim=$(printf '\033[2m') red=$(printf '\033[31m') off=$(printf '\033[0m')
else
  bold='' dim='' red='' off=''
fi
step() { printf '%s[%s/%s]%s %s\n' "$bold" "$1" "$total" "$off" "$2"; current="$2"; }
note() { printf '      %s%s%s\n' "$dim" "$1" "$off"; }
warn() { printf '      %swarning:%s %s\n' "$red" "$off" "$1" >&2; }
fail() {
  printf '\n%spre-k: %s failed.%s %s\n' "$red" "$current" "$off" "$1" >&2
  if [ -s "$log" ]; then
    printf '%sLast lines of %s:%s\n' "$dim" "$log" "$off" >&2
    tail -n 20 "$log" >&2
  fi
  exit 1
}
# Run a command with its output in the log; on failure, stop with the fix given.
run() {
  fix=$1
  shift
  printf '\n$ %s\n' "$*" >>"$log"
  "$@" >>"$log" 2>&1 || fail "$fix"
}
need() { command -v "$1" >/dev/null 2>&1 || fail "pre-k needs $1: $2"; }
clean() { [ -z "$(git -C "$1" status --porcelain --untracked-files=no)" ]; }
branch() { git -C "$1" symbolic-ref --short -q HEAD || echo "(detached)"; }
short() { git -C "$1" rev-parse --short HEAD; }

current="Checking tools"
need git "install Xcode's command line tools: xcode-select --install"
need node "install Node.js 22 or newer: https://nodejs.org"
need bun "install it: curl -fsSL https://bun.sh/install | bash (then open a new terminal)"

step 1 "Updating pre-k"
if [ -z "$PREK_START_UPDATED" ] && [ -d .git ]; then
  b=$(branch .)
  if [ "$b" = main ] && clean .; then
    before=$(git rev-parse HEAD)
    run "check the network, or run git pull yourself to see why" git pull --ff-only -q origin main
    if [ "$(git rev-parse HEAD)" != "$before" ]; then
      note "pulled main: $(git rev-parse --short "$before") → $(short .)"
      PREK_START_UPDATED=1 exec sh scripts/start.sh "$@" # the new version of this script carries on
    fi
    note "main is up to date ($(short .))"
  elif [ "$b" != main ]; then
    note "on branch $b, so not pulling main"
  else
    note "local changes, so not pulling main"
  fi
else
  note "at $(short .)"
fi

pinned=$(sed -n 's/.*"point": "\([0-9a-f]*\)".*/\1/p' point.lock | head -1)
step 2 "Getting Point"
if [ ! -d "$POINT/.git" ]; then
  note "cloning into $POINT"
  run "check the network and that you can read github.com/buildwf/cloudflare-point" \
    git clone -q https://github.com/buildwf/cloudflare-point.git "$POINT"
  # Start at the commit point.lock pins, so the app builds against exactly the Point its rules were checked with.
  run "pre-k's point.lock names a Point commit GitHub doesn't have" git -C "$POINT" checkout -q "$pinned"
fi
if ! git -C "$POINT" merge-base --is-ancestor "$pinned" HEAD 2>/dev/null; then
  pb=$(branch "$POINT")
  if [ "$pb" = main ] && clean "$POINT"; then
    run "check the network, or run git pull in $POINT to see why" git -C "$POINT" pull --ff-only -q origin main
    note "pulled Point main"
  elif [ "$pb" = "(detached)" ] && clean "$POINT"; then
    run "check the network, or run git fetch in $POINT to see why" git -C "$POINT" fetch -q origin
    run "pre-k's point.lock names a Point commit GitHub doesn't have" git -C "$POINT" checkout -q "$pinned"
    note "checked out the Point commit pre-k pins"
  else
    warn "$POINT is on $pb at $(short "$POINT"), older than the Point pre-k needs ($(echo "$pinned" | cut -c1-7))."
    warn "pre-k may not build. To fix: commit or stash there, then: git -C $POINT checkout main && git -C $POINT pull"
  fi
fi
note "Point at $(short "$POINT") on $(branch "$POINT")"

step 3 "Building Point"
head=$(git -C "$POINT" rev-parse HEAD)
built=$(cat "$POINT/dist/.pre-k-built" 2>/dev/null || true)
if [ -f "$POINT/dist/cli/index.js" ] && [ "$head" = "$built" ]; then
  note "already built"
else
  note "this takes about a minute"
  if [ -f "$POINT/bun.lock" ]; then
    run "bun install in $POINT failed: see the log (it needs the network)" sh -c "cd '$POINT' && bun install --frozen-lockfile"
    run "Point's own build failed: see the log" sh -c "cd '$POINT' && bun run build"
  else # a Point checkout from before it moved to bun
    need pnpm "this older Point checkout builds with pnpm: corepack enable pnpm"
    run "pnpm install in $POINT failed: see the log (it needs the network)" sh -c "cd '$POINT' && pnpm install --frozen-lockfile"
    run "Point's own build failed: see the log" sh -c "cd '$POINT' && pnpm build"
  fi
  echo "$head" >"$POINT/dist/.pre-k-built"
  note "built"
fi

step 4 "Installing pre-k"
# sevenyears is pre-k's design system (docs/design.md): a private repo next to this one, installed as a file: copy.
if [ ! -d ../sevenyears/.git ]; then
  note "cloning sevenyears into ../sevenyears"
  run "check the network and that you can read github.com/buildwf/sevenyears" \
    git clone -q https://github.com/buildwf/sevenyears.git ../sevenyears
fi
run "bun install failed: see the log (it needs the network)" bun install
run "Electron's download failed: check the network and run sh scripts/start.sh again" bunx install-electron
note "dependencies and Electron ready"

if [ "$launch" = 0 ]; then
  printf '\npre-k is ready: bun run dev (desktop), bunx point smoke (headless), bun run verify (merge gate)\n'
  exit 0
fi

step 5 "Opening pre-k"
note "the window opens in a few seconds; this terminal shows the app's log. Ctrl-C quits."
note "agents need claude on your PATH, signed in (claude, then /login) or with ANTHROPIC_API_KEY set"
exec bun run dev
