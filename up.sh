#!/usr/bin/env zsh
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p secrets
[ -f secrets/db_password ] || printf 'app-v1-password' > secrets/db_password
DB_PASSWORD=$(cat secrets/db_password)

SQL_SCRIPT="DO \$\$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    ALTER ROLE app_user WITH PASSWORD '$DB_PASSWORD';
  ELSE
    CREATE ROLE app_user WITH LOGIN PASSWORD '$DB_PASSWORD';      
  END IF;
END
\$\$;"
echo "$SQL_SCRIPT" > init-pg.sql

docker compose up -d --wait

echo "Done"
