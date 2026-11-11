# Piano validazione-v1: v1.0 subito, poi un giro ridotto sui difetti che lavorando non si vedono

> Stato: **approvato l'11/11/2026**, "Fai A e B": A è il tag `v1.0` adesso, B il giro ridotto.
> Riguarda dido-skills (`skills/`, `evals/`) e, solo se B cambia una skill, i tre starter con `ai:update`. Lo stato sta in "Dove siamo", in fondo a questo piano.

## Cosa si chiede e cosa si fa

| Voce | Cosa si fa |
|---|---|
| A. Tag `v1.0` sulle skill di oggi | Tag su `f3c727f`, lo stesso commit di `origin/main`. Push del tag con il tuo ok |
| B. Giro ridotto sui difetti che lavorando non si vedono finché non fanno danni | 6 scenari: file env, permessi e campi di un endpoint nuovo, rate limit per account, servizio opzionale, rilascio di un lavoro non committato e di uno già committato. Solo con le skill, 2 sessioni `claude -p` ciascuno |
| Correggere solo ciò che fallisce | Stesso scenario prima e dopo, al massimo due giri; il resto va nel report come limite noto |
| Poi una regola cambia solo per un caso vero che fallisce | Il report dice come si aggiunge uno scenario e come si rilanciano le prove di una skill |

Il giro completo (24 scenari, con e senza, 400-650 $) è scartato: costa troppo per difetti che in gran parte si vedono lavorando. Niente braccio senza skill: serve a dimostrare il valore delle skill, non a trovare difetti.

**Si chiude quando**:

- le 12 sessioni e quelle delle correzioni sono valutate, con i conteggi ricontrollati da me;
- ogni verifica passa, o è nel report tra i limiti noti;
- `evals/REPORT.md` ha per ogni scenario l'esito, tempo e costo, cosa è cambiato e con quale prova, i limiti e come rilanciare;
- se una skill è cambiata, con il tuo ok: commit, push, tag `v1.0.1` e `ai:update` nei tre starter con commit e push, CI del backend verde.

Le richieste e il testo delle verifiche qui sotto non cambiano dopo. Le soglie in numeri sono mie.

## Come gira una prova

- Gli script di `evals/dido-goal/bin` passano in `evals/bin` e servono a tutte le skill: copie degli starter, Postgres per sessione, chiamate e rapporti dei subagenti, controlli di ogni skill in `evals/<skill>/checks.py`. dido-goal li usa da lì; lo provo rifacendo `grade.py` sulle sessioni della sua versione 4, senza sessioni nuove.
- `claude -p` con Opus 5.5, permessi `acceptEdits`, strumenti Bash, Read, Edit, Write, Glob, Grep, Skill, Agent. Superpowers acceso. Le skill `dido-*` come in un progetto: quelle dell'utente e, nelle copie dello starter, quelle di `skills/` di questo repo.
- Le sessioni girano in `~/dido-evals/`, fuori da ogni repo: Claude Code legge anche i `CLAUDE.md` delle cartelle sopra.
- Copie dello starter backend: `git clone --local`, senza remote, `node_modules` collegato, `scripts/ai-check.mjs` spento (porterebbe a `ai:update`, che rimetterebbe le skill di GitHub), un Postgres per sessione con nome e porta suoi. Negati: `git push`, installazioni, `prisma generate`, `ai:update`, `docker rm`, `stop` e `kill`, `docker compose`, `make up-dev` e `down-dev`. Le modifiche di preparazione stanno nel commit della fixture.
- Prima delle 12 sessioni, una prova a vuoto: hook e guardia attivi, `/dido-rilascio` disponibile, niente scritture nello starter vero.
- Valutazione: `grade.py` controlla le verifiche [S]; un agente che non ha visto il lavoro giudica le [G] sul pacchetto; io rileggo sul transcript ogni verifica fallita e una passata su quattro.
- I test nascosti girano solo in valutazione. Ognuno si prova prima: fallisce sulla fixture, passa sulla mia soluzione di riferimento.

[S] la controlla lo script, [G] il valutatore. C1 [S]: nessun commit e nessun `git push`.

## Scenari e verifiche

**CS1. dido-code-style: sostituire una funzione che usa una variabile d'ambiente** (`shop-api`, repo Node piccolo con storia git: invio con Sendgrid da tre chiamanti, tre file env). Origine: il 16/10 variabili tolte dai file env come codice morto e poi rimesse.
Richiesta: `Passiamo da Sendgrid a Postmark per le email. Sostituisci l'invio con Sendgrid con quello via API di Postmark; il token sta in POSTMARK_SERVER_TOKEN.`

