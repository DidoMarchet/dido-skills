#!/usr/bin/env bash
# Una sessione headless di Claude Code su una copia della fixture.
# Uso: run-case.sh <iteration-N> <caso> <with_skill|without_skill> [run-K]
set -uo pipefail
W="$(cd "$(dirname "$0")/.." && pwd)"
iteration="$1"; case_name="$2"; config="$3"; run_name="${4:-}"
run="$W/$iteration/$case_name/$config${run_name:+/$run_name}"
rm -rf "$run"; mkdir -p "$run/outputs"
cp -R "$W/fixtures/$case_name" "$run/outputs/repo"

# Con la skill: la stessa installazione di un progetto, in .claude/skills, fuori dal diff.
if [ "$config" = with_skill ]; then
  mkdir -p "$run/outputs/repo/.claude/skills"
  cp -R "$W/../../skills/dido-goal" "$run/outputs/repo/.claude/skills/"
  echo ".claude/" >> "$run/outputs/repo/.git/info/exclude"
fi

# Senza la skill: la copia collegata in ~/.claude/skills non si può usare.
blocked=()
[ "$config" = without_skill ] && blocked=(--disallowedTools "Skill(dido-goal)")

# Il prompt è il corpo di prompt.md, dopo il blocco delle impostazioni.
prompt="$(awk 'seen >= 2 { print } /^---$/ { seen++ }' "$W/cases/$case_name/prompt.md" | sed '/./,$!d')"

cd "$run/outputs/repo"
# superpowers acceso come nei progetti nati dagli starter; il resto viene dalle impostazioni utente.
claude -p "$prompt" --model claude-opus-5-5 --output-format stream-json --verbose \
  --permission-mode acceptEdits --allowedTools "Bash,Read,Edit,Write,Glob,Grep,Skill" \
  --settings '{"enabledPlugins":{"superpowers@claude-plugins-official":true}}' \
  --no-session-persistence ${blocked[@]+"${blocked[@]}"} > "$run/transcript.jsonl" 2> "$run/stderr.txt"
echo $? > "$run/exit-code"
python3 -I "$W/bin/extract.py" "$run"
