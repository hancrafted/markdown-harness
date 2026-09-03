#!/usr/bin/env bash
# Post-conditions on a minted run. Every check here is one whose failure is silent.
set -uo pipefail

RUN_DIR=$(cd "${1:?usage: verify-run.sh <run-directory>}" && pwd)
RUN_ID=$(basename "$RUN_DIR")
SIDECAR="$(dirname "$RUN_DIR")/$RUN_ID.provenance"
cd "$RUN_DIR"
fails=0
ok()   { echo "  ok   $*"; }
bad()  { echo "  FAIL $*"; fails=$((fails + 1)); }

[ -f "$SIDECAR" ] || { echo "verify-run: no sidecar at $SIDECAR" >&2; exit 2; }
VARIANT=$(sed -n 's/^variant: //p' "$SIDECAR")
grep -q '^variant:' PROVENANCE \
  && { echo "  FAIL in-run PROVENANCE still names the variant"; exit 1; } || true
echo "verify-run: $RUN_DIR (variant: $VARIANT)"

[ -L CLAUDE.md ] && ok "CLAUDE.md is a symlink to AGENTS.md" || bad "CLAUDE.md is not a symlink"

# rsync -aL flattens links into copies silently, and archgate resolves symlinks, so
# a copy and a pointer are indistinguishable to any rule. Only test -L tells them apart.
if [ "$VARIANT" = "governed" ]; then
  n=$(find .claude/rules -type l 2>/dev/null | wc -l | tr -d ' ')
  r=$(find .claude/rules -type f 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" -gt 0 ] && [ "$r" -eq 0 ] && ok "$n record links, none flattened to copies" \
    || bad "record links: $n symlinks, $r copies (copies mean rsync -aL flattened them)"
  # The siblings must exist, or GEN-001 opens the gate on violations the run did
  # not cause; and they must not be collected, or this variant starts on a green
  # baseline the others lack. Both halves, or the gate stops being comparable.
  find . -name '*.rules.test.ts' -not -path './node_modules/*' | grep -q . \
    && ok "rules tests ship, so the sibling record is satisfiable" \
    || bad "no .rules.test.ts; GEN-001 will fire on violations the run cannot fix"
  c=$(npx vitest list --filesOnly 2>/dev/null | grep -c '\.archgate' || true)
  [ "${c:-0}" -eq 0 ] && ok "no rules test is collected by the suite" \
    || bad "$c rules test(s) collected; this variant would boot on a green baseline"
fi

n=$(find .claude/skills -type l 2>/dev/null | wc -l | tr -d ' ')
[ "$n" -gt 0 ] && ok "$n skill links on the .claude surface" || bad "no .claude/skills symlinks"

# A link out of the run directory would reach back into the source repo, which is
# what makes a run a snapshot rather than a view.
escapes=0
# Canonicalise the root too. On macOS /tmp is itself a symlink to /private/tmp, so
# comparing a resolved target against an unresolved $PWD calls every link an escape.
ROOT=$(realpath "$PWD")
while IFS= read -r l; do
  # Read the link before changing directory. $l is relative to the run root, so
  # once cd has moved, it names nothing and readlink returns empty -- which then
  # resolves to empty and reads as an escape.
  target=$(readlink "$l")
  resolved=$(cd "$(dirname "$l")" && realpath "$target" 2>/dev/null)
  case "$resolved" in
    "$ROOT"/*) ;;
    *) echo "     escapes: $l -> ${resolved:-<unresolvable>}"; escapes=$((escapes + 1)) ;;
  esac
done < <(find . -type l -not -path './node_modules/*')
[ "$escapes" -eq 0 ] && ok "no symlink resolves outside the run" || bad "$escapes symlinks escape"

# A sweep scoped to one file is not a sweep: PROVENANCE failed this exact pattern
# on three lines while the AGENTS.md-only version reported CLEAN. The skips below
# are the task's own domain vocabulary -- the spec, its fixtures and its suite say
# "governed" because that is what the tool being built calls a governed file --
# plus, for the governed variant only, the record layer it is supposed to have.
# Two patterns, because they are not the same secret. A governed run is *supposed*
# to hold records, so naming them is no leak there; but no run of any variant may
# learn that it is one of several, or that anything is being compared. STUDY is
# swept everywhere, always. This caught a comment in governed's own vitest config
# that explained the experiment to its subject.
# Three surfaces, three patterns.
#
# STUDY sweeps everything this skill authors or edits -- layer configs, AGENTS.md,
# metrics.sh, PROVENANCE, the vendored skills. Nothing there may hint that the run
# is one of several or that anything is being compared. This is the tier that
# caught a comment in governed's own vitest config explaining the experiment to
# its subject, which the earlier AGENTS.md-only sweep could never have reached.
#
# RECORDS is added for bare and checks-only, which must not meet the vocabulary of
# a record layer they do not have. A governed run holds records by design.
#
# COPIED is for material lifted verbatim from the source repository: the spec, its
# fixtures, its suite, the record layer itself. It legitimately says "governed"
# (the tool being built classifies files that way) and "variants" (ordinary
# English in a lint message), so only the study's own name is a leak there.
STUDY='ablation|checks-only|\btreatment\b|\bvariants?\b'
RECORDS='\bADR\b|archgate|governance'
COPIED='ablation'
leaks=0
while IFS= read -r f; do
  case "$f" in
    ./SPEC.md|./fixtures/*|./tests/*|./.archgate/*|./.claude/rules/*|./package-lock.json)
      pattern="$COPIED" ;;
    *)
      pattern="$STUDY"
      [ "$VARIANT" != "governed" ] && pattern="$STUDY|$RECORDS" ;;
  esac
  grep -qiE "$pattern" "$f" 2>/dev/null && { echo "     leaks: $f"; leaks=$((leaks + 1)); }
done < <(find . -type f -not -path './node_modules/*' -not -path './.git/*')
[ "$leaks" -eq 0 ] && ok "tree sweep clean ($VARIANT)" \
  || bad "$leaks file(s) name what the run must not know"

if [ "$VARIANT" != "bare" ]; then
  # Not a dependency count: src/ is empty at mint time by design, so cruising zero
  # here is correct and proves nothing either way. What is checkable now is the
  # flag whose absence makes the tool silently cruise an empty graph forever --
  # every `import type` is erased without it, and the checkmark still prints green.
  # The non-zero-dependency assertion belongs to scoring, over the output tree.
  grep -q 'tsPreCompilationDeps: true' .dependency-cruiser.cjs \
    && ok "tsPreCompilationDeps is set, so type-only edges stay visible" \
    || bad "tsPreCompilationDeps is not set; the boundary check would cruise an empty graph"

  # Only meaningful where the records are absent. A governed run's config names
  # .archgate because a governed run has one; asserting otherwise would force the
  # ignore back out and reopen the 38-error forced violation it exists to close.
  if [ "$VARIANT" != "governed" ]; then
    for f in eslint.config.mjs .dependency-cruiser.cjs; do
      n=$(grep -ciE 'ADR|archgate|ablation|needs-triage' "$f" || true)
      [ "$n" -eq 0 ] && ok "$f names no record" || bad "$f leaks record vocabulary on $n line(s)"
    done
  fi
fi

if [ "$VARIANT" = "governed" ]; then
  # Not a check count either. Nothing has changed since the scaffold commit, so
  # archgate correctly scopes to zero; a non-zero total here would mean the mint
  # itself was dirty. What matters now is that the records are reachable and that
  # the base is not the origin/main this repo has never had.
  n=$(npx archgate adr list 2>/dev/null | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)
  [ "${n:-0}" -gt 0 ] && ok "archgate reaches $n records" || bad "archgate reaches no records"

  b=$(python3 -c 'import json;print(json.load(open(".archgate/config.json"))["baseBranch"])' 2>/dev/null || echo "")
  [ "$b" = "scaffold" ] && ok "baseBranch is the scaffold ref" \
    || bad "baseBranch is '$b'; it must name a ref this run actually has"
  git rev-parse --verify scaffold >/dev/null 2>&1 \
    && ok "the scaffold ref exists" || bad "no scaffold ref, so the base resolves to nothing"
fi

# This script used to certify a mint whose own gate it never ran: a checks-only
# mint reported "all checks passed" while `npm run verify` was red on two files.
# Every gate the run is judged by runs here except the acceptance suite, which is
# red by design until the run builds the thing.
gate() {
  local name=$1; shift
  if "$@" >/dev/null 2>&1; then ok "gate $name opens green"; else bad "gate $name opens red"; fi
}
gate prettier npx prettier --check .
gate tsc npx tsc --noEmit
if [ "$VARIANT" != "bare" ]; then
  gate eslint npx eslint .
  gate boundaries npx depcruise src
  gate knip npx knip
fi
[ "$VARIANT" = "governed" ] && gate archgate npx archgate check

echo
[ "$fails" -eq 0 ] && echo "verify-run: all checks passed" || echo "verify-run: $fails check(s) failed"
exit "$fails"
