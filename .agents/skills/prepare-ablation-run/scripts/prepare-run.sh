#!/usr/bin/env bash
# Mint one run repository. The only script here that writes.
set -euo pipefail

SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)
SRC_REPO=$(cd "$SKILL_DIR/../../.." && pwd)
RUNS_ROOT="${RUNS_ROOT:-$HOME/Developer/ablation-runs}"
# The slug reaches the agent through its own working directory, which the harness
# stamps into context every turn. `mh` is the CLI the spec already asks the run to
# build, so it names nothing the run does not already know. `adr-ablation` named
# both the subject under test and the fact that this is a study.
SLUG=mh

. "$SKILL_DIR/scripts/lib/layers.sh"
. "$SKILL_DIR/scripts/lib/stamp.sh"
. "$SKILL_DIR/scripts/lib/symlink.sh"
. "$SKILL_DIR/scripts/lib/report.sh"

VARIANT="" MODEL="" SPEC_REL="docs/evals/ablation/implementation-spec.md" HARNESS="unknown"
while [ $# -gt 0 ]; do
  case "$1" in
    --variant) VARIANT="$2"; shift 2 ;;
    --model)   MODEL="$2";   shift 2 ;;
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

# Check the status explicitly. `eval "$(preflight)"` hides it: the substitution
# captures stdout, the refusal goes to stderr, and eval on an empty string
# succeeds -- so a refusal printed REFUSED and then minted anyway.
if ! PREFLIGHT=$(bash "$SKILL_DIR/scripts/preflight.sh" --spec "$SPEC_REL"); then
  echo "prepare-run: refused by preflight; nothing was written." >&2
  exit 1
fi
eval "$PREFLIGHT"

# Run ids are dated and numbered, never named for the variant: the directory name
# reaches the agent, and the variant is exactly what it must not know. The operator
# reads the variant from the sidecar and from by-variant/, both outside the run.
DATE=$(date -u +%Y%m%d)
n=1
while [ -e "$RUNS_ROOT/$DATE-$SLUG-$n-$MODEL" ]; do n=$((n + 1)); done
RUN_ID="$DATE-$SLUG-$n-$MODEL"
RUN_DIR="$RUNS_ROOT/$RUN_ID"

# A run that dies half-built must not be left looking like a run.
cleanup() {
  rc=$?
  if [ "$rc" -ne 0 ] && [ -n "${RUN_DIR:-}" ] && [ -d "$RUN_DIR" ]; then
    rm -rf "$RUN_DIR"
    echo "prepare-run: failed; removed the partial run at $RUN_DIR" >&2
  fi
}
trap cleanup EXIT

mkdir -p "$RUN_DIR"
stack_layers "$RUN_DIR" "$VARIANT" "$SKILL_DIR" "$SRC_REPO"
copy_kit "$RUN_DIR" "$SRC_REPO"
link_skills "$RUN_DIR" "$SKILL_DIR"
stamp_run "$RUN_DIR" "$SKILL_DIR" "$SRC_REPO" "$spec_path"
[ "$VARIANT" = "governed" ] && link_rules "$RUN_DIR"
write_provenance "$RUN_DIR" "$RUN_ID" "$VARIANT" "$MODEL" "$HARNESS" \
  "$spec_path" "$spec_sha" "$source_sha" "$kit_sha" "$RUNS_ROOT"

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

git add -A
git -c user.name=scaffold -c user.email=scaffold@local commit -qm "scaffold: $RUN_ID"
git branch scaffold
SCAFFOLD=$(git rev-parse HEAD)

# The operator's index. It lives outside every run directory, so it is readable at
# a glance without the variant ever entering an agent's working path.
mkdir -p "$RUNS_ROOT/by-variant/$VARIANT"
ln -sfn "../../$RUN_ID" "$RUNS_ROOT/by-variant/$VARIANT/$DATE-$n-$MODEL"

report_run "$RUN_DIR" "$VARIANT" "$MODEL" "$spec_sha" "$SCAFFOLD" "$RUNS_ROOT"
