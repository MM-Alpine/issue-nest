#!/bin/sh
# Runs once, on first initialisation of an empty Postgres data volume.
# Creates the dedicated test database so the suite never touches the development database.
set -e

: "${POSTGRES_TEST_DB:=issuehub_test}"

psql \
  -v ON_ERROR_STOP=1 \
  -v test_db="$POSTGRES_TEST_DB" \
  -v owner="$POSTGRES_USER" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<-'EOSQL'
CREATE DATABASE :"test_db" OWNER :"owner";
EOSQL

echo "init-test-db: created database $POSTGRES_TEST_DB"
