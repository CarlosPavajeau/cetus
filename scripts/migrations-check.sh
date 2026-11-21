#!/usr/bin/env bash
# Fails when a Flyway migration that already exists on the base branch is edited, renamed or deleted: every database
# that applied it would fail Flyway's checksum validation. Changes go in a new V<n+1>__<name>.sql.
#
#   scripts/migrations-check.sh [base]    base defaults to origin/main; compares it with the working tree
set -euo pipefail

cd "$(dirname "$0")/.."

base=${1:-origin/main}
migrations=modules/persistence/src/main/resources/db/migration
fork=$(git merge-base "$base" HEAD)

changed=$(git diff --no-renames --name-status --diff-filter=MDT "$fork" -- "$migrations")
if [ -n "$changed" ]; then
  echo "Migrations already on $base were changed (M edited, D deleted or renamed, T type changed):" >&2
  echo "$changed" >&2
  echo "Restore them and put the change in a new V<n+1>__<name>.sql." >&2
  exit 1
fi
echo "No migration on $base was changed."
