#!/usr/bin/env bash
# La copia di una fixture di dido-code-style per una sessione (le fixture le crea make-fixtures.sh).
# Uso: fixture.sh <caso> <repo> <with_skill|without_skill> <run>
# Le skill dido-* sono quelle dell'utente (~/.claude/skills), come in un repo che non è uno starter.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
case_name="$1"; repo="$2"
case "$case_name" in
  env-sostituzione) cp -R "$HERE/fixtures/shop-api" "$repo" ;;
  *) echo "caso sconosciuto: $case_name" >&2; exit 1 ;;
esac
