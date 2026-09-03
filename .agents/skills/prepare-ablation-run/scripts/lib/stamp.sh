#!/usr/bin/env bash
# Write the run's own identity and instructions.

stamp_run() {
  local run_dir=$1 skill_dir=$2 src_repo=$3 spec_rel=$4
  cp "$src_repo/$spec_rel" "$run_dir/SPEC.md"
  cp "$skill_dir/assets/AGENTS.md" "$run_dir/AGENTS.md"
  cp "$skill_dir/assets/metrics.sh" "$run_dir/metrics.sh"
  chmod +x "$run_dir/metrics.sh"
  ( cd "$run_dir" && ln -sfn AGENTS.md CLAUDE.md )
}

write_provenance() {
  local run_dir=$1 run_id=$2 variant=$3 model=$4 harness=$5
  local spec_path=$6 spec_sha=$7 source_sha=$8 kit_sha=$9 runs_root=${10}
  local started
  started=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # In-run: only what the agent may know. The variant is the single fact the whole
  # contrast rests on it not having, and spec_path names the study by its folder.
  # Both move to the sidecar; metrics.sh reads none of them.
  cat > "$run_dir/PROVENANCE" <<EOF
run_id: $run_id
model: $model
harness: $harness
spec_sha: $spec_sha
source_sha: $source_sha
kit_sha: $kit_sha
started: $started
EOF

  # Sidecar: the operator's full record, outside the run tree entirely.
  cat > "$runs_root/$run_id.provenance" <<EOF
run_id: $run_id
variant: $variant
model: $model
harness: $harness
spec_path: $spec_path
spec_sha: $spec_sha
source_sha: $source_sha
kit_sha: $kit_sha
started: $started
EOF
}
