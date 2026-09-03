#!/bin/sh
# Session measurement. Deterministic: every number below is read or computed,
# never estimated. Emits markdown on stdout, intended to be appended to RESULTS.md.
set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"

now_epoch=$(date -u +%s)
now_iso=$(date -u +%Y-%m-%dT%H:%M:%SZ)

kv() { sed -n "s/^$1: //p" PROVENANCE 2>/dev/null | head -1; }

started=$(kv started)
base=$(kv scaffold_commit)

echo "## Telemetry"
echo
echo "Read at $now_iso. This is a partial reading: it is taken from inside the session, so it"
echo "excludes everything after this command. Re-run it once the session is closed for the"
echo "complete figures."
echo
echo "### Identity"
echo
echo "| key | value |"
echo "| --- | --- |"
for k in run_id model harness spec_sha source_sha scaffold_commit started; do
  echo "| $k | $(kv "$k") |"
done

echo
echo "### Duration"
echo
if [ -n "${started:-}" ]; then
  start_epoch=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$started" +%s 2>/dev/null \
    || date -u -d "$started" +%s 2>/dev/null || echo "")
fi
if [ -n "${start_epoch:-}" ]; then
  elapsed=$((now_epoch - start_epoch))
  printf '| wall-clock seconds | %s |\n' "$elapsed"
  printf '| wall-clock (h:mm:ss) | %d:%02d:%02d |\n' \
    $((elapsed / 3600)) $(((elapsed % 3600) / 60)) $((elapsed % 60))
else
  echo "| wall-clock seconds | unreadable: no start stamp in PROVENANCE |"
fi

echo
echo "### Churn"
echo
echo '```'
if [ -n "${base:-}" ] && git rev-parse --verify "$base" >/dev/null 2>&1; then
  git --no-pager diff --shortstat "$base" HEAD
  echo
  git --no-pager log --oneline "$base"..HEAD | wc -l | tr -d ' ' | sed 's/^/commits: /'
  echo
  git --no-pager diff --numstat "$base" HEAD
else
  echo "no scaffold commit recorded in PROVENANCE; churn unavailable"
fi
echo '```'

echo
echo "### Inventory"
echo
echo "Every tracked file the run authored, with its line count."
echo
echo '```'
git ls-files -- src bin lib 2>/dev/null | while read -r f; do
  [ -f "$f" ] && printf '%6s  %s\n' "$(wc -l < "$f" | tr -d ' ')" "$f"
done
echo '```'

echo
echo "### Entry point"
echo
echo '```'
node -e 'const p=require("./package.json");console.log(JSON.stringify(p.bin ?? null))' 2>/dev/null \
  || echo "package.json unreadable"
echo '```'

echo
echo "### Harness"
echo
if [ -f .metrics-adapter.sh ]; then
  sh .metrics-adapter.sh
else
  echo "No adapter installed, so token, cache and think-time figures are unavailable for this"
  echo "session. The figures above are the portable floor."
fi
