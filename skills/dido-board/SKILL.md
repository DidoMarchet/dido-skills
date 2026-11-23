---
name: dido-board
description: Usare quando un piano di dido-planning viene approvato, cambia (step aggiunti, cambiati o tolti) o si riprende, quando una sua domanda si apre o ha risposta, quando uno step parte, è fatto o entra in un commit, e quando si parla della board, del GitHub Project, della board di Infinity o delle card degli step.
allowed-tools: Bash(node "${CLAUDE_SKILL_DIR}/board.mjs" *)
---

# La board del piano

La board del progetto segue il piano di dido-planning: una card per step e una per domanda aperta, che si spostano con il lavoro. Chi la guarda vede cosa è deciso e cosa no, cosa è in corso e cosa è fatto. Il piano resta la fonte: la card ne porta una copia da leggere sulla board, e dove non coincidono vale il piano. La board non ferma mai il lavoro.

Tutto passa da `board.mjs`, accanto a questo file. Risponde con righe che cominciano con `board:` ed esce sempre senza errore.

## Quale board

Di base la board è il GitHub Project collegato al repo. Se il repo ha `docs/plans/board.json`, la board è quella scritta lì:

```json
{
  "service": "infinity",
  "url": "https://app.startinfinity.com/b/<board>/<cartella>",
  "columns": { "Backlog": "Stopped", "Ready": "To-do", "In progress": "Doing", "In review": "Test", "Done": "Done", "archive": "Done" },
  "fields": { "Responsabile": "Davide Marchet", "Referente": "Lorenzo Furno", "Reparto": "Develop" },
  "priority": "Priorità"
}
```

- `service`: `github`, `infinity` o `none` (il progetto non ha una board).
- `url`: per Infinity, l'indirizzo della board aperta sulla cartella delle card, come nel browser.
- `columns`: la colonna della board per ogni stato della skill, se ha un altro nome; `archive` è dove va una card archiviata. Una colonna che non è nell'elenco lo script non la tocca.
- `fields`: per Infinity, i campi di ogni card: chi la prende, il referente, il reparto, con il nome dell'attributo della cartella. Una persona si scrive con il nome o l'email che ha nel workspace. Lo script li scrive sulle card nuove e su quelle dove sono vuoti.
- `priority`: per Infinity, l'attributo della priorità. La priorità di ogni card la decidi tu (vedi "La card").

`check` dice board, colonne e campi della cartella, e se file e token funzionano. Il token di Infinity è la variabile `INFINITY_TOKEN`, nei tre file env del progetto come le altre: così arriva su ogni computer con il repo. Lo script la legge dall'ambiente o, se lì non c'è, da `.env.local`.

Con la skill si usano sempre gli stati della tabella qui sotto: è lo script a portarli nella colonna giusta.

## Quando

| Cosa succede | Comando |
|---|---|
| Il piano è approvato | `sync` di tutti gli step, con title, body e todo: quelli decisi con lo stato Ready, gli altri senza stato; poi `sync` delle domande aperte |
| Riprendi un piano già avviato | `sync` degli step già partiti, con key e lo stato che dice "Dove siamo", e di quelli decisi in Ready; poi `sync` con title, body e todo di quelli che lo script dice mancanti, e delle domande aperte |
| Uno step entra nel piano o cambia il suo testo | `sync` di quello step, in Ready se è deciso |
| Una cosa da fare di uno step è fatta | `sync` di quello step con title, body e todo |
| Nel piano si apre una domanda | `sync` della domanda; gli step che aspettano la risposta, se erano in Ready, `move` in Backlog |
| Una domanda ha risposta, o arriva l'ok che uno step aspettava | la domanda `move` in Done; gli step che ora sono decisi `move` in Ready |
| Uno step parte | `move` in In progress |
| Uno step è fatto e verificato, con "Dove siamo" aggiornato | `move` in In review |
| Uno step entra in un commit | `move` in Done |
| Uno step finisce in "Cosa non si fa" | `archive` |

Uno step è **deciso** quando il piano è approvato, nessuna domanda aperta lo riguarda e non aspetta l'ok di chi lavora con te: allora sta in Ready, anche se nell'ordine del piano viene dopo. In Backlog restano gli step che aspettano una risposta o un ok, e le domande aperte. L'ordine lo dà il piano, non la colonna.

## Cosa risponde lo script

- `board: nessun Project collegato … e nessun docs/plans/board.json`: è l'inizio del progetto e nessuno ha detto quale board usa. Nel messaggio a chi lavora con te chiedi, una volta, se il progetto ha una board di Infinity e, se c'è, l'URL della board aperta sulla cartella, il nome di chi prende le card, quello del referente e il ruolo (il reparto: sviluppo, design…). Il lavoro va avanti senza aspettare. Con la risposta lancia `check`, scrivi `docs/plans/board.json` con le colonne e i campi che `check` elenca, e fai `sync` del piano. Se la board non c'è, scrivi `{ "service": "none" }`: non si chiede più.
- `board: nessun Project collegato…`, in ogni altro caso: il repo non ha una board. Per il resto della sessione non usare più la skill, e non dirlo.
- `board: non aggiornata: <motivo>`: la board non risponde o non si legge (GitHub, gh, Infinity, `docs/plans/board.json`). Per il resto della sessione non chiamare più lo script e scrivi il motivo in una riga del report. Non riprovare, non usare gh o l'API di Infinity da solo e non chiedere: il lavoro va avanti.
- `board: manca la card di …`: fai `sync` di quello step con title, body e todo, poi ripeti `move` se lo stavi spostando.
- `board: la cartella … non ha un campo checklist`: le card si fanno lo stesso, senza le cose da fare. Scrivi nel report, una volta, che con un campo checklist nella cartella di Infinity le cose da fare si vedono sulla board. Non metterle nel testo della card.
- Le altre righe dicono cosa è cambiato sulla board: non serve riportarle.

