#!/usr/bin/env bash

report_run() {
  cat <<EOF

Minted $1

  variant  $2
  model    $3
  spec     $4
  scaffold $5

Open a harness session there and type: start
EOF
}
