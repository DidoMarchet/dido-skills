---
name: dido-board
description: Usare quando un piano di dido-planning viene approvato, cambia (step aggiunti, cambiati o tolti) o si riprende, quando una sua domanda si apre o ha risposta, quando uno step parte, è fatto o entra in un commit, quando la milestone si chiude, e quando si parla della board, del GitHub Project, della board di Infinity o delle card degli step.
allowed-tools: Bash(node "${CLAUDE_SKILL_DIR}/board.mjs" *)
---

# La board del piano

La board del progetto segue il piano di dido-planning: una card per step e una per domanda aperta, che si spostano con il lavoro. Chi la guarda vede cosa è deciso e cosa no, cosa è in corso e cosa è fatto, chi fa cosa e di che tipo è. Sul GitHub Project ogni card è una issue del repo, che si chiude quando arriva in Done. Il piano resta la fonte: la card ne porta una copia da leggere sulla board, e dove non coincidono vale il piano. La board non ferma mai il lavoro.

Tutto passa da `board.mjs`, accanto a questo file, anche leggere la board. Risponde con righe che cominciano con `board:` (`show` con le card in JSON) ed esce sempre senza errore.

## Quale board

Di base la board è il GitHub Project collegato al repo. Se il repo ha `docs/plans/board.json`, la board è quella scritta lì:

```json
{
  "service": "infinity",
  "url": "https://app.startinfinity.com/b/<board>/<cartella>",
  "columns": { "Backlog": "Stopped", "Ready": "To-do", "In progress": "Doing", "In review": "Test", "Done": "Done", "archive": "Done" },
  "fields": { "Responsabile": "Davide Marchet", "Referente": "Lorenzo Furno", "Reparto": "Develop" },
  "assignee": "Responsabile",
  "priority": "Priorità",
  "type": "Tipo",
  "milestone": "Milestone"
}
```

- `service`: `github`, `infinity` o `none` (il progetto non ha una board).
- `url`: per Infinity, l'indirizzo della board aperta sulla cartella delle card, come nel browser.
- `columns`: la colonna della board per ogni stato della skill, se ha un altro nome; `archive` è dove va una card archiviata. Una colonna che non è nell'elenco lo script non la tocca.
- `fields`: i campi di ogni card: chi la prende, il referente, il reparto. Su Infinity con il nome dell'attributo della cartella, e una persona con il nome o l'email che ha nel workspace. Su GitHub con il nome del campo del Project, e chi prende la card con il suo login. Lo script li scrive sulle card nuove e su quelle dove sono vuoti.
- `assignee`: quale campo di `fields` dice chi prende la card. Su GitHub diventa l'assegnatario della issue; uno step può darne un altro (vedi "La card").
- `priority`: l'attributo della priorità su Infinity, il campo a scelta del Project su GitHub. La priorità di ogni card la decidi tu.
- `type` e `milestone`: solo per Infinity, l'attributo etichetta del tipo e quello della milestone; senza, la card non li ha. Su GitHub il tipo è quello della issue e la milestone quella del repo, sempre.

Su GitHub lo script non crea campi del Project: Referente, Reparto e Priorità si aggiungono una volta a mano al Project, con lo stesso nome che hanno in `fields` e `priority`.

`check` dice board, colonne, campi e, su GitHub, i tipi delle issue del repo, e se file e token funzionano. Il token di Infinity è la variabile `INFINITY_TOKEN`, nei tre file env del progetto come le altre: così arriva su ogni computer con il repo. Lo script la legge dall'ambiente o, se lì non c'è, da `.env.local`.

Con la skill si usano sempre gli stati della tabella qui sotto: è lo script a portarli nella colonna giusta.

## Quando

