#!/bin/sh
# Run by coding agents' hooks (.claude/settings.json, .codex/hooks.json, .opencode/plugins/point-check.ts), after each
# file edit and, with --stop, when the agent ends its turn. Both regenerate .point/ and cloud/_generated/ as `point dev`
# does on save.
# - After an edit, `point check --hook --no-typecheck` checks Point's rules (fast, no types): it reads the edited files
#   from the hook's JSON on stdin (or from this script's arguments), reports their problems in full and the rest of the
#   app in one line, and stays quiet when the report is the one it gave in the last 30 seconds.
# - At the end of a turn, `point check --stop` checks the whole app with its types, once the agent's edits are done.
# Problems that block go to stderr with exit code 2, which Claude Code and Codex hand back to the model so it fixes them
# before moving on (or, from Stop, before it finishes); problems only elsewhere after an edit go to stdout as the
# hook's additionalContext, which the model reads without being blocked. An unchanged Stop failure also reports
# unverified context at exit 0; that prevents a retry loop without claiming verification succeeded.
cd "$(dirname "$0")/.." || exit 1
if [ "$1" = --stop ]; then
  shift
  set -- --stop "$@"
else
  set -- --hook --no-typecheck "$@"
fi
input=''
[ -t 0 ] || input=$(cat)
err=$(mktemp) || exit 1
out=$(printf '%s' "$input" | bunx point check "$@" 2>"$err")
code=$?
case $code in
  0) [ -n "$out" ] && printf '%s\n' "$out" ;;
  1) cat "$err" >&2; code=2 ;;
  *) printf 'point check could not run (try bun install):\n%s\n' "$out$(cat "$err")" >&2; code=1 ;;
esac
rm -f "$err"
exit $code
