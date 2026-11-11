#!/usr/bin/env bash
# La copia di una fixture di dido-goal per una sessione (le fixture le crea make-fixtures.sh).
# Uso: fixture.sh <caso> <repo> <with_skill|without_skill> <run>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
case_name="$1"; repo="$2"; config="$3"
cp -R "$HERE/fixtures/$case_name" "$repo"

# Con la skill: la stessa installazione di un progetto, in .claude/skills, fuori dal diff.
if [ "$config" = with_skill ]; then
  mkdir -p "$repo/.claude/skills"
  cp -R "$HERE/../../skills/dido-goal" "$repo/.claude/skills/"
  echo ".claude/" >> "$repo/.git/info/exclude"
fi
