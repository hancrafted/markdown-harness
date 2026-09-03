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
  find . -name '*.rules.test.ts' -not -path './node_modules/*' | grep -q . \
    && bad "a .rules.test.ts shipped; this variant would boot on a green baseline" \
    || ok "no .rules.test.ts present"
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
  # The checkmark prints green over an empty graph. Only the dependency count
  # distinguishes "cruised and found nothing wrong" from "cruised nothing".
  out=$(npx depcruise src 2>&1 | tail -3)
  deps=$(echo "$out" | grep -oE '[0-9]+ dependencies' | grep -oE '^[0-9]+' || echo 0)
  [ "${deps:-0}" -gt 0 ] && ok "boundary check cruised $deps dependencies" \
    || bad "boundary check cruised 0 dependencies; it proved nothing"
fi

if [ "$VARIANT" = "governed" ]; then
  base=$(sed -n 's/^scaffold_commit: //p' PROVENANCE)
  total=$(npx archgate check --base "$base" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])' 2>/dev/null || echo 0)
  [ "${total:-0}" -gt 0 ] && ok "archgate evaluates $total records against the scaffold" \
    || bad "archgate evaluated 0 records; total 0 means nothing was in scope, not that it passed"
fi

echo
[ "$fails" -eq 0 ] && echo "verify-run: all checks passed" || echo "verify-run: $fails check(s) failed"
exit "$fails"
