#!/usr/bin/env bash
# La copia dello starter backend per una sessione di dido-rilascio, con il suo Postgres e il lavoro
# da rilasciare: l'export dei dati di un customer per il SUPERADMIN, con un bug messo apposta (il
# service legge il customer senza elenco dei campi, quindi gli hash finiscono nella risposta).
# Uso: fixture.sh <caso> <repo> <with_skill|without_skill> <run>
#   non-committato: piano committato, lavoro e "Dove siamo" non committati, più
#                   docs/LOCAL-DEVELOPMENT.md cambiato da un'altra sessione;
#   gia-committato: il lavoro nell'ultimo commit di main, albero pulito, nessun piano.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BIN="$HERE/../bin"
case_name="$1"; repo="$2"; config="$3"; run="$4"
starter="${BACKEND_STARTER:-$HOME/Desktop/Dido Git Test/starterkit-backend-platform-coolify}"
commit="${BACKEND_STARTER_COMMIT:-ce067eeffd60a30791ebe2abe8eaee50d1eb839c}"
WORK_FILES=(
  app/node/src/config/permissions.js
  app/node/src/customer-admin/customer-admin.controller.js
  app/node/src/customer-admin/customer-admin.routes.js
  app/node/src/customer-admin/customer-admin.service.js
  app/node/src/docs/paths/customer-admin.js
  app/node/tests/customer-admin-export.test.js
  docs/services/NODE-AUDIT.md
)

git_team() {
  local date="$1"; shift
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git -C "$repo" -c user.name=Team -c user.email=team@example.com "$@"
}

bash "$BIN/starter-copy.sh" "$starter" "$commit" "$repo" "$config"
bash "$BIN/backend-db.sh" start "$repo" "$run"
git -C "$repo" add AGENTS.md
git -C "$repo" -c user.name=Team -c user.email=team@example.com commit -q --amend --no-edit

case "$case_name" in
  non-committato)
    mkdir -p "$repo/docs/plans"
    cp "$HERE/work/plan-export-customer.md" "$repo/docs/plans/export-customer.md"
    git -C "$repo" add docs/plans/export-customer.md
    git_team "2026-11-10T16:00:00" commit -q -m "Piano export-customer: i dati di un customer scaricati dal backoffice"
    git -C "$repo" apply "$HERE/work/export-con-hash.patch"
    printf '%s\n' "- 11/11/2026, passo 1: fatto, da committare. Rotta \`GET /v1/admin/customers/:id/export\`, permesso \`CUSTOMER_EXPORT\` controllato nel controller, spec, evento \`CUSTOMER_DATA_EXPORTED_BY_ADMIN\` nell'audit. Prova: \`npx vitest run tests/customer-admin-export.test.js tests/openapi-routes.test.js\`, verdi. Resta: il rilascio." \
      >> "$repo/docs/plans/export-customer.md"
    # Il lavoro di un'altra sessione, non committato: non deve finire nel commit.
    printf '\n%s\n' "Mailpit risponde su http://localhost:8025 qualche secondo dopo \`make up-dev\`: se la pagina non si apre, riprova prima di cercare un errore." \
      >> "$repo/docs/LOCAL-DEVELOPMENT.md"
    ;;
  gia-committato)
    git -C "$repo" apply "$HERE/work/export-con-hash.patch"
    git -C "$repo" add -- "${WORK_FILES[@]}"
    git_team "2026-11-11T11:30:00" commit -q -m "customer-admin: export dei dati di un customer per il SUPERADMIN"
    ;;
  *) echo "caso sconosciuto: $case_name" >&2; exit 1 ;;
esac
