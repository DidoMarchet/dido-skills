# Prove delle skill

Sessioni vere di Claude Code (`claude -p`, Opus) su repo di prova, con controlli da script e un valutatore che non sa come è andato il lavoro. Servono a provare una modifica a una skill prima di pubblicarla, e a trasformare in uno scenario un caso vero che fallisce. Risultati: [REPORT.md](REPORT.md) e, per dido-goal, [dido-goal/REPORT.md](dido-goal/REPORT.md).

Servono Claude Code, Node, Python 3, git e, per il backend, Docker con l'immagine `postgres:15`.

## Cosa c'è

| Cartella | Cosa |
|---|---|
| `bin/` | gli script comuni: una sessione, un'iterazione, metriche, valutazione, copie degli starter, Postgres per sessione |
| `<skill>/cases/<caso>/` | `prompt.md` (la richiesta, dopo il blocco delle impostazioni), `graders/NN.md` (una verifica per file), `case.yaml` |
| `<skill>/fixture.sh` | prepara il repo di una sessione: copia di una fixture o di uno starter a un commit fissato |
| `<skill>/checks.py` | `JUDGED` (le verifiche da giudicare, per caso) e `check()`, che controlla le altre |
| `<skill>/hidden/` | test nascosti: la sessione non li vede, la valutazione li copia nel repo e li toglie subito dopo |
| `<skill>/reference/`, `dido-rilascio/work/` | soluzioni di riferimento e lavoro da rilasciare, come patch |

## Come si lancia

Dalla cartella `evals/`:

1. Le fixture dei repo piccoli: `bash dido-code-style/make-fixtures.sh`, `bash dido-goal/make-fixtures.sh`. Le copie degli starter le fa `fixture.sh` a ogni sessione.
2. `bin/launch.sh ~/dido-evals/<iterazione> <with_skill|without_skill|both> <sessioni> <skill>/<caso>...`, per esempio `bin/launch.sh ~/dido-evals/backend-1 with_skill 2 dido-backend/export-superadmin`. Le sessioni girano in `~/dido-evals/`, fuori da ogni repo, perché Claude Code legge anche i `CLAUDE.md` delle cartelle sopra.
3. `python3 bin/grade.py ~/dido-evals/<iterazione> prepare`: controlla le verifiche da script e scrive `blind/bundle.md` per quelle di giudizio.
4. Un agente legge il pacchetto e giudica, con il prompt di [dido-goal/README.md](dido-goal/README.md), e scrive `blind/verdicts.json`.
5. `python3 bin/grade.py ~/dido-evals/<iterazione> merge`: `grading.json` di ogni sessione e `summary.md` con le verifiche passate, tempo e costo medi per caso.
6. Poi i Postgres delle sessioni: `for run in ~/dido-evals/<iterazione>/*/*/*/run-*; do bin/backend-db.sh stop "$run"; done`.

Con la skill, le `dido-*` sono quelle dell'utente (`~/.claude/skills`, collegate a `skills/` di questo repo) e, nelle copie degli starter, quelle di `skills/`. Senza, la skill provata è bloccata con `--disallowedTools`. Superpowers è acceso. `bin/settings.json` nega push, installazioni, `prisma generate`, `ai:update`, `docker compose` e `make up-dev`: con `node_modules` collegato scriverebbero nello starter vero.

## Aggiungere uno scenario

Quando un lavoro vero mostra una regola che non tiene:

1. Una cartella in `<skill>/cases/` con la richiesta com'era e una verifica per file, scritte prima di lanciare e mai cambiate dopo per farle passare.
2. La fixture in `fixture.sh`, il più vicina possibile al repo del caso vero.
3. I controlli in `checks.py`; un test nascosto, se serve, provato prima: fallisce sulla fixture, passa su una soluzione giusta.
4. Il caso prima della correzione della skill (deve fallire) e dopo (deve passare), con lo stesso comando.
