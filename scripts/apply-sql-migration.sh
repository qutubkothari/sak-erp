#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <env-file> <migration-file>" >&2
  exit 2
fi

env_file=$1
migration_file=$2

if [[ ! -f "$env_file" || ! -f "$migration_file" ]]; then
  echo "Environment or migration file not found." >&2
  exit 2
fi

database_url=$(awk '/^DATABASE_URL=/{sub(/^DATABASE_URL=/, ""); gsub(/\r/, ""); print; exit}' "$env_file")
if [[ -z "$database_url" ]]; then
  echo "DATABASE_URL is not configured." >&2
  exit 2
fi

psql "$database_url" -v ON_ERROR_STOP=1 -f "$migration_file"
unset database_url
