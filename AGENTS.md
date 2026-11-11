# dido-skills

Le skill `dido-*` e i loro test. Cosa fa ogni skill: `OVERVIEW.md`. Come si installano: `README.md`.

## Come si lavora su una skill

- Prima di creare, modificare, analizzare o valutare una skill, carica `writing-skills` e seguila. Ogni modifica ha uno scenario che mostra il difetto prima e non lo mostra dopo, lanciato con `claude -p` su un repo di prova. Un difetto trovato leggendo si prova prima di correggerlo: se lo scenario non lo mostra, non si corregge.
- Prima di cambiare una regola, cerca con grep dove altro è scritta: le altre skill, `OVERVIEW.md`, e `AGENTS.md` e `docs/conventions.md` dei tre starter. Si cambiano tutti i posti nella stessa modifica.
- Le prove delle skill stanno in `evals/`, uno scenario per caso (come si lanciano e come se ne aggiunge uno: `evals/README.md`). Quelle di una skill si rilanciano prima del push di una sua modifica, e un caso vero che fallisce diventa uno scenario nuovo.
- Commit solo quando lo chiede chi lavora con te, push solo con il suo ok. Dopo il push gli starter prendono le skill con `ai:update`.
