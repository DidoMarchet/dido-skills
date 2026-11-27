# Piano skill-neutre: skill dido-* valide per ogni tipo di progetto

> Stato: **bozza, da approvare**.
> Riguarda dido-skills, e `AGENTS.md` e `docs/conventions.md` dei tre starter. Lo stato sta in "Dove siamo", in fondo a questo piano.

## Cosa si chiede e cosa si fa

| Voce | Cosa si fa |
|---|---|
| Skill neutre e solide, riusabili su progetti diversi (26/11) | Nelle skill restano solo le regole vere per ogni progetto del loro tipo: correttezza, sicurezza, integrità dei dati, accessibilità, verifica, documentazione. |
| Niente eccezioni né parti da ignorare | Ciò che vale per uno stack o per i gusti di uno starter esce dalla skill e va in `docs/conventions.md` dello starter, che `ai:update` porta già nei siti. La skill dice solo: segui le convenzioni del progetto. |
| Un percorso completo, dalla progettazione alla manutenzione (26/11) | Le skill coprono ogni fase per ogni tipo di software: progettazione e architettura, sviluppo frontend e backend, prestazioni e carico, sicurezza, revisione, rilascio e deploy, operatività e manutenzione. Le fasi che mancano sono nel passo 6b. |
| Non perdere ciò che c'è | Ogni regola tolta ha una destinazione scritta: convenzioni dello starter, file di riferimento caricato solo se il progetto usa quello stack, oppure eliminata con il motivo. |

**Si chiude quando**:
- gli scenari su progetti diversi dagli starter (script, app React, backend non Express, gestionale) passano senza che l'agente dica di dover fare eccezioni o ignorare una regola;
- gli scenari già in `evals/` passano ancora;
- nei tre starter il comportamento resta quello di oggi (le convenzioni sono le stesse, solo spostate);
- `ai:update` in un sito toglie il vecchio nome della skill frontend e non ne lascia due.

## Dal documento di partenza

Da `docs/riorganizzazione-skill-linee-guida-software.md`, che si toglie quando il lavoro parte. Si tiene ciò che non va contro le scelte di Dido; i segreti nei file env restano come convenzione degli starter.

**Vincoli per non perdere qualità**
- Neutro non vuol dire vago: ogni regola dice quando si applica, il risultato atteso e, dove si può, come si verifica.
- Si distinguono requisiti di correttezza e sicurezza, valori predefiniti che il progetto può cambiare, ed esempi. Niente divieti senza motivo, e niente "dipende dal progetto" senza il criterio per scegliere.
- I requisiti di prodotto cambiano strumenti e strategie, mai la protezione dei dati, i permessi verificati o le prove dichiarate.
- Non si indeboliscono controlli di sicurezza, integrità, accessibilità o rilascio per accorciare il testo. Una regola tolta è superflua, di un solo progetto, o sostituita da una migliore.
- I contratti pubblici si tengono, con una migrazione quando qualcuno dipende dal comportamento di prima: "togli il vecchio" non autorizza rotture.
- Per gli effetti esterni importanti (mail, pagamenti, webhook) si considera il guasto tra il salvataggio e l'invio: idempotenza, retry e consegna si scelgono in base al requisito, senza una tecnica unica.
- Le preferenze di Dido e dello starter non si perdono: si spostano.

**Regole da riscrivere**, da verificare con l'inventario e le prove

| Regola di oggi | Come diventa |
|---|---|
| Hero animata, ingressi dal basso, una sezione per schermata | Scelte creative: nelle convenzioni o nel design del progetto |
| Una sola easing, chiusura speculare, pannello sempre azzerato | Nella skill: movimento coerente e corretto; il dettaglio nello starter |
| Una libreria per ogni animazione, niente CSS o `scroll-snap` | Nella skill: la soluzione più semplice che fa ciò che serve, con gli strumenti già scelti; il resto nello starter |
| Misure arrotondate anche contro il design | Nella skill: si segue il design approvato e si segnalano le incongruenze; l'arrotondamento nello starter Nuxt |
| Riuso obbligatorio alla seconda somiglianza | Si riusa quando la responsabilità è la stessa, non per la sola somiglianza |
| Mai una tabella o un diagramma che riassume il codice | Niente copie che invecchiano; una sintesi utile si tiene, con la sua fonte |
| Mai repository, cache, adapter fuori dal modello scelto | Si valutano bisogno, costo e contesto; la semplicità resta il punto di partenza |
| Audit sempre facoltativo, rate limit sempre permissivo con il guasto | Si decide in base al rischio del servizio; la scelta dello starter resta nelle sue convenzioni |
| Correzioni nate da un bug di un browser | Con il contesto e le condizioni in cui valgono |

