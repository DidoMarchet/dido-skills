---
name: dido-code-style
description: Usare quando si scrive, modifica, rifattorizza, corregge, revisiona o analizza codice in un qualunque progetto di Dido (backend, frontend, script, configurazione, infrastruttura), e quando Dido chiede di analizzare o controllare un repo, un modulo o una cartella ("analizza il repo", "controlla che sia tutto ok").
---

# Stile e convenzioni di codice di Dido

Stai aiutando **Dido Marchet** a costruire applicazioni web. Segui queste convenzioni **alla lettera**: sono validate sui progetti di Dido in produzione, frontend Nuxt e uno starter backend Node con i progetti derivati.

| Compito | Cosa leggere |
|---|---|
| Scrivere o modificare codice | Parte 1 + la parte dello stack (3 backend, 4 Nuxt) |
| Revisionare una modifica, "trova bug" | Parte 1 + Parte 2 "Revisioni e caccia ai bug" |
| Analizzare un repo, un modulo o una cartella | Parte 2 "Analisi completa": lancia il workflow `repo-audit.js` che sta accanto a questo file |

Quando il `CLAUDE.md` del progetto è più specifico, vale quello.

---

# 1. Principi per ogni progetto e linguaggio

## Contesto e continuità

Il codice non si scrive mai nel vuoto: ogni modifica parte da ciò che c'è già, e lascia alla sessione successiva (persona o AI) la conoscenza di cosa è successo e perché.

**Prima di scrivere codice**

- Leggi il `CLAUDE.md` del progetto, le doc a cui rimanda e la memoria: lì ci sono decisioni, vincoli e limiti noti. Non riproporre ciò che è documentato come scartato o fuori scope (es. `docs/LIMITI-NOTI.md`) e non riaprire una decisione già presa.
- Scopri cosa è stato fatto prima nella zona che tocchi: `git log --oneline -- <path>`, i commit recenti, i commenti sul perché, i test collegati. Capisci perché il codice è fatto così prima di cambiarlo.
- Leggi tutto il flusso coinvolto, non solo la riga da cambiare: chiamanti, test, doc che lo descrivono. Cerca helper esistenti da riusare prima di scriverne di nuovi.
- Se il progetto ha gemelli derivati dallo stesso starter, guarda come hanno risolto lo stesso problema e segui la stessa convenzione.
- Se qualcosa non è chiaro o contraddice le doc, chiedi: non tirare a indovinare e non scavalcare in silenzio una decisione presa.

**Durante e dopo**

- Una decisione non ovvia va in un commento sul perché nel codice e, se cambia il modo in cui si lavora sul progetto, nel `CLAUDE.md` / nelle doc — nella stessa modifica, non dopo.
- Le doc descrivono il codice com'è dopo la modifica: cerca nel repo le parole chiave che hai toccato e aggiorna ogni occorrenza (tabelle riassuntive e diagrammi sono i soliti avanzi).
- I messaggi di commit dicono cosa è cambiato e perché, nella lingua del progetto.
- I fatti che codice e git non dicono (una decisione e il suo motivo, un vincolo, una scadenza, un riferimento esterno) vanno in memoria.
- Il report finale dice cosa è cambiato, cosa è stato verificato e cosa resta aperto, così il passo successivo parte dai fatti.

## Semplice e leggibile

- Scrivi il codice più semplice che risolve il requisito di **oggi**. Non il prossimo, non quello ipotetico.
- Tre righe simili valgono più di un'astrazione prematura. Estrai un helper quando ci sono punti di chiamata ripetuti reali, non prima.
- Niente factory, adapter, registry, classe base, sistema di plugin od opzione di configurazione con una sola implementazione o un solo utilizzatore. Eccezione: una seconda implementazione pianificata concretamente **e** scritta nel `CLAUDE.md` del progetto (es. storage dei file `local` → `s3`).
- Niente parametri, opzioni o flag che nessuno passa. Nessuna versione "generica" di una funzione specifica.
- Leggibile al primo sguardo: nomi che dicono cos'è una cosa, return anticipati invece di condizioni annidate, un solo compito per funzione, nessuna riga "furba" che ha bisogno di un commento per essere decifrata.

## Scalabile per costruzione, niente scalabilità prematura

Il codice continua a funzionare quando dati e traffico crescono: è progettazione, non ottimizzazione.

- Le liste che possono crescere sono paginate; le query prendono solo i campi che servono; nessuna query per elemento dentro un ciclo (N+1).
- Le colonne usate per filtrare, fare join o ordinare hanno un indice.
- Nessuno stato in memoria di processo che si rompe con più di un worker o di un container — oppure il limite è scritto nelle doc del progetto.
- File e dataset grandi vanno in streaming; nessuna chiamata bloccante (`*Sync`, crypto sincrona) nel percorso della richiesta.

Prematura è l'infrastruttura "per quando crescerà il traffico": cache, code, worker, microservizi, livelli in più. Si aggiungono quando una misura o un incidente reale lo chiede. Quando una cache o un'ottimizzazione c'è, un commento sopra dice perché (cosa è stato misurato, quanto dato vecchio è accettabile): leggilo prima di toccarla.

## Niente effetti collaterali nascosti

- Una funzione fa quello che dice il suo nome e nient'altro: `get`, `find`, `resolve`, `check`, `validate` non scrivono.
- Non modificare gli argomenti né lo stato condiviso del modulo; restituisci valori nuovi.
- Le scritture che devono riuscire insieme stanno in una transazione.
- Gli effetti esterni (email, webhook, chiamate a terzi, scritture di file) partono dopo che i dati sono salvati, mai dentro una transazione che può essere annullata.

## Niente codice morto

- Niente codice commentato, funzioni / export / import / variabili / dipendenze / variabili d'ambiente / chiavi di configurazione / file inutilizzati. La storia la tiene git.
- Niente percorsi di fallback per situazioni che non esistono più. Niente TODO per lavori che nessuno ha in programma.

## Quando cambi qualcosa, togli il vecchio

- Sostituisci X con Y → cancella X **nella stessa modifica**: codice, test, variabili d'ambiente (tutti i file env + compose), doc, spec dell'API, configurazione.
- Niente shim di retrocompatibilità se Dido non li chiede: niente alias deprecati, niente re-export dei vecchi nomi, niente rinomine in `_unused`, niente marcatori `// removed X`, niente doppia lettura di campo vecchio e nuovo.
- Prima di dire "tolto ovunque": grep con i confini di parola (`grep -rn '\bnome\b' src/ tests/ docs/`), non un pattern stretto. Test e query/filtri sono dove si nascondono gli avanzi.

## Una protezione per problema

- Se un bug o un rischio è già coperto da un meccanismo, non aggiungerne un secondo "per sicurezza".
- Niente gestione degli errori per casi impossibili: niente null check dopo una guardia che lancia già, niente try/catch attorno a codice che non può lanciare, niente ri-validazione di dati già validati a monte.
- Valida al confine (input utente, API esterne, variabili d'ambiente all'avvio), poi fidati del codice interno.