| Cosa succede | Comando |
|---|---|
| Il piano è approvato | `sync` di tutti gli step, con title, body e todo: quelli decisi con lo stato Ready, gli altri senza stato; poi `sync` delle domande aperte |
| Riprendi un piano già avviato | `sync` degli step già partiti, con key e lo stato che dice "Dove siamo", e di quelli decisi in Ready; poi `sync` con title, body e todo di quelli che lo script dice mancanti, e delle domande aperte |
| Uno step entra nel piano o cambia il suo testo | `sync` di quello step, in Ready se è deciso |
| Una cosa da fare di uno step è fatta | `sync` di quello step con key e todo: le voci che `show` dà per la sua card, spuntate come dice il piano |
| Nel piano si apre una domanda | `sync` della domanda; gli step che aspettano la risposta, se erano in Ready, `move` in Backlog |
| Una domanda ha risposta, o arriva l'ok che uno step aspettava | la domanda `move` in Done; gli step che ora sono decisi `move` in Ready |
| Uno step parte | `move` in In progress |
| Uno step è fatto e verificato, con "Dove siamo" aggiornato | `move` in In review |
| Uno step entra in un commit | `move` in Done |
| Uno step finisce in "Cosa non si fa" | `archive` |
| Chi lavora con te chiude la milestone del piano | `close-milestone <piano>` |

Uno step è **deciso** quando il piano è approvato, nessuna domanda aperta lo riguarda e non aspetta l'ok di chi lavora con te: allora sta in Ready, anche se nell'ordine del piano viene dopo. In Backlog restano gli step che aspettano una risposta o un ok, e le domande aperte. L'ordine lo dà il piano, non la colonna.

## Cosa risponde lo script

- `board: nessun Project collegato … e nessun docs/plans/board.json`: è l'inizio del progetto e nessuno ha detto quale board usa. Nel messaggio a chi lavora con te chiedi, una volta, se il progetto ha una board di Infinity e, se c'è, l'URL della board aperta sulla cartella, il nome di chi prende le card, quello del referente e il ruolo (il reparto: sviluppo, design…). Il lavoro va avanti senza aspettare. Con la risposta lancia `check`, scrivi `docs/plans/board.json` con le colonne e i campi che `check` elenca, e fai `sync` del piano. Se la board non c'è, scrivi `{ "service": "none" }`: non si chiede più.
- `board: nessun Project collegato…`, in ogni altro caso: il repo non ha una board. Per il resto della sessione non usare più la skill, e non dirlo.
- `board: non aggiornata: <motivo>`: la board non risponde o non si legge (GitHub, gh, Infinity, `docs/plans/board.json`). Per il resto della sessione non chiamare più lo script e scrivi il motivo in una riga del report. Non riprovare, non usare gh o l'API di Infinity da solo e non chiedere: il lavoro va avanti.
- `board: manca la card di …`: fai `sync` di quello step con title, body e todo, poi ripeti `move` se lo stavi spostando.
- `board: campi non scritti: …` o un problema tra parentesi accanto a una card (un login che non si può assegnare, un campo o un'etichetta che non c'è): le card si fanno lo stesso. Scrivi nel report, una volta, cosa manca e dove si aggiunge.
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
- **type**: ogni volta che mandi title e body. Lo decidi tu dal piano: `Bug` se lo step corregge un difetto, `Feature` se aggiunge una funzione che chi usa il prodotto vede, `Task` per il resto (design, decisioni, prove, revisione, chiusura).
- **assignee**: solo se lo step dice chi lo prende ("Chi: lorenzo"), con quel nome o login. Senza, la card va a chi dice `board.json`.
- **milestone**: solo se lo step dice una milestone diversa dal suo piano. Senza, è il piano della key: `M5 step 3` sta nella milestone `M5`.
- **status**: solo quando la tabella "Quando" lo dice. Uno step non ancora partito va solo tra Backlog e Ready, e solo per le ragioni della tabella: chi lavora con te può averlo spostato. Senza stato, una card nuova va in Backlog e una che c'è resta dov'è.

