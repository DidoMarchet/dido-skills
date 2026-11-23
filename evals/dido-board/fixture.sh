#!/usr/bin/env bash
# Il repo di prova di dido-board per una sessione: un'app con il piano M1 e il suo Project finto.
# Uso: fixture.sh <caso> <repo> <with_skill|without_skill> <run>
# Al posto di gh c'è fake-gh.mjs (DIDO_BOARD_GH in session.env): il Project sta in
# <run>/gh-state.json, ogni chiamata in <run>/gh-calls.jsonl. Nei casi infinity-* il repo ha la
# board di Infinity in docs/plans/board.json e al posto dell'API c'è fake-infinity.mjs
# (DIDO_BOARD_FETCH): la board sta in <run>/infinity-state.json. Le altre skill dido-* sono quelle
# dell'utente (~/.claude/skills); dido-board si copia nel repo, come negli starter, da skills/ o da
# BOARD_SKILL: la copia fissa la versione provata anche se skills/ cambia mentre la sessione gira.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
case_name="$1"; repo="$2"; run="$4"

case "$case_name" in
  piano-approvato) plan_state='**bozza, da approvare**'; gh_mode=ok ;;
  github-non-risponde) plan_state='**approvato da Dido il 20/11/2026**, "va bene, procedi"'; gh_mode=auth ;;
  infinity-piano-approvato|infinity-assegna|infinity-token-env|nessuna-board) plan_state='**bozza, da approvare**'; gh_mode=ok ;;
  *) echo "caso sconosciuto: $case_name" >&2; exit 1 ;;
esac

mkdir -p "$repo" && cd "$repo"
git init -q -b main
git remote add origin https://github.com/acme/notes-app.git
mkdir -p src test docs/plans

cat > package.json <<'EOF'
{
  "name": "notes-app",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
EOF

cat > CLAUDE.md <<'EOF'
# notes-app

L'app delle note. Il codice sta in `src/`, i test in `test/` (`npm test`). I piani stanno in `docs/plans/` e seguono dido-planning.
EOF

cat > src/notes.js <<'EOF'
// Le note da mostrare nella lista: quelle nel cestino restano fuori.
export const listNotes = (notes) => notes.filter((note) => !note.deleted)
EOF

cat > test/notes.test.js <<'EOF'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listNotes } from '../src/notes.js'

test('la lista lascia fuori le note nel cestino', () => {
  const notes = [{ title: 'Spesa' }, { title: 'Vecchia', deleted: true }]
  assert.deepEqual(listNotes(notes), [{ title: 'Spesa' }])
})
EOF

cat > docs/plans/M1.md <<EOF
# Piano M1: quante parole ha ogni nota

> Stato: $plan_state.
> Riguarda l'app e il backend delle note. Lo stato sta in "Dove siamo", in fondo a questo piano.

## Cosa si chiede e cosa si fa

| Voce (dalla richiesta) | Cosa si fa |
|---|---|
| Ogni nota dice quante parole ha | il conteggio nell'app e nella risposta del backend |

**Si chiude quando**: la lista delle note mostra le parole di ogni nota, con i test verdi.

## Cosa c'è già

\`listNotes\` in \`src/notes.js\`, con il suo test.

## Step

1. **Conteggio delle parole**: \`countWords(text)\` in \`src/words.js\` dice quante parole ha un testo. Le parole sono separate da spazi, anche più di uno; un testo vuoto o di soli spazi ne ha 0. Con il suo test in \`test/\`.
2. **Backend, le parole nella risposta**: \`GET /notes\` restituisce anche \`words\` per ogni nota, con il test della rotta.
3. **Lista con le parole**: la lista delle note mostra "N parole" sotto il titolo di ogni nota.
4. **Chiusura**: prove complete, revisione del codice e report.

## Dipendenze nuove

Nessuna.

## Cosa non si fa

Il conteggio dei caratteri.

## Domande aperte

Nessuna.

## Dove siamo

20/11/2026: piano scritto, nessuno step fatto.
EOF

mkdir -p .claude/skills
cp -R "${BOARD_SKILL:-$HERE/../../skills/dido-board}" .claude/skills/dido-board

if [[ "$case_name" == infinity-* ]]; then
  cat > docs/plans/board.json <<'EOF'
{
  "service": "infinity",
  "url": "https://app.startinfinity.com/b/wBMjf2pNi5a/ifdZU4AdwJH",
  "columns": {
    "Backlog": "Stopped",
    "Ready": "To-do",
    "In progress": "Doing",
    "In review": "Test",
    "Done": "Done",
    "archive": "Done"
  }
}
EOF
fi
if [ "$case_name" = infinity-assegna ]; then
  # Chi prende le card, il referente e il reparto, come li chiede la skill all'inizio del progetto.
  python3 - <<'PYCONFIG'
import json
from pathlib import Path
path = Path("docs/plans/board.json")
config = json.loads(path.read_text())
config["fields"] = {"Responsabile": "Davide Marchet", "Referente": "Lorenzo Furno", "Reparto": "Develop"}
config["priority"] = "Priorità"
path.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n")
PYCONFIG
fi

if [ "$case_name" = infinity-token-env ]; then
  # Il token sta nei tre file env del repo, come le altre variabili, e non nell'ambiente.
  for file in .env.example .env.local .env.production; do
    printf 'SITE_URL = https://notes.example.com\nINFINITY_TOKEN = token-di-prova\n' > "$file"
  done
fi

git add -A
git -c user.name="Team" -c user.email="team@example.com" commit -q -m "Piano M1"

chmod +x "$HERE/fake-gh.mjs"
# Tra virgolette: i percorsi possono avere spazi e run-case.sh carica il file con ".".
printf "DIDO_BOARD_GH='%s'\nFAKE_GH_STATE='%s'\nFAKE_GH_LOG='%s'\nFAKE_GH_MODE=%s\n" \
  "$HERE/fake-gh.mjs" "$run/gh-state.json" "$run/gh-calls.jsonl" "$gh_mode" > "$run/session.env"

# Né in nessuna-board né nei casi infinity-* il repo ha un GitHub Project.
if [[ "$case_name" == infinity-* || "$case_name" == nessuna-board ]]; then
  echo '{ "linked": false }' > "$run/gh-state.json"
fi
if [[ "$case_name" == infinity-* ]]; then
  [ "$case_name" = infinity-token-env ] || echo "INFINITY_TOKEN=token-di-prova" >> "$run/session.env"
  printf "DIDO_BOARD_FETCH='%s'\nFAKE_INFINITY_STATE='%s'\nFAKE_INFINITY_LOG='%s'\n" \
    "$HERE/fake-infinity.mjs" "$run/infinity-state.json" "$run/infinity-calls.jsonl" >> "$run/session.env"
fi