Della board non si scrive nel piano: "Dove siamo" resta la memoria del lavoro.

## La card

Una card per step, sottostep compresi (6b, 9b.1), con questi campi:

- **key**: `<piano> step <numero>`, come nei commit: `M5 step 3`, `M4 step 6h.1`. Il piano è il nome del suo file in `docs/plans/`, senza `.md`. Sulla board non sta nel titolo: lo script la scrive nell'ultima riga del testo ("Step 3 del piano M5") e da lì ritrova la card. Resta nel titolo solo in una cartella di Infinity senza campo di testo lungo, dove il testo non c'è.
- **title**: cosa si fa, in poche parole, come lo direbbe una persona che guarda la board: "Ricerca con Typesense", non "M5 step 9: Ricerca". Niente key, numero dello step o nome del piano, e niente titoli secchi come "Prove" o "Chiusura": deve essere unico nel piano.
- **body**: cosa fa lo step e perché, in una o due frasi, con le parole di chi guarda la board. I punti dello step non vanno qui, vanno in todo. Poi una riga vuota e queste due righe:

  ```
  Repo: <i repo che lo step tocca: app, backend, admin>
  Piano: <link al file del piano su GitHub>
  ```

  Il link viene dal remote del repo che ha il piano: `https://github.com/<owner>/<repo>/blob/<branch principale>/docs/plans/<piano>.md`.
- **todo**: le cose da fare dello step, una per voce: i suoi punti o, se non ne ha, le parti della sua frase. Ogni voce è `{ "text": "…", "done": true }`, con `done` vero per quelle che il piano dà per fatte ("Dove siamo"). Lo script le mette dove la board le mostra con le caselle da spuntare: su Infinity nel primo campo checklist della cartella (per esempio "Sub task"), su GitHub in fondo al testo.
- **priority**: solo se `docs/plans/board.json` ha `priority`, ogni volta che mandi title e body. La decidi tu dal piano: `Alta` se altri step aspettano questo o ha una scadenza, `Normale` se si può fare quando c'è tempo, `Media` negli altri casi.
- **status**: solo quando la tabella "Quando" lo dice. Uno step non ancora partito va solo tra Backlog e Ready, e solo per le ragioni della tabella: chi lavora con te può averlo spostato. Senza stato, una card nuova va in Backlog e una che c'è resta dov'è.

Una card per ogni domanda aperta del piano (sezione "Domande aperte" o domande segnate in un'altra parte del piano), così si vede cosa aspetta una risposta:

- **key**: `<piano> domanda <numero>`, con il numero che ha nel piano: `M5 domanda 2`.
- **title**: la domanda in poche parole.
- **body**: il testo della domanda, con la proposta se c'è, poi una riga `Step: <gli step che aspettano la risposta>` (o `Step: nessuno`) e le righe `Repo:` e `Piano:` come per uno step.
- **todo**: come per uno step, se la risposta chiede più passi.
- **priority**: come per uno step; `Alta` se uno step aspetta la risposta.
- **status**: Backlog finché è aperta, Done quando ha risposta.

## I comandi

```bash
node "${CLAUDE_SKILL_DIR}/board.mjs" sync - <<'EOF'
[
  { "key": "M5 step 3", "title": "Bibbia completa nell'app", "body": "Cosa fa lo step e perché…\n\nRepo: backend, app\nPiano: https://github.com/acme/app/blob/main/docs/plans/M5.md", "todo": [{ "text": "import dei libri nel backend", "done": true }, { "text": "lettura nell'app", "done": false }], "priority": "Alta" },
  { "key": "M5 step 4", "status": "Done" }
]
EOF
node "${CLAUDE_SKILL_DIR}/board.mjs" move "M5 step 3" "In progress"
node "${CLAUDE_SKILL_DIR}/board.mjs" archive "M5 step 3"
node "${CLAUDE_SKILL_DIR}/board.mjs" check
```

`sync` non crea doppioni: trova la card dalla key, cambia titolo, testo, cose da fare e priorità solo se sono diversi e la sposta solo se gli dai lo stato. title, body e todo vanno insieme: se ne mandi uno, la card prende quello che mandi e il resto resta vuoto; senza nessuno dei tre, una card che c'è tiene i suoi e una che manca non si crea. Le cose da fare sono una copia del piano: una spunta messa a mano sulla board la prossima `sync` la rimette come dice il piano. Le card scritte con la key nel titolo ("M5 step 3: …") si ritrovano lo stesso, e la prima `sync` con il testo le porta al titolo nuovo. Si può rilanciare quando serve. `check` dice a quale board è collegato il repo e la colonna di ogni stato. Su Infinity `archive` non cancella: porta la card nella colonna di `archive`.

## Errori da evitare

- Issue, label o card fatte a mano con gh o con l'API di Infinity: sulla board vanno solo le card di `board.mjs`, una per step e una per domanda aperta.
- Card per le cose minute dentro uno step: sono le sue cose da fare, in todo. Le card sono gli step e le domande del piano.
- Le cose da fare nel testo della card, con caselle come ☐, ☑ o "- [ ]": vanno in todo, e lo script le mette nel campo giusto.
- La key, il numero dello step o il nome del piano nel titolo.
- Uno step in Ready con una domanda ancora aperta, o uno deciso lasciato in Backlog.
- Fermarsi, ritentare o chiedere perché la board non risponde.
