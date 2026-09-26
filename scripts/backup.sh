#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BACKUP_DIR="$(pwd)/backups"
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/swgss-army-knife-$(date +%F-%H%M%S).dump"
docker compose exec -T primary pg_dump -U admin -d swgss-army-knife -Fc > "$BACKUP_FILE"
echo "Backup written to $BACKUP_FILE"
