#!/bin/sh
# Build pre-k as an installable app on this machine (`bun run package`): unsigned, local only, never uploaded.
# On a Mac it makes release/mac-*/pre-k.app (and a .dmg) to drag into Applications; on Linux an AppImage.
# Then it runs the packaged app headless once (point smoke --packaged) to prove it starts.
set -e
cd "$(dirname "$0")/.."
# Unsigned on purpose: without this, electron-builder signs with any Developer ID it finds in the login keychain.
export CSC_IDENTITY_AUTO_DISCOVERY=false
bunx point build
app=$(ls -d release/mac*/*.app release/*.AppImage 2>/dev/null | head -1)
[ -n "$app" ] || { echo "package: point build made nothing under release/" >&2; exit 1; }
# Smoke the unpacked Linux binary: an AppImage needs FUSE, which containers usually lack.
run=$app
[ -x release/linux-unpacked/pre-k ] && case "$app" in *.AppImage) run=release/linux-unpacked/pre-k ;; esac
log=.point/package-smoke.log
mkdir -p .point
if ! bunx point smoke --packaged "$run" --no-secrets >"$log" 2>&1; then
  cat "$log"
  echo "package: the packaged app failed its smoke run (log: $log)" >&2
  exit 1
fi
grep -E '^point smoke' "$log"
echo
echo "package: $app"
case "$app" in
  *.app) echo "Drag it into Applications (or: cp -R \"$app\" /Applications/). It's unsigned, so the first time, right-click it and choose Open." ;;
esac
