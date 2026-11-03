#!/bin/sh
# Smoke the running dev app through its CLI (`bun run live`). Start `bun run dev` first.
set -e
cd "$(dirname "$0")/.."
P() { npx point cli "$@"; }
P point inspect --json | head -c 300; echo
P files read --path package.json --json | head -c 120; echo
P host uptime --json
P git status --cwd . --json | head -c 200; echo
