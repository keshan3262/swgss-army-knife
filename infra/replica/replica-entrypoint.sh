#!/bin/bash
set -e

PGDATA="${PGDATA:-/var/lib/postgresql/data}"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "replica: PGDATA is empty, taking pg_basebackup from primary…"
  until PGPASSWORD="${REPL_PASSWORD:-repl}" pg_basebackup \
      --host=primary --port=5432 --username=repl \
      --pgdata="$PGDATA" \
      -R \
      --wal-method=stream \
      --checkpoint=fast; do
    echo "replica: primary is not ready, retrying in 1 second"
    sleep 1
  done
  chmod 0700 "$PGDATA"
  echo "replica: base backup taken, starting as standby"
fi

exec docker-entrypoint.sh postgres
