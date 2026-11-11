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

## Come rilanciare le prove di una skill

Dalla cartella `evals/`. Le copie dello starter backend sono di `~/Desktop/Dido Git Test/starterkit-backend-platform-coolify`, o di `BACKEND_STARTER`.

```bash
bash dido-code-style/make-fixtures.sh
bin/launch.sh ~/dido-evals/code-style-1 with_skill 2 dido-code-style/env-sostituzione
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