## Modifiche minime

- Un fix cambia le righe rotte, non il modulo. I refactor "già che ci sono" vanno in una modifica separata, e solo se Dido li chiede.
- Non riformattare, rinominare o riordinare codice che non ti è stato chiesto di toccare.
- Allineati al codice attorno: nomi, idiomi, struttura dei file, lingua e densità dei commenti.

## Commenti

- Commenta il **perché**, non il cosa.
- Una scelta non ovvia che c'è ha un commento che la spiega (es. `// Niente cache: ...`).
- Un'assenza voluta che qualcuno potrebbe "correggere" ha un breve commento sul perché manca (es. niente cache del transporter per via del cluster PM2). Non è un marcatore `// removed X`: spiega una decisione di progetto, non la storia.

## Testi

Ogni testo che una persona legge (interfaccia, email, messaggi d'errore, commenti, doc, report) si scrive quando a quella persona serve per fare qualcosa. Frasi brevi, con le parole che usa chi legge. Prima di scriverne uno nuovo leggi quelli che ci sono già (template, file delle lingue, email) e tieni lo stesso registro e lo stesso tu o lei.

In un'interfaccia una pagina, una sezione o una card ha titolo, contenuto e azioni. Sottotitoli, descrizioni e testi d'aiuto ci sono solo in tre casi:

- un campo vuole un formato o ha un limite che non si vede ("Massimo 10 MB");
- un'azione non si può annullare, e allora lo dice il dialog di conferma, non la pagina ("Eliminare l'account? Ordini e indirizzi non si recuperano.");
- qualcosa è andato storto, e il messaggio dice cosa e come rimediare ("Il file supera i 10 MB. Scegline uno più leggero.").

I bottoni dicono l'azione ("Salva", "Pubblica"), le label il nome della cosa.

Punteggiatura normale: punto, virgola, due punti, parentesi. Trattino lungo (—) e punto a metà altezza (·) al massimo uno per paragrafo; tra un termine e la sua spiegazione vanno i due punti.

## Test

- Ogni comportamento nuovo e ogni bug fix hanno un test che senza la modifica fallisce. Per un bug, scrivi prima il test e guardalo fallire.
- Testa il comportamento dall'interfaccia pubblica (rotta HTTP, componente renderizzato, output della CLI), non gli interni.
- Non modificare un test solo per farlo passare. Se il cambio di comportamento è voluto, dillo nella modifica.
- Se il progetto non ha un setup di test, dillo nel report; non aggiungere un framework di test senza che sia chiesto.

## Sicurezza in ogni modifica

Ogni modifica passa un controllo di sicurezza prima di essere chiamata fatta, proporzionato a ciò che tocca: un ritocco CSS non ne ha bisogno, un endpoint nuovo ha bisogno di tutto.

- **Input.** Ogni input esterno (body, query, parametri, header, cookie, file caricati, webhook, risposte di API di terzi) è validato al confine: tipo, formato, lunghezza, valori ammessi.
- **Autenticazione e autorizzazione.** Chi può chiamarlo? Il controllo sta sul server, mai solo nascosto nella UI. Un utente può arrivare ai dati di un altro cambiando un id? Un account disattivato o declassato perde l'accesso subito?
- **Esposizione dei dati.** Le risposte restituiscono solo i campi che servono: mai hash di password, token, OTP, segreti, stack trace o errori del driver in produzione. I log non contengono mai password, token od OTP.
- **Injection.** Niente SQL, comandi shell o HTML costruiti concatenando stringhe: query parametrizzate / ORM, template con escape, niente `v-html` / `innerHTML` su contenuti controllati dall'utente.
- **Segreti.** In env o cifrati a riposo; mai nel codice, nel repo, nei log o nel bundle client (`runtimeConfig.public` contiene solo valori pubblici per natura, es. token CMS in sola lettura).
- **Abusi.** Rate limit su tutto ciò che si può forzare o usare per spam (login, OTP, reset password, registrazione, upload, form di contatto). I token sono casuali, a scadenza e monouso. Le risposte di login e reset non rivelano se un account esiste.
- **File.** Controlla tipo e dimensione, salva con nomi generati, nessun percorso controllato dall'utente, contenuti privati scaricabili solo dietro autenticazione.
- **Trasporto e browser.** Allow-list CORS esplicita, cookie `HttpOnly` + `Secure` + il `SameSite` giusto, HTTPS in produzione.
- **Dipendenze.** Una dipendenza nuova deve servire davvero (non sostituibile con poche righe di codice), essere mantenuta e libera da vulnerabilità critiche note (`npm audit` / `pnpm audit`).

Poi:

- Prima di aggiungere una protezione, controlla cosa copre già quel rischio (`CLAUDE.md` del progetto, commenti nel codice): "una protezione per problema" vale anche per la sicurezza.
- Una falla introdotta dalla tua modifica si corregge nella stessa modifica. Una falla preesistente fuori dallo scope si segnala con scenario e gravità: non si lascia in silenzio e non si "sistema" con un refactor non richiesto.
- Il report finale ha una riga sul controllo di sicurezza: cosa è stato controllato e cosa è emerso (o "nessun problema").

## Fatto vuol dire verificato

- Non dire mai "fatto" o "funziona" senza averlo eseguito: test, lint e formattazione in sola verifica, build, il comando vero, l'endpoint vero. "Compila" non vuol dire "funziona".
- Dopo una modifica allo schema o al codice generato, rigenera prima di eseguire qualsiasi cosa (es. `npx prisma generate`).
- Riporta in modo esplicito cosa è stato verificato e cosa no, e perché (es. "DB spento, test non eseguiti: ecco come lanciarli").

## Campanelli d'allarme: fermati e correggi prima di andare avanti

| Pensiero | Realtà |
|---|---|
| "Tengo la vecchia funzione / il campo / la variabile per compatibilità" | Nessuno l'ha chiesto. Cancellala in questa modifica, con test e doc. |
| "La rendo configurabile / generica, potrebbe servire" | Un solo utilizzatore = nessuna astrazione. Scrivi la versione specifica. |
| "Aggiungo una cache / una coda, per sicurezza" | Niente misura, niente cache. |
| "Aggiungo un secondo controllo, non si sa mai" | Trova cosa lo copre già: una protezione per problema. |
| "Già che ci sono sistemo anche questo" | Modifica separata, e solo se Dido la chiede. |
| "Questo sembra sbagliato, lo cambio" | Leggi prima commenti, git log e doc: potrebbe essere una decisione. |
| "Compila, quindi è fatto" | Eseguilo, e riporta cosa hai eseguito. |
| "Le doc le aggiorno dopo" | Nella stessa modifica, o non succede mai. |

---

# 2. Revisioni e analisi

## Revisioni e caccia ai bug

Per la revisione di una modifica, o una richiesta come "trova bug":

- Parti dal presupposto che il codice funzioni: l'onere della prova sta sul problema segnalato.
- Riporta solo problemi di gravità Alta e Media (vedi "Gravità" sotto). Niente trovato → "ok" in una riga.
- Niente estetica, nomi, micro-semplificazioni, race teoriche o future-proofing, a meno che Dido li chieda. Mai aggiungere in fondo "e un paio di cose minori che ho notato".

## Analisi completa ("analizza il repo")

"Analizza il repo con la skill dido-code-style" (o un modulo, o una cartella) è la richiesta completa: Dido non elenca cosa controllare. Chiede esplicitamente ogni categoria della checklist qui sotto, quindi le restrizioni del progetto sugli audit per quelle categorie non valgono. L'estetica del codice resta fuori.

### Come lanciarla

Chiedere l'analisi con questa skill è il consenso all'esecuzione con più agenti.

1. Avvisa Dido in una riga: workflow in background, quanti agenti circa (uno ogni ~3000 righe di codice, più uno per i test e i verificatori). È lunga e costosa: decine di minuti e centinaia di migliaia di token anche per un modulo piccolo, milioni per un repo intero.
2. Lancia lo script del workflow che sta accanto a questo file (`${CLAUDE_SKILL_DIR}` è la cartella di questa skill, la base directory mostrata quando la skill si carica):
   ```
   Workflow({
     scriptPath: "${CLAUDE_SKILL_DIR}/repo-audit.js",
     args: {
       skill: "${CLAUDE_SKILL_DIR}/SKILL.md",
       memoryDir: "<cartella della memoria di questo progetto, se c'è>",
       scope: "<percorso o elenco di percorsi, solo per un modulo o una cartella>"
     }
   })
   ```
   Se `scriptPath` viene rifiutato, leggi lo script e passane il contenuto come `script`. Se lo strumento Workflow non esiste (un altro agente o un altro host), esegui tu le stesse fasi, nello stesso ordine, con dei subagenti se li hai.
3. Quando torna, scrivi dal suo risultato il report descritto sotto.

| Fase | Agenti | Lavoro |
|---|---|---|
| Contesto | 1 | `CLAUDE.md`, doc, memoria, limiti noti, git log → stack, comandi, scelte documentate, file divisi in gruppi di ~2500-4000 righe (con uno scope, più le doc che lo descrivono) |
| Analisi | 1 per gruppo | ogni file letto per intero e controllato con la checklist; una doc la confronta con il codice chi analizza quella doc |
| Test | 1 | test, lint e formattazione in sola verifica, build, typecheck, audit delle dipendenze, seguendo la procedura sicura del progetto; una prova di funzionamento dove non ci sono test automatici |
| Verifica | 2 per problema Alta/Media (un terzo se non concordano), 1 per gruppo per quelli Bassa | scettici che provano a smentire ogni problema con i criteri qui sotto; possono riprodurlo fuori dal repo |
| Completezza | quanti servono | i file non letti o non assegnati hanno un secondo giro |

### Checklist

- **Bug**: logica sbagliata, casi che capitano davvero ma non sono gestiti, percorsi di errore rotti, race con uno scenario riproducibile.
- **Effetti collaterali**: le regole di "Niente effetti collaterali nascosti" della Parte 1, più lo stato a livello di modulo condiviso tra richieste o worker.
- **Sicurezza**: la checklist "Sicurezza" della Parte 1, applicata a ogni punto d'ingresso.
- **Overengineering**: astrazioni con una sola implementazione o un solo utilizzatore, opzioni e parametri che nessuno passa, livelli che si limitano a inoltrare chiamate, configurazione che nessuno imposta.
- **Codice morto e avanzi**: file / export / funzioni / dipendenze / variabili d'ambiente / chiavi di configurazione inutilizzati, codice commentato, shim di compatibilità, resti di funzionalità sostituite in codice, test o doc. Va dimostrato: grep di ogni candidato in cerca di utilizzatori reali.
- **Semplicità e leggibilità**: codice che si può scrivere in modo sostanzialmente più semplice con lo stesso comportamento (mostra la versione più semplice), logica che duplica un helper esistente, nomi tanto fuorvianti da portare a usi sbagliati.
- **Scalabilità e prestazioni**: le regole di "Scalabile per costruzione" della Parte 1. Solo colli di bottiglia reali, non "aggiungiamo una cache / una coda per sicurezza".
- **Doc disallineate**: doc, spec dell'API, contratto per i client, `CLAUDE.md` che non corrispondono più al codice.
- **Test**: test che falliscono, flussi critici (auth, permessi, scritture di dati) senza test, test che non verificano niente.
- **Testi**: testi d'interfaccia, email e messaggi d'errore che non seguono "Testi" della Parte 1 (descrizioni e sottotitoli fuori dai tre casi, errori che non dicono cosa è successo, la stessa cosa chiamata in modi diversi, trattini e punti a metà altezza usati come separatori) e commenti che ripetono il codice. Una voce per file, con le righe.

### Verifica: un problema è smentito quando

- il codice non fa quello che il problema dice, o lo scenario non può verificarsi;
- è documentato come voluto, fuori scope o limite noto (`CLAUDE.md`, doc, file dei limiti noti, un commento sul perché, una decisione registrata dopo un'analisi precedente);
- il rischio è già coperto da un altro meccanismo ("una protezione per problema");
- è estetica del codice (nomi, ordine, formattazione), una micro-semplificazione senza un guadagno concreto, o "non è identico al file Y";
- è una race teorica o un caso limite senza scenario riproducibile, o future-proofing;
- la prova manca o non si riproduce.

Nel dubbio: smentito. Un problema che regge prende la gravità definita sotto, qualunque cosa abbia detto chi l'ha trovato. Alta e Media sopravvivono con 2 conferme su 3.

### Gravità

| Gravità | Cosa |
|---|---|
| Alta | perdita o corruzione di dati, falla di sicurezza, errore visibile agli utenti, sessioni o credenziali perse, lock-out |
| Media | stato incoerente in scenari documentati, retry o idempotenza rotti, collo di bottiglia reale, test che fallisce, doc dell'API che ingannano un client |
| Bassa | overengineering, codice morto e avanzi, semplificazione con un guadagno concreto, altre doc disallineate, flusso critico senza test, testi |

### Report

In italiano, in quest'ordine:

1. **Intestazione**: repo o scope, data, stack.
2. **Copertura**: file analizzati sul totale dei tracciati (pattern esclusi con il motivo), ogni comando con ✓ / ✗ / non eseguito (motivo e come lanciarlo), cosa non è stato controllato e perché.
3. **Alta**, **Media**, **Bassa**: una voce per problema, scritta per Dido. In grassetto il link `[file:line](link)` e il problema in poche parole, poi due o tre frasi con cosa succede e a chi, la prova e il fix minimo. Lo stesso problema trovato due volte è una voce sola. Per esempio:

   > **[orders.service.js:48](src/orders/orders.service.js#L48) Doppio clic, doppio ordine.** Due richieste ravvicinate creano due ordini, perché il controllo sul carrello già chiuso sta fuori dalla transazione. Riprodotto con due `POST /v1/orders` in parallelo. Fix: spostare il controllo dentro la transazione.

4. **Categorie senza problemi**: una riga che le elenca.
5. **Verifica**: quanti problemi sono stati smentiti (dettagli su richiesta) e quelli non verificati con il motivo.

Niente confermato: intestazione, "ok", copertura.

L'analisi non modifica il codice. Dopo, correggi ciò che Dido sceglie seguendo la Parte 1.

### Dopo il report

- Un problema che Dido scarta si registra con il motivo dove l'analisi successiva lo leggerà: un commento sul perché accanto al codice se è locale, altrimenti il file dei limiti noti del progetto o le regole di revisione nel `CLAUDE.md` (crea `docs/LIMITI-NOTI.md` se il progetto non ha né l'uno né l'altro). La fase Contesto li legge, quindi non viene riproposto.
- I fix seguono la Parte 1: prima il test di regressione, fix minimo, vecchio codice tolto, commit che dice cosa e perché.

---

# 3. Backend (Node, Express, Prisma)

Implementazione di riferimento: lo starter backend Node di Dido. I progetti derivati mantengono la stessa struttura.

## Stack

| Ambito | Strumento |
|---|---|
| Runtime | Node 22 (Alpine in Docker) |
| Gestore pacchetti | npm (`package-lock.json`) |
| Linguaggio | JavaScript puro, ESM (`"type": "module"`), niente TypeScript tranne `prisma.config.ts` |
| HTTP | Express 5 |
| Database | PostgreSQL 15 + Prisma 7 con `@prisma/adapter-pg` |
| Validazione | Zod |
| Gestore processi | PM2 in cluster (`pm2-runtime`) |
| Store condiviso | Redis, opzionale (contatori del rate limit) |
| Mail | nodemailer + Handlebars |
| Doc dell'API | OpenAPI servita su `/docs` e `/openapi.json` |
| Test | vitest + supertest, E2E su un Postgres reale |
| Deploy | Docker Compose: Coolify in produzione, Traefik + Dockge in locale |
| Lint / formattazione | ESLint + default di Prettier (virgolette doppie, punto e virgola) |

Commenti, messaggi d'errore e doc sono in **italiano**.

## Struttura del progetto

```
app/node/
├── src/
│   ├── app.js                 # buildApp(): middleware, health, router /v1, 404 JSON, error handler, niente listen
│   ├── index.js               # connect + listen + job periodici
│   ├── <module>/
│   │   ├── <module>.routes.js
│   │   ├── <module>.schema.js
│   │   ├── <module>.controller.js
│   │   └── <module>.service.js
│   ├── middleware/            # authenticate, error-handler, rate-limit
│   ├── config/                # permessi, versione dell'API, resolver della config runtime
│   ├── database/postgres/     # client Prisma
│   ├── docs/                  # spec OpenAPI, paths/, schemas/
│   └── utils/                 # errors.js (HttpError), campi Zod condivisi, paginazione
├── tests/                     # test E2E, fuori da src/
└── prisma/                    # schema.prisma + migrations/
```

`buildApp()` è separato da `index.js`, così i test importano l'app senza avviare il listener.

## Livelli

`routes → controller → service → Prisma → PostgreSQL`. **Nessun livello repository**: i service importano Prisma direttamente.

| File | Fa | Mai |
|---|---|---|
| `*.routes.js` | endpoint + middleware; commento in testa con l'elenco degli endpoint | logica |
| `*.schema.js` | schemi Zod del body della richiesta | regole di business che hanno bisogno del DB |
| `*.controller.js` | `schema.parse(req.body)` in cima, chiama il service, costruisce la risposta | chiamate Prisma |
| `*.service.js` | logica di business, lancia `HttpError` per gli errori di dominio | `req` / `res`, Zod, `res.status().json()` |

```js
// Express 5 passa le promise rifiutate all'error handler: niente try/catch nel controller
export const putFrontendUrl = async (req, res) => {
  const { url } = frontendUrlSchema.parse(req.body);
  await upsertFrontendUrl(url, req.auth.sub);
  res.json({ status: "ok", data: await resolveFrontendUrl() });
};
```

```js
// Nel service solo errori di dominio
if (!user) throw new HttpError(404, "Utente non trovato");
```

## Risposte e status code

- Successo: `{ "status": "ok" }`, più `data` quando c'è qualcosa da restituire (le liste paginate anche `pagination`) o `message` per una risposta informativa.
- Errore: `{ "status": "error", "error": "..." }` — anche per le rotte inesistenti (404 JSON) e per il 429.
- `400` input sbagliato (anche con un token valido), `401` solo per token / account / credenziali, `403` permesso negato, `404` non trovato, `409` conflitto.
- Un solo error handler globale traduce: `ZodError` → 400, `HttpError` → il suo status, Prisma `P2002` e `P2034` → 409, `P2025` → 404, tutto il resto → 500 con messaggio generico in produzione.

## Convenzioni

- **Costanti in un posto solo**: ruoli e permessi in `config/permissions.js`, versione dell'API in `config/api-version.js`. Mai stringhe di ruolo o il prefisso `/v1` scritti a mano.
- **Rotte versionate**: ogni rotta di dominio è montata sul sub-router `/v1`; health e doc restano senza versione.
- **Campi Zod condivisi** (`utils/zod-fields.js`): riusa `emailField` (trim + minuscole) e `passwordField`, non reimplementarli.
- **Variabili d'ambiente**: lo stesso nome in `.env.local`, `.env.production` e `.env.example`. Quelle obbligatorie in produzione bloccano l'avvio se mancano. Una variabile che nessuno legge più si toglie da tutti e tre i file e dai compose.
- **Prisma**: lo schema si cambia solo con le migration, mai a mano in SQL. `npx prisma generate` dopo ogni modifica a `schema.prisma`.
- **Adapter**: `<module>/storage/index.js` (factory) + `<driver>.js` solo quando un secondo driver è reale o scritto come pianificato.
- **Modifica dell'API** → nella stessa modifica si aggiornano la spec OpenAPI, il file di contratto per i client (`CLAUDE-ADMIN-CONTEXT.md`) e le doc coinvolte.

## Sicurezza

Meccanismi già presenti — usali, non duplicarli:

- **Ogni rotta non pubblica** usa `authenticate()` (staff, il default) o `authenticate({ type: PRINCIPAL_TYPES.CUSTOMER })`: il claim `type` del JWT separa le audience e il principal viene riletto dal DB a ogni richiesta, quindi disattivazione e cambi di ruolo hanno effetto subito. Nessuna cache davanti a quella lettura.
- **Permessi** più ristretti di `FULL_ACCESS_ROLES` si controllano in cima al controller (403), perché i ruoli con accesso completo superano il controllo `roles` di `authenticate()`.
- **Proprietà dei dati**: una rotta self-service prende l'id del principal da `req.auth.sub`, mai dal body o dall'URL.
- **`select` di Prisma** con l'elenco esplicito dei campi (es. `STAFF_SELECT`, `CUSTOMER_SELECT`): `passwordHash`, `otpHash` e i token non arrivano mai in una risposta.
- **Credenziali**: password con bcrypt (`auth/core/crypto.js`); OTP e token email salvati solo come sha256; il login con un utente inesistente esegue comunque bcrypt su un hash fittizio (stessi tempi, nessuna enumerazione degli account).
- **Rate limiter** in `middleware/rate-limit.js` su ogni endpoint che si può forzare o usare per spam; store Redis condiviso quando gira più di un processo.
- **Segreti** dalle env; i segreti runtime salvati in DB sono cifrati (AES-256-GCM, `config/runtime-crypto.js`) e l'API restituisce solo `hasPassword: bool`. `NODE_JWT_SECRET` e CORS sono validati all'avvio in produzione (fail fast).
- **Errori in produzione**: messaggio generico sul 500, i dettagli del driver solo nel log del server.
- **Audit log** per gli eventi rilevanti per la sicurezza (login e fallimenti, cambi di ruolo e di stato, modifiche di configurazione, eliminazioni); ogni nuovo tipo di evento documentato.

## Test

- E2E con supertest contro `buildApp()` con i path completi (`/v1/...`) e un Postgres reale — meglio un container usa e getta su un'altra porta, non il DB di sviluppo.
- Ogni file di test usa un prefisso univoco `test-<uuid>-` e `afterAll` cancella solo ciò che corrisponde.
- Niente parallelismo (`fileParallelism: false`): i vincoli unique andrebbero in conflitto.

---

# 4. Frontend (Nuxt, Vue)

## Stack

| Ambito | Strumento |
|---|---|
| Framework | Nuxt 4 (`nuxt: ^4.x`) |
| Gestore pacchetti | pnpm |
| Linguaggio | JS per composable e plugin, TS per i file di configurazione |
| Stato | Pinia, store in stile composition |
| GraphQL | @nuxtjs/apollo + `useGraphql()` personalizzato |
| API REST | composable `useApiFetch()` personalizzato |
| Form | FormKit + @formkit/nuxt |
| Animazioni | GSAP + Lenis |
| Mappe | Leaflet (solo client) |
| Carosello | Swiper |
| i18n | @nuxtjs/i18n |
| Reset CSS | the-new-css-reset |
| Tracciamento errori | Sentry (@sentry/vue + @sentry/vite-plugin) |
| Analytics | GTM con @saslavik/nuxt-gtm |
| Prestazioni | nuxt-delay-hydration |
| SEO aggiuntivo | nuxt-schema-org |
| Librerie SCSS | `scss-react` + `scss-slamp` (scritte da Dido) |
| Deploy | Netlify Edge + ISR |

---

## Struttura del progetto (Nuxt 4)

In Nuxt 4 tutti i sorgenti stanno dentro `app/`. I moduli di configurazione restano nella root del progetto.

```
project/
├── app/                                  ← ALL source files
│   ├── app.vue
│   ├── app.config.ts
│   ├── error.vue
│   ├── assets/
│   │   ├── js/
│   │   │   ├── utils.js                  # debounce, misc helpers
│   │   │   └── page-transitions/         # one GSAP file per page
│   │   │       ├── home.js
│   │   │       └── product.js
│   │   └── styles/scss/
│   │       ├── _core.scss                # @forward vars + mixins → injected globally
│   │       ├── vars/
│   │       │   ├── _index.scss           # @forward all
│   │       │   ├── _colors.scss
│   │       │   ├── _fonts.scss
│   │       │   ├── _spacing.scss
│   │       │   └── _timings.scss
│   │       ├── mixins/
│   │       │   ├── _index.scss
│   │       │   ├── _utility.scss         # scss-react + scss-slamp setup
│   │       │   ├── _fonts.scss
│   │       │   ├── _buttons.scss
│   │       │   ├── _links.scss
│   │       │   └── _input.scss
│   │       ├── layout/
│   │       │   ├── _setup.scss
│   │       │   ├── _layout.scss          # .row-*, .flex utilities
│   │       │   ├── _paddings.scss
│   │       │   ├── _margins.scss
│   │       │   ├── _images.scss
│   │       │   └── _visibility.scss
│   │       ├── typo/
│   │       │   ├── _setup.scss
│   │       │   ├── _heading.scss
│   │       │   ├── _text.scss
│   │       │   └── _cta.scss
│   │       └── globals/
│   │           ├── _lenis.scss
│   │           └── _formkit.scss
│   ├── bucket/                           # Static data: nav, filters, lists
│   │   └── navigations.js
│   ├── components/
│   │   └── [category]/
│   │       └── [name]/
│   │           ├── index.vue
│   │           └── style.scss
│   ├── composables/
│   │   ├── graphql.js
│   │   ├── api-fetch.js
│   │   ├── helpers.js
│   │   ├── lenis.js
│   │   └── seo.js
│   ├── graphql/
│   │   └── [cms]/                        # craft/, dato/, etc.
│   │       ├── queries/
│   │       │   ├── index.js              # re-exports all queries
│   │       │   └── [content-type].js
│   │       └── fragments/
│   │           └── [fragment-name].js
│   ├── layouts/
│   │   └── default.vue
│   ├── middleware/
│   │   ├── netlify-redirects.global.ts
│   │   └── remove-trailing-slash.global.ts
│   ├── pages/
│   │   ├── index.vue
│   │   └── [content-type]/[slug]/index.vue
│   ├── plugins/
│   │   ├── apollo.js
│   │   ├── animation-directives.client.js
│   │   ├── leaflet.client.js
│   │   └── sentry.client.js
│   ├── public/
│   ├── server/
│   │   └── api/
│   │       └── sitemap.js
│   ├── stores/                           # Pinia, always plural
│   │   └── [store-name].js
│   └── utils/
├── configuration/                        # Nuxt config split by concern, at root level
│   ├── apollo.ts
│   ├── app.ts
│   ├── build.ts
│   ├── css.ts
│   ├── delayHydration.ts
│   ├── devtools.ts
│   ├── experimental.ts
│   ├── formkit.ts
│   ├── gtm.ts
│   ├── i18n.ts
│   ├── modules.ts
│   ├── nitro.ts
│   ├── runtimeConfig.ts
│   ├── site.ts
│   ├── sitemap.ts
│   ├── sourcemap.ts
│   ├── ssr.ts
│   └── vite.ts
├── i18n/locales/
│   ├── it.js
│   └── en.js
├── nuxt.config.ts                        # thin: only spreads ./configuration/*
├── formkit.config.js
├── i18n.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── stylelint.config.mjs
└── vite.config.js                        # Sentry vite plugin
```

---

## nuxt.config.ts sempre snello

```ts
import apollo from './configuration/apollo'
import app from './configuration/app'
import build from './configuration/build'
import css from './configuration/css'
import delayHydration from './configuration/delayHydration'
import devtools from './configuration/devtools'
import experimental from './configuration/experimental'
import formkit from './configuration/formkit'
import gtm from './configuration/gtm'
import i18n from './configuration/i18n'
import modules from './configuration/modules'
import nitro from './configuration/nitro'
import runtimeConfig from './configuration/runtimeConfig'
import site from './configuration/site'
import sitemap from './configuration/sitemap'
import ssr from './configuration/ssr'
import vite from './configuration/vite'

export default defineNuxtConfig({
  ...apollo,
  ...app,
  ...build,
  ...css,
  ...delayHydration,
  ...devtools,
  ...experimental,
  ...formkit,
  ...gtm,
  i18n: {
    vueI18n: './i18n.config',
    ...i18n.i18n,
  },
  ...modules,
  ...nitro,
  ...runtimeConfig,
  ...site,
  ...sitemap,
  ...ssr,
  ...vite,
  compatibilityDate: '2025-xx-xx',
})
```

Ogni `configuration/*.ts` esporta un oggetto semplice. **Mai** configurazione inline in `nuxt.config.ts`.

---

## Schemi dei file di configurazione

```ts
// configuration/modules.ts
export default {
  modules: [
    '@nuxt/devtools',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
    '@nuxtjs/apollo',
    '@pinia/nuxt',
    '@formkit/nuxt',
    'nuxt-delay-hydration',
    '@saslavik/nuxt-gtm',
  ],
}
```

```ts
// configuration/experimental.ts
export default {
  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
  },
}
```

```ts
// configuration/runtimeConfig.ts
export default {
  runtimeConfig: {
    public: {
      enviroment: process.env.NODE_ENV,
      baseURL: process.env.SITE_URL,
      siteName: process.env.SITE_NAME,
      sentryURL: process.env.SENTRY_URL,
      gqlURL: process.env.GQL_URL,
      gqlApiKey: process.env.GQL_API_KEY,
    },
  },
}
```

```ts
// configuration/vite.ts
export default {
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use '~/assets/styles/scss/core' as *;`,
        },
      },
    },
    build: {
      sourcemap: process.env.NODE_ENV !== 'production',
    },
  },
}
```

```ts
// configuration/css.ts
export default {
  css: [
    'the-new-css-reset/css/reset.css',
    '~/assets/styles/scss/typo/index.scss',
    '~/assets/styles/scss/layout/index.scss',
    '~/assets/styles/scss/globals/index.scss',
  ],
}
```

```ts
// configuration/nitro.ts
export default {
  nitro: {
    routeRules: {
      '/**': { isr: true },                // ISR on all routes, no TTL: revalidate on deploy
      '/sitemap.xml': { prerender: true },
      // redirects:
      '/it/old-path/**': { redirect: { to: '/it/new-path', statusCode: 301 } },
    },
    prerender: {
      autoSubfolderIndex: true,
      concurrency: 1,
      interval: 1,
      failOnError: false,
      crawlLinks: true,
      routes: ['/', '/sitemap.xml'],
      retries: 4,
      retryDelay: 1000,
    },
    preset: 'netlify-edge',
  },
}
```

```ts
// configuration/i18n.ts
// NOTE: this is the only config file that types its export explicitly
import type { NuxtI18nOptions } from '@nuxtjs/i18n'

