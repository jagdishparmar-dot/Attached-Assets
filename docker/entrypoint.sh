#!/bin/sh
set -e

wait_for_db() {
  if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL is not set" >&2
    exit 1
  fi

  echo "Waiting for database..."
  i=1
  while [ "$i" -le 30 ]; do
    if node -e "
      const { Client } = require('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      client.connect()
        .then(() => client.end())
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    "; then
      echo "Database is ready."
      return 0
    fi
    sleep 2
    i=$((i + 1))
  done

  echo "Database not reachable after 60s" >&2
  exit 1
}

run_db_migration() {
  echo "Applying database schema (drizzle push)..."
  node /app/node_modules/drizzle-kit/bin.cjs push --config /app/lib/db/drizzle.config.ts
}

run_db_seed() {
  echo "Seeding database..."
  node --import /app/load-env.mjs /app/node_modules/tsx/dist/cli.mjs /app/scripts/src/seed-staff.ts
}

if [ "$RUN_DB_MIGRATION" = "true" ]; then
  wait_for_db
  run_db_migration
fi

if [ "$RUN_DB_SEED" = "true" ]; then
  wait_for_db
  run_db_seed
fi

node --enable-source-maps /app/artifacts/api-server/dist/index.mjs &
API_PID=$!

trap 'kill -TERM "$API_PID" 2>/dev/null; wait "$API_PID" 2>/dev/null' TERM INT

for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT:-8080}/api/healthz" >/dev/null; then
    break
  fi
  sleep 1
done

exec nginx -g 'daemon off;'
