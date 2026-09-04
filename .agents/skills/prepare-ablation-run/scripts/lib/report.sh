#!/usr/bin/env bash
# The mint hand-over. Most important first: the two commands the operator runs,
# copy-pastable, before any of the provenance they will not act on.

report_run() {
  local run_dir=$1 variant=$2 model=$3 harness=$4 spec_sha=$5 scaffold_sha=$6
  local scaffold=$7 runs_root=$8 skill_dir=$9 cohort_sha=${10}
  local run_id
  run_id=$(basename "$run_dir")
  cat <<EOF

  Minted $run_id

  1. Launch the run. Every flag is protocol, not convenience. --setting-sources
     shuts off the user-level hooks that would otherwise rewrite Read into cat and
     hide the record channel from the transcript. --mcp-config takes an object with
     an mcpServers key: bare '{}' is rejected outright, and one run on record was
     launched without it and reached a live MCP server three siblings never saw.
     --settings adds the InstructionsLoaded hook, which records the records Claude
     Code injects without the agent ever opening one. It lives outside the run
     because an instrument inside the tree tells the run it is measured.

     cd $run_dir
     claude --dangerously-skip-permissions --setting-sources project,local \\
            --strict-mcp-config --mcp-config '{"mcpServers":{}}' \\
            --settings $(observe_dir "$runs_root")/observe.settings.json

     Then type: start

  2. Once the session is closed, collect the telemetry:

     bash $skill_dir/scripts/collect-metrics.sh $run_dir

  ---
  variant   $variant
  model     $model
  harness   $harness
  spec      $spec_sha
  scaffold  $scaffold
  arm hash  $scaffold_sha
  cohort    $cohort_sha
  record    $(sidecar_path "$runs_root" "$run_id")

  The arm hash answers "same treatment?" and differs between arms by
  construction, so never read it as the cohort. The cohort answers "comparable
  at all?" and is shared by every arm of one mint. Check the cohort against the
  siblings you intend to compare this run with before you launch it.
EOF
}
