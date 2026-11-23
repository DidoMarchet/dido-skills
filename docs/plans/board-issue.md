# Piano board-issue: su GitHub le card della board diventano issue vere, con le stesse proprietà di Infinity

> Stato: **approvato da Davide Marchet il 23/11/2026**, "ok", con le proposte delle domande 1–4.
> Riguarda la skill dido-board (`SKILL.md`, `board.mjs`, `github.mjs`, `infinity.mjs`), le sue prove in `evals/dido-board/`, il modello del piano in dido-planning, `OVERVIEW.md` e la frase della board in `AGENTS.md` dei tre starter. Lo stato sta in "Dove siamo", in fondo a questo piano.

## Cosa si chiede e cosa si fa

| Voce (richiesta del 23/11/2026) | Cosa si fa |
|---|---|
| "Passiamo a issue" | Sul GitHub Project ogni step e ogni domanda diventano una issue del repo del piano, aggiunta al Project. Niente più bozze |
| "Le issue devono avere le stesse proprietà di Infinity" | Ogni proprietà di una card di Infinity ha il suo posto sulla issue (tabella sotto), scritta dallo stesso `board.json` |
| Tipologia, assegnazione e milestone (dal flusso del 23/11) | Nuove proprietà della card, su tutte e due le board |
| "Una cosa fatta bene" | Prove dello script prima e dopo, scenari `claude -p` prima e dopo, prova dal vivo su un repo e un Project di prova, revisione indipendente |

**Si chiude quando**:
- su un repo di prova con un Project collegato, `sync` di un piano crea issue con titolo, testo, cose da fare, assegnatario, tipo, milestone, priorità, referente, reparto e colonna, e una seconda `sync` non crea doppioni né cambia niente;
- `move` in Done chiude la issue, `archive` la chiude come "non pianificata", e una card riportata indietro si riapre;
- le bozze fatte dalla versione di prima diventano issue alla prima `sync`, con la stessa key;
- su Infinity tipo e milestone vanno nei loro attributi, se la cartella li ha;
- `node --test evals/dido-board/board.test.mjs` è verde e gli scenari di `evals/dido-board/` passano, compreso quello nuovo che prima fallisce.

### Le proprietà, Infinity e GitHub

| Proprietà | Infinity (oggi) | GitHub (dopo) |
|---|---|---|
| Titolo | primo attributo di testo | titolo della issue |
| Testo, con la key nell'ultima riga | primo testo lungo | testo della issue |
| Cose da fare | primo campo checklist ("Sub task") | lista con le caselle nel testo: GitHub conta "2 di 5" sulla card |
| Colonna | attributo etichetta della colonna | campo Status del Project; in più la issue è chiusa in Done e in archivio, aperta altrove |
| Responsabile | `fields`, attributo persone | assegnatario della issue (login GitHub) |
| Referente | `fields`, attributo persone | campo di testo del Project con lo stesso nome |
| Reparto | `fields`, attributo etichetta | campo a scelta del Project con lo stesso nome |
| Priorità | `priority`, attributo etichetta | campo a scelta del Project con lo stesso nome (Alta, Media, Normale) |
| Tipo (nuovo) | attributo etichetta, se `board.json` lo nomina | tipo della issue (Task, Bug, Feature) nei repo di un'organizzazione; label `tipo: …` negli altri |
| Milestone (nuovo) | attributo etichetta, se `board.json` lo nomina | milestone del repo con il nome del piano |
| Domanda | card con la key "domanda" | issue con la key "domanda" e la label `domanda` |

Un campo che il Project non ha lo script non lo crea: lo dice con `check` e una riga di `sync`, come fa oggi su Infinity.

## Cosa c'è già

- `board.mjs` con `check`, `sync`, `move`, `archive`; la key ritrova la card dall'ultima riga del testo.
- `github.mjs`: bozze del Project, solo titolo, testo e Status. Niente campi, niente priorità.
- `infinity.mjs`: titolo, testo, checklist, colonna, `fields` sulle card nuove e su quelle vuote, `priority`.
- 48 prove dello script (`board.test.mjs`, con `fake-gh.mjs` e `fake-infinity.mjs`) e 7 scenari in `evals/dido-board/cases/`.
- Fatti verificati il 23/11: gh ha gli scope `repo` e `project`; l'organizzazione Quammsrl e anche i repo di un utente (DidoMarchet) hanno i tipi Task, Bug, Feature; nessun repo ha oggi un Project collegato.

## Step

