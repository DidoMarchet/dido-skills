# Skill di terzi nei backend: cosa vale qui

Le eccezioni che valgono per ogni stack stanno in `dido-code-style/riferimento/skill-di-terzi.md`. Qui ci sono quelle dei backend Node con Express e Prisma. Sono scritte per argomento: valgono anche se una skill cambia nome o viene tolta.

## Database e migration

- Lo schema cambia solo con una migration Prisma (`npm run db:migrate -- --name <nome>`). Mai con `db push`, `prisma dev`, `db execute`, SQL da un client o modifiche da Prisma Studio, nemmeno per le estensioni o per il DDL temporaneo (indici tolti durante un caricamento, tabelle di appoggio).
- Non si crea una nuova init né una baseline senza una richiesta di Dido. `migrate resolve` serve solo a recuperare una migration fallita, mai a registrare modifiche fatte a mano; in produzione si propone a Dido con il comando.
- I test girano meglio sul Postgres usa e getta, ma possono girare anche sul database di sviluppo, dove cancellano solo i dati col loro prefisso. Il database di sviluppo non si azzera (`migrate reset`, reset proposto per il drift) senza il consenso di Dido.
- In produzione solo letture per diagnosi, dal container o con il tunnel SSH del runbook, senza aprire porte. Terminare connessioni, `VACUUM FULL`, `ALTER SYSTEM`, `ALTER TABLE` e il reset delle statistiche si propongono a Dido con il comando, non si lanciano. Anche `EXPLAIN ANALYZE` su un UPDATE o un DELETE è una scrittura.
- Tipi, id e nomi li decide lo schema Prisma del progetto (nello starter: id `String @default(uuid())`, date senza fuso, tabelle in PascalCase e colonne in camelCase). Una skill di terzi non li cambia: niente `bigint`, UUIDv7, `timestamptz` o `@map` a snake_case dove lo schema non li usa già. Un progetto che li ha scelti (per esempio UUIDv7 generati dal client) lo scrive nel suo `AGENTS.md`. Nel SQL scritto a mano i nomi vanno tra virgolette (`"StaffUser"`).
- Le scritture passano dal client Prisma condiviso: id e `updatedAt` li riempie il client, quindi un INSERT o UPDATE in SQL crudo li salta. Niente secondo pool `pg` né altri driver.
- Gli indici nascono da `@@index` e dalla sua migration. `CONCURRENTLY` solo su una tabella grande, da solo in una migration. Un indice che lo schema non sa descrivere va nella migration scritta a mano, e si controlla con `prisma migrate diff` che la migration dopo non lo tolga.
- Le race tra scritture le rileva la transazione (Serializable o `updateMany` condizionale): il client riceve 409 e riprova. Niente retry nel server, `SELECT … FOR UPDATE` in SQL crudo, advisory lock o lock applicativi.
- La paginazione resta offset (`docs/LIMITI-NOTI.md`). Niente PgBouncer, repliche, partizioni, viste materializzate, code su tabella o RLS senza una misura che li chieda.
- Backup con il dump compresso dello script `db-snapshot` e la sua rotazione; cambio di major e di server con dump e restore. Niente `pg_basebackup`, archivio WAL, `pg_upgrade`, replica logica o retention per età.
- Il database sta sulla rete interna di Docker, senza porte pubblicate, e la connessione dell'app non usa SSL.

## Prisma

- La connessione è `NODE_POSTGRES_URI`, letta da `prisma.config.ts`. Niente `DATABASE_URL`, file `.env` o `prisma init`, che crea file e installa skill da solo.
- Il seed è `npm run seed:superadmin`, non `prisma db seed`. Il generatore resta quello di `schema.prisma`: cambiarlo è una modifica a sé, e la decide Dido.
- Valgono le versioni installate: un'opzione di una versione più nuova si verifica con `--help` prima di usarla. Le protezioni della CLI contro i comandi distruttivi non sostituiscono la conferma di Dido.
- Gli schemi Zod delle richieste si scrivono a mano: niente schemi generati dai modelli del database, che contengono hash e campi interni. Le risposte le descrivono la spec OpenAPI e i `select`.

## API

- La spec OpenAPI è scritta a mano in `src/docs/`, accanto al codice, ed è servita su `/docs` e `/openapi.json`, dove si valida. Niente divisione in file YAML, overlay o decorator che ne facciano una seconda versione, spec ricavata dal traffico o pubblicazione su piattaforme esterne.
- I test dell'API sono gli E2E con vitest e supertest su un Postgres usa e getta: niente suite parallele (Arazzo) né test contro la produzione.
- I messaggi d'errore restano generici dove il dettaglio direbbe se un account esiste o in che stato è un token: login, OTP, sessione, reset, registrazione, reinvio della verifica, token monouso. In produzione i 500 e gli errori del database hanno un messaggio generico, e il dettaglio va nei log.

## Docker e Coolify

- Database, Node e Redis sono progetti compose e resource Coolify distinti, collegati da reti esterne: niente `depends_on` tra loro né container a parte per le migration. L'attesa del database la fanno il retry di `prisma migrate deploy` e `connectPrismaWithRetry`.
- Il container Node non ha healthcheck, per scelta; database e Redis sì.
- Servizi, container, reti e volumi portano lo slug del progetto; il nome del progetto compose resta quello della cartella.
- Upload, log e backup stanno nei bind mount `/srv/<slug>/`; i dati di Postgres e Redis in volumi con nome.
- Nel compose base le variabili passano da `environment:` con `${VAR}`, riempite da Coolify; `env_file` solo negli override locali. Password e segreti non hanno un valore di riserva (`${VAR:-…}`).
- Il compose base non pubblica porte: stanno negli override locali. In locale il codice entra con il bind mount e nodemon in polling, niente `develop.watch`.
- L'immagine Node gira come root, tiene le devDependencies (all'avvio gira `prisma migrate deploy`), copia `package.json` e non ha un build step; il CMD resta `sh -c`, in forma JSON, con `exec pm2-runtime`. Il piano per cambiarla è in `docs/LIMITI-NOTI.md`.
- I tag mobili delle immagini sono un limite noto, con il suo piano: non si propone di fissarli mentre si lavora su altro. La versione di Node la decidono Dockerfile, `engines` e CI, non gli esempi delle skill.
- Nessuna azione su Coolify (deploy, stop, riavvio) senza la conferma di Dido, e il token non si stampa.

## File env e doc

- `.env.example`, `.env.local` e `.env.production` stanno nel repo con i valori veri: le regole del tipo "`.env` nel `.gitignore`", "niente segreti in git" o "niente password nelle stringhe di connessione" non valgono per loro.
- Le doc con uno schema fisso tengono etichette in grassetto e separatori: decisioni (contesto, decisione, perché, conseguenze) e limiti (stato, rischio, mitigazione, fix).
- Le doc in Markdown non passano da linter di stile o di prosa con correzione automatica.
