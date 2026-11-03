#!/bin/sh
# Headless UI tour (`bun run tour`, and the last step of `bun run verify`): build, run smoke/ui-tour.json on the
# scripted harnesses (no model, no key, nothing spent) and fail like any smoke run when a step or a window fails.
# Windows stay hidden (xvfb-run on Linux).
#
# The screenshots in docs/ui-tour are replaced only when the UI's source changed since they were taken (app/,
# smoke/ui-tour.json, this script), so a verify with no UI change leaves the tree clean. Agent output arrives
# asynchronously, so two runs of the same source can differ by a pixel row; `--force` refreshes them anyway.
set -e
cd "$(dirname "$0")/.."
source=$(git ls-files -co --exclude-standard app smoke/ui-tour.json scripts/tour.sh | sort | xargs cat | git hash-object --stdin)
taken=$(cat docs/ui-tour/.source 2>/dev/null || true)

shots=.point/smoke/tour-$(date +%s)-$$
mkdir -p .point/smoke
PREK_HARNESS=scripted bunx point smoke --no-secrets --screenshot "$shots" --steps smoke/ui-tour.json --timeout 60000 \
  >"$shots.log" 2>&1 || { cat "$shots.log"; exit 1; }
grep -E '^point smoke' "$shots.log"

if [ "$source" = "$taken" ] && [ "$1" != "--force" ]; then
  echo "tour: UI source unchanged, docs/ui-tour kept (bun run tour --force refreshes it)"
  rm -rf "$shots" "$shots.log"
  exit 0
fi

# Which step's screenshot is which page of the tour. Step numbers follow smoke/ui-tour.json: change both together.
copy() { cp "$shots/main$1.png" "docs/ui-tour/$2.png"; }
copy "" 1-new-project
copy -4 2-project-chat
copy -8 3-coordinator-starts-thread
copy -10 4-threads-and-thread-view
copy -12 5-project-settings
echo "$source" >docs/ui-tour/.source
rm -rf "$shots" "$shots.log"
echo "tour: docs/ui-tour refreshed"
