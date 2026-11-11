#!/usr/bin/env bash
# La copia dello starter backend per una sessione di dido-backend, con il suo Postgres.
# Uso: fixture.sh <caso> <repo> <with_skill|without_skill> <run>
# BACKEND_STARTER sposta lo starter; il commit è fissato, così le prove si ripetono uguali.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BIN="$HERE/../bin"
case_name="$1"; repo="$2"; config="$3"; run="$4"
starter="${BACKEND_STARTER:-$HOME/Desktop/Dido Git Test/starterkit-backend-platform-coolify}"
commit="${BACKEND_STARTER_COMMIT:-ce067eeffd60a30791ebe2abe8eaee50d1eb839c}"

case "$case_name" in
  export-superadmin|rate-limit-account|servizio-opzionale) ;;
  *) echo "caso sconosciuto: $case_name" >&2; exit 1 ;;
esac

bash "$BIN/starter-copy.sh" "$starter" "$commit" "$repo" "$config"
bash "$BIN/backend-db.sh" start "$repo" "$run"
git -C "$repo" add AGENTS.md
git -C "$repo" -c user.name=Team -c user.email=team@example.com commit -q --amend --no-edit
