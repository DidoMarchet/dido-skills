# Skill di terzi: cosa vale qui

Le skill di terzi danno conoscenza (un'API, una diagnosi, un controllo), ma spesso con abitudini di altri progetti. Dove dicono altro valgono le skill `dido-*`, il `CLAUDE.md` del progetto e le frasi qui sotto. Sono scritte per argomento, non per skill: valgono anche se una skill cambia nome o viene tolta. Le eccezioni di uno stack stanno nel file `riferimento/skill-di-terzi.md` della sua skill (dido-frontend-nuxt, dido-backend).

## Lingua e forma

- Si risponde in italiano, anche quando una skill dà frasi fisse, report o messaggi in inglese. Per il resto vale la lingua di dido-code-style ("Forma del codice"): nomi nuovi in inglese, commenti, commit e doc in italiano. Tabelle e numeri generati restano identici.
- Gli esempi di una skill sono un riferimento: si riscrivono in JavaScript con le arrow function, nei file, nei nomi e nei punti d'ingresso del progetto. Le soluzioni che esistono solo in TypeScript non si portano.

## Installazione e dipendenze

- Skill e plugin si installano, si aggiornano e si tolgono con gli script del repo, mai globali. Le istruzioni d'installazione dentro una skill (installazione globale, comandi di un plugin, aggiornamento dello strumento) non valgono, e nessun installatore scrive nelle istruzioni del progetto.
- Una skill che un'altra cita ma che non è installata non si installa da sola: si chiede.
- Un pacchetto si installa con il gestore pacchetti del repo, mai con un altro. Se è già nel `package.json` non si reinstalla.
- Una dipendenza nuova solo se serve davvero, è mantenuta e passa l'audit. Per una dipendenza abbandonata o rischiosa la prima strada è toglierla o sostituirla con poche righe.
- Uno strumento usato ogni tanto si lancia senza installarlo e non entra nelle dipendenze.
- La documentazione di una libreria si chiede per la versione del lockfile, anche a un servizio di documentazione.

## Processo

- Il processo lo danno dido-planning (lavori grandi) e dido-code-style (tutto il resto). Brainstorming obbligatori, spec o piani in cartelle di uno strumento, TDD che cancella il codice scritto prima del test, un worktree per ogni lavoro (servono solo a più sessioni sullo stesso repo, come dice dido-code-style), commit in momenti o formati diversi da quelli di dido-code-style e dido-planning, revisioni con altre soglie di gravità (i "Minor" non si riportano): non valgono, anche se una skill dice di usarli "sempre".
- Un piano eseguito con dei subagenti segue dido-planning: i test che un subagente dichiara si rilanciano, le decisioni di prodotto si chiedono.
- Trovata la causa di un bug, si corregge in un punto: niente controlli ripetuti a ogni livello né guardie per i test nel codice.
- Dove una skill dice di andare avanti con un segnaposto e la scelta va contro il progetto, si chiede.
- Una regola che chiede di caricare una skill prima di ogni risposta, o un brainstorming prima di ogni lavoro, non scavalca dido-planning: una richiesta piccola si fa e basta, un lavoro grande segue il piano e le cartelle di dido-planning anche quando si usa la skill di un altro per scriverlo o eseguirlo.
- Delle skill di processo si usano le tecniche: nel debugging i log a ogni confine tra componenti prima di proporre un fix; gli agenti in parallelo solo su parti indipendenti, con la suite intera alla fine; per un subagente il compito in un file, senza la storia della sessione; una modifica a una skill `dido-*` provata con uno scenario prima di pubblicarla.

## Testi e prosa

- Quando una skill riscrive un testo, restano: le alternative che chi legge sceglierebbe davvero ("X, non Y"), le note sul perché qualcosa manca, le regole "non aggiungere X", i blocchi fissi delle doc ("NON DEDUCIBILE", "da confermare", "File controllati") con il loro grassetto, il grassetto dei nomi di bottoni, stati e campi nei testi d'interfaccia.
- I titoli delle doc non si riscrivono e il loro trattino lungo resta, perché da loro dipendono le ancore dei link. Nel testo ne è ammesso uno per paragrafo. Restano le frecce che indicano un flusso o una mappatura.
- Il report tiene tutto ciò che chiede dido-code-style: cosa è stato verificato, con i comandi, cosa no e perché, cosa è stato letto per intero, in parte o no, le scelte fatte senza chiedere e la riga sul controllo di sicurezza. Non è contesto ripetuto.
- Stati vuoti, caricamenti, tooltip e onboarding non spiegano, e gli esiti si dicono con il fatto, senza empatia né festeggiamenti, anche quando una skill di copy li chiede (dido-code-style, "Testi"). Le virgolette restano dritte anche dove una skill vuole quelle curve.
- Chi rivede un testo cambia solo la prosa che gli è chiesta, senza fatti nuovi e senza ristrutturare. In italiano controlla anche le caporali, il punto a metà altezza e i tic nostrani ("cruciale", "fondamentale", "è importante notare"). La forma impersonale delle regole resta.

## Test

- I test si scrivono in JavaScript, nella cartella e con la config di test del repo, con le API della versione installata. Niente config in TypeScript accanto a quella del repo: la scavalca.
- Niente pacchetti di test nuovi, file env in più o suite parallele (E2E nel frontend, browser mode) senza richiesta.
- Un test passa dall'interfaccia pubblica anche se una skill ne chiede uno per funzione: niente dipendenze iniettate solo per i test, niente test su codice che non si tocca.

## Browser automatizzato

- Serve a verificare (render, console, richieste, cookie, larghezze), non a scrivere test. La CLI che guida il browser si installa globale, fuori dal `package.json`.
- Snapshot, screenshot, tracce, video e stati di login salvati a mano vanno nella cartella temporanea della sessione; quelli che la CLI salva da sola restano nella sua cartella, ignorata da git. Tutti si cancellano a fine lavoro: tracce e stati di login contengono cookie, token e password.
- Un'interfaccia si giudica dagli screenshot alle larghezze della skill dello stack: lo snapshot ad albero serve a trovare gli elementi, l'emulazione mobile non sostituisce le altre larghezze.
- Una risposta finta del backend ha la forma e lo status veri del contratto.

## Audit delle dipendenze

- Le vulnerabilità di tutto l'albero si controllano con l'audit del gestore pacchetti del repo. Se uno strumento non legge il lockfile del repo, il report dice che ha visto solo le dipendenze dirette, e non alle versioni installate.
- Dove il gestore pacchetti blocca già gli script d'installazione tranne un elenco consentito, un pacchetto segnalato si valuta contro quell'elenco.

## File degli strumenti nel repo

- Nessun DESIGN.md, PRODUCT.md, brief, glossario o file di contesto di uno strumento entra in git. Se uno strumento non lavora senza, il file resta in locale (il `.gitignore` lo ignora) e si scrive da `docs/`, che resta il riferimento. Se uno strumento chiede di documentare qualcosa si aggiorna il file di `docs/` che c'è già.
- I file di lavoro degli strumenti (config, cache, mock, estrazioni, download) stanno in cartelle che il `.gitignore` ignora per intero. Nessuno strumento scrive nella root del repo o fuori dalla sua cartella.
- Gli strumenti non toccano codice e config del progetto, salvo le pagine di prova temporanee che il file dello stack ammette: niente plugin temporanei, patch alla config o hook aggiunti in `.claude/`, `.github/` o `.codex/`. Se uno strumento non parte senza, non si usa.
- I controlli automatici di una skill (lint, detector, hook, soglie) sono un parere: il "fatto" lo decidono il lint e la verifica del progetto. Le eccezioni ai controlli di una skill non vanno in file di config né in commenti di ignore: si scrivono nel report. Il lint del progetto si spegne solo come dice dido-code-style.
