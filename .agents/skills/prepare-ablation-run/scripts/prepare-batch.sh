#!/usr/bin/env bash
# Mint a matrix of runs in one pass. Every write is delegated to prepare-run.sh,
# one cell at a time, so a batch and a hand mint produce identical repositories.
#
# Not `set -e`: a cell that refuses must not abandon the cells behind it without
# saying so. Each failure is caught, recorded, and reported in the closing table.
set -uo pipefail

SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)

SLUG="" MODELS="" VARIANTS="bare,checks-only,governed" REPEAT=1
SPEC_REL="docs/evals/ablation/implementation-spec.md" HARNESS="unknown"
while [ $# -gt 0 ]; do
  case "$1" in
    --slug)     SLUG="$2";     shift 2 ;;
    --models)   MODELS="$2";   shift 2 ;;
    --variants) VARIANTS="$2"; shift 2 ;;
    --repeat)   REPEAT="$2";   shift 2 ;;
    --spec)     SPEC_REL="$2"; shift 2 ;;
    --harness)  HARNESS="$2";  shift 2 ;;
    *) echo "prepare-batch: unknown argument $1" >&2; exit 2 ;;
  esac
done

[ -n "$SLUG" ]     || { echo "prepare-batch: --slug is required" >&2; exit 2; }
[ -n "$MODELS" ]   || { echo "prepare-batch: --models is required, comma separated" >&2; exit 2; }
# An empty list yields an empty array, and on bash 3.2 -- the only bash on macOS --
# expanding one under `set -u` is an unbound-variable error that kills the batch
# mid-flight rather than refusing it up front.
[ -n "$VARIANTS" ] || { echo "prepare-batch: --variants must name at least one variant" >&2; exit 2; }
case "$REPEAT" in
  ''|*[!0-9]*) echo "prepare-batch: --repeat must be a whole number" >&2; exit 2 ;;
esac
[ "$REPEAT" -ge 1 ] || { echo "prepare-batch: --repeat must be at least 1" >&2; exit 2; }

# Splitting on comma alone turns "bare, governed" into a space-prefixed element that
# reaches the run id verbatim, so whitespace is squeezed out before the split.
MODELS=$(printf '%s' "$MODELS" | tr -d '[:space:]')
VARIANTS=$(printf '%s' "$VARIANTS" | tr -d '[:space:]')
IFS=',' read -r -a models <<< "$MODELS"
IFS=',' read -r -a variants <<< "$VARIANTS"

# Refuse the whole matrix on a bad name rather than minting the good cells and
# failing the rest: a partly-minted batch is the state that is hardest to reason
# about later, and every cell here is cheap to re-request.
for v in "${variants[@]}"; do
  case "$v" in
    bare|checks-only|governed) ;;
    *) echo "prepare-batch: unknown variant '$v'" >&2; exit 2 ;;
  esac
done
for m in "${models[@]}"; do
  [ -n "$m" ] || { echo "prepare-batch: --models holds an empty entry" >&2; exit 2; }
done
total=$(( ${#models[@]} * ${#variants[@]} * REPEAT ))
echo "prepare-batch: $total cell(s) -- ${#models[@]} model(s) x ${#variants[@]} variant(s) x $REPEAT"
echo

# Repeat-major. An abort partway then leaves whole balanced blocks behind rather
# than every repeat of one variant and none of another, which is the difference
# between a small study and an unusable one.
minted=() failed=()
for r in $(seq 1 "$REPEAT"); do
  for model in "${models[@]}"; do
    for variant in "${variants[@]}"; do
      echo "--- block $r: $variant / $model"
      if out=$(bash "$SKILL_DIR/scripts/prepare-run.sh" \
                 --variant "$variant" --model "$model" --slug "$SLUG" \
                 --spec "$SPEC_REL" --harness "$HARNESS" 2>&1); then
        id=$(printf '%s\n' "$out" | sed -n 's/^  Minted //p')
        minted+=("$variant/$model  $id")
        echo "    minted $id"
      else
        failed+=("$variant/$model")
        printf '%s\n' "$out" | sed 's/^/    /' >&2
      fi
    done
  done
done

echo
echo "prepare-batch: ${#minted[@]} minted, ${#failed[@]} failed"
for m in ${minted+"${minted[@]}"}; do echo "  ok   $m"; done
for f in ${failed+"${failed[@]}"}; do echo "  FAIL $f"; done

# Verifying every mint here would double the batch's runtime on checks the
# operator may want to read one at a time, so it is named rather than run.
if [ "${#minted[@]}" -gt 0 ]; then
  echo
  echo "Check each mint before launching anything:"
  echo "  for d in \$(ls -d \${RUNS_ROOT:-\$HOME/Developer/ablation-runs}/*-$SLUG-*); do"
  echo "    bash $SKILL_DIR/scripts/verify-run.sh \"\$d\"; done"
fi

[ "${#failed[@]}" -eq 0 ]
