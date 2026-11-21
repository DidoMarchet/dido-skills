---
name: dido-board
description: Usare quando un piano di dido-planning viene approvato, cambia (step aggiunti, cambiati o tolti) o si riprende, quando una sua domanda si apre o ha risposta, quando uno step parte, è fatto o entra in un commit, e quando si parla della board, del GitHub Project o delle card degli step.
allowed-tools: Bash(node "${CLAUDE_SKILL_DIR}/board.mjs" *)
---

# La board del piano

La board del GitHub Project collegato al repo segue il piano di dido-planning: una card per step e una per domanda aperta, che si spostano con il lavoro. Chi la guarda vede cosa è deciso e cosa no, cosa è in corso e cosa è fatto. Il piano resta la fonte: la card ne porta una copia da leggere sulla board, e dove non coincidono vale il piano. La board non ferma mai il lavoro.

Tutto passa da `board.mjs`, accanto a questo file. Risponde con righe che cominciano con `board:` ed esce sempre senza errore.

## Quando

| Cosa succede | Comando |
|---|---|
| Il piano è approvato | `sync` di tutti gli step, con title e body: quelli decisi con lo stato Ready, gli altri senza stato; poi `sync` delle domande aperte |
| Riprendi un piano già avviato | `sync` degli step già partiti, con key e lo stato che dice "Dove siamo", e di quelli decisi in Ready; poi `sync` con title e body di quelli che lo script dice mancanti, e delle domande aperte |
| Uno step entra nel piano o cambia il suo testo | `sync` di quello step, in Ready se è deciso |
| Nel piano si apre una domanda | `sync` della domanda; gli step che aspettano la risposta, se erano in Ready, `move` in Backlog |
| Una domanda ha risposta, o arriva l'ok che uno step aspettava | la domanda `move` in Done; gli step che ora sono decisi `move` in Ready |
| Uno step parte | `move` in In progress |
| Uno step è fatto e verificato, con "Dove siamo" aggiornato | `move` in In review |
| Uno step entra in un commit | `move` in Done |
| Uno step finisce in "Cosa non si fa" | `archive` |

Uno step è **deciso** quando il piano è approvato, nessuna domanda aperta lo riguarda e non aspetta l'ok di chi lavora con te: allora sta in Ready, anche se nell'ordine del piano viene dopo. In Backlog restano gli step che aspettano una risposta o un ok, e le domande aperte. L'ordine lo dà il piano, non la colonna.

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
- **status**: solo quando la tabella "Quando" lo dice. Uno step non ancora partito va solo tra Backlog e Ready, e solo per le ragioni della tabella: chi lavora con te può averlo spostato. Senza stato, una card nuova va in Backlog e una che c'è resta dov'è.

Una card per ogni domanda aperta del piano (sezione "Domande aperte" o domande segnate in un'altra parte del piano), così si vede cosa aspetta una risposta:

- **key**: `<piano> domanda <numero>`, con il numero che ha nel piano: `M5 domanda 2`.
- **title**: la domanda in poche parole.
- **body**: il testo della domanda, con la proposta se c'è, poi una riga `Step: <gli step che aspettano la risposta>` (o `Step: nessuno`) e le righe `Repo:` e `Piano:` come per uno step.
- **status**: Backlog finché è aperta, Done quando ha risposta.

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

- Issue, label o card fatte a mano con gh: sulla board vanno solo le card bozza di `board.mjs`, una per step e una per domanda aperta.
- Card per le cose minute dentro uno step: le card sono gli step e le domande del piano.
- Uno step in Ready con una domanda ancora aperta, o uno deciso lasciato in Backlog.
- Fermarsi, ritentare o chiedere perché la board non risponde.
