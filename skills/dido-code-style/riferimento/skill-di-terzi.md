# Skill di terzi: cosa vale qui

Le skill di terzi danno conoscenza (un'API, una diagnosi, un controllo), ma spesso con abitudini di altri progetti. Dove dicono altro valgono le skill `dido-*`, il `CLAUDE.md` del progetto e le frasi qui sotto. Sono scritte per argomento, non per skill: valgono anche se una skill cambia nome o viene tolta. Le eccezioni di uno stack stanno nel file `riferimento/skill-di-terzi.md` della sua skill (dido-frontend-nuxt, dido-backend).

## Lingua e forma

- Si risponde e si scrive in italiano, anche quando una skill dà frasi fisse, report o messaggi in inglese. Tabelle e numeri generati restano identici.
- Gli esempi di una skill sono un riferimento: si riscrivono in JavaScript con le arrow function, nei file, nei nomi e nei punti d'ingresso del progetto. Le soluzioni che esistono solo in TypeScript non si portano.

## Installazione e dipendenze

- Skill e plugin si installano, si aggiornano e si tolgono solo con gli script `ai:*` del repo. Le istruzioni d'installazione dentro una skill (`--global`, `/plugin install`, `npx <strumento> skill`, `update` dello strumento) non valgono, e nessun installatore scrive in AGENTS.md o CLAUDE.md.
- Una skill che un'altra cita ma che non è installata non si installa da sola: si chiede a Dido.
- Un pacchetto si installa con il gestore del repo (pnpm nel frontend, npm nel backend), mai con un altro. Se è già nel `package.json` non si reinstalla.
- Una dipendenza nuova solo se serve davvero, è mantenuta e passa l'audit. Per una dipendenza abbandonata o rischiosa la prima strada è toglierla o sostituirla con poche righe.
- Uno strumento usato ogni tanto si lancia con `npx` e non entra nel `package.json`.

## Processo

- Il processo lo danno dido-planning (lavori grandi) e dido-code-style (tutto il resto). Brainstorming obbligatori, spec o piani in cartelle di uno strumento, TDD che cancella il codice scritto prima del test, worktree, commit fatti da soli o in un altro formato, revisioni con soglie diverse da Alta e Media: non valgono, anche se una skill dice di usarli "sempre".
- Dove una skill dice di andare avanti con un segnaposto e la scelta va contro il progetto, si chiede a Dido.

## Testi e prosa

- Restano: le alternative che chi legge sceglierebbe davvero ("X, non Y"), le note sul perché qualcosa manca, le regole "non aggiungere X", i blocchi fissi delle doc ("NON DEDUCIBILE", "da confermare", "File controllati") con il loro grassetto, il grassetto dei nomi di bottoni, stati e campi nei testi d'interfaccia.
- Nei titoli delle doc il trattino lungo resta, perché da lui dipendono le ancore dei link. Nel testo ne è ammesso uno per paragrafo.
- Il report tiene cosa è stato verificato, con i comandi, cosa no e perché, e la riga sul controllo di sicurezza: non è contesto ripetuto.
- Chi rivede un testo cambia solo la prosa che gli è chiesta, senza fatti nuovi e senza ristrutturare. In italiano controlla anche le caporali, il punto a metà altezza e i tic nostrani ("cruciale", "fondamentale", "è importante notare"). La forma impersonale delle regole resta.

## Test

- I test si scrivono in JavaScript, nella cartella e con la config di test del repo, con le API della versione installata. Niente config in TypeScript accanto a quella del repo: la scavalca.
- Niente pacchetti di test nuovi, file env in più o suite parallele (E2E nel frontend, Arazzo, browser mode) senza richiesta.

## Browser automatizzato

- Serve a verificare (render, console, richieste, cookie, larghezze), non a scrivere test. Il comando si installa globale.
- Snapshot, screenshot, tracce, video e stati di login vanno fuori dal repo, nella cartella temporanea della sessione, e si cancellano a fine lavoro: tracce e stati di login contengono cookie, token e password.
- Un'interfaccia si giudica dagli screenshot alle larghezze della skill dello stack: lo snapshot ad albero serve a trovare gli elementi, l'emulazione mobile non sostituisce le altre larghezze.
- Una risposta finta del backend ha la forma e lo status veri del contratto.

## Audit delle dipendenze

- Le vulnerabilità di tutto l'albero si controllano con `pnpm audit` o `npm audit`. Se uno strumento non legge il lockfile del repo (per esempio `pnpm-lock.yaml`), il report dice che ha visto solo le dipendenze dirette.
- Con pnpm gli script d'installazione sono già bloccati, tranne quelli in `pnpm.onlyBuiltDependencies`: un pacchetto segnalato si valuta contro quell'elenco.

## File degli strumenti nel repo

- Nessun DESIGN.md, PRODUCT.md, brief, glossario o file di contesto creato da uno strumento: il riferimento sta in `docs/`, e se uno strumento chiede di documentare qualcosa si aggiorna il file di `docs/` che c'è già.
- I file di lavoro degli strumenti (config, cache, mock, estrazioni, download) stanno in cartelle che il `.gitignore` ignora per intero. Nessuno strumento scrive nella root del repo o fuori dalla sua cartella.
- Gli strumenti non toccano codice e config del progetto: niente plugin temporanei, patch alla config o hook aggiunti in `.claude/`, `.github/` o `.codex/`. Se uno strumento non parte senza, non si usa.
- I controlli automatici di una skill (lint, detector, hook, soglie) sono un parere: il "fatto" lo decidono il lint e la verifica del progetto. Le eccezioni non vanno in file di config né in commenti di ignore: si scrivono nel report.
