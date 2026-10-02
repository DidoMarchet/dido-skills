---
name: dido-code-style
description: Usare ogni volta che si scrive, modifica, rifattorizza, corregge o revisiona codice in un progetto di Dido, anche per poche righe e su qualunque stack (backend, frontend, script, configurazione, infrastruttura), e quando Dido chiede di analizzare o controllare un repo, un modulo o una cartella ("analizza il repo", "controlla che sia tutto ok", "trova bug").
---

# Stile e convenzioni di codice di Dido

Stai aiutando **Dido Marchet** a costruire applicazioni web. Segui queste convenzioni **alla lettera**: sono validate sui progetti di Dido in produzione e valgono per ogni stack. **Skill dello stack, richiesta quando lavori su quel codice:** dido-backend per i backend, dido-frontend-nuxt per i frontend Nuxt.

| Compito | Cosa leggere |
|---|---|
| Scrivere o modificare codice | Parte 1, più la skill dello stack |
| Revisionare una modifica, "trova bug" | Parte 1 + Parte 2 "Revisioni e caccia ai bug" |
| Analizzare un repo, un modulo o una cartella | `analisi.md`, accanto a questo file |

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
- **Un fatto, un posto.** Le doc dicono ciò che il codice non dice: decisioni e perché, procedure (con i comandi e gli URL che servono), il ruolo di ogni servizio e modulo. Per il resto rimandano alla fonte: le variabili stanno in `.env.example`, con un commento sopra quelle il cui nome non basta, e gli endpoint nella spec OpenAPI. Una tabella, un elenco o un diagramma che riporta ciò che un file già definisce è una copia, e ogni copia è un punto in cui la doc resta indietro.
- Dopo la modifica cerca nel repo le parole chiave che hai toccato. Dove una doc copia ciò che hai cambiato, togli tutta la copia, non solo la riga che hai cambiato, e metti il rimando alla fonte invece di aggiornarla. Le procedure e le decisioni scritte nelle doc che non valgono più si correggono.
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
- Un'assenza voluta che qualcuno potrebbe "correggere" ha un breve commento sul perché manca (es. niente cache del client SMTP perché il server gira in più processi). Non è un marcatore `// removed X`: spiega una decisione di progetto, non la storia.

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
- **Segreti.** In env o cifrati a riposo; mai nel codice, nel repo, nei log o nel bundle client (lì vanno solo valori pubblici per natura, es. un token CMS in sola lettura).
- **Abusi.** Rate limit su tutto ciò che si può forzare o usare per spam (login, OTP, reset password, registrazione, upload, form di contatto). Ogni protezione (contatore, blocco, limite) si guarda anche da chi la può far scattare: se un estraneo la fa scattare sull'account di un altro, è un lock-out. I token sono casuali, a scadenza e monouso. Le risposte di login e reset non rivelano se un account esiste.
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
| "Aggiorno anche la tabella nel README" | Se ripete il codice, toglila e metti il rimando alla fonte. |

---

# 2. Revisioni e analisi

## Revisioni e caccia ai bug

Per la revisione di una modifica, o una richiesta come "trova bug":

- Parti dal presupposto che il codice funzioni: l'onere della prova sta sul problema segnalato.
- Riporta solo problemi di gravità Alta e Media (vedi "Gravità" sotto). Niente trovato → "ok" in una riga.
- Niente estetica, nomi, micro-semplificazioni, race teoriche o future-proofing, a meno che Dido li chieda. Mai aggiungere in fondo "e un paio di cose minori che ho notato".

## Gravità

| Gravità | Cosa |
|---|---|
| Alta | perdita o corruzione di dati, falla di sicurezza, errore visibile agli utenti, sessioni o credenziali perse, lock-out |
| Media | stato incoerente in scenari documentati, retry o idempotenza rotti, collo di bottiglia reale, test che fallisce, doc dell'API che ingannano un client |
| Bassa | overengineering, codice morto e avanzi, semplificazione con un guadagno concreto, altre doc disallineate, copie nelle doc, flusso critico senza test, testi |

## Analisi completa ("analizza il repo")

Per analizzare un repo, un modulo o una cartella leggi `analisi.md`, accanto a questo file: dice quanto costa e come si lancia il workflow `repo-audit.js`, cosa controlla, quando un problema è smentito e com'è fatto il report.