const i18n: { i18n: NuxtI18nOptions } = {
  i18n: {
    baseUrl: process.env.SITE_URL ?? '',
    defaultLocale: 'it',
    langDir: 'locales',
    locales: [
      { code: 'it', language: 'it-IT', name: 'Italiano', file: 'it.js' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.js' },
    ],
    strategy: 'prefix_except_default',  // default locale has no URL prefix
    detectBrowserLanguage: false,
    pages: {
      contacts: { it: '/contatti', en: '/contacts' },
      'projects/index': { it: '/progetti', en: '/projects' },
      'projects/[slug]/index': { it: '/progetti/[slug]', en: '/projects/[slug]' },
    },
  },
}

export default i18n
```

---

## Convenzione dei componenti

Ogni componente vive nella sua cartella, sempre con due file:

```
components/widget/accordion/index.vue
components/widget/accordion/style.scss
```

**Doppio blocco script**, schema voluto:

```vue
<template>
  <!-- markup -->
</template>

<script>
export default {
  name: 'WidgetAccordion',
}
</script>

<script setup>
const props = defineProps({
  items: Array,
})
</script>
```

Regole:
- **Niente tag `<style>`** nei `.vue`: gli stili stanno sempre nel `style.scss` accanto
- **Niente TypeScript** nei file `.vue` e nei composable (voluto)
- **Prefisso `Lazy`** per i componenti pesanti: `<LazyPagesHomeProjects />`
- **Importati in automatico**: mai importare i componenti a mano

---

## app.vue

```vue
<template>
  <div>
    <NuxtLayout>
      <NuxtLoadingIndicator :color="'#000'" />
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Init smooth scroll and provide to all children
const { lenis } = useLenis()
provide('lenis', lenis)

// Fetch global CMS config, always with an explicit key
await useAsyncData('site-configuration', () => useStore().fetchConfiguration())

const { locale } = useI18n()
watch(() => locale.value, async () => {
  await useAsyncData('site-configuration', () => useStore().fetchConfiguration())
})
</script>
```

---

## error.vue

```vue
<template>
  <div>
    <NuxtLayout>
      <div class="page page-error">
        <div v-html="error.statusCode === 500 ? $t('errors.500.text') : $t('errors.404.text')" />
        <NuxtLink :to="$localePath({ name: 'index' })" external>Home</NuxtLink>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup>
const props = defineProps({
  error: { type: Object, required: true },
})

console.error(props.error)  // keep: required to surface the error

const { lenis } = useLenis()
provide('lenis', lenis)
</script>
```

---

## layouts/default.vue

```vue
<template>
  <main class="layout-default">
    <NavigationMenu />
    <SeoTemplatePreset>
      <slot />
    </SeoTemplatePreset>
    <FooterMain />
  </main>
</template>

<script setup></script>
```

Un solo layout per tutta l'app: navigazione, cursore e footer stanno qui.

---

## Architettura SCSS

### scss-react per i breakpoint

Repo: https://github.com/DidoMarchet/scss-react

```scss
/* mixins/_utility.scss */
@use 'sass:list';
@use 'sass:string';
@use 'scss-react/dist/index';
@use 'scss-slamp/dist/index';

$react_breakpoints: (
  '<medium':   (max-width: 749px),
  '<large':    (max-width: 999px),
  'landscape': (orientation: landscape),
  'portrait':  (orientation: portrait),
);
```

Uso:
```scss
.component {
  width: 100%;

  @include react('<medium') {
    width: 50%;
  }

  @include react('landscape') {
    height: auto;
  }
}
```

### scss-slamp per le dimensioni fluide

Repo: https://github.com/DidoMarchet/scss-slamp

Scala un valore in modo fluido tra `min` e `max` in base alla larghezza del viewport. Default: root=16px, min-vp=480px, max-vp=1600px.

```scss
font-size:  slamp(18px, 32px);
padding:    slamp(16px, 100px);
margin-top: slamp(40px, 120px);
gap:        slamp(8px, 24px);
```

### Sistema di moduli con `@use` e `@forward` (mai `@import`)

```scss
/* vars/_index.scss */
@forward 'colors';
@forward 'fonts';
@forward 'spacing';
@forward 'timings';

/* mixins/_index.scss */
@forward 'utility';
@forward 'fonts';
@forward 'buttons';
@forward 'links';
@forward 'input';

/* _core.scss, injected globally via Vite additionalData */
@forward 'vars/index';
@forward 'mixins/index';
```

I `style.scss` dei componenti ricevono variabili e mixin in automatico: non serve importarli.

### Sistema di layout

```scss
/* layout/_layout.scss */
%row {
  box-sizing: content-box;
  margin-left: auto;
  margin-right: auto;
}

.row-1 {
  @extend %row;
  padding-left: slamp(16px, 100px);
  padding-right: slamp(16px, 100px);
  max-width: 1600px;

  .row-1 { padding: 0; width: 100%; }  // nested row resets its own padding
}

.row-2 {
  @extend %row;
  padding-left: slamp(16px, 400px);
  padding-right: slamp(16px, 400px);
  max-width: 1170px;
}

.row-3 {
  @extend %row;
  padding-left: slamp(16px, 800px);
  padding-right: slamp(16px, 400px);
  max-width: 700px;
}

.flex { display: flex; align-items: flex-start; }
.flex.--column                { flex-direction: column; }
.flex.--align-center          { align-items: center; }
.flex.--align-right           { align-items: flex-end; }
.flex.--justify-space-between { justify-content: space-between; }
.flex.--justify-center        { justify-content: center; }
.flex.--justify-end           { justify-content: flex-end; }
.flex-1 { flex: 1; }
```

### Tipografia

```scss
/* typo/_heading.scss */
.title-xl { font-size: slamp(40px, 75px); }
.title-l  { font-size: slamp(32px, 60px); }
.title-m  { font-size: slamp(24px, 48px); }
.title-s  { font-size: slamp(18px, 32px); }
```

---

## Composable

Tutti i composable sono `.js`, niente TypeScript. Scelta voluta.

### useGraphql, il wrapper delle query GraphQL

```js
// composables/graphql.js
export const useGraphql = async (query, variablesInput, options = { executeSSR: true }) => {
  const data = ref(null)
  const loading = ref(false)

  // Accept both reactive and plain objects
  const variables = isRef(variablesInput) ? variablesInput : ref(variablesInput)

  const executeQuery = async (vars) => {
    try {
      loading.value = true
      const result = await useAsyncQuery(query, vars, { fetchPolicy: 'cache-and-network' })
      data.value = result.data.value
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  if (options.executeSSR) await executeQuery(variables.value)

  watch(() => variables.value, (newVars) => executeQuery(newVars))

  return { data, loading }
}
```

### useApiFetch, API REST con retry e refresh del token

```js
// composables/api-fetch.js

// Retry only network errors of idempotent methods: a POST or PATCH may have reached
// the server before the connection dropped, and once a response has arrived the
// request already happened, and repeating it would duplicate it.
const RETRYABLE_METHODS = ['GET', 'HEAD', 'PUT', 'DELETE']

export const useApiFetch = ({ endpoint = '', initialToken = null, refreshTokenFunction = null } = {}) => {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)
  const authToken = ref(initialToken)

  const fetchWithRetry = async (url, options, retries = 3) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(url, options).catch((e) => {
        if (retries > 0 && RETRYABLE_METHODS.includes(options.method)) return null
        throw e
      })
      if (!response) return await fetchWithRetry(url, options, retries - 1)
      if (!response.ok) {
        if (response.status === 401 && retries > 0 && refreshTokenFunction) {
          await refreshTokenFunction()
          options.headers.Authorization = `Bearer ${authToken.value}`
          return await fetchWithRetry(url, options, retries - 1)
        }
        error.value = response
        return response
      }
      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('application/pdf')) return await response.blob()
      const result = await response.json()
      data.value = result
      return result
    } catch (e) {
      error.value = e
      return e
    } finally {
      loading.value = false
    }
  }

  const request = async ({ method = 'GET', api = '', params = {}, headers = {}, token = null } = {}) => {
    const usedToken = token || authToken.value
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(usedToken ? { Authorization: `Bearer ${usedToken}` } : {}),
        ...headers,
      },
      body: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.stringify(params) : null,
    }
    const base = endpoint.replace(/\/+$/, '')
    const path = api.replace(/^\/+/, '')
    const url = method === 'GET' && Object.keys(params).length
      ? `${base}/${path}?${new URLSearchParams(params)}`
      : `${base}/${path}`
    return fetchWithRetry(url, opts)
  }

  return {
    data, error, loading, request,
    setToken: (t) => (authToken.value = t),
    clearToken: () => (authToken.value = null),
  }
}
```

### useLenis per lo scroll fluido

```js
// composables/lenis.js
export const useLenis = () => {
  const lenis = ref(null)

  onMounted(() => {
    lenis.value = new Lenis()
    lenis.value.on('scroll', ScrollTrigger.update)
    window.lenis = lenis.value  // intentional: page transition files use window.lenis (non-Vue context)
    gsap.ticker.add((time) => lenis.value.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  })

  onUnmounted(() => lenis.value?.destroy())

  return { lenis }
}
```

### useSeo per SEO e hreflang

```js
// called in page <script setup>
useSeo({
  title: 'Page Title',
  meta: [{ name: 'description', content: '...' }],
  link: [],
  localeParams: { it: { slug: 'slug-it' }, en: { slug: 'slug-en' } },
  market: [{ slug: 'it' }, { slug: 'en' }],  // hreflang fallback (CMS-driven)
})
```

Risultato: `"${title} | ${siteName} ${market}"` + tag OG + hreflang + `setI18nParams()`.

---

## Gestione dello stato con Pinia in stile composition

```js
// stores/index.js
import { defineStore } from 'pinia'
import queries from '@/graphql/craft/queries/index.js'

export const useStore = defineStore('store', () => {
  const { locale } = useI18n()
  const configuration = ref(null)

  const fetchConfiguration = async () => {
    const { data } = await useAsyncQuery(queries.site.getConfig, { locale: locale.value })
    configuration.value = data.value
  }

  return { configuration, fetchConfiguration }
})
```

---

## Struttura delle pagine

```vue
<!-- pages/product/[slug]/index.vue -->
<template>
  <div class="page page-product">
    <div class="page__wrap" data-animate="page-wrap">
      <PagesProductHeader :header="product.header[0]" />
      <div data-animate="page-content">
        <LazyPagesProductSpecifications :specs="product.specifications" />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'PageProduct' }