1. **Prove che falliscono.** In `board.test.mjs` le prove del comportamento nuovo su GitHub (issue al posto delle bozze, assegnatario, tipo, milestone, campi del Project, chiusura e riapertura, conversione delle bozze, tipo come label senza organizzazione), con `fake-gh.mjs` che finge issue, label, milestone e campi. Uno scenario nuovo `evals/dido-board/cases/github-issue/` (piano approvato su un repo con Project: l'agente deve dare tipo e milestone a ogni card). Si lanciano sulla versione di oggi: devono fallire.
2. **La card prende tipo, assegnatario e milestone.** Campi nuovi della voce di `sync`: `type` (Task, Bug, Feature; Domanda per le domande), `assignee` (chi la prende, se non è quello di `board.json`), `milestone` (di base il nome del piano). Validati in `readEntries`, comuni alle due board.
3. **GitHub: issue al posto delle bozze.** `github.mjs` crea la issue nel repo del piano e la aggiunge al Project; ritrova le card tra le issue del Project con la key; scrive assegnatario, tipo o label, milestone (la crea se manca), Referente, Reparto e Priorità come campi del Project; chiude in Done e in archivio, riapre negli altri stati. `check` elenca campi, tipi e milestone che trova.
4. **GitHub: le bozze di prima diventano issue.** Alla prima `sync` una bozza con la key diventa issue nel repo del piano (`convertProjectV2DraftIssueItemToIssue`), con colonna e testo che aveva.
5. **Infinity: tipo e milestone.** In `board.json` le chiavi `type` e `milestone` danno il nome dell'attributo etichetta; lo script scrive il valore se l'etichetta c'è e dice quale manca. Senza le chiavi, niente cambia.
6. **Le regole.** `SKILL.md` di dido-board (board.json per GitHub, i campi nuovi della card, come scegliere il tipo, gli errori da evitare); in dido-planning il commit cita la issue (`M2 step 4: filtri della lista ordini (#42)`) e il modello del piano ha, per ogni step, chi lo prende quando non è il responsabile della board; `OVERVIEW.md`; la frase della board in `AGENTS.md` dei tre starter, se cambia. Prima, grep di ogni regola toccata in skill, OVERVIEW e starter.
7. **Prove di chiusura.** `node --test` verde; gli scenari di `evals/dido-board/` con la skill, quello nuovo anche senza; prova dal vivo su un repo di prova con un Project: `sync` di un piano di 4 step e 1 domanda, seconda `sync` senza cambi, `move` fino a Done, `archive`, conversione di una bozza; poi repo e Project di prova da cancellare.
8. **Revisione del codice** indipendente con l'agente `revisore`, sulla base dell'ultimo commit di dido-board, con le correzioni.
9. **Chiusura**: report in `docs/reports/board-issue.md`, "Dove siamo"; commit e push con il tuo ok, poi `ai:update` negli starter e nei progetti.

## Interfacce tra i passi

- Voce di `sync` (step 2, usata da 3, 4, 5, 6): `{ key, title, body, todo, priority, status, type, assignee, milestone }`.
- `board.json` (step 3 e 5): `fields` vale anche per GitHub (il nome del campo del Project, o `Responsabile` per l'assegnatario); chiavi nuove `type` e `milestone` per Infinity.
- Il metodo `completeCard(card, { priority, type, assignee, milestone })` di ogni board (step 3 e 5).

## Casi che i test non coprono

- Un login GitHub sbagliato in `Responsabile`: la issue si crea lo stesso e la riga dice chi non è stato trovato (prova nello step 3).
- Un Project senza il campo Priorità o Reparto: la riga di `check` lo dice, `sync` va avanti (step 3).
- Una issue chiusa a mano e una `sync` senza stato: resta chiusa (step 3).
- Una issue che qualcuno ha tolto dal Project: la `sync` la ritrova nel repo con la key e la riaggiunge, non ne crea un'altra (step 3).
- Il limite di velocità di GitHub su un piano di 40 step: una `sync` che si interrompe riparte senza doppioni (step 3).

## Dipendenze nuove

Nessuna: tutto passa da `gh api graphql`, come oggi.

## Cosa non si fa

- Dalla board al piano (una issue aperta da qualcun altro che entra nel piano): è il passo successivo del flusso, con un comando `pull`, in un piano suo.
- Le cose da fare come sub-issue di GitHub: farebbero una issue per ogni voce. Restano lista nel testo.
- Le sessioni in parallelo che si prenotano uno step: piano a parte.
- Il numero della issue nel messaggio di commit (`(#42)`), previsto nello step 6 (23/11/2026): l'agente dovrebbe saperlo e lo script oggi non lo scrive nelle sue righe. Lo step in Done chiude già la issue. Se serve, va in un piano suo.

## Domande aperte

1. **Tipo.** Proposta: lo sceglie l'agente dal piano. Feature per una funzione nuova, Bug per un difetto, Task per tutto il resto (design, decisioni, prove, chiusura); le domande hanno la label `domanda`. Su Infinity il tipo va solo se la cartella ha un attributo per il tipo.
2. **Assegnazione.** Proposta: di base il responsabile di `board.json`; uno step del piano può dire "Chi: <nome>" e allora la card va a lui.
3. **Milestone.** Proposta: una milestone GitHub per piano, con il nome del piano, chiusa quando chiudi tu la milestone del piano. Su Infinity, un attributo "Milestone" se la cartella lo ha.
4. **Referente e Reparto su GitHub.** Proposta: campi del Project con lo stesso nome (testo e scelta), da creare una volta a mano sul Project; lo script non crea campi.
5. **Prova dal vivo.** Proposta: un repo privato di prova `DidoMarchet/dido-board-prova` con un Project collegato, creati dallo script delle prove e cancellati alla fine. Serve il tuo ok perché si crea qualcosa su GitHub; per provare i tipi di issue servirebbe un repo di prova anche in Quammsrl.
   **Risposta del 23/11/2026**: ok per i due repo di prova, `DidoMarchet/dido-board-prova` e uno in Quammsrl, da cancellare alla fine con i loro Project. Nessuna scrittura su altri repo.

## Dove siamo

23/11/2026 sera, step 1–8 fatti. Niente commit: aspetta l'ok di Davide Marchet.

- Step 1: prove nuove in `board.test.mjs` (64), `fake-gh.mjs` riscritto con issue, label, milestone, tipi e campi; caso `github-issue`. Sulla versione di prima falliscono 33 prove su 63; lo scenario, con gli script nuovi e le regole di prima, dà issue senza tipo e lo step "Chi: lorenzo" a dido (2 sessioni su 2).
- Step 2–5: `board.mjs`, `github.mjs`, `infinity.mjs`. `node --test evals/dido-board/board.test.mjs`: 64 su 64.
- Step 6: SKILL.md di dido-board, dido-planning ("Chi:", chiusura della milestone), OVERVIEW, frase della board nell'AGENTS.md dei tre starter (non committata).
- Step 7, dal vivo su `DidoMarchet/dido-board-prova` (privato) con il Project "dido-board prova (da cancellare)": sync di 5 card con tutte le proprietà, seconda sync senza scritture, move fino a Done (chiusa) e indietro (riaperta), archive (chiusa come non pianificata) e ritorno nel piano (stessa issue, riaperta), bozza diventata issue, close-milestone. Repo e Project da cancellare alla fine.
- Fatti dal vivo che hanno cambiato lo script: la lista del Project non dà le card archiviate (si ritrovano tra le issue del repo); `createIssue` con `projectV2Ids` aggiunge la issue al Project dopo, senza dare la card (resta `addProjectV2ItemById`); ogni chiamata dura 1–2 secondi, quindi i campi di una card vanno in una chiamata sola. Misura: 20 card nuove in 1 minuto e 53 secondi, la seconda sync in 2 secondi.
- Anche i repo di un utente hanno i tipi di issue (Task, Bug, Feature): la label serve solo per un tipo che il repo non ha, come Domanda. Il repo di prova in Quammsrl non è servito.
- Scenario `github-issue` corretto due volte dopo il primo giro con le regole nuove, nella richiesta e nella fixture, non nelle verifiche: la domanda si chiudeva con l'approvazione del piano (dido-planning), e il piano di prova aveva un criterio di chiusura senza step. Letti `dido-board` (SKILL.md e script), `dido-planning`, `dido-rilascio`. In dido-skills ci sono modifiche non committate di un'altra sessione (dido-rilascio, dido-code-style, evals): questo lavoro non le tocca e non le committa.
- Step 8, revisione dell'agente `revisore` sul diff da `0740c86`: due problemi Medi, corretti con una prova ciascuno, che falliva prima. (1) La issue si apriva e chiudeva solo quando la card cambiava colonna: una bozza in Done diventata issue restava aperta. Ora `settleCard` allinea la issue alla colonna anche quando la card c'è già. (2) Il ritorno di una card archiviata si fidava di `addProjectV2ItemById`: ora la issue dice le sue card con `includeArchived` e quella archiviata esce con `unarchiveProjectV2Item`. Tutte e due provate anche dal vivo. Medi, quindi niente secondo giro.
- Prove finali: `node --test evals/dido-board/board.test.mjs` 67 su 67. Scenari `claude -p`: `github-issue` 15 verifiche su 15 (3 sessioni), gli altri 7 scenari di dido-board tutti verdi (1 sessione l'uno, 3 verifiche di giudizio date da un valutatore alla cieca).

