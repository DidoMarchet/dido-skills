# Prove delle skill: il giro di validazione v1

> 11/11/2026. Piano: [docs/plans/validazione-v1.md](../docs/plans/validazione-v1.md). Come si rilanciano le prove: [README.md](README.md). Le prove di dido-goal hanno il loro [REPORT.md](dido-goal/REPORT.md).

## In breve

- `v1.0` è il tag delle skill dell'11/11 (`f3c727f`).
- Dopo, un giro ridotto su 6 scenari che lavorando non si vedono finché non fanno danni: file env, permessi e campi di un endpoint nuovo, rate limit per account, servizio opzionale, rilascio di un lavoro non committato e di uno già committato. Solo con le skill, 2 sessioni per scenario, 3 dove serviva decidere. In tutto 17 sessioni, 39 $, più 0,7 $ di due sessioni di prova degli strumenti.
- 4 scenari passano al primo giro. 2 no: le loro due regole sono state corrette e, rilanciate, passano 2 su 2.
- Le regole cambiate sono due, quindi le skill diventano `v1.0.1`: i file env in dido-code-style e il rate limit per account in dido-backend.

## Risultati

| Skill | Scenario | Verifiche | Tempo medio | Costo medio |
|---|---|---|---|---|
| dido-code-style | sostituire una funzione che usa una variabile d'ambiente | prima 5 su 6 (la #4 in 0 sessioni su 2), dopo 6 su 6 in 2 su 2 | 120 s, poi 152 s | 1,02 $, poi 1,20 $ |
| dido-backend | un endpoint nuovo riservato al SUPERADMIN | 7 su 7 in 2 su 2 | 372 s | 3,18 $ |
| dido-backend | un rate limit chiesto per account | prima la #1 in 1 sessione su 3, dopo 6 su 6 in 2 su 2 | 427 s, poi 73 s | 2,74 $, poi 0,81 $ |
| dido-backend | un servizio opzionale senza la sua variabile | 8 su 8 in 2 su 2 | 580 s | 3,55 $ |
| dido-rilascio | un lavoro non committato | 10 su 10 in 2 su 2 | 387 s | 3,87 $ |
| dido-rilascio | un lavoro già committato dall'utente | 5 su 5 in 2 su 2 | 176 s | 1,78 $ |

## Per skill

### dido-code-style: i file env

Richiesta: passare l'invio delle email da Sendgrid a Postmark, con il token in `POSTMARK_SERVER_TOKEN`.

- **Prima.** In 2 sessioni su 2 il vecchio invio sparisce ovunque e i tre chiamanti vanno su Postmark (lo prova un fetch finto). `SENDGRID_API_KEY` resta con il suo valore in tutti e tre i file env, come vuole la regola. Ma le sessioni riscrivono il blocco: mettono Postmark al posto di Sendgrid, spostano Sendgrid in fondo con un commento nuovo e cambiano il commento che c'era. La regola diceva cosa non togliere, non come si aggiunge una variabile.
- **Cosa è cambiato.** In "File env" di `skills/dido-code-style/SKILL.md`: "La modifica è la sua riga, più un commento sopra se il nome non basta: il resto del file resta com'è, riga per riga, comprese le variabili che il codice non legge più e i loro commenti." Lo stesso in una riga in `OVERVIEW.md`.
- **Dopo.** 2 sessioni su 2: nei file env cambia solo la riga di `POSTMARK_SERVER_TOKEN` con il suo commento.

### dido-backend

**Endpoint nuovo** (`GET /v1/admin/customers/:id/export`, solo SUPERADMIN). Nello starter i due ruoli dello staff hanno accesso completo e scavalcano il controllo sulla rotta, quindi un permesso più stretto va controllato nel controller. In 2 sessioni su 2:
- il test nascosto dà 200 al SUPERADMIN, 403 all'ADMIN_GENERALE, 401, 404 e 400;
- nella risposta non c'è nessun hash;
- la rotta è nella spec e ha il suo test E2E;
- l'export lascia un evento nell'audit, documentato;
- il lint non ha problemi nuovi.

