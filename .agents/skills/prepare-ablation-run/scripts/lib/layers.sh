#!/usr/bin/env bash
# Stack the requested variant onto the scaffold, then derive its enforcers.

stack_layers() {
  local run_dir=$1 variant=$2 skill_dir=$3 src_repo=$4
  # -L so nothing in a run points back here. Every run is a snapshot.
  rsync -aL "$skill_dir/assets/layers/bare/" "$run_dir/"
  case "$variant" in
    bare) return 0 ;;
    checks-only|governed) rsync -aL "$skill_dir/assets/layers/checks/" "$run_dir/" ;;
  esac
  # Derived at mint time from the live configs rather than stored, so there is no
  # copy here to fall out of step with the originals.
  python3 "$skill_dir/scripts/lib/strip-governance.py" \
    "$src_repo/eslint.config.mjs" "$run_dir/eslint.config.mjs" eslint "$variant" >/dev/null
  python3 "$skill_dir/scripts/lib/strip-governance.py" \
    "$src_repo/.dependency-cruiser.cjs" "$run_dir/.dependency-cruiser.cjs" depcruise "$variant" >/dev/null
  [ "$variant" = "governed" ] || return 0

  rsync -aL "$skill_dir/assets/layers/governed/" "$run_dir/"
  mkdir -p "$run_dir/.archgate"
  # The .rules.test.ts siblings ship. Withholding them looked right -- vitest's
  # include glob would collect them and boot this variant on a green baseline
  # where bare starts at zero -- but GEN-001 requires every .rules.ts to have one,
  # so withholding them opened the gate on five violations the run did not cause
  # and cannot fix. A forced violation is a fixture defect, not a record binding.
  # They ship, and the governed vitest config excludes them from collection, so
  # the record is satisfied and every variant still counts the same suites.
  rsync -aL "$src_repo/.archgate/" "$run_dir/.archgate/"
}

copy_kit() {
  local run_dir=$1 src_repo=$2
  rsync -aL "$src_repo/docs/evals/ablation/kit/fixtures/" "$run_dir/fixtures/"
  rsync -aL "$src_repo/docs/evals/ablation/kit/tests/" "$run_dir/tests/"
  # The kit is named to stay out of the source repo's test glob; a run repo wants
  # it collected, so the rename happens on the way in.
  find "$run_dir/tests" -name '*.acceptance.ts' | while read -r f; do
    mv "$f" "${f%.acceptance.ts}.test.ts"
  done
}
