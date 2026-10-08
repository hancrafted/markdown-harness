#!/usr/bin/env bash
# Records which instruction files Claude Code loaded into a run's context.
#
# This is the channel `collect-metrics.sh` cannot see from tool calls alone. A
# record reaches an agent two ways: the agent opens it, which is a Read or a Bash
# command naming the path, or Claude Code injects it because a Read touched a file
# the record's `paths:` glob matches. Only the first leaves a tool call. Measured
# on 20260903-mh-1-fable-5: the metric reported 4 of 10 records opened while 9 had
# in fact arrived, and one of the five it missed landed 37 seconds before the
# "first access" it printed.
#
# The hook is passed to `claude --settings`, never written into a run. A run that
# can read the instrument is a run that has been told it is measured.
set -uo pipefail
DEST=${1:?usage: observe-hook.sh <operator-dir>}

# Never fail the session. A hook that exits non-zero is the harness's problem to
# report, and a measurement fault must not become a run fault: the run would be
# unusable for a reason that has nothing to do with its treatment.
payload=$(cat) || exit 0
run=$(printf '%s' "$payload" \
  | python3 -c 'import json,os,sys
try: print(os.path.basename(json.load(sys.stdin).get("cwd") or "unknown") or "unknown")
except Exception: print("unknown")' 2>/dev/null) || run=unknown
[ -n "$run" ] || run=unknown

mkdir -p "$DEST/instructions-loaded" || exit 0
printf '%s\n' "$payload" >> "$DEST/instructions-loaded/$run.jsonl" || exit 0
exit 0
