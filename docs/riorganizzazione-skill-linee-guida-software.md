# Linee guida software e riorganizzazione delle skill Dido

Questa è la consegna per l’agente che riorganizzerà le skill Dido. L’obiettivo dell’utente è avere buone linee guida per scrivere software solido, controllato, preciso, modulare, scalabile e ben documentato. Le scelte di stack, prodotto, design e motion dipendono dal progetto.

Stato: proposta di riorganizzazione del 26 novembre 2026. L’obiettivo è confermato dall’utente; alberatura e singole modifiche sono proposte da verificare sui sorgenti e con gli scenari prima di applicarle. Questo file è il riferimento operativo per l’agente incaricato. Non costituisce una validazione delle future skill né autorizza push o distribuzione.

# Risultato da ottenere

Una base breve e applicabile a progetti diversi, con approfondimenti caricati solo quando servono. Le regole devono spiegare il risultato da garantire; strumenti e convenzioni specifiche vanno nei documenti del progetto. Conservare le conoscenze utili già presenti, eliminando gli assoluti senza una ragione generale.

# Alberatura proposta

Le categorie sotto sono logiche: non richiedono di cambiare la struttura usata dagli installer. Ogni skill resta nella cartella prevista dal repository.

```text
skills/
├── dido-code-style/            Rivedere: principi comuni del software
├── dido-frontend/              Rinominare da dido-frontend-nuxt
│   └── riferimento/           Accessibilità, browser, motion tecnico
├── dido-backend/               Rivedere: principi di servizi e dati
│   └── riferimento/           API, concorrenza, sicurezza, operatività
├── dido-planning/              Mantenere e alleggerire
├── dido-rilascio/              Mantenere e rendere proporzionata
├── dido-platform-docs-writer/  Mantenere e rendere flessibile
├── dido-board/                 Solo con una board collegata
└── dido-checklist-sito-web/     Solo per audit web pertinenti

Nel singolo progetto:
docs/
├── conventions.md             Stack, linguaggio, struttura, comandi
└── design/                    Design e motion, se necessari
```

**Non creare nuove skill universali di design, motion o di ogni singola qualità del codice.** La qualità resta nella base comune; gli approfondimenti restano file di riferimento. La nuova denominazione `dido-frontend` sostituisce quella esistente, senza mantenere due skill con le stesse responsabilità.

Le skill specialistiche di terzi, come quelle per framework, test, browser e dipendenze, restano strumenti da attivare quando pertinenti. `design-taste-frontend` può servire come repertorio creativo facoltativo, senza imporre il suo stile ai progetti.

# Responsabilità delle skill

| Skill | Cosa deve garantire |
|---|---|
| dido-code-style | Comprendere il contesto, modifiche circoscritte, codice leggibile, responsabilità chiare, sicurezza di base, errori gestiti, prove e documentazione proporzionate. |
| dido-frontend | Interfacce accessibili, responsive e utilizzabili; stati di caricamento, vuoto ed errore; gestione corretta di rete, stato, browser e rendering. |
| dido-backend | Contratti chiari, validazione, autorizzazione, integrità dei dati, concorrenza, gestione dei guasti e osservabilità. |
| dido-planning | Requisiti verificabili, passi comprensibili, decisioni e stato del lavoro recuperabili tra sessioni. |
| dido-rilascio | Controllo del perimetro, revisione indipendente quando prevista, prove adeguate e rilascio verificato. |
| dido-platform-docs-writer | Consentire a un’altra persona di avviare, capire, verificare e gestire il progetto con informazioni attendibili. |
| dido-board | Rappresentare il piano sulla board scelta, senza diventare un requisito per lavorare. |
| dido-checklist-sito-web | Verificare le aree pertinenti di un sito, distinguendo risultati osservati, limiti e aspetti non applicabili. |

# Principi da conservare e chiarire

- **Solidità:** validare ai confini, gestire i guasti realistici, proteggere i dati e trattare esplicitamente gli errori. Una dipendenza opzionale non deve bloccare operazioni indipendenti.

- **Controllo:** usare lint, test e verifiche adatti alla modifica. Non dichiarare verificato ciò che non è stato provato. I bug corretti hanno una prova di regressione quando utile e praticabile.

- **Precisione:** ricostruire il flusso coinvolto, rispettare i contratti, controllare le versioni effettive e documentare le assunzioni rilevanti.

- **Modularità:** responsabilità e punti di ingresso chiari, dipendenze esplicite, effetti collaterali riconoscibili. Riutilizzare quando responsabilità e comportamento coincidono; la sola somiglianza visiva non obbliga a un’astrazione.

