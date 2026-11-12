#!/usr/bin/env bash
# Copia di uno starter per una sessione di prova, a un commit fissato.
# Uso: starter-copy.sh <starter> <commit> <dest> <with_skill|without_skill>
#
# - clone locale senza remote: un push non può arrivare allo starter vero;
# - node_modules dello starter collegati, fuori da git: niente build e niente installazioni
#   (negate in settings.json), che scriverebbero nella cartella dello starter vero;
# - con la skill, le dido-* del progetto sono quelle di skills/ di questo repo; senza, tolte;
# - scripts/ai-check.mjs spento: il suo avviso porterebbe a ai:update, che rimette le skill
#   di GitHub.
# Le modifiche finiscono nell'ultimo commit (amend), così il diff della sessione ha solo il
# suo lavoro. fixture.sh aggiunge le sue e rifà l'amend.
set -euo pipefail
starter="$1"; commit="$2"; dest="$3"; config="$4"
SKILLS="$(cd "$(dirname "$0")/../../skills" && pwd)"

git clone -q --local "$starter" "$dest"
git -C "$dest" checkout -q "$commit"
git -C "$dest" checkout -q -B main
git -C "$dest" remote remove origin

(cd "$starter" && find . -maxdepth 3 -name node_modules -type d -not -path '*/node_modules/*') \
  | while read -r dir; do
      # Solo dove la cartella c'è anche nella copia: quelle di build (.output) non sono in git.
      [ -d "$(dirname "$dest/${dir#./}")" ] || continue
      ln -s "$starter/${dir#./}" "$dest/${dir#./}"
      echo "${dir#.}" >> "$dest/.git/info/exclude"
    done

for skill_dir in "$dest"/.agents/skills/dido-*; do
  name="$(basename "$skill_dir")"
  if [ "$config" = with_skill ]; then
    rsync -a --delete --exclude .DS_Store "$SKILLS/$name/" "$skill_dir/"
  else
    rm -rf "$skill_dir" "$dest/.claude/skills/$name"
  fi
done

printf '%s\n' "// Spento nelle copie di prova di evals: l'avviso porterebbe a ai:update." > "$dest/scripts/ai-check.mjs"

git -C "$dest" add -- .agents/skills .claude/skills scripts/ai-check.mjs
git -C "$dest" -c user.name=Team -c user.email=team@example.com commit -q --amend --no-edit
