# Skill di terzi nei backend: cosa vale qui

Le eccezioni che valgono per ogni stack stanno in `dido-code-style/riferimento/skill-di-terzi.md`; quelle legate agli strumenti del progetto in `docs/conventions.md` del progetto. Qui ci sono quelle di ogni backend.

## Database e migration

- Lo schema cambia solo con una migration versionata, creata con il comando del progetto. Mai con comandi che allineano lo schema senza migration, SQL lanciato da un client o modifiche da un'interfaccia grafica, nemmeno per le estensioni o per il DDL temporaneo.
- Non si crea una nuova migration iniziale né una baseline senza che sia chiesta. Segnare a mano una migration come applicata serve solo a recuperarne una fallita; in produzione si propone il comando a chi lavora con te.
- Il database di sviluppo non si azzera senza il consenso di chi lavora con te. I test girano meglio su un database usa e getta.
- In produzione solo letture per diagnosi, senza aprire porte. Terminare connessioni, manutenzioni pesanti, modifiche di sistema o di tabella e il reset delle statistiche si propongono con il comando, non si lanciano. Anche un'analisi che esegue un UPDATE o un DELETE è una scrittura.
- Tipi, id e nomi li decide lo schema del progetto: una skill di terzi non li cambia. Un progetto che fa scelte diverse le scrive nelle sue istruzioni.
- Le scritture passano dal client del database condiviso: niente secondo pool né altri driver.
- Le race tra scritture le rileva la transazione: il client riceve 409 e riprova. Niente retry nel server o lock applicativi.
- Niente pooler, repliche, partizioni, viste materializzate, code su tabella o sicurezza a livello di riga senza una misura che li chieda.
- Le protezioni di una CLI contro i comandi distruttivi non sostituiscono la conferma di chi lavora con te. Valgono le versioni installate: un'opzione di una versione più nuova si verifica con `--help` prima di usarla.

## API

- La spec OpenAPI è scritta a mano accanto al codice e servita dall'app. Niente seconda versione della spec, spec ricavata dal traffico o pubblicazione su piattaforme esterne.
- Gli schemi di validazione delle richieste si scrivono a mano: niente schemi generati dai modelli del database, che contengono hash e campi interni.
- I test dell'API sono gli E2E del progetto: niente suite parallele né test contro la produzione.
- I messaggi d'errore restano generici dove il dettaglio direbbe se un account esiste o in che stato è un token: login, OTP, sessione, reset, registrazione, reinvio della verifica, token monouso.

## Container e deploy

- Nessuna azione sulla piattaforma di deploy (deploy, stop, riavvio) senza conferma, e i token non si stampano.
- I limiti noti delle immagini e del deploy hanno il loro piano nei limiti noti del progetto: non si propone di cambiarli mentre si lavora su altro.

## File env e doc

- I tre file env stanno nel repo con i valori veri: le regole del tipo "`.env` nel `.gitignore`", "niente segreti in git" o "niente password nelle stringhe di connessione" non valgono per loro.
- Le doc con uno schema fisso tengono etichette in grassetto e separatori: decisioni (contesto, decisione, perché, conseguenze) e limiti (stato, rischio, mitigazione, fix).
- Le doc in Markdown non passano da linter di stile o di prosa con correzione automatica.
