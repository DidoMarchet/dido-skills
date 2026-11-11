#!/usr/bin/env bash
# Lancia tutte le sessioni di un'iterazione in parallelo: 4 casi x 2 configurazioni x 2 run.
W="$(cd "$(dirname "$0")/.." && pwd)"
iteration="$1"
for case_name in feature-tests-green debugging-same-error architecture-no-new-elements product-goals-met; do
  mkdir -p "$W/$iteration/$case_name"
  python3 -I - "$W" "$iteration" "$case_name" <<'PY'
import json, re, sys
from pathlib import Path
w, iteration, case_name = sys.argv[1:]
case = Path(w) / "cases" / case_name
prompt = case.joinpath("prompt.md").read_text().split("---", 2)[2].strip()
assertions = [re.split(r"^---\n.*?\n---\n", p.read_text(), flags=re.S)[-1].strip()
              for p in sorted((case / "graders").glob("*.md"))]
Path(w, iteration, case_name, "eval_metadata.json").write_text(json.dumps(
    {"eval_name": case_name, "prompt": prompt, "assertions": assertions}, indent=2, ensure_ascii=False) + "\n")
PY
  for config in with_skill without_skill; do
    for run_name in run-1 run-2; do
      "$W/bin/run-case.sh" "$iteration" "$case_name" "$config" "$run_name" &
    done
  done
done
wait
echo "iterazione $iteration finita"