Del motion resta nella skill la parte tecnica: reduced motion, pulizia degli effetti, interruzioni gestite, focus e input corretti, contenuti accessibili, prestazioni misurate.

**Criteri in più per la chiusura**
- Uno script piccolo riceve regole di correttezza e verifica, senza controller, CMS, design system o milestone.
- Un gestionale tiene filtri e bozze e usa interazioni sobrie, senza animazioni obbligatorie.
- Un sito con un design approvato lo segue, e segnala i problemi di accessibilità senza imporre altri gusti.
- Un backend può avere un'architettura e un contratto diversi dallo starter, con integrità, permessi e prove.
- Un progetto con più processi affronta stato condiviso, concorrenza e guasti, senza una risposta unica imposta.
- Chi riprende il progetto trova avvio, prove, decisioni, configurazione e limiti noti.

## Cosa c'è già

- `docs/conventions.md` negli starter, portato da `ai:update`: è il posto naturale delle preferenze degli starter.
- `ai:update` toglie da solo le skill che lo starter non ha più (`scripts/skills-update.mjs`).
- Prove in `evals/` per code-style, frontend-nuxt, backend, board, goal, rilascio.
- Regole oggi legate allo stack o ai gusti, trovate leggendo: segreti nei `.env` versionati, arrow function, una sola easing, valori arrotondati a multipli di 5, niente `scroll-snap`, Nuxt e DatoCMS nella skill frontend, Express/Prisma nella skill backend.

## Dove va ogni cosa (proposta del 26/11, da confermare con l'inventario)

| Dove | Cosa |
|---|---|
| dido-code-style | capire prima di toccare, modifiche minime, codice leggibile e modulare, niente codice morto, togliere il vecchio, sicurezza in ogni modifica, errori gestiti, bug con la prova, fatto vuol dire verificato, revisioni e analisi. Rimando a `docs/conventions.md` del progetto |
| dido-frontend | accessibilità, responsive e valori fluidi con gli strumenti del progetto, stati di caricamento, vuoto ed errore, degradare senza cadere, SSR e idratazione, hover solo con il puntatore, dati e terze parti in un punto solo, config ed env fuori dai componenti, SEO tecnica per i siti pubblici (sitemap, robots e indicizzazione per ambiente, canonical, hreflang e slug localizzati, schema.org, meta e Open Graph, status 404 e 500, redirect, Core Web Vitals), motion tecnico (reduced motion, `transform` e `opacity`, pulizia, interruzioni), verifica con screenshot in proporzione |
| dido-backend | contratti, validazione al confine, permessi sul server, transazioni e concorrenza, guasti dei servizi opzionali, migration versionate, log e audit senza segreti, rate limit, test E2E su un database vero |
| planning, rilascio, goal, board, docs-writer, checklist | come oggi, senza nomi di stack |
| Starter Nuxt (`docs/conventions.md`, `scss-system.md`, `motion.md`) | Nuxt e Vue, SCSS con `scss-slamp` e `scss-react` (pacchetti di Dido, mantenuti: restano), BEM e cartelle dei componenti, scala `.title`/`.text`, colori a scala per famiglia, multipli di 5 e arrotondamento sul design, DatoCMS, i18n, FormKit, GSAP e Lenis con una sola easing, file env con i valori |
| Starter admin | Tailwind con colori di ruolo, testi nel template, transizioni di Tailwind e Vue, Pinia, `useApi()` |
| Starter backend | Express, Prisma, Zod, livelli routes/controller/service, `HttpError`, PM2, Redis, Docker e Coolify, le scelte su retry, lock e paginazione |
| CLAUDE.md globale | lingua e modo di scrivere, testi d'aiuto, JavaScript e non TypeScript |
| Tutti gli starter | arrow function e nomi vietati (già nel lint), JavaScript ESM |

