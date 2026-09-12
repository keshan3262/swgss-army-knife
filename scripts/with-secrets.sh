#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ "${SKIP_VAULT:-0}" = "1" ]; then
  export DB_URL="${DB_URL}"
else
  source ./.env
fi

exec "$@"
