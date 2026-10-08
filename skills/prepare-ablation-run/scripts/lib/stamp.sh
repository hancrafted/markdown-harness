#!/usr/bin/env bash
# Write the run's own identity and instructions.

stamp_run() {
  local run_dir=$1 skill_dir=$2 src_repo=$3 spec_rel=$4
  cp "$src_repo/$spec_rel" "$run_dir/SPEC.md"
  cp "$skill_dir/assets/AGENTS.md" "$run_dir/AGENTS.md"
  ( cd "$run_dir" && ln -sfn AGENTS.md CLAUDE.md )
}

# The scaffold the run started from, as a content hash. This is the cohort key, and
# it exists because source_sha cannot be one: it names a commit, and a commit can be
# amended out of existence. One run already carries a source_sha that reads
# `fatal: bad object`, which leaves its treatment unidentifiable -- and the checks
# and governed layers are *derived from the source repo at mint time*
# (lib/layers.sh), so the commit was the only record of what they held.
#
# Runs are comparable only within one scaffold_sha. That is not a formality: two
# governed runs minted eight hours apart on 2026-09-03 differ by 74 insertions and
# 188 deletions across four records, because record edits landed between them. Both
# reported a clean mint. Nothing in either tree said they were different treatments.
#
# Excluded from the hash, deliberately: node_modules and package-lock.json (npm
# resolves transitive versions per install, and lock churn would fragment cohorts
# over something no arm reads), PROVENANCE (it carries this hash), and .git.
scaffold_hash() {
  local run_dir=$1
  ( cd "$run_dir" && find . \
      -path ./.git -prune -o \
      -path ./node_modules -prune -o \
      -name PROVENANCE -prune -o \
      -name package-lock.json -prune -o \
      -print \
    | LC_ALL=C sort | while IFS= read -r p; do
        # A symlink contributes its target, never its target's content. That is the
        # difference rsync -aL erases, and the difference GEN-002 is about.
        if [ -L "$p" ]; then printf 'l %s %s\n' "$p" "$(readlink "$p")"
        elif [ -f "$p" ]; then printf 'f %s %s\n' "$p" "$(shasum -a 256 <"$p" | cut -d' ' -f1)"
        elif [ -d "$p" ]; then printf 'd %s\n' "$p"
        fi
      done | shasum -a 256 | cut -d' ' -f1 )
}

# Everything the operator holds, and no run may see, lives in one directory beside
# the runs -- never inside a run, and no longer loose at the runs root. The
# sidecars used to sit as siblings of the run directories, which buried the runs
# among their own metadata and put a file named after the study next to every one.
sidecar_path() { printf '%s/_operator/provenance/%s.provenance' "$1" "$2"; }
observe_dir()  { printf '%s/_operator' "$1"; }

# The measurement channel, regenerated on every mint into the operator directory.
# Deliberately not an asset and not pinned: an instrument that splits cohorts when
# it changes would make measuring the study a treatment applied to it. Absolute
# paths, so it is a per-machine artifact and never committed.
write_observe_settings() {
  local runs_root=$1 skill_dir=$2 dir
  dir=$(observe_dir "$runs_root")
  mkdir -p "$dir"
  cat > "$dir/observe.settings.json" <<EOF
{
  "hooks": {
    "InstructionsLoaded": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$skill_dir/scripts/lib/observe-hook.sh '$dir'"
          }
        ]
      }
    ]
  }
}
EOF
}

write_provenance() {
  local run_dir=$1 run_id=$2 variant=$3 model=$4 harness=$5
  local spec_path=$6 spec_sha=$7 source_sha=$8 kit_sha=$9 scaffold_sha=${10}
  local cohort_sha=${11} runs_root=${12}
  local started
  started=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Two files because two audiences, not because anything is hidden. The variant is
  # in the run id by decision, and the run id is written below -- so withholding a
  # `variant:` line buys no blinding and nobody should read it as buying any. What
  # the split does buy is one field: spec_path names `docs/evals/ablation/...`, and
  # that is the study, not the run. Keeping the files separate keeps that path out
  # of the tree the agent works in. verify-run.sh enforces the split.
  cat > "$run_dir/PROVENANCE" <<EOF
run_id: $run_id
model: $model
harness: $harness
spec_sha: $spec_sha
source_sha: $source_sha
kit_sha: $kit_sha
scaffold_sha: $scaffold_sha
cohort_sha: $cohort_sha
started: $started
EOF

  # Sidecar: the operator's full record, outside the run tree entirely.
  local sidecar
  sidecar=$(sidecar_path "$runs_root" "$run_id")
  mkdir -p "$(dirname "$sidecar")"
  cat > "$sidecar" <<EOF
run_id: $run_id
variant: $variant
model: $model
harness: $harness
spec_path: $spec_path
spec_sha: $spec_sha
source_sha: $source_sha
kit_sha: $kit_sha
scaffold_sha: $scaffold_sha
cohort_sha: $cohort_sha
started: $started
EOF
}