## Step

0. **Niente nomi di clienti in dido-skills** (26/11, Dido: "non devono esserci nomi di clienti"; solo dai file di oggi, la storia git resta). Nello stesso passo si toglie `docs/riorganizzazione-skill-linee-guida-software.md`, già riportato in "Dal documento di partenza". Oggi c'è `bici.pro` in `evals/REPORT.md` e nelle prove di dido-board (`board.test.mjs`, `fake-infinity.mjs`, `fixture.sh`, due `case.yaml`), e il nome di persona Lorenzo in `skills/dido-board/SKILL.md` e nelle prove di dido-board. Si sostituiscono con nomi finti e si rilanciano `node --test evals/dido-board/board.test.mjs` e le prove di dido-board. La storia git, che è pubblica, li contiene ancora (26 righe): ripulirla vuol dire riscriverla e forzare il push, che lancia Dido.
1. **Inventario**: ogni regola di ogni skill `dido-*` (comprese dido-goal e i file di riferimento) con la destinazione: base comune, riferimento di stack, convenzioni dello starter, eliminata. Esce una tabella in questo piano, da guardare insieme prima di scrivere.
2. **Scenari prima (RED)**: 4 repo di prova non starter (script Python, app React, backend Go o Fastify, gestionale Vue con filtri e bozze) e 2 compiti per ciascuno, lanciati con `claude -p` e le skill di oggi. Si annota dove l'agente applica regole che non c'entrano o dice di doverle ignorare. Senza difetto visto, la regola non si tocca.
3. **dido-code-style**: base comune neutra; le preferenze escono verso le convenzioni degli starter. Scenari del passo 2 e `evals/dido-code-style`.
4. **Skill frontend**: base neutra (accessibilità, responsive, stati di caricamento, vuoto ed errore, rete, motion tecnico); Nuxt, SCSS e DatoCMS in `riferimento/nuxt.md`, letto solo se il progetto usa Nuxt. Rinomina in `dido-frontend` (vedi Domande aperte).
5. **dido-backend**: base neutra (contratti, validazione, permessi, transazioni, guasti, log); lo stack dello starter in un riferimento o nelle convenzioni.
6. **planning, rilascio, docs-writer, board, checklist, goal**: si tolgono solo le parti legate a uno stack o i passaggi obbligatori che gli scenari mostrano inutili.
6b. **Le fasi che mancano** (26/11), viste mettendosi nei panni dei vari ruoli di un progetto:
   - **progettazione** in dido-planning: requisiti non funzionali (carico atteso, dati, sicurezza, disponibilità, costi), scelta dell'architettura per tipo di software (sito, app, API, servizi, script, worker), modello delle minacce per ciò che tocca dati o permessi;
   - **prestazioni e carico**: un riferimento con il metodo per misurare (Core Web Vitals e peso delle pagine nel frontend, prova di carico, query lente e colli di bottiglia nel backend), usato quando il piano ha la sezione "Misure";
   - **analisi di sicurezza**: oltre ai controlli di ogni modifica, un'analisi su richiesta o prima di un rilascio importante (minacce, dipendenze, segreti, permessi, esposizione dei dati);
   - **operatività e manutenzione**: una skill nuova, `dido-operations`: deploy e rollback, controlli dopo il deploy, monitoraggio e alert senza un servizio imposto, backup con una prova di ripristino, incidenti, aggiornamento delle dipendenze e dei runtime. Funziona anche senza chiavi: senza accesso prepara comandi, script e procedure e controlla il sito dall'esterno; con un accesso in sola lettura legge log e stato; ogni azione che cambia qualcosa in produzione (deploy, riavvio, ripristino) la fa solo con la conferma di chi lavora con te, come oggi per Coolify.
   Ogni parte nuova ha il suo scenario prima e dopo, come il resto.