Una card per ogni domanda aperta del piano (sezione "Domande aperte" o domande segnate in un'altra parte del piano), così si vede cosa aspetta una risposta:

- **key**: `<piano> domanda <numero>`, con il numero che ha nel piano: `M5 domanda 2`.
- **title**: la domanda in poche parole.
- **body**: il testo della domanda, con la proposta se c'è, poi una riga `Step: <gli step che aspettano la risposta>` (o `Step: nessuno`) e le righe `Repo:` e `Piano:` come per uno step.
- **todo**: come per uno step, se la risposta chiede più passi.
- **priority**: come per uno step; `Alta` se uno step aspetta la risposta.
- **type**: `Domanda`.
- **status**: Backlog finché è aperta, Done quando ha risposta.

## I comandi

```bash
node "${CLAUDE_SKILL_DIR}/board.mjs" sync - <<'EOF'
[
  { "key": "M5 step 3", "title": "Bibbia completa nell'app", "body": "Cosa fa lo step e perché…\n\nRepo: backend, app\nPiano: https://github.com/acme/app/blob/main/docs/plans/M5.md", "todo": [{ "text": "import dei libri nel backend", "done": true }, { "text": "lettura nell'app", "done": false }], "priority": "Alta", "type": "Feature", "assignee": "lorenzo" },
  { "key": "M5 step 4", "status": "Done" },
  { "key": "M5 step 2", "todo": [{ "text": "rotta dei libri", "done": true }, { "text": "test della rotta", "done": true }], "status": "Done" }
]
EOF
node "${CLAUDE_SKILL_DIR}/board.mjs" show M5
node "${CLAUDE_SKILL_DIR}/board.mjs" show "M5 step 2"
node "${CLAUDE_SKILL_DIR}/board.mjs" move "M5 step 3" "In progress"
node "${CLAUDE_SKILL_DIR}/board.mjs" archive "M5 step 3"
node "${CLAUDE_SKILL_DIR}/board.mjs" close-milestone M5
node "${CLAUDE_SKILL_DIR}/board.mjs" check
```

Su GitHub creare una card vuol dire tre chiamate, di circa due secondi l'una: la `sync` di un piano intero dura qualche minuto. Lanciala dandole fino a dieci minuti. Se si interrompe, rilanciala uguale: riparte senza doppioni.

`sync` non crea doppioni: trova la card dalla key, cambia titolo, testo, cose da fare e priorità solo se sono diversi e la sposta solo se gli dai lo stato. Di title, body e todo cambia solo quello che mandi: con key, todo e status la card tiene titolo e testo. todo è sempre la lista intera, e una card che manca si crea solo con il title. Le cose da fare sono una copia del piano: una spunta messa a mano sulla board la prossima `sync` con todo la rimette come dice il piano. Le card scritte con la key nel titolo ("M5 step 3: …") si ritrovano lo stesso, e la prima `sync` con il testo le porta al titolo nuovo. Su GitHub le bozze del Project fatte prima delle issue diventano issue alla prima `sync`, nella stessa colonna. Si può rilanciare quando serve. `check` dice a quale board è collegato il repo e la colonna di ogni stato.

`show` dà le card della board in JSON, nella forma che vuole `sync`: key, title, body, todo e status. Senza altro le dà tutte, con il nome di un piano quelle del piano, con una key quella dello step. Serve quando ti manca quello che la card ha già, come le voci scritte da un'altra sessione: le prendi da lì, cambi quello che serve e rimandi a `sync` solo quello. Le card archiviate non le dà. Una card senza key non è della skill: non toccarla.

Su GitHub `move` in Done chiude la issue, e in un'altra colonna la riapre; `archive` la chiude come non pianificata e la toglie dalla board, e lo step che torna nel piano riprende la stessa issue. Su Infinity `archive` non cancella: porta la card nella colonna di `archive`, e `close-milestone` non fa niente, perché lì la milestone è un'etichetta.

## Errori da evitare

- Issue, label, milestone o card fatte a mano con gh o con l'API di Infinity, anche per sistemare quello che lo script dice di non aver scritto: sulla board vanno solo le card di `board.mjs`, una per step e una per domanda aperta.
- La board letta con gh, con l'API di Infinity o con uno script tuo che usa i file della skill: si legge con `show`.
- Card per le cose minute dentro uno step: sono le sue cose da fare, in todo. Le card sono gli step e le domande del piano.
- Le cose da fare nel testo della card, con caselle come ☐, ☑ o "- [ ]": vanno in todo, e lo script le mette nel campo giusto.
- La key, il numero dello step o il nome del piano nel titolo.
- Uno step in Ready con una domanda ancora aperta, o uno deciso lasciato in Backlog.
- Fermarsi, ritentare o chiedere perché la board non risponde.
