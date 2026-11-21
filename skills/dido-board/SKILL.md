---
name: dido-board
description: Usare quando un piano di dido-planning viene approvato, cambia (step aggiunti, cambiati o tolti) o si riprende, quando uno step parte, è fatto o entra in un commit, e quando si parla della board, del GitHub Project o delle card degli step.
allowed-tools: Bash(node "${CLAUDE_SKILL_DIR}/board.mjs" *)
---

# La board del piano

La board del GitHub Project collegato al repo segue il piano di dido-planning: una card per step, che si sposta con il lavoro. Il piano resta la fonte: la card ne porta una copia da leggere sulla board, e dove non coincidono vale il piano. La board non ferma mai il lavoro.

Tutto passa da `board.mjs`, accanto a questo file. Risponde con righe che cominciano con `board:` ed esce sempre senza errore.

## Quando

| Cosa succede | Comando |
|---|---|
| Il piano è approvato | `sync` di tutti gli step, con title e body |
| Riprendi un piano già avviato | `sync` degli step già partiti, con key e lo stato che dice "Dove siamo"; poi `sync` con title e body di quelli che lo script dice mancanti |
| Uno step entra nel piano o cambia il suo testo | `sync` di quello step |
| Uno step parte | `move` in In progress |
| Uno step è fatto e verificato, con "Dove siamo" aggiornato | `move` in In review |
| Uno step entra in un commit | `move` in Done |
| Uno step finisce in "Cosa non si fa" | `archive` |

Ready non lo usa la skill: è di chi lavora con te, per scegliere cosa viene dopo.

## Cosa risponde lo script

- `board: nessun Project collegato…`: il repo non ha una board. Per il resto della sessione non usare più la skill, e non dirlo.
- `board: non aggiornata: <motivo>`: GitHub o gh non vanno. Per il resto della sessione non chiamare più lo script e scrivi il motivo in una riga del report. Non riprovare, non usare gh da solo e non chiedere: il lavoro va avanti.
- `board: manca la card di …`: fai `sync` di quello step con title e body, poi ripeti `move` se lo stavi spostando.
- Le altre righe dicono cosa è cambiato sulla board: non serve riportarle.

Della board non si scrive nel piano: "Dove siamo" resta la memoria del lavoro.

## La card

Una card per step, sottostep compresi (6b, 9b.1), con questi campi:

- **key**: `<piano> step <numero>`, come nei commit: `M5 step 3`, `M4 step 6h.1`. Il piano è il nome del suo file in `docs/plans/`, senza `.md`.
- **title**: il nome dello step in poche parole, cioè la parte in grassetto, se c'è. Sulla board il titolo diventa `<key>: <title>`.
- **body**: il testo dello step, intero e con i suoi punti, come nel piano. Poi una riga vuota e queste due righe:

  ```
  Repo: <i repo che lo step tocca: app, backend, admin>
  Piano: <link al file del piano su GitHub>
  ```

  Il link viene dal remote del repo che ha il piano: `https://github.com/<owner>/<repo>/blob/<branch principale>/docs/plans/<piano>.md`.
- **status**: solo quando la tabella "Quando" lo dice, e mai per gli step non ancora partiti: lì può averli spostati chi lavora con te. Senza, una card nuova va in Backlog e una che c'è resta dov'è.

## I comandi

```bash
node "${CLAUDE_SKILL_DIR}/board.mjs" sync - <<'EOF'
[
  { "key": "M5 step 3", "title": "Bibbia completa", "body": "Testo dello step…\n\nRepo: backend, app\nPiano: https://github.com/acme/app/blob/main/docs/plans/M5.md" },
  { "key": "M5 step 4", "status": "Done" }
]
EOF
node "${CLAUDE_SKILL_DIR}/board.mjs" move "M5 step 3" "In progress"
node "${CLAUDE_SKILL_DIR}/board.mjs" archive "M5 step 3"
node "${CLAUDE_SKILL_DIR}/board.mjs" check
```

`sync` non crea doppioni: trova la card dalla key, cambia titolo e testo solo se sono diversi e la sposta solo se gli dai lo stato. Senza title e body, una card che c'è tiene i suoi e una che manca non si crea. Si può rilanciare quando serve. `check` dice a quale Project è collegato il repo e quali stati ha.

## Errori da evitare

- Issue, label o card fatte a mano con gh: sulla board vanno solo le card bozza di `board.mjs`, una per step.
- Card per le cose minute dentro uno step: le card sono gli step del piano.
- Fermarsi, ritentare o chiedere perché la board non risponde.
