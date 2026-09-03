#!/usr/bin/env bash
# Refuse to mint unless the source is clean and the acceptance kit is unchanged.
# A drifted kit silently changes the functional gate for every run cut from it,
# and runs cut either side of the drift are then not comparable.
set -euo pipefail

SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)
SRC_REPO=$(cd "$SKILL_DIR/../../.." && pwd)
SPEC_REL="docs/evals/ablation/implementation-spec.md"

while [ $# -gt 0 ]; do
  case "$1" in
    --spec) SPEC_REL="$2"; shift 2 ;;
    *) echo "preflight: unknown argument $1" >&2; exit 2 ;;
  esac
done

cd "$SRC_REPO"
fail() { echo "REFUSED: $*" >&2; exit 1; }

[ -z "$(git status --porcelain)" ] || fail "the source repository has uncommitted changes.
Every run records the commit it was cut from, so a dirty tree makes that record a
fiction. Commit or stash, then mint."

[ -f "$SPEC_REL" ] || fail "no spec at $SPEC_REL"

KIT="docs/evals/ablation/kit"
[ -d "$KIT" ] || fail "no acceptance kit at $KIT"

count=$(find "$KIT" -type f | wc -l | tr -d ' ')
[ "$count" = "34" ] || fail "the kit holds $count files, expected 34."

want=$(cat "$SKILL_DIR/assets/kit.sha256")
got=$(find "$KIT" -type f | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256 | cut -d' ' -f1)
[ "$want" = "$got" ] || fail "the acceptance kit has drifted.
  expected $want
  found    $got
Runs cut before and after this change are not comparable. Either restore the kit,
or re-pin assets/kit.sha256 deliberately and record why."

for assertion in 'governedFiles: 24' 'invalidFiles: 15' 'totalViolations: 22'; do
  grep -rq "$assertion" "$KIT/tests" || fail "the suite no longer asserts '$assertion'."
done

SPEC_SHA=$(git log -1 --format=%H -- "$SPEC_REL")
SOURCE_SHA=$(git rev-parse HEAD)
echo "spec_path=$SPEC_REL"
echo "spec_sha=$SPEC_SHA"
echo "source_sha=$SOURCE_SHA"
echo "kit_sha=$got"
