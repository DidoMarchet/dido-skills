# Analisi completa ("analizza il repo")

"Analizza il repo con la skill dido-code-style" (o un modulo, o una cartella) è la richiesta completa: Dido non elenca cosa controllare. Chiede esplicitamente ogni categoria della checklist qui sotto, quindi le restrizioni del progetto sugli audit per quelle categorie non valgono. L'estetica del codice resta fuori.

I rimandi alla Parte 1 e alla tabella "Gravità" sono a `SKILL.md`, accanto a questo file.

## Come lanciarla

Un'analisi dura decine di minuti e costa centinaia di migliaia di token anche per un modulo piccolo, milioni per un repo intero: un agente ogni ~3000 righe di codice, più uno per i test e i verificatori.

1. Se Dido l'ha chiesta in modo esplicito ("analizza il repo con la skill dido-code-style"), quello è il consenso: avvisalo in una riga, con il numero di agenti, e lancia. Se la richiesta è generica ("controlla che sia tutto ok"), dagli prima la stima e aspetta il sì.
2. Lancia lo script del workflow che sta accanto a questo file (`${CLAUDE_SKILL_DIR}` è la cartella di questa skill, la base directory mostrata quando la skill si carica):
   ```
   Workflow({
     scriptPath: "${CLAUDE_SKILL_DIR}/repo-audit.js",
     args: {
       skill: "${CLAUDE_SKILL_DIR}/SKILL.md",
       memoryDir: "<cartella della memoria di questo progetto, se c'è>",
       stackSkills: ["<SKILL.md delle skill dello stack che il repo usa, es. ${CLAUDE_SKILL_DIR}/../dido-frontend-nuxt/SKILL.md>"],
       scope: "<percorso o elenco di percorsi, solo per un modulo o una cartella>"
     }
   })
   ```
   Se `scriptPath` viene rifiutato, leggi lo script e passane il contenuto come `script`. Se lo strumento Workflow non esiste (un altro agente o un altro host), esegui tu le stesse fasi, nello stesso ordine, con dei subagenti se li hai.
3. Quando torna, scrivi dal suo risultato il report descritto sotto.

| Fase | Agenti | Lavoro |
|---|---|---|
| Contesto | 1 | `CLAUDE.md`, doc, memoria, limiti noti, git log → stack, comandi, scelte documentate, file divisi in gruppi di ~2500-4000 righe (con uno scope, più le doc che lo descrivono) |
| Analisi | 1 per gruppo | ogni file letto per intero e controllato con la checklist; una doc la confronta con il codice chi analizza quella doc |
| Test | 1 | test, lint e formattazione in sola verifica, build, typecheck, audit delle dipendenze, seguendo la procedura sicura del progetto; una prova di funzionamento dove non ci sono test automatici |
| Verifica | 2 per problema Alta/Media (un terzo se non concordano), 1 per gruppo per quelli Bassa | scettici che provano a smentire ogni problema con i criteri qui sotto; possono riprodurlo fuori dal repo |
| Completezza | quanti servono | i file non letti o non assegnati hanno un secondo giro |

## Checklist