</script>

<script setup>
import queries from '@/graphql/craft/queries/index.js'
import { onBeforeEnter, onEnter, onLeave } from '~/assets/js/page-transitions/product.js'

definePageMeta({
  layout: 'default',
  pageTransition: {
    onBeforeEnter: (el) => onBeforeEnter(el),
    onEnter: async (el, done) => {
      const tl = onEnter(el, done)
      await tl.delay(0.5).play()
      done()
    },
    onLeave: async (el, done) => {
      const tl = onLeave(el)
      await tl.play()
      window.lenis.scrollTo(0, { immediate: true })
      done()
    },
  },
})

// storeToRefs keeps it reactive: app.vue refetches the configuration on locale change
const { configuration } = storeToRefs(useStore())
const variables = computed(() => ({
  site: configuration.value.site,
  slug: useRoute().params.slug,
}))

const { data } = await useGraphql(queries.product.getProduct, variables)

if (!data.value?.productEntries?.[0]) throw createError({ statusCode: 404 })

const product = computed(() => data.value.productEntries[0])

useSeo({
  ...product.value.seo,
  meta: [{ name: 'description', content: product.value.seo?.description }],
})
</script>
```

---

## Transizioni di pagina

Un file per pagina in `assets/js/page-transitions/`. Target standard: `data-animate="page-wrap"` e `data-animate="page-content"`.

```js
// assets/js/page-transitions/product.js
import { gsap } from 'gsap'