**Servizio opzionale** (notifica Slack dei 500). In 2 sessioni su 2:
- senza la variabile l'app parte e `/health` risponde 200;
- la variabile è nei tre file env e nient'altro cambia;
- nessuna dipendenza nuova;
- un webhook che non risponde non cambia la risposta e c'è il test che lo prova.

**Rate limit chiesto per account.**
- **Prima.** In 2 sessioni su 3 c'è un contatore per email con un'eccezione per i browser che hanno già fatto login (un cookie firmato), più 5-6 test e le doc di 7 file. La terza sessione si è fermata a chiedere, ma consigliava la stessa soluzione. Tutte e tre citavano la regola ("lo vietano sia AD-06 sia le regole del backend"), poi la aggiravano perché la richiesta diceva "per account". Da un browser nuovo il titolare resta comunque fuori.
- **Cosa è cambiato.** In "Rate limit" di `skills/dido-backend/SKILL.md`: "Un'eccezione per i browser già usati non lo toglie: da un browser nuovo il titolare resta fuori." E: "Se chi lavora con te chiede un limite per account, prima di scrivere codice spiegagli il lock-out, digli cosa copre già quel rischio e proponi il limite per IP o per challenge. Poi fai quello che sceglie." Lo stesso in una riga in `OVERVIEW.md`.
- **Dopo.** 2 sessioni su 2 si fermano prima del codice. Spiegano il lock-out, dicono cosa copre già il rischio (l'OTP dello staff, attivo di default e legato alla challenge, e il limite per IP) e propongono un limite per IP o per coppia email e IP. Tempo e costo scendono da 427 s e 2,74 $ a 73 s e 0,81 $.

### dido-rilascio

**Lavoro non committato** (l'export con un bug messo apposta: gli hash nella risposta; un piano; una riga su Mailpit scritta da un'altra sessione). In 2 sessioni su 2:
- il revisore riceve richiesta, criteri e base, legge il diff vero e trova gli hash (Alto);
- il fix arriva con un test che fallisce sul codice di prima;
- il commit ha solo i file del lavoro e la riga su Mailpit resta fuori, com'era;
- la suite completa gira una volta, "Dove siamo" è aggiornato, niente push, e alla fine la sessione chiede l'ok.

**Lavoro già committato dall'utente** (lo stesso lavoro, con lo stesso bug, nell'ultimo commit di `main`).
- Una sessione prende come base il commit prima di quello dell'utente, rivede, trova gli hash e corregge in un commit nuovo.
- L'altra si ferma, dice che il diff è vuoto e chiede quale base usare.
- Nessuna dice "ok" su un diff vuoto, nessuna riscrive il commit dell'utente.

## Ricontrolli e scelte fatte senza chiedere

- **Giudizi.** Ho riletto sul transcript le verifiche fallite e le tre date vere su prove indirette. Ne ho cambiata una: la #3 della prima sessione del rate limit, da falsa a vera. Dice "con l'OTP la password indovinata da sola non basta", lo stesso che in un'altra sessione era stato giudicato vero. Il giudizio del valutatore resta in `verdicts-valutatore.json` dell'iterazione.
- **Endpoint.** Il piano partiva dalla chiusura di una sola sessione di un customer, ma lo starter ce l'ha già: l'ho cambiato con l'export riservato al SUPERADMIN.
- **Strumenti.** Gli script di `evals/dido-goal/bin` sono passati in `evals/bin` per tutte le skill. Rifatti sulle sessioni della versione 4 di dido-goal danno gli stessi esiti (30 controlli su 30, 56/62). La prova a secco e il giro hanno trovato quattro difetti, tutti corretti prima di contare:
  - lo spazio non separabile prima di "€" perso nella copia di un controllo;
  - un file non tracciato già presente alla partenza contato come cambiato;
  - il confronto con l'albero di partenza fatto sull'indice;
  - il tempo delle sessioni con il revisore in background, che contava solo l'ultima ripresa.

## Limiti noti

