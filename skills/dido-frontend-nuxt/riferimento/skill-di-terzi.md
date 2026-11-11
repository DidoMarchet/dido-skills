# Skill di terzi nei frontend: cosa vale qui

Le eccezioni che valgono per ogni stack stanno in `dido-code-style/riferimento/skill-di-terzi.md`; quelle legate agli strumenti del progetto in `docs/conventions.md` del progetto. Qui ci sono quelle di ogni frontend. Per animazioni e scroll vale `motion.md`, accanto a questo file. Quello che SKILL.md dice già vale anche quando una skill di terzi dice altro.

## Design: fonte e direzione

- Con un design di riferimento, il design è il brief: palette, font, composizione, sezioni, immagini e motion (cosa si muove e in che ordine; easing e durate dai token) vengono da lì. Niente direzioni estratte da una libreria o tirate a sorte, interviste su tono e stile, immagini generate o valori presi da un'immagine.
- Senza design una skill può proporre la direzione: prima del codice la proposta diventa token del progetto, e la sceglie chi lavora con te.
- Quello che il design ha resta, anche se una checklist di design lo vieta (righe della griglia, divisori, eyebrow, ombre, gradienti, monospace, colori di brand, card, hero diviso). I divieti estetici delle skill valgono solo dove il design non dice niente.
- Un testo sotto AA o un punto del design che va contro una regola si segnala nel report, non si cambia in silenzio.
- Niente sezioni, interazioni, immagini, animazioni o temi che il brief, il design o dido-frontend-nuxt non chiedono: si propongono nel report. Tema scuro e lingue da destra a sinistra solo se il progetto li ha.
- Le estrazioni da un sito di riferimento servono a leggere: i loro file (temi, variabili, componenti) non entrano nel progetto.
- Prima di caricare il progetto in uno strumento esterno si controlla che l'archivio non contenga i file env.

## Design: token, layout, immagini

- Un valore preso da una skill o da un sito di riferimento si arrotonda come quelli del design. Un valore fuori scala non diventa un token o una variante nuova.
- Niente reset, griglie, classi o fogli di stile copiati da una skill: bottoni, link, input e card si riusano dal design system. Niente card che si alzano, ripple o zoom delle immagini.
- Il codice che arriva dal design o da una skill (un altro framework, un altro linguaggio, stili inline, posizioni assolute, wrapper annidati) è un riferimento: si riscrive nei componenti, nelle classi e nei token del progetto.
- I font sono quelli del design, serviti dal sito stesso, con almeno il Latin-1. Un avviso "font troppo usato" su questi font si ignora.
- Le immagini vengono dal design o dal CMS. Niente URL temporanei di uno strumento o foto linkate da domini esterni. Una foto stock, generata o di un archivio aperto è un segnaposto e si elenca nel report.
- Niente attributi o marcatori messi solo per gli strumenti, né TODO nel codice: un limite va nel report.

## Dati, store, form

- Da una guida di debug di un framework si prende la diagnosi, non il codice: la correzione usa i meccanismi e i composable del progetto, non aggiunge dipendenze e gira nel rendering lato server prima di dirla fatta.
- Un errore catturato continua a salire fino all'error tracking. Un mismatch di idratazione si corregge, non si zittisce.
- Lo stato di autenticazione sta solo in memoria: niente token né utente nello storage del browser. Lo storage si usa solo nel client, dentro try/catch.
- Anteprima delle bozze, modifica dal sito, tempo reale e cache tag del CMS solo su richiesta. Il token delle bozze non arriva mai nel browser.
- Niente generazione di tipi o di codice dallo schema del CMS.
- Lo stile dei form resta quello del progetto, vestito con il suo design system.
- L'errore di un backend è un solo messaggio. Va sul campo quando la pagina sa a quale si riferisce, altrimenti è l'errore del form; niente adattatori che lo dividano sui campi. I campi li valida il client.
- Un sito nuovo parte dallo starter, mai da uno starter ufficiale di un servizio.