- **Scalabilità:** considerare crescita dei dati, query, memoria, concorrenza e limiti dei servizi. Scegliere paginazione, indici, code o cache in base agli accessi e ai requisiti; evitare sia colli di bottiglia evidenti sia infrastruttura ipotetica.

- **Documentazione:** spiegare decisioni, contratti e procedure operative; mantenere esempi e rimandi attendibili. Un riepilogo o un diagramma utile è ammesso, con fonte e responsabilità di aggiornamento.

- **Sicurezza:** segreti separati dal codice versionato, permessi verificati, dati sensibili esclusi da log e risposte. Un repository privato non giustifica la conservazione dei segreti nella cronologia.

- **Manutenzione:** rispettare il lavoro altrui, evitare refactor estranei e rimuovere ciò che viene sostituito compatibilmente con i contratti e le esigenze di migrazione.

# Cosa spostare nel progetto

| Tema | Dove deve essere deciso |
|---|---|
| JavaScript o TypeScript, arrow function, lingua di commenti e commit | Convenzioni del progetto e del team. |
| Nuxt, React, ORM, CMS, strumenti di stile e test | Stack del progetto. |
| BEM, cartelle dei componenti, scala e nomi dei token | Convenzioni frontend e design system. |
| Curve, durate, direzioni delle entrate, hover e scroll fluido | Design e requisiti d’interazione. |
| Forma del JSON, versionamento delle API, livelli controller/service/repository | Contratto e architettura del servizio. |
| Strategia di sessione, revoca, rate limit, cache e audit | Requisiti di sicurezza, disponibilità e operatività. |
| Lingue, CMS, SEO, sitemap e analytics | Funzionalità effettive del prodotto. |
| Numero di screenshot, viewport e ampiezza delle suite | Rischio della modifica e dispositivi supportati. |

Una scelta già valida nello starter può restare nello starter. Spostarla fuori dalla base comune non significa riscrivere il codice dei progetti esistenti.

# Regole da eliminare o riscrivere

| Regola attuale | Indicazione per la riscrittura |
|---|---|
| Segreti nei file env versionati perché il repo è privato | Eliminare come pratica generale. Non cancellare o ruotare credenziali durante questo lavoro sulle skill. |
| Hero animata, ingressi dal basso, una sezione per schermata | Rimuovere dagli obblighi generali: sono scelte creative. |
| Una sola easing, chiusura speculare, pannello sempre azzerato | Richiedere coerenza e correttezza; comportamento e conservazione dello stato dipendono dall’uso. |
| Una libreria per ogni animazione, divieto di CSS o scroll-snap | Preferire la soluzione più semplice che soddisfa i requisiti, compatibile con gli strumenti già adottati. |
| Misure del design arrotondate anche contro il riferimento | Rispettare il design approvato; segnalare incongruenze reali invece di correggere per gusto. |
| Testi d’aiuto ammessi solo in tre casi | Consentire spiegazioni quando aiutano a capire, scegliere o completare un’azione. |
| Riuso obbligatorio alla seconda somiglianza | Valutare responsabilità condivise e probabilità di evoluzione indipendente. |
| Vietare ogni tabella o diagramma che riassume il codice | Evitare duplicazioni fragili, consentendo sintesi utili e mantenibili. |
| Mai repository, cache, adapter o altre tecniche fuori dal modello scelto | Valutare necessità, costo e contesto; non trasformare la semplicità in un divieto architetturale. |
| Audit sempre facoltativo o rate limit sempre permissivo in caso di guasto | Definire il comportamento in base al rischio e ai requisiti del servizio. |

Nel motion conservare gli aspetti tecnici: rispetto delle preferenze di movimento ridotto, pulizia degli effetti, interruzioni gestite, focus e input corretti, contenuti accessibili e prestazioni verificate. Eliminare le prescrizioni estetiche universali. Le correzioni nate da uno specifico bug del browser devono indicare contesto e condizioni di applicazione.

# Come deve lavorare l’agente

1. Leggere le skill sorgenti in `dido-skills/skills`, i riferimenti e le regole dei repository coinvolti. Confrontare le copie distribuite prima di decidere dove intervenire.

2. Per ogni regola scegliere una destinazione: principio comune, approfondimento tecnico, convenzione del progetto oppure eliminazione. Conservare una mappa sintetica delle modifiche rilevanti.

3. Riscrivere prima `dido-code-style`, poi frontend e backend. Ridurre ripetizioni e rimandi circolari. Caricare gli approfondimenti per argomento, senza rendere ogni piccolo intervento un audit completo.

