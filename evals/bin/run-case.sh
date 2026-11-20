#!/usr/bin/env bash
# Una sessione headless di Claude Code su una copia della fixture di un caso.
# Uso: run-case.sh <cartella-iterazione> <skill> <caso> <with_skill|without_skill> <run-K>
#
# La copia la prepara la skill con evals/<skill>/fixture.sh <caso> <repo> <config> <run>,
# che può scrivere <run>/session.env (variabili esportate per la sessione).
# Senza skill, la skill provata è bloccata con --disallowedTools; la sua descrizione
# resta comunque nell'elenco delle skill.
set -uo pipefail
BIN="$(cd "$(dirname "$0")" && pwd)"
EVALS="$(dirname "$BIN")"
iteration="$1"; skill="$2"; case_name="$3"; config="$4"; run_name="$5"
run="$iteration/$skill/$case_name/$config/$run_name"
rm -rf "$run"; mkdir -p "$run/outputs"

bash "$EVALS/$skill/fixture.sh" "$case_name" "$run/outputs/repo" "$config" "$run" > "$run/fixture.log" 2>&1 \
  || { echo "fixture fallita: $run/fixture.log"; exit 1; }

# Il punto di partenza: il commit e l'albero intero, file non committati compresi, senza
# toccare l'indice del repo. I controlli confrontano il lavoro con questi.
repo="$run/outputs/repo"
git -C "$repo" rev-parse HEAD > "$run/base.txt"
GIT_INDEX_FILE="$run/start-index" git -C "$repo" add -A
GIT_INDEX_FILE="$run/start-index" git -C "$repo" write-tree > "$run/start-tree.txt"
rm -f "$run/start-index"

blocked=()
[ "$config" = without_skill ] && blocked=(--disallowedTools "Skill($skill)")

# Il prompt è il corpo di prompt.md, dopo il blocco delle impostazioni.
case_dir="$EVALS/$skill/cases/$case_name"
prompt="$(awk 'seen >= 2 { print } /^---$/ { seen++ }' "$case_dir/prompt.md" | sed '/./,$!d')"

# followup.md, se c'è, è un secondo messaggio nella stessa sessione (per esempio una correzione
# di chi lavora con te): la sessione si salva per riprenderla. Il messaggio finale è del secondo turno.
session=(--no-session-persistence)
session_id=""
if [ -f "$case_dir/followup.md" ]; then
  session_id="$(uuidgen | tr 'A-Z' 'a-z')"
  session=(--session-id "$session_id")
fi
common=(--model claude-opus-5-5 --output-format stream-json --verbose
  --permission-mode acceptEdits --allowedTools "Bash,Read,Edit,Write,Glob,Grep,Skill,Agent"
  --settings "$BIN/settings.json")

(
  [ -f "$run/session.env" ] && set -a && . "$run/session.env" && set +a
  cd "$repo"
  claude -p "$prompt" "${common[@]}" "${session[@]}" ${blocked[@]+"${blocked[@]}"} \
    > "$run/transcript.jsonl" 2> "$run/stderr.txt"
  status=$?
  if [ -n "$session_id" ] && [ "$status" = 0 ]; then
    claude -p "$(sed '/./,$!d' "$case_dir/followup.md")" "${common[@]}" --resume "$session_id" \
      ${blocked[@]+"${blocked[@]}"} >> "$run/transcript.jsonl" 2>> "$run/stderr.txt"
    status=$?
  fi
  echo $status > "$run/exit-code"
)
python3 -I "$BIN/extract.py" "$run"
