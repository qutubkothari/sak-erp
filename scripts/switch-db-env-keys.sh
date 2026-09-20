#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: $0 <app-root> <source-env> <target-env> <expected-project-ref>" >&2
  exit 2
fi

app_root="$1"
source_env="$app_root/$2"
target_env="$app_root/$3"
expected_ref="$4"

app_root="$(cd "$app_root" && pwd)"
source_env="$(readlink -f "$source_env")"
target_env="$(readlink -f "$target_env")"

[[ "$source_env" == "$app_root/"* && "$target_env" == "$app_root/"* ]] || {
  echo "Environment files must stay inside the selected app root" >&2
  exit 3
}
[[ -f "$source_env" && -f "$target_env" ]] || {
  echo "Source or target environment file is missing" >&2
  exit 4
}
grep -q "${expected_ref}" "$source_env" || {
  echo "Source environment does not reference expected database ${expected_ref}" >&2
  exit 5
}

backup="${target_env}.pre-db-switch-$(date -u +%Y%m%dT%H%M%SZ)"
cp "$target_env" "$backup"

for key in SUPABASE_URL SUPABASE_KEY SUPABASE_PASSWORD DATABASE_URL; do
  line="$(grep -m1 "^${key}=" "$source_env" || true)"
  [[ -n "$line" ]] || {
    echo "Required key ${key} is missing from source environment" >&2
    exit 6
  }
  sed -i "/^${key}=/d" "$target_env"
  printf '%s\n' "$line" >> "$target_env"
done

grep -q "${expected_ref}" "$target_env" || {
  echo "Target environment verification failed; restoring backup" >&2
  cp "$backup" "$target_env"
  exit 7
}

echo "Database keys updated; backup retained at ${backup}"
