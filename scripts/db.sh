#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POOLER_FILE="$ROOT_DIR/supabase/.temp/pooler-url"

if [[ ! -f "$POOLER_FILE" ]]; then
  echo "Pooler URL not found at $POOLER_FILE" >&2
  exit 1
fi

RAW=$(cat "$POOLER_FILE")
NOSCHEME=${RAW#postgresql://}
HOSTPORTDB=${NOSCHEME##*@}
CREDS=${NOSCHEME%@$HOSTPORTDB}
USER=${CREDS%%:*}
PASS=${CREDS#*:}
HOST=${HOSTPORTDB%%:*}
R2=${HOSTPORTDB#*:}
PORT=${R2%%/*}
DB=${R2#*/}

CONN="host=$HOST port=$PORT dbname=$DB user=$USER password=$PASS sslmode=require"

# Pick psql binary
if command -v psql >/dev/null 2>&1; then
  PSQL_BIN="psql"
elif [[ -x "/opt/homebrew/opt/libpq/bin/psql" ]]; then
  PSQL_BIN="/opt/homebrew/opt/libpq/bin/psql"
else
  echo "psql not found. Install libpq or add psql to PATH." >&2
  exit 1
fi

cmd=${1:-}
case "$cmd" in
  psql)
    shift
    exec "$PSQL_BIN" "$CONN" "$@"
    ;;
  query)
    shift
    SQL=${1:-}
    if [[ -z "$SQL" ]]; then
      echo "Usage: bash scripts/db.sh query \"select 1\"" >&2
      exit 2
    fi
    "$PSQL_BIN" "$CONN" -v ON_ERROR_STOP=1 -c "$SQL"
    ;;
  file)
    shift
    FILE=${1:-}
    if [[ -z "$FILE" ]]; then
      echo "Usage: bash scripts/db.sh file migrations/NNN-name.sql" >&2
      exit 2
    fi
    "$PSQL_BIN" "$CONN" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/$FILE"
    ;;
  files)
    shift
    if [[ $# -lt 1 ]]; then
      echo "Usage: bash scripts/db.sh files migrations/001-name.sql [migrations/002-name.sql ...]" >&2
      exit 2
    fi
    for FILE in "$@"; do
      if [[ ! -f "$ROOT_DIR/$FILE" ]]; then
        echo "File not found: $FILE" >&2
        exit 2
      fi
      echo "Running $FILE..."
      "$PSQL_BIN" "$CONN" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/$FILE"
    done
    ;;
  *)
    echo "Usage: bash scripts/db.sh [psql|query|file|files]" >&2
    exit 2
    ;;
esac


