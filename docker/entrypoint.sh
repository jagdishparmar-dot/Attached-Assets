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
    if node /app/docker/wait-for-db.mjs; then
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
  node /app/docker/run-drizzle.mjs
}

if [ "$RUN_DB_MIGRATION" = "true" ]; then
  wait_for_db
  run_db_migration
fi

if [ "$RUN_DB_SEED" = "true" ]; then
  echo "RUN_DB_SEED is set, but database seed scripts have been removed. Skipping."
fi

exec node --import /app/load-env.mjs --enable-source-maps /app/artifacts/api-server/dist/index.mjs
