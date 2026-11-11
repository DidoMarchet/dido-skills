# Cosa fanno le skill dido-*

Il riassunto per chi entra in un progetto. Le skill sono linee guida di sviluppo e di mantenimento che valgono per ogni progetto e per chiunque ci lavori: non nominano strumenti. Le regole vere stanno nelle skill, in `skills/`: se qui qualcosa non torna, vale la skill.

**Con quali strumenti** un progetto applica le skill, e **cosa controlla il suo lint**, sta in `docs/conventions.md` del progetto. Lo porta `ai:update` dallo starter da cui il progetto è nato.

## Chi vale su chi

Quando due fonti si contraddicono vale la prima di quest'ordine:

1. ciò che serve perché il codice funzioni (linguaggio, framework, libreria);
2. le indicazioni di chi lavora con te;
3. il `CLAUDE.md` del progetto, quando è più specifico;
4. le skill `dido-*`;
5. le skill di altri e il codice che c'è.

Il codice che c'è non è una regola: dove va contro le skill si seguono le skill, e la differenza va nel report. Una regola saltata ha il motivo scritto accanto al codice e nel report.

## Lingua

- Il codice è in inglese: ogni nome nuovo (variabili, funzioni, file, cartelle, classi, chiavi, campi, variabili d'ambiente).
- Commenti, doc, commit e risposte sono in italiano.
- I nomi che ci sono già restano come sono, in qualunque lingua: non si traducono e non si rinominano.

## dido-code-style: ogni progetto

**Prima di scrivere**

- Leggere le istruzioni del progetto, le doc, la memoria, la storia git della zona e tutto il flusso coinvolto. Non riaprire decisioni già prese. La doc di una libreria si legge per la versione installata.
- **Parti chiuse**: quelle elencate in `docs/parti-chiuse.md` non si toccano senza consenso. Un componente generale che usano si può cambiare solo se loro restano uguali, e si verifica guardandole.

**Come si scrive**

- **Semplice**: il codice per il requisito di oggi. Niente astrazioni, opzioni o factory con un solo utilizzatore.
- **Una cosa, un componente**: prima di scrivere si cerca chi lo fa già e lo si estende. Mai una seconda copia.
- **Modulare**: ogni funzionalità ha la sua cartella e il suo nome; si usa un modulo dal suo punto d'ingresso. Le parti opzionali si agganciano al nucleo, mai il contrario. Se una manca, si spegne solo lei.
- **Scalabile senza esagerare**: liste paginate, niente query in un ciclo, indici sulle colonne filtrate. Niente cache o code senza una misura.
- **Niente effetti nascosti**: `get`, `find`, `check` non scrivono. Email e webhook partono dopo il salvataggio.
- **Forma**: arrow function (`function` solo se usa `this` o è un generatore), nomi interi che dicono cos'è la cosa, niente `console.log` di debug.
- **Lint**: i problemi nuovi si correggono, avvisi compresi; quelli che c'erano già restano. Una regola si spegne solo per una riga, con il motivo, o nella config del progetto.
- **Togli il vecchio**: chi sostituisce X con Y cancella X nella stessa modifica (codice, test, doc, configurazione), senza shim di compatibilità. Niente codice morto.
- **File env**: tre file nel repo (`.env.example`, `.env.local`, `.env.production`) con i valori veri. Non si tolgono, non si accorpano, nessuna variabile si toglie. Una variabile nuova va in tutti e tre.
- **Una protezione per problema**: niente controlli doppi "per sicurezza"; si valida al confine e poi ci si fida.
- **Modifiche minime**: un fix tocca le righe rotte. Niente refactor "già che ci sono".
- **Commenti** sul perché, non sul cosa.
- **Testi d'interfaccia**: titolo, contenuto, azioni. Aiuti solo per un formato o un limite, un'azione che non si annulla o un errore. Virgolette dritte, niente emoji né scuse. Login e reset non dicono mai se un account esiste.
- **Sicurezza**, quando la modifica tocca input, permessi, dati, segreti o dipendenze: il report ha una riga su cosa è stato controllato.

**Doc e memoria**

- **Un fatto, un posto**: le doc dicono ciò che il codice non dice (decisioni, procedure, ruolo di ogni parte). Una tabella che copia un file si toglie e al suo posto va il rimando.
- Le doc cambiano nella stessa modifica del codice. I fatti che codice e git non dicono vanno in memoria.

**Bug e test**

- **Bug**: prima la causa. Dopo tre fix falliti ci si ferma e se ne parla.
- **Test**: li scrive l'agente, nella stessa modifica. Ogni fix ha un test che senza il fix fallisce. Si testa dall'interfaccia pubblica e si finge solo il confine.

**Verifica e chiusura**

- **Si prova solo ciò che cambia**: lint dei file toccati, test collegati, la pagina o l'endpoint toccato. Suite completa e build una volta, alla chiusura, o quando si tocca codice condiviso.
- **Fatto vuol dire eseguito**. Il resoconto di un subagente non è una prova. Si decide solo su ciò che si è letto per intero.
- **Report** lungo quanto il lavoro: cosa è cambiato, cosa è stato verificato, cosa resta, le scelte fatte senza chiedere. Per un fix bastano tre righe. Poi ci si ferma, senza "se vuoi posso anche…".
- **Commit** a lavoro verificato e quando gli altri agenti sullo stesso repo hanno finito, con i soli propri file aggiunti per nome. Più sessioni: un worktree ciascuna. Push solo con l'ok di chi lavora con te.

**Revisioni e analisi**

- **Revisioni**: solo problemi di gravità Alta e Media, niente estetica. Se non c'è niente, "ok" in una riga.
- **Revisione ricevuta**: si controlla sul codice prima di applicarla; se è sbagliata si risponde con il motivo.
- **"Analizza il repo"**: più agenti leggono tutto e altri provano a smentire ogni problema. Anche la gravità Bassa (overengineering, codice morto, copie nelle doc). Costa molto: si avvisa prima.

## dido-frontend-nuxt: frontend

- **Valori**: dal design, misurati e non a memoria, arrotondati a un token o a un multiplo di 5; font a multipli di 2 o 4. Le regole della skill valgono sopra il layout: una differenza dal design dovuta a loro non è un errore.
- **Design system**: classi e token che ci sono. Token solo per i valori ricorrenti, una scala tipografica sola, colori a scala per famiglia. Font e spazi grandi fluidi tra mobile e desktop, margine laterale fluido.
- **Componenti**: una cartella per componente, con il suo stile; i riusabili in un'area loro, che ricevono tutto da prop e slot. Un pattern esiste una volta sola. Classi BEM, varianti per sezione e mai per colore.
- **Stesso elemento, stesso comportamento**: caroselli, schede, hover, dissolvenze uguali in tutto il sito.
- **Hover** su ogni elemento cliccabile, solo dove il puntatore lo permette, con la stessa transizione e lo stesso stato alla pressione.
- **Testi** dai dizionari delle lingue, divisi per area e sempre allineati; nessun testo scritto nei componenti. Ogni pagina è dichiarata nella config delle lingue, così entra nella sitemap.
- **Degrada, non cadere**: un dato o una config che manca dà uno stato gestito. Solo il contenuto principale fa errore: fonte che non risponde 500, contenuto che non c'è 404.
- **Dati**: il CMS e le API da un composable ciascuno, mai dai componenti. SEO, canonical e hreflang da un composable solo. Lo schema del CMS cambia solo con migration.
- **Configurazione** divisa per area; nel bundle client solo valori pubblici; si indicizza solo la produzione.
- **Terze parti**: per tutto il sito un plugin, per una pagina un composable più un componente. Si tolgono cancellando i loro file. Prima di dire cosa fanno, si misurano domini e cookie.
- **Chiamate a un backend con sessione** (`riferimento/chiamate-al-backend.md`): URL con il prefisso di versione, access token solo in memoria, un refresh alla volta anche tra le schede, cosa fare con 401, 400, 403 e 409.
- **Motion** (`riferimento/motion.md`, letto solo quando si tocca qualcosa che si muove): una libreria sola, a componenti, easing e durate dai token, apertura e chiusura nella stessa sequenza, solo `transform` e `opacity`, un solo sistema di scroll, reduced motion sempre rispettato.
- **Foto**: mai visibili mentre arrivano, mai zoom all'hover.
- **Accessibilità e SEO**: un `<h1>`, contrasto AA, `:focus-visible`, `alt` giusti, l'esito di un'azione annunciato spostando il focus.
- **Verifica** in proporzione: sempre lint, pagina 200 senza errori in console e test toccati; per un ritocco uno screenshot mobile e uno desktop; per un'interfaccia nuova cinque larghezze e il confronto con gli elementi simili del sito.

## dido-backend: backend

- **Livelli**: rotta, controller (valida e risponde), service (logica ed errori di dominio). Niente repository. Un modulo è una cartella che si aggancia all'app con una riga.
- **API**: rotte sotto una versione, definita in un posto solo. Risposte `{ status: "ok", data }` o `{ status: "error", error }`. Status code precisi (400, 401, 403, 404, 409, 429, 503). Liste paginate dal server, ricerca come parametro.
- **Errori**: un solo gestore globale; un conflitto tra transazioni è sempre 409; in produzione il 500 è generico e il dettaglio va nei log.
- **Validazione** con uno schema in cima al controller; unicità ed esistenza nel service.
- **Autenticazione**: un middleware, che rilegge l'utente dal database a ogni richiesta. Audience diverse hanno token e cookie distinti. Una rotta self-service prende l'id dal token.
- **Credenziali**: password con un hash lento; token, OTP e challenge salvati solo come hash. La password di un account nuovo la sceglie chi apre il link arrivato nella casella.
- **Sessioni**: refresh token in un cookie HttpOnly che ruota a ogni uso. Un refresh token già ruotato che torna chiude la sua famiglia di sessioni. L'OTP vale solo con la challenge del login.
- **Rate limit** per IP o per challenge, mai solo per account. Se lo store dei contatori non risponde, la richiesta passa.
- **Dati**: schema solo con migration, campi delle query sempre elencati.
- **Configurazione**: senza la variabile di un servizio opzionale l'app parte e quel servizio resta spento. I segreti salvati nel database sono cifrati.
- **Audit log** degli eventi di sicurezza; non fa mai fallire la richiesta.
- **Test** end-to-end su un database vero; nessuna mail parte davvero; un test con il servizio esterno che non risponde.
- **Spec OpenAPI**: scritta a mano, cambia nella stessa modifica dell'API.
- Un fix di sicurezza o di correttezza trovato in un progetto derivato si segnala, così si porta nello starter e nei gemelli.

## dido-planning: lavori grandi

- Un lavoro piccolo si fa e basta. Uno di più passi ha un piano in `docs/plans/`, che chi lavora con te approva. Un prodotto nuovo ha anche `docs/PROJECT_CHARTER.md`, con requisiti, invarianti e milestone.
- Prima del piano si chiede solo ciò che cambia il risultato, in un messaggio, con una proposta per domanda.
- Chi lavora con te decide il prodotto e il design; l'agente le scelte tecniche, scritte nel piano.
- Il design viene prima del codice: un'interfaccia nuova si approva in `docs/design/`.
- Passi piccoli, ognuno verificato e con un commit (`M2 step 4: …`).
- Niente si perde: quello che emerge entra nel piano con la data (un passo nuovo, "Cosa non si fa", "Domande aperte"), mai solo in chat.
- "Dove siamo", in fondo al piano, è la memoria tra una sessione e l'altra.
- Le decisioni tecniche vanno in `docs/decisions/`, il report di chiusura in `docs/reports/`.
- Alla chiusura: ripasso del piano voce per voce, revisione indipendente, report. La milestone la chiude chi lavora con te.

## dido-rilascio: chiudere un lavoro

Si lancia a mano con `/dido-rilascio`.

1. Perimetro: resta solo ciò che serve alla richiesta; le modifiche di altri non entrano nel commit.
2. Revisione dell'agente `revisore`, che non ha scritto il codice e riceve solo la richiesta, i criteri e la base del confronto.
3. Lint e test dei file toccati, mentre il revisore lavora.
4. Correzione dei problemi Alti e Medi, ognuno con il suo test. Dopo una correzione Alta, un secondo giro di revisione.
5. Suite completa e build, una volta.
6. Commit dei soli file del lavoro.
7. Push e deploy solo con l'ok di chi lavora con te. Il lavoro è chiuso quando la CI è verde e ciò che è cambiato è provato sull'ambiente.

## Le altre skill dido-*

- **dido-checklist-sito-web**: collaudo di un sito (tecnica, performance, SEO e ricerca con AI, accessibilità, privacy, sicurezza). Una voce non verificata si scrive "NON VERIFICATO", mai spuntata. Consegna il report per il cliente e la checklist spuntata.
- **dido-platform-docs-writer**: README e doc operative (avvio, deploy, variabili, guasti). Si scrive solo ciò che i file dimostrano; il resto è "NON DEDUCIBILE". Porte, versioni e variabili non si copiano: si rimanda al file.

## Le skill di altri

Danno conoscenza, ma dove dicono altro valgono le skill `dido-*` e `docs/conventions.md` del progetto. Le eccezioni generali sono nei file `riferimento/skill-di-terzi.md` delle skill. Le più frequenti:

- il codice d'esempio di una skill si riscrive nei file, nei nomi e negli strumenti del progetto;
- niente brainstorming o piani obbligatori: il processo lo danno dido-planning e dido-code-style;
- con un design di riferimento, il design è il brief: niente direzioni, sezioni o animazioni che non chiede;
- skill e plugin si installano con gli script del repo, mai globali;
- nessun file di contesto di uno strumento (DESIGN.md, brief) entra in git.
