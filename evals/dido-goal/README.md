# Test di dido-goal

Quattro scenari che confrontano Claude con e senza la skill, in sessioni vere di Claude Code (`claude -p`). Servono a provare una modifica alla skill prima di pubblicarla. I risultati dell'11/11/2026 sono in [REPORT.md](REPORT.md).

Un giro completo sono 16 sessioni con Opus, circa 10 $ e 5 minuti. Servono Claude Code, Node, Python 3 e git.

## Come si lancia

Gli script sono quelli comuni di `evals/bin` (come si usano: [../README.md](../README.md)); qui ci sono le fixture, i casi e i controlli da script (`checks.py`). Dalla cartella `evals/`:

1. `bash dido-goal/make-fixtures.sh`: crea i quattro repo di prova in `dido-goal/fixtures/`, ognuno con la sua storia git.
2. `bin/launch.sh ~/dido-evals/goal-1 both 2 dido-goal/feature-tests-green dido-goal/debugging-same-error dido-goal/architecture-no-new-elements dido-goal/product-goals-met`: 4 scenari, con e senza la skill, 2 run ciascuno, in parallelo. La skill provata è quella di `skills/dido-goal`. Senza skill, il collegamento in `~/.claude/skills` è bloccato con `--disallowedTools`; la descrizione resta comunque nell'elenco delle skill.
3. `python3 bin/grade.py ~/dido-evals/goal-1 prepare`: controlla le asserzioni che si verificano da codice (test, diff, numero di esecuzioni, lunghezza) e scrive `blind/bundle.md`, senza indizi su quale run ha la skill.
4. Un agente legge il pacchetto e giudica le altre asserzioni, con il prompt qui sotto.
5. `python3 bin/grade.py ~/dido-evals/goal-1 merge`: scrive il `grading.json` di ogni run e `summary.md`, con le asserzioni passate e tempo e costo medi per caso e configurazione.

Fino alla versione 4 le sessioni giravano in `iteration-*/` qui dentro, ignorate da git, e potevano leggere l'`AGENTS.md` di dido-skills (Claude Code legge i `CLAUDE.md` delle cartelle sopra), in tutti e due i bracci. Ora girano in `~/dido-evals/`. Le cartelle `fixtures/` e `iteration-*/` sono ignorate da git.

## Il prompt del valutatore

```text
Sei un valutatore. Leggi per intero il file <percorso>/iteration-N/blind/bundle.md.

Contiene 16 sessioni di un agente di programmazione (R01…R16), ognuna con: la richiesta dell'utente, le asserzioni da giudicare (numerate, es. #2), le azioni dell'agente in ordine, il diff finale del repo (più file nuovi e commit fatti) e il messaggio finale all'utente.

Per ogni sessione e per ogni asserzione elencata sotto "Asserzioni da giudicare", decidi se è vera (passed: true) o falsa (passed: false), con una prova breve: una citazione del messaggio finale, una riga del diff o un'azione. Regole:
- L'onere della prova sta sul "vero": se la prova non c'è, è falso.
- Giudica solo l'asserzione scritta, non la qualità generale.
- Le sessioni sono indipendenti: non confrontarle e non cercare di capire come sono state prodotte.
- Le cifre possono essere scritte in modi diversi (2.000 o 2000, 0,2% o 0.2%): conta il significato.
- "Lavoro non richiesto offerto o proposto": conta un'offerta di fare altro ("se vuoi posso…", "vuoi che…"). Chiedere l'ok al push di un lavoro finito non conta; una riga che segnala un problema aperto senza offrirsi di farlo non conta.

Scrivi solo JSON valido in <percorso>/iteration-N/blind/verdicts.json, con questa forma:
{"R01": {"2": {"passed": true, "evidence": "..."}}, ...}
```
