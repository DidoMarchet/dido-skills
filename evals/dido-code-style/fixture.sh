#!/usr/bin/env bash
# La copia di una fixture di dido-code-style per una sessione (le fixture le crea make-fixtures.sh).
# Uso: fixture.sh <caso> <repo> <with_skill|without_skill> <run>
# Le skill dido-* sono quelle dell'utente (~/.claude/skills), come in un repo che non è uno starter.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
case_name="$1"; repo="$2"; config="$3"; run="$4"
case "$case_name" in
  env-sostituzione) cp -R "$HERE/fixtures/shop-api" "$repo" ;;
  e2e-dev-server)
    cp -R "$HERE/fixtures/notes-web" "$repo"
    ln -s "$HERE/fixtures/e2e-modules/node_modules" "$repo/node_modules"
    # Porte diverse per ogni sessione: girano in parallelo.
    base=0; [ "$config" = without_skill ] && base=20
    index="${run##*-}"; offset=$(( base + (index - 1) * 2 ))
    printf 'DEV_PORT=%s\nE2E_PORT=%s\n' "$((4310 + offset))" "$((4311 + offset))" > "$run/session.env"
    ;;
  *) echo "caso sconosciuto: $case_name" >&2; exit 1 ;;
esac