4. Allineare planning, rilascio e documentazione. Conservare la tracciabilità, evitando documenti e passaggi obbligatori senza utilità per il lavoro concreto.

5. Per la rinomina frontend, aggiornare tutti i riferimenti effettivi: cataloghi, distribuzione, istruzioni e documentazione. Verificare il meccanismo di rimozione del vecchio nome prima di distribuire.

6. Non modificare l’implementazione delle applicazioni, migrare stack, cambiare segreti o riscrivere skill di terzi come effetto collaterale della pulizia.

7. Verificare la nuova base con gli scenari sotto e con i controlli disponibili nel repository. Consegnare diff, esiti e limiti. Commit, push e distribuzione seguono le autorizzazioni del progetto.

# Criteri di accettazione

- Un piccolo script riceve regole di correttezza e verifica senza essere costretto ad avere controller, CMS, design system o piano di milestone.

- Un gestionale può conservare filtri e bozze e usare interazioni sobrie, senza animazioni scenografiche obbligatorie.

- Un sito con design approvato lo segue, segnalando problemi di accessibilità senza imporre gusti diversi.

- Un servizio backend può adottare un’architettura e un contratto diversi dallo starter, mantenendo integrità, permessi e verifiche.

- Un progetto con più processi affronta esplicitamente stato condiviso, concorrenza e guasti; le skill non impongono una risposta unica a ogni rischio.

- Chi riprende il progetto trova comandi di avvio, prove, decisioni, configurazione necessaria e limiti noti.

- Le regole generali non impongono framework, linguaggi o stile visivo. Le eccezioni sono motivate dal contesto, non da una lista crescente di deroghe.

- I riferimenti alle skill rinominate sono coerenti e la distribuzione non lascia due fonti concorrenti.

# Consegna finale richiesta

Un riepilogo leggibile con: skill mantenute, rinominate e riscritte; regole spostate nei progetti; regole eliminate; scenari verificati; eventuali decisioni ancora necessarie. Nessuna nuova skill solo per suddividere un testo lungo: prima usare sezioni e riferimenti mirati.

# Vincoli per non perdere qualità durante la pulizia

- Rendere le skill indipendenti dallo stack non significa renderle vaghe. Ogni regola deve indicare quando si applica, il risultato atteso e una verifica concreta, quando possibile.
- Distinguere requisiti di correttezza e sicurezza, impostazioni predefinite modificabili e semplici esempi. Evitare sia divieti arbitrari sia formule come “dipende dal progetto” senza criteri di scelta.
- I requisiti di prodotto possono cambiare strumenti e strategie, ma non giustificano perdita di dati, permessi non verificati o dichiarazioni di test mai eseguiti.
- Non indebolire controlli di sicurezza, integrità, accessibilità o rilascio per accorciare il testo. Una regola eliminata deve risultare superflua, specifica di un progetto oppure sostituita da una regola più corretta.
- Conservare i contratti pubblici e prevedere migrazioni quando esistono utenti o client che dipendono dal comportamento precedente. “Togliere il vecchio” non autorizza modifiche incompatibili indiscriminate.
- Per gli effetti esterni importanti, considerare anche i guasti tra salvataggio e invio: idempotenza, retry e consegna affidabile si decidono secondo il requisito, senza imporre una tecnica unica.
- Registrare separatamente le preferenze personali o del team ancora desiderate. Non eliminarle dallo starter soltanto perché non sono universali.

# Verifica richiesta prima di riscrivere

L’analisi iniziale ha riguardato principalmente dido-code-style, dido-frontend-nuxt e i suoi riferimenti, dido-backend, planning, rilascio, documentazione e alcune prescrizioni di design-taste-frontend. Non è una verifica completa di tutti gli script, riferimenti e skill distribuite.

L’agente deve completare l’inventario, includendo eventuali skill non valutate come dido-goal, senza eliminarle per la sola assenza nell’alberatura proposta. Deve inoltre leggere le istruzioni correnti di dido-skills/AGENTS.md e usare il workflow di scrittura e valutazione delle skill che quel repository richiede. Le verifiche comportamentali vanno eseguite in un ambiente di prova; un controllo testuale da solo non dimostra che l’agente seguirà meglio le nuove istruzioni.

Prima della distribuzione, verificare che i tre starter conservino le proprie convenzioni, che i richiami alle skill siano aggiornati e che ai:update gestisca la rinomina senza lasciare copie obsolete. Nessuna modifica alle applicazioni è implicita in questo documento.

