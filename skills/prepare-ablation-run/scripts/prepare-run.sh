#!/usr/bin/env bash
# Mint one run repository. The only script here that writes.
set -euo pipefail

SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)
SRC_REPO=$(cd "$SKILL_DIR/../../.." && pwd)
RUNS_ROOT="${RUNS_ROOT:-$HOME/Developer/ablation-runs}"

. "$SKILL_DIR/scripts/lib/layers.sh"
. "$SKILL_DIR/scripts/lib/stamp.sh"
. "$SKILL_DIR/scripts/lib/symlink.sh"
. "$SKILL_DIR/scripts/lib/report.sh"

VARIANT="" MODEL="" SLUG=""
SPEC_REL="docs/evals/ablation/implementation-spec.md" HARNESS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --variant) VARIANT="$2"; shift 2 ;;
    --model)   MODEL="$2";   shift 2 ;;
    --slug)    SLUG="$2";    shift 2 ;;
    --spec)    SPEC_REL="$2"; shift 2 ;;
    --harness) HARNESS="$2"; shift 2 ;;
    *) echo "prepare-run: unknown argument $1" >&2; exit 2 ;;
  esac
done

case "$VARIANT" in
  bare|checks-only|governed) ;;
  *) echo "prepare-run: --variant must be bare, checks-only or governed" >&2; exit 2 ;;
esac
[ -n "$MODEL" ] || { echo "prepare-run: --model is required; it is the last field of the run id" >&2; exit 2; }

# The harness is required, not defaulted. It used to default to "unknown", and all
# eleven runs minted before this change recorded exactly that -- while the entire
# metrics path forks on it: Claude Code's figures come from a transcript, Antigravity
# persists no token count anywhere on disk. An unrecorded harness leaves the operator
# guessing which of those two a missing token table means.
[ -n "$HARNESS" ] || {
  echo "prepare-run: --harness is required; the metrics path forks on it" >&2
  echo "prepare-run: e.g. --harness claude-code, --harness antigravity" >&2
  exit 2; }
case "$HARNESS" in
  *[!a-z0-9-]*|-*|*-|*--*)
    echo "prepare-run: --harness must be lowercase kebab-case: $HARNESS" >&2; exit 2 ;;
esac

# The model is a run-id field, not prose, so it is held to the identifier charset.
# This is not cosmetic. The run id is interpolated into verify-run.sh's sed
# expression, where a `|` ends the s/// command outright and a `.` matches any
# character -- `gemini-3.8-flash` silently strips `gemini-3X8-flash` too. Confining
# the id to [a-z0-9-] leaves no regex metacharacter to interpret, so write the model
# with dashes: gemini-3-8-flash-high, not gemini/3.8-flash-high.
case "$MODEL" in
  *[!a-z0-9-]*|-*|*-|*--*)
    echo "prepare-run: --model must be lowercase kebab-case with no dots or slashes: $MODEL" >&2
    echo "prepare-run: write gemini-3-8-flash-high rather than gemini-3.8-flash-high" >&2
    exit 2 ;;
esac

# The slug names the task the run performs, and it reaches the agent through the
# working directory the harness stamps into context every turn. So it is held to
# the same line the leak sweep draws: a slug may describe the build, never the
# study around it. Two words minimum, because an abbreviation describes nothing.
[ -n "$SLUG" ] || {
  echo "prepare-run: --slug is required; it names the task, e.g. build-initial-cli" >&2; exit 2; }
case "$SLUG" in
  *[!a-z0-9-]*|-*|*-|*--*)
    echo "prepare-run: --slug must be lowercase kebab-case: $SLUG" >&2; exit 2 ;;
esac
case "$SLUG" in
  *-*) ;;
  *) echo "prepare-run: --slug must name the task in words, not one abbreviation: $SLUG" >&2; exit 2 ;;
esac
if printf '%s' "$SLUG" | grep -qiE 'ablation|governed|checks|bare|variant|treatment|\badr\b|archgate'; then
  echo "prepare-run: --slug names the study rather than the task: $SLUG" >&2; exit 2
fi

# Check the status explicitly. `eval "$(preflight)"` hides it: the substitution
# captures stdout, the refusal goes to stderr, and eval on an empty string
# succeeds -- so a refusal printed REFUSED and then minted anyway.
if ! PREFLIGHT=$(bash "$SKILL_DIR/scripts/preflight.sh" --spec "$SPEC_REL"); then
  echo "prepare-run: refused by preflight; nothing was written." >&2
  exit 1
fi
eval "$PREFLIGHT"

