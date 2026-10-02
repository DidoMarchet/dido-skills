# Starter Node: Express, Prisma, PostgreSQL

Come lo starter backend di Dido applica le linee guida di `SKILL.md`, e dove sta ogni cosa. I progetti nati dallo starter hanno la stessa struttura. Se un progetto ha cambiato un dettaglio, vale il suo codice.

## Stack

| Ambito | Strumento |
|---|---|
| Runtime | Node 22 (Alpine in Docker) |
| Gestore pacchetti | npm (`package-lock.json`) |
| Linguaggio | JavaScript puro, ESM (`"type": "module"`), niente TypeScript tranne `prisma.config.ts` |
| HTTP | Express 5 |
| Database | PostgreSQL 15 + Prisma 7 con `@prisma/adapter-pg` |
| Validazione | Zod |
| Gestore processi | PM2 in cluster (`pm2-runtime`) |
| Store condiviso | Redis, opzionale (contatori del rate limit) |
| Mail | nodemailer + Handlebars |
| Doc dell'API | OpenAPI servita su `/docs` e `/openapi.json` |
| Test | vitest + supertest, E2E su un Postgres reale |
| Deploy | Docker Compose: Coolify in produzione, Traefik + Dockge in locale |
| Lint / formattazione | ESLint + default di Prettier (virgolette doppie, punto e virgola) |

Commenti, messaggi d'errore e doc sono in **italiano**.

## Struttura del progetto

```
app/node/
├── src/
│   ├── app.js                 # buildApp(): middleware, health, router /v1, 404 JSON, error handler, niente listen
│   ├── index.js               # connect + listen + job periodici
│   ├── <module>/
│   │   ├── <module>.routes.js
│   │   ├── <module>.schema.js
│   │   ├── <module>.controller.js
│   │   └── <module>.service.js
│   ├── middleware/            # authenticate, error-handler, rate-limit
│   ├── config/                # permessi, versione dell'API, resolver della config runtime
│   ├── database/postgres/     # client Prisma
│   ├── docs/                  # spec OpenAPI, paths/, schemas/
│   └── utils/                 # errors.js (HttpError), campi Zod condivisi, paginazione
├── tests/                     # test E2E, fuori da src/
└── prisma/                    # schema.prisma + migrations/
```

`buildApp()` è separato da `index.js`, così i test importano l'app senza avviare il listener.

## Livelli

| File | Fa | Mai |
|---|---|---|
| `*.routes.js` | endpoint + middleware; commento in testa con l'elenco degli endpoint | logica |
| `*.schema.js` | schemi Zod del body della richiesta | regole di business che hanno bisogno del DB |
| `*.controller.js` | `schema.parse(req.body)` in cima, chiama il service, costruisce la risposta | chiamate Prisma |
| `*.service.js` | logica di business, lancia `HttpError` per gli errori di dominio | `req` / `res`, Zod, `res.status().json()` |

```js
// Express 5 passa le promise rifiutate all'error handler: niente try/catch nel controller
export const putFrontendUrl = async (req, res) => {
  const { url } = frontendUrlSchema.parse(req.body);
  await upsertFrontendUrl(url, req.auth.sub);
  res.json({ status: "ok", data: await resolveFrontendUrl() });
};
```

```js
// Nel service solo errori di dominio (con un catalogo degli errori si usa il suo codice)
if (!user) throw new HttpError(404, "Utente non trovato");
```
## Errori

Il gestore globale è `middleware/error-handler.js`, registrato per ultimo:

| Errore | Risposta |
|---|---|
| `ZodError` | 400 |
| `HttpError`, o un errore con `statusCode` tra 400 e 599 | il suo status |
| Prisma `P2002`, vincolo unique violato | 409 |
| Prisma `P2034`, conflitto tra transazioni | 409, il client può riprovare |
| `DriverAdapterError` con `cause.kind === "TransactionWriteConflict"`: lo stesso conflitto, rilevato al COMMIT di una `$transaction` Serializable, che con Prisma 7 e adapter-pg arriva così e non come `P2034` | 409, il client può riprovare |
| Prisma `P2025`, record che non c'è più | 404 |
| tutto il resto | 500, messaggio generico in produzione e `SYSTEM_ERROR` nell'audit |

