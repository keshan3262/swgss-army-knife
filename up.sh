#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

DB_PASSWORD="app-$(openssl rand -hex 8)"
export DB_URL="postgresql://app_user:${DB_PASSWORD}@postgres:5432/swgss-army-knife"
[ -f ./secrets/db-url ] || printf "${DB_URL}" > ./secrets/db-url

SQL_SCRIPT="DO \$\$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    ALTER ROLE app_user WITH PASSWORD '${DB_PASSWORD}';
  ELSE
    CREATE ROLE app_user WITH LOGIN PASSWORD '${DB_PASSWORD}';      
  END IF;
END
\$\$;"
echo "${SQL_SCRIPT}" > init-pg.sql

docker compose up -d --wait --force-recreate

echo "Done"