export const onBeforeEnter = (el) => {
  gsap.set('[data-animate="page-wrap"]', { opacity: 0 })
}

export const onEnter = (el, done) => {
  return gsap.timeline({ paused: true })
    .to('[data-animate="page-wrap"]', { opacity: 1, duration: 0.5, ease: 'power2.out' })
}

export const onLeave = (el) => {
  return gsap.timeline({ paused: true })
    .to('[data-animate="page-wrap"]', { opacity: 0, duration: 0.3, ease: 'power2.in' })
}
```

---

## Direttive di animazione (plugin solo client)

```js
// plugins/animation-directives.client.js
import { revealText } from '~/plugins/animation-directives/reveal-text.js'
import { scrollSpeed } from '~/plugins/animation-directives/scroll-speed.js'
import { parallaxElement } from '~/plugins/animation-directives/parallax-element.js'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('anim-reveal-text', {
    mounted(el) { revealText(el) },
  })
  nuxtApp.vueApp.directive('anim-scroll-speed', {
    mounted(el, binding) { scrollSpeed(el, binding) },
  })
  nuxtApp.vueApp.directive('anim-parallax-element', {
    mounted(el, binding) { parallaxElement(el, binding) },
  })
})
```

Uso: `v-anim-reveal-text`, `v-anim-scroll-speed`, `v-anim-parallax-element`.

---

## Plugin Sentry (solo client)

```js
// plugins/sentry.client.js
import * as Sentry from '@sentry/vue'
import { browserTracingIntegration } from '@sentry/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const { public: { sentryURL, enviroment } } = useRuntimeConfig()

  if (!sentryURL) { console.warn('Missing Sentry dsn'); return }

  Sentry.init({
    app: nuxtApp.vueApp,
    environment: enviroment,
    dsn: sentryURL,
    integrations: [browserTracingIntegration({ router })],
    tracesSampleRate: 1.0,
  })
})
```

---

## Organizzazione delle query GraphQL

```js
// graphql/craft/queries/index.js
import * as home from './home.js'
import * as product from './product.js'
import * as news from './news.js'