- **Bug**: logica sbagliata, casi che capitano davvero ma non sono gestiti, percorsi di errore rotti, race con uno scenario riproducibile.
- **Effetti collaterali**: le regole di "Niente effetti collaterali nascosti" della Parte 1, più lo stato a livello di modulo condiviso tra richieste o worker.
- **Sicurezza**: la checklist "Sicurezza" della Parte 1, applicata a ogni punto d'ingresso.
- **Overengineering**: astrazioni con una sola implementazione o un solo utilizzatore, opzioni e parametri che nessuno passa, livelli che si limitano a inoltrare chiamate, configurazione che nessuno imposta.
- **Codice morto e avanzi**: file / export / funzioni / dipendenze / variabili d'ambiente / chiavi di configurazione inutilizzati, codice commentato, shim di compatibilità, resti di funzionalità sostituite in codice, test o doc. Va dimostrato: grep di ogni candidato in cerca di utilizzatori reali.
- **Semplicità e leggibilità**: codice che si può scrivere in modo sostanzialmente più semplice con lo stesso comportamento (mostra la versione più semplice), logica che duplica un helper esistente, nomi tanto fuorvianti da portare a usi sbagliati.
- **Scalabilità e prestazioni**: le regole di "Scalabile per costruzione" della Parte 1. Solo colli di bottiglia reali, non "aggiungiamo una cache / una coda per sicurezza".
- **Doc disallineate e copie**: doc, spec dell'API e `CLAUDE.md` che non corrispondono più al codice, e le copie come le definisce "Un fatto, un posto" della Parte 1, anche se oggi sono giuste. Una copia si dimostra con il file che definisce già la stessa cosa; il fix è toglierla e rimandare a quel file. Una voce per file, con le righe.
- **Test**: test che falliscono, flussi critici (auth, permessi, scritture di dati) senza test, test che non verificano niente.
- **Testi**: testi d'interfaccia, email e messaggi d'errore che non seguono "Testi" della Parte 1 (descrizioni e sottotitoli fuori dai tre casi, errori che non dicono cosa è successo, la stessa cosa chiamata in modi diversi, trattini e punti a metà altezza usati come separatori) e commenti che ripetono il codice. Una voce per file, con le righe.

## Verifica: un problema è smentito quando

- il codice non fa quello che il problema dice, o lo scenario non può verificarsi;
- è documentato come voluto, fuori scope o limite noto (`CLAUDE.md`, doc, file dei limiti noti, un commento sul perché, una decisione registrata dopo un'analisi precedente);
- il rischio è già coperto da un altro meccanismo ("una protezione per problema");
- è estetica del codice (nomi, ordine, formattazione), una micro-semplificazione senza un guadagno concreto, o "non è identico al file Y";
- è una race teorica o un caso limite senza scenario riproducibile, o future-proofing;
- la prova manca o non si riproduce.

Nel dubbio: smentito. Un problema che regge prende la gravità definita in `SKILL.md`, qualunque cosa abbia detto chi l'ha trovato. Alta e Media sopravvivono con 2 conferme su 3.

## Report

In italiano, in quest'ordine:

1. **Intestazione**: repo o scope, data, stack.
2. **Copertura**: file analizzati sul totale dei tracciati (pattern esclusi con il motivo), ogni comando con ✓ / ✗ / non eseguito (motivo e come lanciarlo), cosa non è stato controllato e perché.
3. **Alta**, **Media**, **Bassa**: una voce per problema, scritta per Dido. In grassetto il link `[file:line](link)` e il problema in poche parole, poi due o tre frasi con cosa succede e a chi, la prova e il fix minimo. Lo stesso problema trovato due volte è una voce sola. Per esempio:

   > **[orders.service.js:48](src/orders/orders.service.js#L48) Doppio clic, doppio ordine.** Due richieste ravvicinate creano due ordini, perché il controllo sul carrello già chiuso sta fuori dalla transazione. Riprodotto con due `POST /v1/orders` in parallelo. Fix: spostare il controllo dentro la transazione.

4. **Categorie senza problemi**: una riga che le elenca.
5. **Verifica**: quanti problemi sono stati smentiti (dettagli su richiesta) e quelli non verificati con il motivo.

Niente confermato: intestazione, "ok", copertura.

L'analisi non modifica il codice. Dopo, correggi ciò che Dido sceglie seguendo la Parte 1.

## Dopo il report

- Un problema che Dido scarta si registra con il motivo dove l'analisi successiva lo leggerà: un commento sul perché accanto al codice se è locale, altrimenti il file dei limiti noti del progetto o le regole di revisione nel `CLAUDE.md` (crea `docs/LIMITI-NOTI.md` se il progetto non ha né l'uno né l'altro). La fase Contesto li legge, quindi non viene riproposto.
- I fix seguono la Parte 1: prima il test di regressione, fix minimo, vecchio codice tolto, commit che dice cosa e perché.
