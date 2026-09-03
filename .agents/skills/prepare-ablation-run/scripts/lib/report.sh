#!/usr/bin/env bash

report_run() {
  cat <<EOF

Minted $1

  variant  $2
  model    $3
  spec     $4
  scaffold $5

  record   $6/$(basename "$1").provenance
  index    $6/by-variant/$2/

Open a harness session there and type: start
EOF
}
