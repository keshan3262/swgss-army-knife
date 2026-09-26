#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
CREATE ROLE repl WITH REPLICATION LOGIN PASSWORD 'repl';
SQL

echo 'host replication repl 0.0.0.0/0 scram-sha-256' >> "$PGDATA/pg_hba.conf"