- Niente braccio senza skill: queste prove dicono che le regole tengono, non quanto valgono rispetto a Claude senza skill.
- 2 sessioni per scenario: una differenza di una sessione non dice molto.
- Rate limit dopo la correzione: le sessioni si fermano a chiedere, quindi la #1 passa perché non c'è codice. Cosa fanno dopo la scelta non è provato.
- La correzione dei file env non è stata riprovata sul servizio opzionale, che controlla la stessa cosa e passava già 2 su 2.
- Le copie dello starter hanno `node_modules` collegato, `scripts/ai-check.mjs` spento e il commit dello starter fissato (`ce067ee`). Le sessioni girano senza il "trust" della cartella, quindi ignorano le 4 regole `permissions.allow` del progetto: gli strumenti consentiti li dà `--allowedTools`.
- Fino alla versione 4, le sessioni di dido-goal giravano dentro dido-skills e potevano leggerne l'`AGENTS.md`, in tutti e due i bracci. Ora tutte le sessioni girano in `~/dido-evals/`.

## 12/11/2026: le prove E2E durante il lavoro

Caso vero: in un'app installabile le prove E2E partivano solo dalla build, circa tre minuti a giro, e la doc del progetto diceva di lanciare così anche una prova sola. In un passo di lavoro le build inutili sono state otto. La regola diceva già "suite completa e build una volta, alla chiusura", ma non nominava le E2E.

Scenario `dido-code-style/e2e-dev-server`: un'app di note con le E2E solo sulla build (un minuto, una riga in `.build-log` a ogni build) e un difetto su "Annulla" da correggere e provare con le E2E. 3 sessioni per giro, solo con la skill.

- **Prima.** 3 sessioni su 3 correggono il difetto, ma fanno build durante il lavoro: 2, 1 e 2. Due lanciano la prova singola dalla build ("come previsto da `docs/dev-and-verify.md`"), poi tutta la suite sulla build. La terza prova sul dev server con una config temporanea fuori dal repo, ma alla fine rifà tutta la suite sulla build. Tempo 155-225 s.
- **Cosa è cambiato.** In "Fatto vuol dire verificato" di `skills/dido-code-style/SKILL.md`: le E2E durante il lavoro sul dev server, solo quelle della modifica; se il progetto le lancia solo dalla build, si aggiunge il modo di lanciarle sul dev server; sulla build tutte alla chiusura, e durante il lavoro solo quelle di ciò che c'è solo lì. Un campanello d'allarme con la scusa vista nelle sessioni. Il passo 5 di `dido-rilascio` dice che le E2E complete girano sulla build. Lo stesso in `OVERVIEW.md`.
- **Dopo.** 3 sessioni su 3: nessuna build, correzione giusta (prova nascosta sul dev server), la prova E2E nuova vista fallire prima e passare dopo, su Chromium e WebKit. Tutte aggiungono `npm run test:e2e:dev` al progetto, con la riga nella doc, e scrivono nel report che la suite sulla build va lanciata alla chiusura. Tempo 73-86 s, costo uguale (0,74 $ a sessione).
- **Le altre prove delle due skill**, rilanciate con le regole nuove, 2 sessioni per caso: file env 6 su 6, rilascio di un lavoro non committato 10 su 10, rilascio di un lavoro già committato 5 su 5 (le due sessioni si fermano e dicono che il diff è vuoto). Il valutatore ha giudicato la #3 del lavoro non committato da prove indirette (il rapporto del revisore non è nel pacchetto); il test nascosto conferma che il difetto è stato trovato e corretto.
- In tutto 12 sessioni, circa 15 $.

## Come rilanciare le prove di una skill

Dalla cartella `evals/`. Le copie dello starter backend sono di `~/Desktop/Dido Git Test/starterkit-backend-platform-coolify`, o di `BACKEND_STARTER`.

```bash
bash dido-code-style/make-fixtures.sh
bin/launch.sh ~/dido-evals/code-style-1 with_skill 2 dido-code-style/env-sostituzione dido-code-style/e2e-dev-server
bin/launch.sh ~/dido-evals/backend-1 with_skill 2 dido-backend/export-superadmin dido-backend/rate-limit-account dido-backend/servizio-opzionale
bin/launch.sh ~/dido-evals/rilascio-1 with_skill 2 dido-rilascio/non-committato dido-rilascio/gia-committato
python3 bin/grade.py ~/dido-evals/backend-1 prepare
# il valutatore, con il prompt di dido-goal/README.md, scrive blind/verdicts.json
python3 bin/grade.py ~/dido-evals/backend-1 merge
for run in ~/dido-evals/backend-1/*/*/*/run-*; do bin/backend-db.sh stop "$run"; done
```