export default { home, product, news }
```

```js
// graphql/craft/queries/product.js
import { seoFragment } from '../fragments/seo.js'

export const getProduct = gql`
  ${seoFragment}
  query GetProduct($site: [String], $slug: [String]) {
    productEntries(site: $site, slug: $slug) {
      id
      title
      slug
      seo { ...SeoFragment }
    }
  }
`
```

Fetch policy di Apollo: sempre `cache-and-network`.

---

## Dati statici in `bucket/`

Link di navigazione, array di filtri, liste di paesi, configurazione statica → `app/bucket/` come semplici export JS. Mai negli store, mai nel CMS.

```js
// bucket/navigations.js
export const navMenu = {
  linksMain: [
    { key: 'products', route: { name: 'products' } },
    { key: 'projects', route: { name: 'projects-index' } },
  ],
}
```

---

## Linting

### eslint.config.mjs

```js
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default createConfigForNuxt({})
  .append(
    {
      files: ['**/*.js', '**/*.ts', '**/*.vue'],
      plugins: { prettier: prettierPlugin },
      rules: {
        'vue/multi-word-component-names': 'off',
        'no-console': 'off',
        'no-undef': 'off',
        'prettier/prettier': 'error',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    prettierConfig,
    { ignores: ['node_modules/**', '.nuxt/**', '.output/**', 'dist/**', 'public/**'] }
  )
```

### stylelint.config.mjs

```js
export default {
  ignoreFiles: ['node_modules/**', 'dist/**', 'public/**', '.nuxt/**', '.output/**'],
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-standard-vue/scss',
  ],
  rules: {
    'selector-max-compound-selectors': 6,
    'selector-class-pattern': null,
    'function-name-case': null,
    'selector-id-pattern': null,
    'selector-pseudo-element-no-unknown': null,
    'keyframes-name-pattern': null,
    'custom-property-no-missing-var-function': null,
    'color-function-notation': 'legacy',
    'selector-no-qualifying-type': null,
    'alpha-value-notation': 'number',
    'no-descending-specificity': null,
  },
}
```

---

## Riepilogo Nuxt

1. **`nuxt.config.ts` snello**: configurazione in `configuration/`, mai inline
2. **Sorgenti in `app/` (Nuxt 4)**: pagine, componenti, composable e store tutti dentro `app/`
3. **`stores/` al plurale**, convenzione di Nuxt
4. **Componente = cartella**: `categoria/nome/index.vue + style.scss`, niente `<style>` nei `.vue`
5. **Doppio blocco script**: `<script>` per il `name`, `<script setup>` per la logica (voluto)
6. **Composable e plugin in `.js`**: niente TypeScript nei composable e nei plugin (voluto)
7. **SCSS con `@use`/`@forward`**, mai `@import` (deprecato in Dart Sass)
8. **`slamp()` per le dimensioni**: fluide, mai px fissi per ciò che deve scalare
9. **`@include react()`** con al massimo 2 breakpoint (`<medium`, `<large`) + 2 orientamenti
10. **Layout `.row-1/2/3`**: larghezze di contenuto standard, non wrapper personalizzati
11. **`window.lenis`**: impostato da `useLenis()`, usato nelle transizioni di pagina fuori dal contesto Vue (corretto)
12. **`bucket/` per i dati statici**: navigazione, filtri, liste. Non store, non CMS
13. **Suffisso `.client.js`** per leaflet, sentry e direttive di animazione
14. **Transizioni di pagina** in `assets/js/page-transitions/[page].js`, una per pagina
15. **`useAsyncData` con chiave esplicita**, sempre, per evitare mismatch di idratazione SSR
16. **ISR senza TTL**: `{ isr: true }` voluto, si rivalida al redeploy
17. **`cache-and-network`** come fetch policy di Apollo ovunque