# The variant is in the run id by decision: the operator reads the runs root at a
# glance, which neither a codename nor a sidecar-only record delivers. The cost is
# real and accepted -- the harness stamps the working directory into context every
# turn, so a governed run can read the word "governed" about itself. What stays out
# of the name is the study *around* the run: no "ablation", no sibling variant, no
# hint that anything is being compared. The slug is checked above on that same line.
DATE=$(date -u +%Y%m%d)
n=1
while [ -e "$RUNS_ROOT/$DATE-$SLUG-$VARIANT-$n-$MODEL" ]; do n=$((n + 1)); done
RUN_ID="$DATE-$SLUG-$VARIANT-$n-$MODEL"
RUN_DIR="$RUNS_ROOT/$RUN_ID"

# A run that dies half-built must not be left looking like a run.
cleanup() {
  rc=$?
  if [ "$rc" -ne 0 ] && [ -n "${RUN_DIR:-}" ] && [ -d "$RUN_DIR" ]; then
    rm -rf "$RUN_DIR"
    # The sidecar goes with it. Left behind it names a run that is not there, and
    # verify-run.sh keys off the sidecar -- so the next mint of the same id would
    # be verified against its predecessor's record.
    rm -f "$(sidecar_path "$RUNS_ROOT" "$RUN_ID")"
    echo "prepare-run: failed; removed the partial run at $RUN_DIR" >&2
  fi
}
trap cleanup EXIT

mkdir -p "$RUN_DIR"
# Canonicalise before anything cd's. cleanup() re-tests [ -d "$RUN_DIR" ] from
# whatever directory the failure happened in, so a relative RUNS_ROOT would make
# the trap resolve nothing, find nothing, and leave a half-built run in place.
RUN_DIR=$(cd "$RUN_DIR" && pwd)
stack_layers "$RUN_DIR" "$VARIANT" "$SKILL_DIR" "$SRC_REPO"
copy_kit "$RUN_DIR" "$SRC_REPO"
link_skills "$RUN_DIR" "$SKILL_DIR"
stamp_run "$RUN_DIR" "$SKILL_DIR" "$SRC_REPO" "$spec_path"
[ "$VARIANT" = "governed" ] && link_rules "$RUN_DIR"

( cd "$RUN_DIR" && npm install --silent --no-audit --no-fund >/dev/null 2>&1 ) \
  || echo "prepare-run: npm install reported a problem; check $RUN_DIR" >&2

cd "$RUN_DIR"

# strip-governance edits text and never reformats, so the derived configs land
# prettier-dirty. Left alone, every non-bare run opens red on `prettier --check .`
# over two files it never authored. Formatted here with the run's own prettier,
# since the run's gate is the judge that matters.
if [ "$VARIANT" != "bare" ]; then
  npx prettier --write eslint.config.mjs .dependency-cruiser.cjs >/dev/null
fi

git init -q

# archgate ships baseBranch: origin/main, which no fresh run has. Left alone it
# scopes to zero changed files and reports total: 0 -- which reads as a pass and
# is not one. A ref name rather than a sha, so it survives any later rewrite.
if [ -f .archgate/config.json ]; then
  python3 - <<'CFG'
import json, pathlib
p = pathlib.Path(".archgate/config.json")
d = json.loads(p.read_text())
d["baseBranch"] = "scaffold"
p.write_text(json.dumps(d, indent=2) + "\n")
CFG
fi

# Hashed here and nowhere earlier: this is the last point at which anything edits
# the tree, and the hash has to describe the tree the scaffold commit will hold.
# Computed one step sooner it missed the baseBranch rewrite above, and every
# governed mint then failed its own reproduction check in verify-run.sh -- which is
# how that ordering was found.
SCAFFOLD_SHA=$(scaffold_hash "$RUN_DIR")
write_provenance "$RUN_DIR" "$RUN_ID" "$VARIANT" "$MODEL" "$HARNESS" \
  "$spec_path" "$spec_sha" "$source_sha" "$kit_sha" "$SCAFFOLD_SHA" \
  "$cohort_sha" "$RUNS_ROOT"

git add -A
git -c user.name=scaffold -c user.email=scaffold@local commit -qm "scaffold: $RUN_ID"
git branch scaffold
SCAFFOLD=$(git rev-parse HEAD)

write_observe_settings "$RUNS_ROOT" "$SKILL_DIR"

report_run "$RUN_DIR" "$VARIANT" "$MODEL" "$HARNESS" "$spec_sha" "$SCAFFOLD_SHA" \
  "$SCAFFOLD" "$RUNS_ROOT" "$SKILL_DIR" "$cohort_sha"
