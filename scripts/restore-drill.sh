#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BACKUP_DIR="$(pwd)/backups"

if [ -n "${EPOCHREALTIME:-}" ]; then
  now_ms() { local t="${EPOCHREALTIME/[.,]/}"; echo "${t:0:${#t}-3}"; }
else
  now_ms() { perl -MTime::HiRes -e 'printf("%.0f\n", Time::HiRes::time()*1000)'; }
fi
secs()   { awk -v ms="$1" 'BEGIN { printf "%.1f", ms / 1000 }'; }

BACKUP_FILE="$BACKUP_DIR/$(ls -1t "$BACKUP_DIR" | head -n1)"
BEFORE=$(docker compose exec -T primary psql -U admin -d swgss-army-knife -Atc \
  "SELECT count(*) || '|' || coalesce(avg(ts), 0) FROM \
  (SELECT id, (EXTRACT(EPOCH FROM created_at) * 1000000)::bigint as ts FROM conversions)")
echo "Conversions before: $BEFORE (count|avg(ts))"

echo "Removing conversions..."
docker compose --profile drill rm -sf restore >/dev/null 2>&1 || true
docker volume rm -f swgss-army-knife_pgdata-restore >/dev/null 2>&1 || true
docker compose --profile drill up -d --wait restore
TABLES_IN_CLEAN=$(docker compose exec -T restore psql -U admin -d swgss-army-knife -Atc \
  "SELECT count(*) FROM pg_tables WHERE tablename = 'conversions'")
if [ "$TABLES_IN_CLEAN" != "0" ]; then
  echo "Found $TABLES_IN_CLEAN tables, expected 0"; exit 1
fi

echo "Restoring conversions from $BACKUP_FILE"
T0=$(now_ms)
docker compose exec -T restore pg_restore -U admin -d swgss-army-knife --no-owner < "$BACKUP_FILE"
RESTORE_TIME=$(( $(now_ms) - T0 ))
AFTER=$(docker compose exec -T restore psql -U admin -d swgss-army-knife -Atc \
  "SELECT count(*) || '|' || coalesce(avg(ts), 0) FROM \
  (SELECT id, (EXTRACT(EPOCH FROM created_at) * 1000000)::bigint as ts FROM conversions)")
echo "Conversions after: $AFTER (count|avg(ts))"
if [ "$BEFORE" = "$AFTER" ]; then
  echo "MATCH"
else
  echo "Restored conversions mismatch"
  exit 1
fi

echo "Restored in $(secs $RESTORE_TIME)s (RTO ≈ container startup time + $(secs $RESTORE_TIME)s)"