6c. **Skill che migliorano dai progetti** (26/11). Oggi dido-code-style chiede la sezione "Skill da rivedere" nel report, ma i casi restano nella chat del progetto e si perdono. Si aggiunge il giro completo:
   - **raccolta**: quando succede un caso, l'agente propone di aprire una issue su dido-skills con l'etichetta `caso`: progetto, skill e regola, cosa ha fatto, cosa doveva fare, se è un miglioramento, un conflitto o una regola che non si sa applicare. La apre con l'ok di chi lavora con te;
   - **avviso**: `ai-check` all'avvio dice quanti casi sono aperti;
   - **smistamento**: in dido-skills, quando chi lavora con te lo chiede, l'agente valuta ogni caso e gli dà un'etichetta:
     - `confermato`: uno scenario in `evals/` mostra il difetto, e il difetto vale per più tipi di progetto. L'agente propone la correzione, già confrontata con le altre skill e riprovata;
     - `del-progetto`: è giusto, ma vale solo per uno starter o un progetto. Va nelle sue convenzioni o nel suo `AGENTS.md`, non nella skill;
     - `non-riprodotto`: lo scenario non mostra il difetto. Si chiude con il motivo;
     - `da-decidere`: è un gusto o una scelta di prodotto, non un errore. Decide chi lavora con te;
     - un caso uguale a uno già aperto si unisce a quello.
     Chi lavora con te vede l'elenco con l'etichetta, la correzione proposta e il costo, e decide cosa entra. Il push solo con il suo ok;
   - **novità esterne** (facoltativo): un'attività programmata una volta al mese legge le novità delle skill di terzi e delle versioni principali degli strumenti usati, e apre issue `novità`. Non cambia le skill.
   - **anche gli starter migliorano**: un caso `del-progetto` che riguarda uno starter diventa una issue sul repo di quello starter, che è privato, quindi lì il caso si può raccontare con il codice vero. Si prova, si corregge `docs/conventions.md` o il codice dello starter, e i siti prendono le convenzioni con `ai:update`. Il codice e le altre doc dei siti non li tocca `ai:update`: lì la correzione si copia a mano, come oggi.
   Una skill non si cambia mai da sola: ogni modifica passa da scenario, confronto con le altre skill e ok al push.
6d. **Lavoro sui casi online, senza il PC di Dido** (26/11, più avanti). Un agente su GitHub prende una issue `caso`, la prova con `evals/`, corregge la skill e apre una pull request con l'esito prima e dopo. Dido la unisce, anche dal telefono. Dettagli e fattibilità in "Lavoro online: fattibilità", sotto.
7. **Starter**: `docs/conventions.md` e `AGENTS.md` dei tre starter ricevono le regole spostate, con lo stesso testo. `evals/` degli starter: lo stesso comportamento di oggi.
8. **Prove di chiusura**: tutti gli scenari, prima e dopo, con gli esiti in `evals/REPORT.md`.
9. **Revisione** indipendente del diff.
10. **Distribuzione** (con il tuo ok): push di dido-skills e degli starter, `ai:update` nei siti, correzione del vecchio nome nelle doc dei siti (una sostituzione per repo).

## Lavoro online: fattibilità

Analisi del 26/11 sui file di oggi. Si fa più avanti, dopo i passi 1-10.

### Cosa c'è e cosa manca

| Pezzo | Stato | Cosa serve |
|---|---|---|
| Repo dido-skills | **pubblico**, licenza MIT | Niente per le Actions: sui server standard i minuti sono gratis |
| Starter | **privati** tutti e tre | Un token GitHub in sola lettura sui tre starter, nei segreti di dido-skills |
| Copia degli starter nelle prove (`bin/starter-copy.sh`) | Clona dal disco di Dido (`~/Desktop/Dido Git Test/...`) e collega i suoi `node_modules` | Una variante per il server: clone da GitHub con il token, al commit fissato, e installazione delle dipendenze (`pnpm install --frozen-lockfile`, `npm ci` in `app/node`) |
| Skill nelle prove | Lette da `~/.claude/skills`, collegate a `skills/` | Sul server lo stesso collegamento, creato dal workflow |
| Plugin superpowers | Acceso nelle prove locali, installato sul Mac di Dido | Il server parte vuoto a ogni giro: nell'Action un passo prima dell'agente lancia `claude plugin marketplace add anthropics/claude-plugins-official` e `claude plugin install superpowers@claude-plugins-official`, come fa già `scripts/plugins-install.mjs` negli starter. Nelle routines lo stesso nello script di preparazione dell'ambiente cloud, se c'è (da verificare) |
| Postgres per le prove backend (`bin/backend-db.sh`) | Docker in locale | Docker c'è sui server Ubuntu di GitHub |
| Valutazione (`bin/grade.py` più un valutatore cieco) | Il valutatore è un agente lanciato a mano | Un `claude -p` separato, che non vede come è andato il lavoro |
| Conteggio dei casi all'avvio | `ai-check` legge già GitHub con il token di `gh` | Una chiamata in più alle issue aperte con l'etichetta `caso` |
| Issue dai progetti | `gh` c'è sul Mac di Dido | Regola in dido-code-style: la issue si propone, si apre con l'ok |

