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
  local run_dir=$1
  cat > "$run_dir/PROVENANCE" <<EOF
run_id: $2
variant: $3
model: $4
harness: $5
spec_path: $6
spec_sha: $7
source_sha: $8
kit_sha: $9
started: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
}