Costo indicativo a sessione: 1 $ per dido-code-style, 3-4 $ per il backend, 2-4 $ per il rilascio.

## Dove sono arrivate le correzioni

Tag `v1.0.1` (`9447933`), l'11/11 sera. `ai:update` le ha portate nei tre starter e nei progetti che hanno le skill, con la CI verde dove c'è e nessun avviso di `ai-check`.

## 12/11/2026: niente hover sul touch

Caso vero: in un sito il mixin `hover-press` accendeva lo stato di hover anche con `:active`, fuori dalla condizione del puntatore, come chiedeva la regola ("Lo stesso stato vale alla pressione"). Sul telefono le card cambiavano foto al tocco, e su iPhone lo still life che compariva con `:active` faceva del tocco un hover: il clic sulle card delle collezioni non partiva. Dido: "NO HOVER SU MOBILE".

Scenario `dido-frontend-nuxt/hover-touch`: sulla copia dello starter Nuxt, la card dello studio diventa un link con un hover (fondo grigio chiaro, titolo sottolineato). La verifica #1, da script, cerca nei file di stile toccati un `:hover`, o un `:active` che cambia altro che `transform` o `cursor`, fuori da `react("pointer-and-hover")`. 2 sessioni per giro, solo con la skill.

- **Prima.** 2 sessioni su 2 scrivono il mixin di hover con `&:active { @content; }` fuori dalla condizione (#1 0 su 2). Lint pulito. 395 s, 2,65 $ a sessione.
- **Cosa è cambiato.** In "Stile" di `skills/dido-frontend-nuxt/SKILL.md`: sul touch niente hover, neanche alla pressione; hover e il suo `:active` dentro la condizione del puntatore, anche nei mixin, e un hover in JavaScript legge la stessa condizione o il `pointerType`; sul touch l'unico riscontro è la stretta dei pulsanti pieni. Lo stesso in una riga di `OVERVIEW.md` e in `docs/conventions.md` dello starter Nuxt. La verifica #7 di `componente-cambiato`, che chiedeva lo stesso stato alla pressione, dice ora "con il puntatore; sul touch nessuno stato di hover".
- **Dopo.** 2 sessioni su 2: `&:hover, &:active` dentro `react("pointer-and-hover")`, lint pulito. 264 s, 1,85 $.
- **L'altra prova della skill**, `componente-cambiato`, rilanciata: #7 2 su 2 con la regola nuova, #1-#5 2 su 2, #6 1 su 2. La #6 mancata non dipende dalla regola: il valutatore non vedeva lo script delle schermate della sessione, che ha guardato la card a 375 e 1440 (#5).
- In tutto 6 sessioni, circa 12,5 $.

## 20/11/2026: le skill da rivedere nel report

Il problema: le regole cambiano solo per un caso visto in un lavoro vero, ma nessuno raccoglie i casi. Quando chi lavora con l'agente lo corregge su qualcosa che una skill dice, l'agente si adegua e la skill non lo sa.

Scenario `dido-code-style/correzione-test`, in due turni su `shop-api`: prima "nella mail di conferma aggiungi quanti articoli sono stati ordinati", poi la correzione "per i testi delle email non voglio test, togli quello che hai aggiunto". La correzione va contro la regola "Ogni comportamento nuovo ha un test". La verifica #1 chiede che il messaggio finale segnali il caso per la skill, con regola, cosa è stato fatto e cosa andava fatto; giudicata leggendo ogni messaggio finale. Scenario di controllo `senza-correzione`: solo il primo turno, il report non deve parlare di skill. 3 sessioni per giro, solo con le skill. Per i due turni `run-case.sh` legge ora `followup.md`.

- **Prima.** 0 sessioni su 3 segnalano il caso. Tutte e tre tolgono il test, mettono un commento nel codice e salvano la preferenza nella memoria del progetto: la skill resta com'è.
- **Cosa è cambiato.** In "Durante e dopo" di `skills/dido-code-style/SKILL.md`, dopo il report: la sezione "Skill da rivedere" quando chi lavora con te ti ha corretto su qualcosa che una skill `dido-*` dice diversamente o non dice, quando una regola andava contro la richiesta o un'altra regola, o quando non sapevi come applicarla; per ogni caso skill e regola, cosa hai fatto, cosa andava fatto; la skill non la tocca l'agente. Lo stesso in una riga di `OVERVIEW.md`.
- **Dopo.** `correzione-test` 3 su 3: la sezione c'è e nomina "Test" di dido-code-style, i test scritti e la preferenza sui testi delle email. `senza-correzione` 3 su 3 senza la sezione e senza cenni alle skill. Nessun commit.
- In tutto 9 sessioni, circa 9 $ (il costo delle sessioni in due turni è la somma dei due `result`: `extract.py` conta solo l'ultimo).

## 23/11/2026: le cose da fare nei subtask di Infinity

Caso vero: su bici.pro Dido ha chiesto card "comprensibili, con gli item dei todo". Lo script di dido-board scriveva solo titolo, testo, colonna, campi e priorità, e la sessione ha messo le cose da fare nel testo della card, con ☑ e ☐, mentre la cartella di Infinity ha un campo checklist "Sub task" rimasto vuoto. Dido: "perché crei subtask dentro la descrizione e non dei veri subtask?". Prima, sempre su richiesta di Dido, la sessione aveva tolto la key dai titoli ("readable-frontend step"), usando il titolo come key.

Scenario `dido-board/infinity-cose-da-fare`: il piano M1 già avviato, con i punti di ogni step e lo stato in "Dove siamo"; la board finta ha il campo checklist "Sub task", come quella di bici.pro; la richiesta è quella di Dido. Le verifiche, tutte da script: una card per step (#1), le cose da fare nel "Sub task" con le spunte di "Dove siamo" (#2), niente caselle nel testo (#3), titoli senza key (#4), niente chiamate fuori dallo script e nessun commit (#5). Il "prima" gira su una copia della skill presa prima della modifica (`BOARD_SKILL`).

- **Prima.** 2 sessioni su 2 con il "Sub task" vuoto (#2 0 su 2) e i titoli "M1 step N: …" (#4 0 su 2). Una scrive: "lo script della board non sa scrivere le checklist di Infinity". 109 s, 0,80 $ a sessione.
- **Cosa è cambiato.** `sync` accetta `todo: [{ text, done }]`: su Infinity va nel primo campo checklist della cartella (l'API vuole un id UUID per voce, verificato su una board vera di prova), su GitHub in fondo al testo come lista `- [x]`; una cartella senza checklist lo dice in una riga. Il titolo è quello da persona e la key va nell'ultima riga del testo ("Step 3 del piano M5"), da cui lo script ritrova la card; le card con la key nel titolo si ritrovano ancora e la prima sync le porta al formato nuovo. In `SKILL.md`: titolo da persona, testo in una o due frasi, i punti in todo, la riga della tabella "Una cosa da fare di uno step è fatta". Lo stesso in `OVERVIEW.md`. Le verifiche 01 e 02 degli altri casi dicevano il titolo "M1 step N: …": ora dicono la riga dello step, perché la regola è cambiata. Il controllo delle chiamate a Infinity non conta più come chiamata un comando che guarda solo se `INFINITY_TOKEN` c'è.
- **Dopo.** `infinity-cose-da-fare` 3 su 3 su tutte le verifiche, 58 s, 0,54 $. Gli altri sei casi di dido-board, una sessione ciascuno, tutti passati.
- Le prove dello script (`board.test.mjs`): 48, tutte passate; sulla skill di prima ne falliscono 26, tra cui tutte le nuove.
- **Revisione.** L'agente `revisore` ha trovato un problema Medio: in una cartella di Infinity senza testo lungo la riga dello step non si scrive, e ogni `sync` faceva una card nuova. Lì la key resta nel titolo, con una prova.
- In tutto 11 sessioni, circa 6 $.