### Rischi e come si chiudono

- **Chiunque può aprire issue su un repo pubblico.** L'agente parte solo per un'etichetta (che mette solo chi ha accesso in scrittura) o per un commento di Dido; il workflow controlla l'autore. Il testo di una issue è un dato, non un'istruzione.
- **I casi vengono da progetti di clienti, e una issue su un repo pubblico è pubblica.** dido-skills resta pubblico (Dido, 26/11). Una issue non contiene nome del cliente, codice del cliente, valori dei file env o URL privati: il caso si racconta con un esempio neutro.
- **Nomi di clienti già pubblici oggi**: vedi il passo 0.
- **Costo**: una prova costa da 0,7 a 4 $; un caso con prova prima e dopo e due sessioni ciascuna circa 8-15 $. Due modi di pagarlo: una chiave API nei segreti, oppure il token dell'abbonamento di Dido (`CLAUDE_CODE_OAUTH_TOKEN`, da `claude setup-token`), che la doc ammette per i piani Pro, Max, Team ed Enterprise. Con l'abbonamento le prove consumano i suoi limiti d'uso; la doc non dice come Anthropic tratta un uso automatico frequente.
- **Una correzione sbagliata arriva a tutti i progetti** al primo `ai:update`: per questo l'agente apre una pull request e non scrive su `main`.

### Le tre strade, dalla documentazione (verificata il 26/11)

| Strada | Come parte | Cosa c'è | Limiti |
|---|---|---|---|
| **GitHub Action** (`anthropics/claude-code-action@v1`) | Un'etichetta su una issue o `@claude` in un commento | Di base parte solo per chi ha accesso in scrittura al repo, cioè Dido; i bot e le pull request da fork sono esclusi. Docker c'è sul server Ubuntu di GitHub. Permessi del workflow: `contents`, `issues`, `pull-requests` in scrittura e `id-token` | I comandi della shell vanno permessi uno per uno (`--allowedTools`); la doc avverte che i filtri sui comandi non sono una sandbox e che il testo di una issue può contenere istruzioni nascoste. Timeout da mettere sul job |
| **Attività programmate** (routines di Claude Code, in anteprima) | A orario fisso, non più di una volta all'ora | Clonano il repo a ogni giro, hanno Docker, scrivono su un ramo `claude/...` e possono aprire una pull request in bozza. Usano l'abbonamento | Girano con l'account di Dido: commit e pull request portano il suo nome. Rete limitata di base, completa se si sceglie. Per un repo privato serve la GitHub App di Claude |
| **Claude Code sul web** (claude.ai/code, anche dall'app sul telefono) | Dido apre una sessione sul repo | Stessa macchina delle routines, con Docker, e un pulsante per creare la pull request | Un comando dura al massimo 10 minuti; si alza con `BASH_MAX_TIMEOUT_MS`. È a mano, non da solo |

**Modello**: si sceglie. L'agente che smista e corregge prende il modello da `--model` (in `claude_args` dell'Action); le sessioni di prova lo hanno fissato in `bin/run-case.sh` (`claude-opus-5-5`). Le prove restano sul modello con cui Dido lavora davvero, altrimenti non dicono come si comporta la skill nel lavoro vero; l'agente che smista può usare un modello più leggero. Per le routines la scelta del modello è da verificare.

**Proposta**: l'Action per i casi (parte quando Dido mette l'etichetta), una routine settimanale per smistare i casi rimasti e una mensile per le novità degli strumenti, il web per quando Dido vuole lavorare dal telefono.

### Da verificare con una prova prima di contarci

