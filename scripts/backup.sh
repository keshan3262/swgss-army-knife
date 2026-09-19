#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BACKUP_DIR="$(pwd)/backups"
mkdir -p "$BACKUP_DIR"

docker compose exec -T primary pg_dump -U admin -d swgss-army-knife -Fc > "$BACKUP_DIR/swgss-army-knife.dump"
echo "Backup written to $BACKUP_DIR/swgss-army-knife.dump"
