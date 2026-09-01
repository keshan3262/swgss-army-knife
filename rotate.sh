#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
DB_PASSWORD="app-$(openssl rand -hex 8)"

docker compose exec -T postgres psql -U admin -d swgss-army-knife \
  -c "ALTER ROLE app_user WITH PASSWORD '${DB_PASSWORD}';" >/dev/null

echo "${DB_PASSWORD}" > secrets/db_password

docker compose exec -T postgres psql -U admin -d swgss-army-knife -tA \
  -c "SELECT count(pg_terminate_backend(pid)) FROM pg_stat_activity WHERE usename = 'app_user';"

echo "Done"