- `claude -p` lanciato dentro l'agente delle Actions o di una routine, con i permessi delle prove (`bin/settings.json`): la doc non ne parla.
- Tempi: una sessione di prova dura da 1 a 10 minuti; un giro su un caso sta nel limite di un job.
- Installazione delle dipendenze degli starter sul server, senza chiavi private (FormKit Pro è solo su richiesta).

## Casi che i test non coprono

- Un sito che ha una skill `dido-frontend-nuxt` in `ai.extraSkills`: va controllato nel passo 10.
- Un sito con il vecchio nome nelle sue doc (`docs/motion.md`, `scss-system.md` e altre): `ai:update` non le tocca, si correggono nel passo 10.

## Dipendenze nuove

Nessuna.

## Cosa non si fa

- Non si cambia il codice delle app né dei backend.
- Non si cambiano i segreti né i file `.env`: la regola resta come convenzione degli starter.
- Non si riscrivono skill di terzi.
- Niente skill nuove solo per dividere un testo lungo.

## Costo

Dal report delle prove (`evals/REPORT.md`) una sessione `claude -p` costa da 0,7 a 4 $, in media circa 2 $. Il grosso del costo sono le sessioni di prova, non la scrittura.

| Versione | Cosa si prova | Sessioni | Costo stimato |
|---|---|---|---|
Il 26/11 Dido ha scelto la versione completa, da fare più avanti; adesso si parte con la ridotta. Con il passo 6b il costo cresce di circa 10-15 sessioni.

| **Ridotta (adesso)** | Scenari nuovi solo per code-style e frontend, le skill più legate allo stack: 4 casi, 1 sessione prima e 2 dopo. Delle prove esistenti si rilanciano solo quelle che toccano regole spostate, 1 sessione ciascuna. | circa 22 | circa 45 $ |
| Completa | 8 casi su tutte le skill, 2 sessioni prima e 2 dopo, più tutte le prove esistenti. | circa 70 | circa 140 $ |

Le altre skill (planning, rilascio, docs-writer, board, checklist, goal) nella versione ridotta cambiano solo dove compare uno stack, senza scenari nuovi: le loro prove esistenti dicono se qualcosa si è rotto.

Le sessioni di prova le lancia lo script di `evals/` in background, senza aprire finestre. Il lavoro di scrittura si fa in questa chat; se il contesto si riempie, si riparte da "Dove siamo".

## Domande aperte

1. 26/11: rinominare `dido-frontend-nuxt` in `dido-frontend`. **Sì.**
2. 26/11: tipi di progetto: siti e app web con qualunque framework, backend con qualunque stack, script. **Sì.**
3. 26/11: le preferenze personali (arrow ovunque, come si scrive) escono dalle skill e restano nel CLAUDE.md globale o nelle convenzioni degli starter. **Sì**; Dido preferirebbe "un modo più moderno di scrivere": da chiarire cosa intende, non blocca il piano.
4. 27/11: Dido vorrebbe le skill per fase (capire, progettare, costruire, provare, gestire in produzione). Proposta: le skill di processo seguono le fasi, quelle di stack (frontend, backend) restano a parte perché servono in più fasi. L'inventario del passo 1 dà a ogni regola anche la sua fase. **Sì**: `dido-goal` diventa `dido-understand` e prende la parte "capire prima di toccare" di dido-code-style; `dido-rilascio` diventa `dido-release`, con il comando `/dido-release`. Nel passo 10 si correggono i vecchi nomi in `AGENTS.md`, nell'agente `revisore` e nelle doc dei siti.

## Dove siamo

- 26/11/2026: bozza scritta, risposte alle tre domande. Versione ridotta adesso, completa più avanti. "Testi staccati dalle righe" tolta, "multipli di 5" nello starter Nuxt. SEO tecnica completa nella skill frontend. Aggiunto il passo 6b con le fasi che mancano.
- 26/11/2026: aggiunti 6c (casi dai progetti, con le etichette e la decisione di Dido) e 6d (lavoro online), con l'analisi di fattibilità. 6d si fa più avanti. Prossimo passo: ok di Dido su 6b e 6c, poi inventario.
- 27/11/2026: ok di Dido su 6b (operatività con rollback e monitoraggio). Domanda 4: skill di processo per fase, `dido-goal` diventa `dido-understand` e `dido-rilascio` diventa `dido-release`. Prossimo passo: ok su 6c, poi inventario.