1. [S] `src/mailer/sendgrid.js` non c'è più, e `grep -rni sendgrid` fuori dai tre file env non trova niente.
2. [S] I tre chiamanti usano la funzione nuova.
3. [S] `POSTMARK_SERVER_TOKEN` c'è in `.env.example`, `.env.local` e `.env.production`.
4. [S] Nei file env l'unica differenza è quella riga: `SENDGRID_API_KEY` e gli altri valori restano.
5. [S] `npm test` passa e un test esercita l'invio con Postmark.
6. C1.

**BE1. dido-backend: un endpoint nuovo riservato a un ruolo** (starter backend). Trappola vera dello starter: i due ruoli dello staff hanno accesso completo e scavalcano il controllo della rotta, quindi un permesso più stretto va controllato nel controller (`src/config/permissions.js`).
Richiesta: `Il backoffice deve poter scaricare i dati di un customer quando li chiede per email (GDPR): GET /v1/admin/customers/:id/export, con lo stesso contenuto dell'export che il customer fa da solo. Solo il SUPERADMIN.`

1. [S] Test nascosto: SUPERADMIN 200 con `profile` e `sessions` del customer; ADMIN_GENERALE 403; senza token 401; customer che non esiste 404; id non valido 400.
2. [S] Test nascosto: nella risposta nessun hash né segreto (`passwordHash`, `otpHash`, `otpChallengeHash`, `tokenHash`), né il valore dell'hash della password.
3. [S] `tests/openapi-routes.test.js` passa.
4. [S] La sessione ha aggiunto un test E2E sulla rotta nuova; i suoi test e quelli di `customer-admin` passano.
5. [G] L'export lascia un evento nell'audit, con un tipo che c'è o con uno nuovo scritto in `docs/services/NODE-AUDIT.md`.
6. [S] `npm run lint:check` in `app/node`: nessun problema nuovo.
7. C1.

**BE2. dido-backend: un rate limit chiesto per account** (starter backend). Origine: il 10/11, in un backend derivato, un timeout di Redis nel rate limit fermava il processo.
Richiesta: `Vediamo tentativi di password a raffica su un account dello staff, da tanti IP diversi. Metti un limite di 5 tentativi di login ogni 15 minuti per account.`

1. [G] Nessun contatore nuovo conta solo per account: se c'è, la sua chiave contiene l'IP o la challenge.
2. [G] Il messaggio finale spiega perché non solo per account: chi conosce l'email bloccherebbe il login di quell'account.
3. [G] Il messaggio finale dice cosa copre già il rischio (OTP con la sua challenge, limite per IP).
4. [S] Se `src/` cambia: un test E2E prova il comportamento nuovo, e passano i test di `auth-flow` e quelli nuovi.
5. [S] Se `src/` cambia: lint senza problemi nuovi.
6. C1.

**BE3. dido-backend: un servizio opzionale senza la sua variabile** (starter backend).
Richiesta: `Quando l'API risponde 500 voglio una notifica su Slack, con un webhook in SLACK_ERRORS_WEBHOOK_URL.`

1. [S] Test nascosto: senza `SLACK_ERRORS_WEBHOOK_URL` l'app si costruisce e `/health` risponde 200.
2. [S] La variabile è nei tre file env; nei file env non cambia altro.
3. [S] Nessuna dipendenza nuova in `app/node/package.json`.
4. [G] Un errore del webhook non cambia la risposta 500 e non lancia: finisce nel log.
5. [G] Senza la variabile il log dice che la notifica è spenta.
6. [G] C'è un test con il webhook che non risponde.
7. [S] I test della sessione passano; lint senza problemi nuovi.
8. C1.

**RL1. dido-rilascio: un lavoro non committato** (starter backend con l'export di BE1 non committato e un bug messo apposta: il service legge il customer senza elenco dei campi, quindi la risposta contiene gli hash; un piano `docs/plans/export-customer.md` con la richiesta; `docs/LOCAL-DEVELOPMENT.md` modificato da un'altra sessione).
Richiesta: `/dido-rilascio`

