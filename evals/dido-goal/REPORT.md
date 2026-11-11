# dido-goal: rapporto dei test

> 11/11/2026. Skill in `skills/dido-goal/SKILL.md`, collegata in `~/.claude/skills` come le altre `dido-*`; negli starter non c'è. Per rifare le prove: [README.md](README.md).

## In breve

- Con la skill passa il 92% delle asserzioni, senza l'87%. Tempo medio 81 s contro 104 s.
- Dove l'agente faceva lavoro in più, la skill lo toglie: analisi architetturale 119 s contro 189 s e 0,66 $ contro 0,97 $, test lanciati 3 volte invece di 5,5, nessuna offerta di lavoro non chiesto (senza skill 2 run su 2 nell'analisi di prodotto).
- Dove l'agente non faceva cicli (debugging), la skill non toglie niente e non fa danni.
- La qualità non scende: la prima versione la faceva scendere nell'architettura, corretto nella terza.

## Cosa fa e cosa lascia alle altre skill

Solo la logica che mancava: l'obiettivo in due o tre righe, il criterio di fine per tipo di compito (analisi, architettura, implementazione, debugging, analisi di prodotto), non rifare ciò che è fatto, il conteggio dei tentativi senza fermarsi troppo presto, quando chiedere, il perimetro, il controllo prima di dire finito.

Lascia alle altre: il piano a dido-planning, la diagnosi a systematic-debugging, le prove a dido-code-style e verification-before-completion. Le skill di terzi non sono toccate.

Si sovrappone a dido-code-style in quattro righe: tre fix poi stop, modifiche minime, "dopo il report ti fermi", niente "se vuoi posso". Le ho tenute perché la skill vale anche per analisi e prodotto, dove dido-code-style non si carica.

## Dove stanno le regole

- **Skill**: tutto quanto sopra. Serve solo ai compiti di più passi, quindi si carica quando serve. Si è attivata da sola in tutte le 26 sessioni che la avevano.
- **CLAUDE.md**: niente di nuovo. Le regole che devono valere sempre ci sono già (dido-code-style). Una riga ("per un compito di più passi usa dido-goal") serve solo se nell'uso vero la skill non si attiva.
- **Hook**: nessuno. Un hook che blocca la fine finché una verifica non passa è proprio il ciclo infinito da evitare. Contare i comandi che falliscono uguali si potrebbe, ma nei test non ci sono cicli di quel tipo che lo giustifichino.

## Come è stata provata

- Quattro repo di prova con la loro storia git, uno per scenario: una funzionalità in un repo con i test verdi, un bug che resta identico dopo due fix dell'utente (la modifica non arriva al codice che gira), un'analisi architetturale già decisa e con misure sotto le soglie, un'analisi di prodotto con gli obiettivi soddisfatti e miglioramenti possibili.
- Sessioni vere `claude -p`, Opus 5.5, nell'ambiente dei tuoi progetti: skill `dido-*` dell'utente e superpowers acceso. La skill è installata come in un progetto (`.claude/skills`), senza nominarla nel prompt.
- Ogni scenario due volte con la skill e due senza. Asserzioni controllate da script (test, diff, esecuzioni, lunghezza) e da un valutatore che non sapeva quali run avevano la skill.
- Tre versioni della skill, 34 sessioni in tutto: 8 senza skill e 26 con.

## Risultati della versione finale

| Scenario | Asserzioni con / senza | Tempo con / senza | Costo con / senza |
|---|---|---|---|
| Funzionalità, test verdi | 15/16 · 14/16 | 84 s · 82 s | 0,77 $ · 0,63 $ |
| Debugging, stesso errore | 14/14 · 14/14 | 61 s · 70 s | 0,60 $ · 0,60 $ |
| Architettura, niente di nuovo | 16/18 · 16/18 | 119 s · 189 s | 0,66 $ · 0,97 $ |
| Prodotto, obiettivi soddisfatti | 12/14 · 10/14 | 58 s · 76 s | 0,45 $ · 0,44 $ |

## Cosa è cambiato tra le versioni

1. **Versione 1.** Due difetti. Il commit a lavoro verificato veniva chiesto invece di farlo ("dimmi tu se farlo"). Un obiettivo del brief veniva giudicato con un criterio più severo di quello scritto.
2. **Versione 2.** Corretti tutti e due: il commit si fa dove le regole lo prevedono, il criterio è quello scritto.
3. **Versione 3.** Nell'architettura la versione 1 era 4 volte più veloce, ma solo perché controllava le soglie della decisione senza leggere il codice. Così perdeva un difetto Medio che senza skill veniva trovato in 2 run su 2: il worker tiene aperta una transazione mentre invia le email, e un SMTP lento può bloccare gli ordini. Ora la skill chiede di leggere il codice che realizza la decisione e di segnalare sempre i problemi gravi visti. Il difetto viene trovato in 2 run su 2 e il tempo resta più basso.

## Limiti

- Due run per configurazione: le differenze di pochi secondi non dicono niente, quelle dell'architettura e delle offerte non chieste sì.
- Lo scenario di debugging non ha prodotto cicli neanche senza skill: non dimostra che la skill li riduca, solo che non fa fermare prima. In più la sua causa è una di quelle che la skill elenca (copia doppia, import).
- Le soglie di parole e di esecuzioni dei test sono mie e falliscono anche nei due bracci: contano i confronti, non i valori.
- Senza skill, una run di architettura ha trovato anche una falla (`POST /orders` senza autenticazione manda email a chiunque). Con la skill, che non legge tutto il repo, non è uscita. Il compito non la chiedeva, ma è un limite del leggere solo ciò che serve.

## Decisioni

Prese con chi ci lavora l'11/11/2026:

- La skill si installa solo con il collegamento utente in `~/.claude/skills`, non negli `skills-lock.json` degli starter: il sistema delle regole è fermo e così non serve un giro sui repo.
- Le quattro righe in comune con dido-code-style restano anche qui, perché per analisi e prodotto dido-code-style non si carica.
- I test restano in `evals/dido-goal/`, fuori da `skills/`, così non finiscono nei progetti.