## Convenzioni

- Ruoli e permessi in `config/permissions.js` (`ROLES`, `PERMISSIONS`), versione dell'API in `config/api-version.js` (`API_PREFIX`). Mai stringhe di ruolo o il prefisso `/v1` scritti a mano.
- Campi Zod condivisi in `utils/zod-fields.js`: `emailField` (trim e minuscole) e `passwordField`.
- Variabili d'ambiente in `.env.local`, `.env.production` ed `.env.example` alla root del repo. Restano fuori solo `NODE_ENV`, `NODE_APP_INSTANCE` (PM2) e `PORT`, che imposta il runtime. In produzione arrivano da Coolify.
- Nuova migration con `npm run db:migrate -- --name <nome>`, mai una nuova init. Dopo, `npx prisma generate` e i test.
- Adapter con factory solo per lo storage dei file: `files/storage/index.js` + `local.js`, con `s3.js` quando servirà.
- Modifica dell'API: la spec OpenAPI in `src/docs/` cambia nella stessa modifica. Le doc cambiano solo per ciò che la spec non dice (flussi, decisioni).
- Mail: tutto in `src/mailer/`, e chi manda una mail importa da `mailer/index.js`. Config SMTP e URL del frontend si risolvono a ogni invio, senza cache del transporter.
- Audit: `auditLog` e `auditLogWithActor` da `audit/audit.logger.js`, su file JSON-lines.
- PM2 in cluster in produzione, quindi niente stato in memoria del processo.
- Nuovo progetto dallo starter: `node scripts/rename-project.mjs <slug>`, prima senza `--apply` per vedere cosa cambia. La procedura completa è in `docs/NEW-PROJECT.md` dello starter.

## Dove sta ogni protezione

- Autenticazione: `authenticate()` per lo staff, che è il default, o `authenticate({ type: PRINCIPAL_TYPES.CUSTOMER })`. Il claim `type` del JWT separa le audience. `authenticate()` rilegge il principal dal DB e lancia all'avvio se `roles` non è un array.
- Permessi: i `FULL_ACCESS_ROLES` passano sempre il controllo `roles` di `authenticate()`, quindi un permesso più ristretto si controlla in cima al controller (modelli: `assertAuditRead`, `assertConfigManage`, `assertCustomerDelete`).
- Proprietà dei dati: l'id del principal arriva da `req.auth.sub`.
- Campi in uscita: `select` espliciti, come `STAFF_SELECT` e `CUSTOMER_SELECT`.
- Credenziali in `auth/core/crypto.js`: bcrypt per le password, sha256 per refresh token (`Session.refreshTokenHash`), OTP, challenge (`otpChallengeHash`) e token email, hash fittizio per il login con un utente che non esiste.
- OTP: la challenge sta nei cookie HttpOnly `otpChallenge` e `customerOtpChallenge`, tentativi e scadenza in `auth/core/otp.js`, il limite per IP in `otpLimiter`.
- Sessioni: rotazione in `rotateSession` (transazione con `deleteMany` e conteggio). Disattivazione e cambio password eliminano le sessioni nella stessa transazione, in `updateStaff` e `updateCustomer`.
- Rate limit in `middleware/rate-limit.js`, con Redis condiviso quando gira più di un processo.
- Segreti runtime cifrati con AES-256-GCM in `config/runtime-crypto.js`, con la chiave derivata da `NODE_JWT_SECRET`. `NODE_JWT_SECRET` e CORS si validano all'avvio in produzione.

## Test

- vitest e supertest in `app/node/tests/`, fuori da `src/`, contro `buildApp()`. Postgres reale, meglio un container usa e getta su un'altra porta, e SMTP irraggiungibile. La procedura è nel `CLAUDE.md` dello starter.
- Ogni file di test usa il prefisso `test-<uuid>-` e in `afterAll` cancella solo ciò che corrisponde.
- `fileParallelism: false`, perché i vincoli unique andrebbero in conflitto.
