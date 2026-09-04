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
# -print0/-0 to match the assets hash below: a kit filename holding whitespace
# would otherwise word-split and hash a path that is not there. Verified
# byte-identical to the previous routine, so the pin does not move.
got=$(find "$KIT" -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 \
  | shasum -a 256 | cut -d' ' -f1)
[ "$want" = "$got" ] || fail "the acceptance kit has drifted.
  expected $want
  found    $got
Runs cut before and after this change are not comparable. Either restore the kit,
or re-pin assets/kit.sha256 deliberately and record why."

for assertion in 'governedFiles: 24' 'invalidFiles: 15' 'totalViolations: 22'; do
  grep -rq "$assertion" "$KIT/tests" || fail "the suite no longer asserts '$assertion'."
done

# The kit is pinned above. Everything *else* the mint stamps into a run is pinned
# here, for the same reason and against a failure already on record: the first
# hand-built attempt shipped a vitest.config.ts that differed between arms, which
# changed the functional gate per arm, and nobody decided that. The layers, the
# in-run AGENTS.md and the three vendored skills are one artifact; an undeclared
# edit to any of them splits every cohort minted either side of it.
ASSETS="$SKILL_DIR/assets"
[ -f "$ASSETS/assets.sha256" ] || fail "no assets pin at $ASSETS/assets.sha256"

# Both pin files are excluded: a pin cannot cover itself. -print0/-0 because a
# bare `xargs shasum` over an empty list reads stdin and hangs rather than failing.
asset_count=$(find "$ASSETS" -type f \
  ! -name assets.sha256 ! -name kit.sha256 | wc -l | tr -d ' ')
[ "${asset_count:-0}" -gt 0 ] || fail "the assets directory holds no files."
got_assets=$( cd "$ASSETS" && find . -type f \
  ! -name assets.sha256 ! -name kit.sha256 -print0 \
  | LC_ALL=C sort -z | xargs -0 shasum -a 256 | shasum -a 256 | cut -d' ' -f1 )
want_assets=$(cat "$ASSETS/assets.sha256")
[ "$want_assets" = "$got_assets" ] || fail "the stamped assets have drifted.
  expected $want_assets
  found    $got_assets
Runs minted before and after this change are not comparable. Either restore the
assets, or re-pin assets/assets.sha256 deliberately and record why."

# The edit register (docs/evals/ablation/scaffold-design.md) removes three passages
# from the vendored skills, and the cuts apply to *all* arms -- an edit present in
# only some arms would itself be a treatment. Two of the three are invisible to the
# per-run leak sweep: it waives record vocabulary for the governed variant, so a
# restored "respect ADRs in the area you're touching" would pass there silently
# while manufacturing the very behaviour the bare arm exists to measure the absence
# of. Named individually rather than left to the pin, because a careless re-pin
# would carry them back in.
for cut in 'respect ADRs' 'codebase-design' 'setup-matt-pocock-skills' 'issue-tracker.md'; do
  if grep -rqi -- "$cut" "$ASSETS/skills"; then
    fail "the vendored skills name '$cut', which the edit register removes from every
arm. See docs/evals/ablation/scaffold-design.md; restore the cut before minting."
  fi
done

SPEC_SHA=$(git log -1 --format=%H -- "$SPEC_REL")
SOURCE_SHA=$(git rev-parse HEAD)
echo "spec_path=$SPEC_REL"
echo "spec_sha=$SPEC_SHA"
echo "source_sha=$SOURCE_SHA"
echo "kit_sha=$got"
