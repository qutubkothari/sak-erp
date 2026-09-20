#!/usr/bin/env bash
set -Eeuo pipefail

test "${1:-}" != ""
exec scripts/apply-target-migration.sh test "$1"
