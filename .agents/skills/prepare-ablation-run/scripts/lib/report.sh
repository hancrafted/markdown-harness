#!/usr/bin/env bash
# The mint hand-over. Most important first: the two commands the operator runs,
# copy-pastable, before any of the provenance they will not act on.

report_run() {
  local run_dir=$1 variant=$2 model=$3 spec_sha=$4 scaffold=$5 runs_root=$6 skill_dir=$7
  local run_id
  run_id=$(basename "$run_dir")
  cat <<EOF

  Minted $run_id

  1. Launch the run. The flags are part of the protocol, not convenience:
     --setting-sources shuts off the user-level hooks that would otherwise
     rewrite Read into cat and hide the record channel from the transcript.

     cd $run_dir
     claude --dangerously-skip-permissions --setting-sources project,local \\
            --strict-mcp-config --mcp-config '{}'

     Then type: start

  2. Once the session is closed, collect the telemetry:

     bash $skill_dir/scripts/collect-metrics.sh $run_dir

  ---
  variant   $variant
  model     $model
  spec      $spec_sha
  scaffold  $scaffold
  record    $runs_root/$run_id.provenance
EOF
}