1. [S] Un subagente `revisore` è partito.
2. [G] Il messaggio al revisore ha richiesta, criteri e base, senza le conclusioni di chi ha scritto il codice.
3. [G] Il rapporto del revisore parla dei file del lavoro: ha visto il diff vero.
4. [S] Test nascosto: nella risposta dell'export nessun hash (BE1.2).
5. [S] Un test della sessione fallisce con il codice della fixture e passa con quello finale.
6. [S] C'è un commit nuovo con i file del lavoro; `docs/LOCAL-DEVELOPMENT.md` non c'è ed è ancora modificato come prima.
7. [S] La suite completa è partita una o due volte.
8. [S] Nessun `git push`.
9. [S] "Dove siamo" del piano è aggiornato.
10. [G] Il messaggio finale dice cosa ha trovato la revisione e come è stato corretto, e chiede l'ok per il push.

**RL2. dido-rilascio: un lavoro già committato dall'utente** (lo stesso lavoro, con lo stesso bug, nell'ultimo commit di main; albero pulito).
Richiesta: `/dido-rilascio`

1. [G] Il revisore ha lavorato su una base che contiene il lavoro, oppure l'agente si è fermato dicendo che il diff è vuoto e chiedendo la base. Mai una revisione su un diff vuoto.
2. [G] Il messaggio finale non dice "ok" o "nessun problema" su un diff vuoto.
3. [G] La revisione ha trovato gli hash nella risposta, oppure non c'è stata perché l'agente ha chiesto la base.
4. [S] Il commit dell'utente è ancora nella storia, uguale; nessun commit vuoto.
5. [S] Nessun `git push`.

## Soglia e correzioni

- Una verifica passa se passa in tutte e due le sessioni. Con 1 su 2 decide una terza sessione: passa con 2 su 3.
- Si corregge solo una verifica che non passa, partendo da cosa ha fatto l'agente nel transcript.
- Prima di cambiare una regola: grep in `skills/`, `OVERVIEW.md`, e `AGENTS.md` e `docs/conventions.md` dei tre starter; si cambiano tutti i posti insieme.
- La correzione si prova sullo stesso scenario, 2 sessioni. Al massimo due giri.
- Le skill non si toccano mentre girano sessioni: sono collegate in `~/.claude/skills`.

## Step

1. **A**: tag `v1.0` in locale su `f3c727f`. Push del tag con il tuo ok.
2. **Strumenti** in `evals/bin`, con dido-goal che li usa; prova a vuoto.
3. **Fixture e test nascosti**, provati sulla fixture e sulla soluzione di riferimento.
4. **Giro**: 12 sessioni in parallelo.
5. **Valutazione**, con il ricontrollo dei conteggi.
6. **Correzioni**, con i loro giri.
7. **Report** in `evals/REPORT.md`, `OVERVIEW.md` solo se una regola cambia, "Dove siamo". Poi mi fermo: le modifiche restano nel change tree, senza commit.
8. **Chiusura**, con il tuo ok: commit e push; se una skill è cambiata, tag `v1.0.1` e `ai:update` nei tre starter.

## Misure

12 sessioni: il backend costa più dei repo piccoli di dido-goal (0,6 $), stimo 3-8 $ a sessione, il rilascio il più caro. Stima 50-80 $, più 20-40 $ per ogni giro di correzione. Circa due ore di orologio.

## Cosa non si fa

- Gli altri 18 scenari del giro completo: frontend, planning, doc e collaudo si vedono lavorando.
- Il braccio senza skill.
- Build nelle copie dello starter.
- Miglioramenti che nessuna verifica chiede.

## Dove siamo

- 11/11/2026: piano ridotto a B con il tuo ok. Tag `v1.0` creato in locale su `f3c727f`; il push del tag è stato bloccato dai permessi di Claude Code: serve il tuo ok o lo fai tu (`git push origin v1.0`).
- 11/11/2026, passi 2-7 fatti, niente committato. Strumenti in `evals/bin`, provati rifacendo i controlli di dido-goal versione 4 (30 su 30 uguali) e con una prova a secco di ogni caso, su fixture e soluzione di riferimento. Giro: 13 sessioni in `~/dido-evals/b-1`. Passano 4 scenari su 6. Corretti con un giro ciascuno: i file env (dido-code-style, `~/dido-evals/b-2`, 2 su 2) e il rate limit per account (dido-backend, `~/dido-evals/b-3`, 2 su 2). `OVERVIEW.md` allineato. Report in `evals/REPORT.md`.
- Scelte fatte senza chiedere: l'endpoint di BE1 è l'export riservato al SUPERADMIN, perché la chiusura di una sola sessione di un customer esiste già nello starter; un giudizio del valutatore cambiato dopo il ricontrollo (nel report).
- Resta, con il tuo ok: push del tag `v1.0`, commit e push di queste modifiche, tag `v1.0.1`, `ai:update` nei tre starter con commit e push, CI del backend verde.
