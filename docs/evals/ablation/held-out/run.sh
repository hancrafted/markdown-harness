#!/usr/bin/env bash
# Layer 1b over one run's output tree. Scoring-time only; never stamped into a run.
#
# Exit 2 is "the instrument could not run", and that includes being called wrong.
# `${1:?...}` exits 1, which would have collided with an ordinary shell failure.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
if [ $# -lt 1 ] || [ -z "${1:-}" ]; then
  echo "usage: run.sh <run-directory>" >&2
  exit 2
fi
exec node "$HERE/check.mjs" "$1"
