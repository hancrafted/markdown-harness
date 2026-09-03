#!/usr/bin/env bash
# Operator-side telemetry. Run once the session is closed.
#
# Claude Code persists per-message usage in its own transcript, so its figures are
# recoverable after the fact and nothing has to be captured live. Antigravity does
# not: its SQLite store keeps step text, step_count and timestamps, but no token
# count anywhere on disk. That was verified rather than assumed -- a live session
# was run, then every blob column was searched for both the usage field names and
# the literal token numbers that session reported. Zero hits. An interactive
# Antigravity run therefore reports the floor and nothing more, which is the
# accepted cost of keeping those cells interactive.
set -euo pipefail

RUN_DIR=$(cd "${1:?usage: collect-metrics.sh <run-directory>}" && pwd)
RUN_ID=$(basename "$RUN_DIR")
SIDECAR="$(dirname "$RUN_DIR")/$RUN_ID.provenance"
[ -f "$SIDECAR" ] || { echo "collect-metrics: no sidecar at $SIDECAR" >&2; exit 2; }

echo "## Telemetry (collected after the session)"
echo
sed 's/^/    /' "$SIDECAR"
echo

PROJECT_SLUG=$(printf '%s' "$RUN_DIR" | tr '/.' '--')
TRANSCRIPTS="$HOME/.claude/projects/$PROJECT_SLUG"

# The floor below is the reading that always survives, so the transcript parse must
# never be able to take it down. Under `set -e` an unhandled exception here would
# abort before the floor printed, leaving a bare traceback where the operator
# expects the section this script's header promises is always recoverable.
if [ -d "$TRANSCRIPTS" ]; then
  if ! python3 - "$TRANSCRIPTS" <<'PY'
import json, pathlib, sys

tot = {"input_tokens": 0, "output_tokens": 0,
       "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "thinking": 0}
msgs = 0
stamps = []
tools = {}
for f in sorted(pathlib.Path(sys.argv[1]).glob("*.jsonl")):
    for line in f.open():
        try:
            o = json.loads(line)
        except ValueError:
            continue
        if o.get("timestamp"):
            stamps.append(o["timestamp"])
        m = o.get("message")
        if not isinstance(m, dict):
            continue
        c = m.get("content")
        if isinstance(c, list):
            for b in c:
                # One malformed content item must not end the parse.
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    n = b.get("name", "?")
                    tools[n] = tools.get(n, 0) + 1
        u = m.get("usage")
        if not isinstance(u, dict):
            continue
        msgs += 1
        for k in list(tot)[:4]:
            v = u.get(k, 0)
            tot[k] += v if isinstance(v, int) else 0
        d = u.get("output_tokens_details")
        tot["thinking"] += d.get("thinking_tokens", 0) if isinstance(d, dict) else 0

print("### Tokens\n")
print("| metric | value |")
print("| --- | --- |")
for label, key in (("input tokens", "input_tokens"), ("output tokens", "output_tokens"),
                   ("thinking tokens", "thinking"),
                   ("cache write tokens", "cache_creation_input_tokens"),
                   ("cache read tokens", "cache_read_input_tokens")):
    print(f"| {label} | {tot[key]:,} |")
print(f"| assistant messages | {msgs:,} |")
if stamps:
    print(f"\nFirst message {min(stamps)}, last {max(stamps)}.")
if tools:
    print("\n### Tool calls\n")
    print("| tool | calls |")
    print("| --- | --- |")
    for k in sorted(tools, key=lambda k: -tools[k]):
        print(f"| {k} | {tools[k]} |")
PY
  then
    echo "collect-metrics: the transcript could not be parsed, so token figures are"  >&2
    echo "unavailable for this run. The floor below is unaffected."                   >&2
    printf '### Tokens\n\nTranscript present but unreadable; see stderr.\n'
  fi
else
  cat <<'TXT'
### Tokens

No Claude Code transcript for this run directory. If it was run under Antigravity,
token and cost figures do not exist anywhere on disk and cannot be recovered; the
floor below is the complete reading. Turns and duration are recoverable from
`~/.gemini/antigravity-cli/conversation_summaries.db` (`step_count`,
`last_modified_time`) should they be needed.
TXT
fi

echo
echo "### Floor (recomputed from the run tree)"
echo
( cd "$RUN_DIR" && sh metrics.sh ) | sed -n '/^### Churn/,$p'
