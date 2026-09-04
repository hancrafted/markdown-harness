#!/usr/bin/env bash
# Operator-side telemetry. Run once the session is closed.
#
# Claude Code persists per-message usage and every tool call in its own transcript,
# so its figures are recoverable after the fact and nothing has to be captured live.
# That includes the record channel: which records the run opened, when, and by which
# tool. No logging has to be switched on for any of it. Antigravity persists none of
# it: its SQLite store keeps step text, step_count and timestamps, but no token count
# anywhere on disk. That was verified rather than assumed -- a live session was run,
# then every blob column was searched for both the usage field names and the literal
# token numbers that session reported. Zero hits. An interactive Antigravity run
# therefore reports the floor and nothing more, which is the accepted cost of keeping
# those cells interactive.
#
# Everything here is operator-side and names the study freely. None of it may be
# written back into the run: telling a run that its record reads are being counted
# is the one measurement that would change what it measures.
set -uo pipefail

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
  if ! python3 - "$TRANSCRIPTS" "$RUN_DIR" <<'PY'
import json, pathlib, sys, re, datetime

tot = {"input_tokens": 0, "output_tokens": 0,
       "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "thinking": 0}
msgs = 0
stamps = []
tools = {}
skills = {}
record_reads = []      # (timestamp, record, tool)

def stamp(o):
    """Timestamps arrive as strings, as null, and occasionally as numbers. Anything
    that is not a string is recorded as empty rather than dropped: the access still
    happened, and a missing clock must not remove it from the count."""
    v = o.get("timestamp")
    return v if isinstance(v, str) else ""

for f in sorted(pathlib.Path(sys.argv[1]).glob("*.jsonl")):
    for line in f.open(encoding="utf-8", errors="replace"):
        try:
            o = json.loads(line)
        except ValueError:
            continue
        if not isinstance(o, dict):
            continue
        ts = stamp(o)
        if ts:
            stamps.append(ts)
        m = o.get("message")
        if not isinstance(m, dict):
            continue
        c = m.get("content")
        if isinstance(c, list):
            for b in c:
                # One malformed content item must not end the parse.
                if not isinstance(b, dict) or b.get("type") != "tool_use":
                    continue
                n = b.get("name", "?")
                tools[n] = tools.get(n, 0) + 1
                inp = b.get("input")
                if not isinstance(inp, dict):
                    continue
                if n == "Skill":
                    s = str(inp.get("skill", "?"))
                    skills[s] = skills.get(s, 0) + 1
                elif n == "Read":
                    fp = str(inp.get("file_path", ""))
                    if ".archgate/adrs" in fp or ".claude/rules" in fp:
                        record_reads.append((ts, fp.rsplit("/", 1)[-1], "Read"))
                elif n == "Bash":
                    cmd = str(inp.get("command", ""))
                    # The #17 channel: a record opened through the shell never fires
                    # the context load, so counting Read alone would report zero on a
                    # run that read every record by another route.
                    if re.search(r"\.archgate/adrs|\.claude/rules", cmd):
                        record_reads.append((ts, cmd.strip()[:48], "Bash"))
        u = m.get("usage")
        if not isinstance(u, dict):
            continue
        msgs += 1
        for k in list(tot)[:4]:
            v = u.get(k, 0)
            tot[k] += v if isinstance(v, int) else 0
        d = u.get("output_tokens_details")
        tot["thinking"] += d.get("thinking_tokens", 0) if isinstance(d, dict) else 0

# Buffered, and printed only once the whole parse has succeeded. Printing as we go
# flushed a real "### Tokens" table and then, on a crash further down, the wrapper's
# "unreadable" notice underneath it -- one report with two contradictory headers and
# a half-written table between them, which reads as data rather than as failure.
out = []
def say(s=""):
    out.append(s)

say("### Tokens\n")
say("| metric | value |")
say("| --- | --- |")
for label, key in (("input tokens", "input_tokens"), ("output tokens", "output_tokens"),
                   ("thinking tokens", "thinking"),
                   ("cache write tokens", "cache_creation_input_tokens"),
                   ("cache read tokens", "cache_read_input_tokens")):
    say(f"| {label} | {tot[key]:,} |")
say(f"| assistant messages | {msgs:,} |")
start = min(stamps) if stamps else ""
if stamps:
    say(f"\nFirst message {start}, last {max(stamps)}.")

# The record channel. A governed run that never opens a record is the strongest
# possible result and the easiest one to miss, so it is reported as a number
# rather than left as an empty section.
adrs = pathlib.Path(sys.argv[2]) / ".archgate/adrs"
present = sorted(p.name for p in adrs.glob("*.md")) if adrs.is_dir() else []
say("\n### Record channel\n")
if not present:
    say("No records in this run tree; nothing to reach.")
else:
    opened = {r for _, r, t in record_reads if t == "Read" and r.endswith(".md")}
    say("| metric | value |")
    say("| --- | --- |")
    say(f"| records in the tree | {len(present)} |")
    say(f"| records ever opened | {len(opened)} |")
    say(f"| record accesses total | {len(record_reads)} |")
    say(f"| via Read | {sum(1 for _, _, t in record_reads if t == 'Read')} |")
    say(f"| via Bash | {sum(1 for _, _, t in record_reads if t == 'Bash')} |")
    never = [p for p in present if p not in opened]
    if never:
        say(f"\nNever opened: {', '.join(never)}")
    if record_reads:
        timed = [t for t, _, _ in record_reads if t]
        first = min(timed) if timed else ""
        if first and start:
            # How far into the session the run first reached for a record. A batch of
            # reads in the opening seconds and none afterwards is a different
            # behaviour from reads spread across the build, and this gap is the only
            # field that tells the two apart.
            def _t(s):
                return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
            try:
                say(f"\nFirst access {first}, {int((_t(first) - _t(start)).total_seconds())}s into the session.")
            except (ValueError, TypeError):
                say(f"\nFirst access {first} (session start {start}).")
        # Sort by the timestamp string, defaulting a missing one to empty so an
        # untimed access sorts first rather than raising against a real timestamp.
        say("\n| when | what | tool |")
        say("| --- | --- | --- |")
        for ts, what, tool in sorted(record_reads, key=lambda r: (r[0] or "", r[1]))[:40]:
            say(f"| {ts or '(no timestamp)'} | `{what}` | {tool} |")

if skills:
    say("\n### Skills invoked\n")
    say("| skill | calls |")
    say("| --- | --- |")
    for k in sorted(skills, key=lambda k: -skills[k]):
        say(f"| {k} | {skills[k]} |")
if tools:
    say("\n### Tool calls\n")
    say("| tool | calls |")
    say("| --- | --- |")
    for k in sorted(tools, key=lambda k: -tools[k]):
        say(f"| {k} | {tools[k]} |")

print("\n".join(out))
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

# ARCH-003 routes a pure file's unit test to its same-name sibling and everything
# else through `<pkg>/tests/`, and calls the package suite the default. Which of the
# two a run reached for is the record's most visible mechanical trace, and no
# enforcer checks it -- Decision 4 constrains where a test may import from, never
# how many tests exist. So it is counted here rather than gated anywhere.
echo
echo "### Test placement"
echo
( cd "$RUN_DIR" 2>/dev/null && {
  pure=$(git ls-files 'src/**/*.pure.ts' 2>/dev/null | wc -l | tr -d ' ')
  orphan=0
  # Read rather than iterate an unquoted substitution: a tracked path holding a
  # space would word-split into two names, neither of which exists, and the
  # orphan count would climb for a file that has its sibling.
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    [ -f "${f%.pure.ts}.test.ts" ] || orphan=$((orphan + 1))
  done < <(git ls-files 'src/**/*.pure.ts' 2>/dev/null)
  pkg=$(git ls-files 'src/**/tests/*.test.ts' 2>/dev/null | wc -l | tr -d ' ')
  sib=$(git ls-files 'src/**/*.test.ts' 2>/dev/null | grep -vc '/tests/')
  echo "| metric | value |"
  echo "| --- | --- |"
  echo "| pure files | $pure |"
  echo "| pure files with no same-name sibling test | $orphan |"
  echo "| tests in a package suite | $pkg |"
  echo "| tests as same-name siblings | $sib |"
} ) || echo "Run tree unreadable; skipped."

# The floor. This used to live in a metrics.sh stamped into the run and appended to
# RESULTS.md by the agent as its last act. That path is closed: it told the run it
# was being measured, and it reported a knowingly partial reading -- taken from
# inside the session, it excluded the commits and the report text that came after
# it, so every churn figure it ever printed undercounted its own run. Recomputed
# here instead, from the run tree, after the fact, with nothing to exclude.
echo
echo "### Floor (recomputed from the run tree, after the session)"
echo
cd "$RUN_DIR" || { echo "Run tree unreadable; no floor."; exit 0; }

sidecar_kv() { sed -n "s/^$1: //p" "$SIDECAR" 2>/dev/null | head -1; }
epoch() {
  # BSD date on macOS, GNU date elsewhere. An unparseable stamp yields empty
  # rather than a wrong number.
  date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$1" +%s 2>/dev/null \
    || date -u -d "$1" +%s 2>/dev/null || true
}

BASE=$(git rev-parse --verify scaffold 2>/dev/null \
  || git rev-list --max-parents=0 HEAD 2>/dev/null || true)
HEAD_SHA=$(git rev-parse --verify HEAD 2>/dev/null || true)

echo "#### Duration"
echo
echo "| metric | value |"
echo "| --- | --- |"
started=$(sidecar_kv started)
# The session end is the last commit, not the clock now: this script runs whenever
# the operator gets to it, and "now" would bill every idle hour to the run. The
# run is told to commit its report as its last act precisely so this stamp exists.
ended=$(git --no-pager log -1 --format=%cI 2>/dev/null || true)
start_epoch=$([ -n "$started" ] && epoch "$started" || true)
# %ct rather than parsing %cI: git hands over the epoch already, and BSD date's
# %z wants +0200 where ISO-8601 writes +02:00 -- so every commit made outside UTC
# read as unparseable and the duration printed "unreadable" next to two timestamps
# that were plainly right there.
end_epoch=$(git --no-pager log -1 --format=%ct 2>/dev/null || true)
echo "| started | ${started:-unrecorded} |"
echo "| last commit | ${ended:-none} |"
if [ -n "${start_epoch:-}" ] && [ -n "${end_epoch:-}" ]; then
  elapsed=$((end_epoch - start_epoch))
  printf '| wall-clock seconds | %s |\n' "$elapsed"
  printf '| wall-clock (h:mm:ss) | %d:%02d:%02d |\n' \
    $((elapsed / 3600)) $(((elapsed % 3600) / 60)) $((elapsed % 60))
else
  echo "| wall-clock | unreadable: no start stamp or no commit |"
fi
if [ -n "$BASE" ] && [ "$BASE" = "${HEAD_SHA:-}" ]; then
  echo
  echo "**HEAD is still the scaffold commit: this run produced nothing.** The duration"
  echo "above measures the gap to the mint, not a session."
fi

echo
echo "#### Churn"
echo
echo '```'
if [ -n "$BASE" ] && [ -n "${HEAD_SHA:-}" ]; then
  git --no-pager diff --shortstat "$BASE" HEAD
  echo
  git --no-pager log --oneline "$BASE"..HEAD | wc -l | tr -d ' ' | sed 's/^/commits: /'
  echo
  git --no-pager diff --numstat "$BASE" HEAD
else
  echo "no scaffold ref and no root commit; churn unavailable"
fi
echo '```'

echo
echo "#### Inventory"
echo
echo "Every tracked file the run authored, with its line count."
echo
echo '```'
git ls-files -- src bin lib 2>/dev/null | while IFS= read -r f; do
  [ -f "$f" ] && printf '%6s  %s\n' "$(wc -l < "$f" | tr -d ' ')" "$f"
done
echo '```'

echo
echo "#### Entry point"
echo
echo '```'
node -e 'const p=require("./package.json");console.log(JSON.stringify(p.bin ?? null))' 2>/dev/null \
  || echo "package.json unreadable"
echo '```'
