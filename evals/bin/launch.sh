#!/usr/bin/env bash
# Lancia in parallelo le sessioni di un'iterazione.
# Uso: launch.sh <cartella-iterazione> <with_skill|without_skill|both> <run-per-config> <skill>/<caso>...
# Esempio: launch.sh ~/dido-evals/b-1 with_skill 2 dido-backend/export-superadmin dido-rilascio/gia-committato
# Le sessioni girano fuori da ogni repo: Claude Code legge anche i CLAUDE.md delle cartelle sopra.
BIN="$(cd "$(dirname "$0")" && pwd)"
EVALS="$(dirname "$BIN")"
iteration="$1"; configs="$2"; runs="$3"; shift 3
[ "$configs" = both ] && configs="with_skill without_skill"
mkdir -p "$iteration"
for entry in "$@"; do
  skill="${entry%%/*}"; case_name="${entry#*/}"
  mkdir -p "$iteration/$skill/$case_name"
  python3 -I - "$EVALS" "$iteration" "$skill" "$case_name" <<'PY'
import json, re, sys
from pathlib import Path
evals, iteration, skill, case_name = sys.argv[1:]
case = Path(evals) / skill / "cases" / case_name
prompt = case.joinpath("prompt.md").read_text().split("---", 2)[2].strip()
assertions = [re.split(r"^---\n.*?\n---\n", p.read_text(), flags=re.S)[-1].strip()
              for p in sorted((case / "graders").glob("*.md"))]
Path(iteration, skill, case_name, "eval_metadata.json").write_text(json.dumps(
    {"eval_name": case_name, "skill": skill, "prompt": prompt, "assertions": assertions},
    indent=2, ensure_ascii=False) + "\n")
PY
  for config in $configs; do
    for index in $(seq 1 "$runs"); do
      "$BIN/run-case.sh" "$iteration" "$skill" "$case_name" "$config" "run-$index" &
    done
  done
done
wait
echo "iterazione $iteration finita"
