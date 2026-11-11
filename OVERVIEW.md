# Cosa fanno le skill dido-*

Il riassunto per chi entra in un progetto. Le skill sono linee guida di sviluppo e di mantenimento che valgono per ogni progetto e per chiunque ci lavori: non nominano strumenti. Le regole vere stanno nelle skill, in `skills/`: se qui qualcosa non torna, vale la skill.

**Con quali strumenti** un progetto applica le skill, e **cosa controlla il suo lint**, sta in `docs/conventions.md` del progetto. Lo porta `ai:update` dallo starter da cui il progetto è nato.

## Lingua

- Il codice è in inglese: ogni nome nuovo (variabili, funzioni, file, cartelle, classi, chiavi, campi, variabili d'ambiente).
- Commenti, doc, commit e risposte sono in italiano.
- I nomi che ci sono già restano come sono, in qualunque lingua: non si traducono e non si rinominano.

## dido-code-style: ogni progetto

- **Prima di scrivere**: leggere le istruzioni del progetto, le doc, la storia git della zona e tutto il flusso coinvolto. Non riaprire decisioni già prese.
- **Parti chiuse**: quelle elencate in `docs/parti-chiuse.md` non si toccano senza consenso.
- **Semplice**: il codice per il requisito di oggi. Niente astrazioni, opzioni o factory con un solo utilizzatore.
- **Una cosa, un componente**: prima di scrivere si cerca chi lo fa già e lo si estende. Mai una seconda copia.
- **Modulare**: ogni funzionalità ha la sua cartella e il suo nome; si usa un modulo dal suo punto d'ingresso. Le parti opzionali si agganciano al nucleo, mai il contrario. Se una manca, si spegne solo lei.
- **Scalabile senza esagerare**: liste paginate, niente query in un ciclo, indici sulle colonne filtrate. Niente cache o code senza una misura.
- **Niente effetti nascosti**: `get`, `find`, `check` non scrivono. Email e webhook partono dopo il salvataggio.
- **Niente codice morto**: si cancella il vecchio nella stessa modifica, senza shim di compatibilità.
- **File env**: tre file nel repo (`.env.example`, `.env.local`, `.env.production`) con i valori veri. Non si tolgono, non si accorpano, nessuna variabile si toglie.
- **Una protezione per problema**: niente controlli doppi "per sicurezza"; si valida al confine e poi ci si fida.
- **Modifiche minime**: un fix tocca le righe rotte. Niente refactor "già che ci sono".
- **Commenti** sul perché, non sul cosa.
- **Testi d'interfaccia**: titolo, contenuto, azioni. Aiuti solo per un formato o un limite, un'azione che non si annulla o un errore. Virgolette dritte, niente emoji né scuse.
- **Bug**: prima la causa. Dopo tre fix falliti ci si ferma e se ne parla.
- **Test**: li scrive l'agente, nella stessa modifica. Ogni fix ha un test che senza il fix fallisce. Si testa dall'interfaccia pubblica e si finge solo il confine.
- **Si prova solo ciò che cambia**: lint dei file toccati, test collegati, la pagina o l'endpoint toccato. Suite completa e build una volta, alla chiusura, o quando si tocca codice condiviso. Un lavoro di pochi minuti non diventa un'ora di prove.
- **Sicurezza**, quando la modifica tocca input, permessi, dati, segreti o dipendenze.
- **Report** lungo quanto il lavoro: per un fix bastano tre righe.
- **Commit** a lavoro verificato, solo dei propri file. Push solo con l'ok di chi lavora con te.
- **Revisioni**: solo problemi di gravità Alta e Media, niente estetica.
- **"Analizza il repo"**: più agenti leggono tutto e verificano ogni problema. Costa molto: si avvisa prima.

## dido-frontend-nuxt: frontend

- **Valori**: dal design, arrotondati a un token o a un multiplo di 5; font a multipli di 2 o 4.
- **Design system**: classi e token che ci sono; font e spazi grandi fluidi tra mobile e desktop.
- **Componenti**: una cartella per componente, con il suo stile; i riusabili in un'area loro. Un pattern esiste una volta sola.
- **Stesso elemento, stesso comportamento**: caroselli, schede, hover, dissolvenze uguali in tutto il sito.
- **Hover** solo dove il puntatore lo permette, con la stessa transizione e lo stesso stato alla pressione.
- **Testi** dai dizionari delle lingue, sempre allineati; nessun testo scritto nei componenti.
- **Dati**: il CMS e le API da un composable ciascuno, mai dai componenti. Errore della fonte: 500; contenuto che non c'è: 404.
- **Terze parti**: per tutto il sito un plugin, per una pagina un composable più un componente. Si tolgono cancellando i loro file.
- **Motion** (dettagli in `riferimento/motion.md`, letto solo quando si tocca qualcosa che si muove): una libreria sola, a componenti, easing e durate dai token, apertura e chiusura nella stessa sequenza, solo `transform` e `opacity`, reduced motion sempre rispettato.
- **Foto**: mai visibili mentre arrivano.
- **Accessibilità e SEO**: un `<h1>`, contrasto AA, `:focus-visible`, `alt` giusti.
- **Verifica** in proporzione: sempre lint, pagina 200 senza errori in console e test toccati; per un ritocco uno screenshot mobile e uno desktop; per un'interfaccia nuova cinque larghezze.

## dido-backend: backend

- **Livelli**: rotta, controller (valida e risponde), service (logica ed errori di dominio).
- **API**: rotte sotto una versione. Risposte `{ status: "ok", data }` o `{ status: "error", error }`. Status code precisi (400, 401, 403, 404, 409, 429, 503).
- **Errori**: un solo gestore globale; in produzione il 500 è generico e il dettaglio va nei log.
- **Validazione** con uno schema in cima al controller; unicità ed esistenza nel service.
- **Autenticazione**: un middleware, che rilegge l'utente dal database a ogni richiesta.
- **Sessioni**: password con un hash lento; token e OTP salvati solo come hash; refresh token in un cookie HttpOnly che ruota a ogni uso.
- **Rate limit** per IP o per challenge, mai solo per account.
- **Dati**: schema solo con migration, campi delle query sempre elencati.
- **Configurazione**: senza la variabile di un servizio opzionale l'app parte e quel servizio resta spento.
- **Audit log** degli eventi di sicurezza; non fa mai fallire la richiesta.
- **Test** end-to-end su un database vero; nessuna mail parte davvero.
- **Spec OpenAPI**: cambia nella stessa modifica dell'API.

## dido-planning: lavori grandi

- Un lavoro piccolo si fa e basta. Uno di più passi ha un piano in `docs/plans/`, che chi lavora con te approva.
- Passi piccoli, ognuno verificato e con un commit.
- "Dove siamo", in fondo al piano, è la memoria tra una sessione e l'altra.
- Le decisioni tecniche vanno in `docs/decisions/`, il report di chiusura in `docs/reports/`.
- Chi lavora con te decide il prodotto e il design; l'agente le scelte tecniche, scritte nel piano.

## dido-rilascio: chiudere un lavoro

Si lancia a mano con `/dido-rilascio`.

1. Controllo del perimetro: resta solo ciò che serve alla richiesta.
2. Revisione dell'agente `revisore`, che non ha scritto il codice.
3. Lint e test dei file toccati.
4. Correzione dei problemi Alti e Medi, ognuno con il suo test.
5. Suite completa e build.
6. Commit dei soli file del lavoro.
7. Push, deploy e controllo della CI solo con l'ok di chi lavora con te.

## Le altre skill dido-*

- **dido-checklist-sito-web**: collaudo di un sito (tecnica, performance, SEO, accessibilità, privacy, sicurezza). Una voce non verificata si scrive "NON VERIFICATO", mai spuntata.
- **dido-platform-docs-writer**: README e doc operative (avvio, deploy, variabili, guasti). Si scrive solo ciò che i file dimostrano; il resto è "NON DEDUCIBILE".

## Le skill di altri

Danno conoscenza, ma dove dicono altro valgono le skill `dido-*` e `docs/conventions.md` del progetto. Le eccezioni generali sono nei file `riferimento/skill-di-terzi.md` delle skill. Le più frequenti:

- il codice d'esempio di una skill si riscrive nei file, nei nomi e negli strumenti del progetto;
- niente brainstorming o piani obbligatori: il processo lo danno dido-planning e dido-code-style;
- skill e plugin si installano con gli script del repo, mai globali.
