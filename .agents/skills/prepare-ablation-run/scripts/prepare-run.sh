#!/usr/bin/env bash
# Mint one run repository. The only script here that writes.
set -euo pipefail

SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)
SRC_REPO=$(cd "$SKILL_DIR/../../.." && pwd)
RUNS_ROOT="${RUNS_ROOT:-$HOME/Developer/ablation-runs}"
SLUG=adr-ablation

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

eval "$(bash "$SKILL_DIR/scripts/preflight.sh" --spec "$SPEC_REL")"

# Run ids are dated and numbered, never named for the variant: the directory name
# reaches the agent, and the variant is exactly what it must not know.
DATE=$(date -u +%Y%m%d)
n=1
while [ -e "$RUNS_ROOT/$DATE-$SLUG-$n-$MODEL" ]; do n=$((n + 1)); done
RUN_ID="$DATE-$SLUG-$n-$MODEL"
RUN_DIR="$RUNS_ROOT/$RUN_ID"

mkdir -p "$RUN_DIR"
stack_layers "$RUN_DIR" "$VARIANT" "$SKILL_DIR" "$SRC_REPO"
copy_kit "$RUN_DIR" "$SRC_REPO"
link_skills "$RUN_DIR" "$SKILL_DIR"
stamp_run "$RUN_DIR" "$SKILL_DIR" "$SRC_REPO" "$spec_path"
[ "$VARIANT" = "governed" ] && link_rules "$RUN_DIR"
write_provenance "$RUN_DIR" "$RUN_ID" "$VARIANT" "$MODEL" "$HARNESS" \
  "$spec_path" "$spec_sha" "$source_sha" "$kit_sha"

( cd "$RUN_DIR" && npm install --silent --no-audit --no-fund >/dev/null 2>&1 ) \
  || echo "prepare-run: npm install reported a problem; check $RUN_DIR" >&2

cd "$RUN_DIR"
git init -q
git add -A
git -c user.name=scaffold -c user.email=scaffold@local commit -qm "scaffold: $RUN_ID"
SCAFFOLD=$(git rev-parse HEAD)

# Without this the base is origin/main, which no fresh run has, so archgate scopes
# to zero changed files and reports total: 0 -- which reads as a pass and is not one.
if [ -f .archgate/config.json ]; then
  python3 - "$SCAFFOLD" <<'PY'
import json, sys, pathlib
p = pathlib.Path(".archgate/config.json")
d = json.loads(p.read_text())
d["baseBranch"] = sys.argv[1]
p.write_text(json.dumps(d, indent=2) + "\n")
PY
fi
sed -i '' "s/^scaffold_commit:.*/scaffold_commit: $SCAFFOLD/" PROVENANCE
git add -A
git -c user.name=scaffold -c user.email=scaffold@local commit -q --amend --no-edit
SCAFFOLD=$(git rev-parse HEAD)
sed -i '' "s/^scaffold_commit:.*/scaffold_commit: $SCAFFOLD/" PROVENANCE

report_run "$RUN_DIR" "$VARIANT" "$MODEL" "$spec_sha" "$SCAFFOLD"
