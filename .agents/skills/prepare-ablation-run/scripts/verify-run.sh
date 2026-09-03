#!/usr/bin/env bash
# Post-conditions on a minted run. Every check here is one whose failure is silent.
set -uo pipefail

RUN_DIR="${1:?usage: verify-run.sh <run-directory>}"
cd "$RUN_DIR"
fails=0
ok()   { echo "  ok   $*"; }
bad()  { echo "  FAIL $*"; fails=$((fails + 1)); }

VARIANT=$(sed -n 's/^variant: //p' PROVENANCE)
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

grep -qiE 'ablation|\bADR\b|archgate|governance|variant' AGENTS.md \
  && bad "AGENTS.md names something the run must not know" || ok "AGENTS.md sweep clean"

if [ "$VARIANT" != "bare" ]; then
  # Not a dependency count: src/ is empty at mint time by design, so cruising zero
  # here is correct and proves nothing either way. What is checkable now is the
  # flag whose absence makes the tool silently cruise an empty graph forever --
  # every `import type` is erased without it, and the checkmark still prints green.
  # The non-zero-dependency assertion belongs to scoring, over the output tree.
  grep -q 'tsPreCompilationDeps: true' .dependency-cruiser.cjs \
    && ok "tsPreCompilationDeps is set, so type-only edges stay visible" \
    || bad "tsPreCompilationDeps is not set; the boundary check would cruise an empty graph"

  for f in eslint.config.mjs .dependency-cruiser.cjs; do
    n=$(grep -ciE 'ADR|archgate|ablation|needs-triage' "$f" || true)
    [ "$n" -eq 0 ] && ok "$f names no record" || bad "$f leaks record vocabulary on $n line(s)"
  done
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

echo
[ "$fails" -eq 0 ] && echo "verify-run: all checks passed" || echo "verify-run: $fails check(s) failed"
exit "$fails"
