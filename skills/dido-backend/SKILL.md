---
name: dido-backend
description: Usare ogni volta che si scrive, modifica o revisiona il codice di un backend di Dido, anche per poche righe (rotte e controller, validazione dell'input, gestione degli errori e status code, autenticazione e permessi, refresh token e OTP, rate limit, transazioni, migration, mail, audit log, variabili d'ambiente, spec OpenAPI, test E2E). Vale anche per lo starter Node con Express e Prisma e per i progetti nati da lì.
---

# Backend di Dido

Linee guida per ogni backend di Dido. **Skill richiesta:** dido-code-style, con i principi validi per ogni stack. Qui c'è come li applica un backend.

Come le applica lo starter Node (Express 5, Prisma, PostgreSQL), e in quale file, sta in `riferimento/node-express-prisma.md`: leggilo quando lavori sullo starter o su un progetto nato da lì. Un progetto derivato può aver cambiato un dettaglio, e allora vale quello che trovi nel suo codice. Quando il `CLAUDE.md` del progetto è più specifico, vale quello.

## Livelli

- Rotte, controller, service, accesso ai dati. Niente livello repository: il service usa direttamente il client del database.
- La rotta dichiara endpoint e middleware, senza logica.
- Il controller valida l'input in cima, chiama il service e costruisce la risposta. Non tocca il database.
- Il service ha la logica di business e lancia gli errori di dominio. Non conosce la richiesta HTTP né la validazione, e non scrive la risposta.
- L'app si costruisce senza aprire la porta e il listen sta in un altro file, così i test importano l'app senza avviare il server.

## Contratto dell'API

