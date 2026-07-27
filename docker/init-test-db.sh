#!/bin/sh
# Runs once, on first initialisation of an empty Postgres data volume.
# Creates the dedicated test database so the suite never touches issuehub_dev.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE issuehub_test OWNER $POSTGRES_USER;
EOSQL

echo "init-test-db: created database issuehub_test"
