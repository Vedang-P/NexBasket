#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set."
  echo "Example:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname?sslmode=require'"
  exit 1
fi

echo "Applying schema..."
psql "$DATABASE_URL" -f database/schema.sql

echo "Applying triggers..."
psql "$DATABASE_URL" -f database/triggers.sql

echo "Applying procedures..."
psql "$DATABASE_URL" -f database/procedures.sql

echo "Applying seed + queries..."
psql "$DATABASE_URL" -f database/queries.sql

echo "Database initialization completed successfully."