- Le rotte di dominio stanno sotto un prefisso di versione (`/v1`) definito in un posto solo. Health, readiness e doc restano senza versione.
- Per una v2 non si cambia il prefisso: si aggiunge un secondo router su un altro prefisso, con varianti solo dei moduli che cambiano.
- Successo: `{ "status": "ok" }`, più `data` quando c'è qualcosa da restituire (le liste paginate anche `pagination`) o `message` per una risposta informativa.
- Errore: `{ "status": "error", "error": "..." }`, anche per una rotta che non esiste (404 JSON) e per il 429.
- Status:
  - `400` input sbagliato, anche con un token valido (es. password corrente errata);
  - `401` solo per token, account, credenziali, OTP e refresh non validi;
  - `403` permesso negato;
  - `404` non trovato;
  - `409` conflitto;
  - `429` troppe richieste;
  - `503` un servizio da cui dipende la richiesta non risponde (es. la mail con l'OTP non parte).
- Le liste che possono crescere sono paginate dal server, e la ricerca è un parametro della richiesta: un filtro nel client vedrebbe solo la pagina corrente.
- La spec OpenAPI è il contratto per i client e cambia nella stessa modifica dell'API. Le altre doc dicono solo ciò che la spec non dice, come flussi e decisioni.
- Health risponde se il processo è vivo, readiness fa anche un ping al database. In produzione l'errore della readiness è generico e il dettaglio va nei log.

## Errori

- Un solo gestore globale traduce gli errori in risposte: validazione 400, errore di dominio con il suo status, vincolo unique violato 409, conflitto tra transazioni 409 (il client può riprovare), record che non c'è più 404, tutto il resto 500.
- Lo stesso conflitto tra transazioni può arrivare in forme diverse a seconda del driver, anche solo al commit. Il gestore le mappa tutte su 409, altrimenti un caso normale di concorrenza diventa un 500.
- In produzione il 500 e gli errori del database hanno un messaggio generico. Dettaglio e stack vanno nei log del server, e il 500 lascia un evento nell'audit.
- Il service lancia solo errori di dominio. Validazione ed errori del database salgono da soli fino al gestore, quindi niente try/catch nel controller per tradurli.
- Gli errori si lanciano con il meccanismo del progetto. Nello starter è `new HttpError(404, "Utente non trovato")`. Un progetto derivato può avere un catalogo degli errori, con codici stabili e messaggi in un posto solo: se c'è, si usa il codice del catalogo. Prima di scriverne uno, guarda come lo fa il codice vicino.

## Validazione

- Body, query e parametri si validano con uno schema in cima al controller.
- I campi che tornano in più schemi, come email e password, si definiscono una volta e si riusano. L'email si normalizza (trim e minuscole) nel campo condiviso, non a mano.
- Le regole che hanno bisogno del database, come unicità ed esistenza, stanno nel service.

## Autenticazione e permessi

- Ogni rotta non pubblica passa da un solo middleware di autenticazione. Audience diverse, come staff e customer, hanno token e cookie distinti, e un claim di tipo nel token impedisce che valga per l'altra audience.
- Il middleware rilegge il principal dal database a ogni richiesta, così una disattivazione o un cambio di ruolo valgono subito. Niente cache davanti a quella lettura e niente denylist dei token: riporterebbero il ritardo.
- Ruoli e permessi sono costanti in un posto solo. Un permesso più ristretto di quello che controlla il middleware si verifica in cima al controller e dà 403.
- Una rotta self-service prende l'id del principal dal token, mai dal body o dall'URL.

## Credenziali e sessioni

- Password con bcrypt. Refresh token, codici OTP, challenge e token monouso (verifica email, reset) si salvano solo come sha256: il valore in chiaro sta solo nel cookie o nel messaggio inviato.
- Il login con un utente che non esiste esegue comunque bcrypt su un hash fittizio, così i tempi non rivelano quali account esistono.
- Il refresh token sta in un cookie HttpOnly e ruota a ogni uso dentro una transazione. Con due refresh concorrenti ne vince uno solo e l'altro riceve 401. Mettere in fila i refresh tra le tab è compito del client.
- L'OTP vale solo insieme alla challenge emessa dal login, in un cookie HttpOnly con lo sha256 nel database. Senza la challenge il tentativo non conta, così chi conosce solo l'email non può bruciare i tentativi di un altro e bloccargli il login.
- Ogni codice OTP ha pochi tentativi e una scadenza breve, e si cancella dopo l'uso. Finiti i tentativi serve un nuovo login, non un blocco temporaneo dell'account.
- Disattivare un account o cambiarne la password elimina le sue sessioni nella stessa transazione. Su un account disattivato cadono subito anche gli access token, perché il middleware rilegge il principal. Dopo un cambio di password, invece, restano validi fino alla scadenza.

## Rate limit

- Con più processi i contatori stanno in uno store condiviso, altrimenti ogni processo conta per conto suo.
- Un limite si lega all'IP o alla challenge, mai solo all'account. Un contatore per account lo fa scattare chiunque conosca l'email, ed è un lock-out.

## Dati

- Lo schema del database cambia solo con le migration, mai a mano in SQL.
- Le query prendono i campi da un elenco esplicito, così hash, OTP e token non possono finire in una risposta.
- Dove due modifiche concorrenti possono scontrarsi, la transazione lo rileva e il client riceve un 409 che può riprovare.
- Sessioni e token legati a un principal senza chiave esterna si cancellano esplicitamente quando il principal si elimina o si disattiva.

## Configurazione e segreti

- Ogni variabile d'ambiente ha lo stesso nome in tutti i file env (locale, produzione, esempio). Quelle obbligatorie in produzione bloccano l'avvio se mancano.
- I segreti di configurazione salvati nel database, come la password SMTP, sono cifrati. L'API dice solo se ci sono (`hasPassword: true`), mai il valore.
- La configurazione che cambia a runtime si risolve a ogni uso (database, poi env, poi default). Una cache la renderebbe vecchia negli altri processi.

## Audit log

- Si registrano gli eventi rilevanti per la sicurezza: login e fallimenti, cambi di ruolo e di stato, modifiche di configurazione, eliminazioni, errori 500.
- Un tipo di evento nuovo si documenta nello stesso passaggio in cui nasce.
- L'audit non fa mai fallire la richiesta: se l'arricchimento del log fallisce, il campo resta vuoto.
- Con più processi che scrivono lo stesso file, il log ruota per giorno e non per dimensione, che perde righe.

## Test

- Test end-to-end contro l'app costruita senza listen, con i path completi (`/v1/...`) e un database reale, meglio un container usa e getta che quello di sviluppo. Nessuna mail parte davvero.
- Ogni file di test usa un prefisso univoco nei dati che crea, e alla fine cancella solo quelli.
- Se i vincoli unique farebbero scontrare file di test in parallelo, i file girano in sequenza.

## Starter e progetti derivati

Un fix di sicurezza o di correttezza trovato in un progetto derivato di solito vale anche per lo starter e per i progetti gemelli. Segnalalo nel report, così si porta anche lì.
