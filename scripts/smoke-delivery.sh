#!/bin/sh
# The first journey end to end, headless and keyless (#3): a project linked to a fake GitHub repo, a thread whose
# scripted builder lands its work on main, and the thread's "Landed on main" card. `bun run smoke:delivery`.
set -e
cd "$(dirname "$0")/.."
S=$(mktemp -d "${TMPDIR:-/tmp}/pre-k-delivery-XXXXXX")
trap 'rm -rf "$S"' EXIT
mkdir -p "$S/seed" "$S/remotes" "$S/checkouts"
git -C "$S/seed" init -q -b main
echo "# test repo" > "$S/seed/README.md"
git -C "$S/seed" add README.md
git -C "$S/seed" -c user.name=pre-k -c user.email=pre-k@example.com commit -qm init
git clone -q --bare "$S/seed" "$S/remotes/acme__test-repo.git"
run() { if command -v xvfb-run >/dev/null 2>&1 && [ -z "$DISPLAY" ]; then xvfb-run -a "$@"; else "$@"; fi; }
PREK_HARNESS=scripted PRE_K_GIT_REMOTES="$S/remotes" PRE_K_CHECKOUTS="$S/checkouts" \
  run bunx point smoke --window main --connector github=fixtures/github-delivery.json --steps smoke/delivery-landed.json "$@"
git -C "$S/remotes/acme__test-repo.git" log --oneline -1 main
