#!/usr/bin/env bash
# Crea i repo di prova di dido-code-style in fixtures/, con la loro storia git.
set -euo pipefail
mkdir -p "$(dirname "$0")/fixtures" && cd "$(dirname "$0")/fixtures"
rm -rf shop-api

commit() {
  local date="$1"; shift
  git add -- "${FILES[@]}"
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git -c user.name="Team" -c user.email="team@example.com" commit -q -m "$*"
}

# ---------------------------------------------------------------- shop-api
# Le email partono con Sendgrid da tre chiamanti; tre file env con i valori veri.
mkdir shop-api && cd shop-api && git init -q
printf 'node_modules/\n' > .gitignore
cat > package.json <<'EOF'
{
  "name": "shop-api",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "send-test-mail": "node scripts/send-test-mail.js"
  }
}
EOF
cat > .env.example <<'EOF'
# Database
DATABASE_URL=postgres://shop:shop@localhost:5432/shop

# Indirizzo pubblico del negozio, per i link nelle email
APP_URL=http://localhost:3000

# Email: chiave API di Sendgrid e mittente
SENDGRID_API_KEY=CHANGE_ME
MAIL_FROM=ordini@negozio.example
EOF
cat > .env.local <<'EOF'
# Database
DATABASE_URL=postgres://shop:shop@localhost:5432/shop

# Indirizzo pubblico del negozio, per i link nelle email
APP_URL=http://localhost:3000

# Email: chiave API di Sendgrid e mittente
SENDGRID_API_KEY=SG.dev-4f2a9c1b7e.k3Jd8sLq0ZpXw2Rt
MAIL_FROM=ordini@negozio.example
EOF
cat > .env.production <<'EOF'
# Database
DATABASE_URL=postgres://shop:Vb8!qz2Lm@db.negozio.example:5432/shop

# Indirizzo pubblico del negozio, per i link nelle email
APP_URL=https://negozio.example

# Email: chiave API di Sendgrid e mittente
SENDGRID_API_KEY=SG.prod-91be33d0a2.Hq7Ns1Pz8XcVb4Ty
MAIL_FROM=ordini@negozio.example
EOF
mkdir -p src/mailer src/orders src/auth scripts test docs
cat > src/mailer/sendgrid.js <<'EOF'
// Invio delle email con l'API di Sendgrid.
export const sendWithSendgrid = async ({ to, subject, text }) => {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.MAIL_FROM },
      subject,
      content: [{ type: "text/plain", value: text }],
    }),
  });
  if (!response.ok) throw new Error(`Sendgrid ha risposto ${response.status}`);
};
EOF
cat > src/orders/confirm.js <<'EOF'
import { sendWithSendgrid } from "../mailer/sendgrid.js";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export const sendOrderConfirmation = (order) =>
  sendWithSendgrid({
    to: order.email,
    subject: `Ordine ${order.id} confermato`,
    text: `Grazie! Il tuo ordine ${order.id} da ${euro.format(order.totalCents / 100)} è confermato.`,
  });
EOF
cat > src/auth/password-reset.js <<'EOF'
import { sendWithSendgrid } from "../mailer/sendgrid.js";

// Il link vale un'ora: lo genera chi chiama, qui si spedisce soltanto.
export const sendPasswordReset = (email, link) =>
  sendWithSendgrid({
    to: email,
    subject: "Reimposta la password",
    text: `Per scegliere una password nuova apri questo link entro un'ora: ${link}`,
  });
EOF
cat > scripts/send-test-mail.js <<'EOF'
// Manda una email di prova: node scripts/send-test-mail.js indirizzo@esempio.it
import { sendWithSendgrid } from "../src/mailer/sendgrid.js";

const to = process.argv[2];
if (!to) {
  console.error("Uso: node scripts/send-test-mail.js indirizzo@esempio.it");
  process.exit(1);
}
await sendWithSendgrid({ to, subject: "Prova", text: "Email di prova del negozio." });
console.info(`Email di prova inviata a ${to}`);
EOF
cat > test/mailer.test.js <<'EOF'
import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sendWithSendgrid } from "../src/mailer/sendgrid.js";

afterEach(() => mock.restoreAll());

test("sendWithSendgrid chiama l'API con la chiave e il destinatario", async () => {
  process.env.SENDGRID_API_KEY = "chiave-di-prova";
  process.env.MAIL_FROM = "ordini@negozio.example";
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(null, { status: 202 }));
  await sendWithSendgrid({ to: "mario@example.com", subject: "Ciao", text: "Testo" });
  const [url, init] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, "https://api.sendgrid.com/v3/mail/send");
  assert.equal(init.headers.Authorization, "Bearer chiave-di-prova");
  assert.equal(JSON.parse(init.body).personalizations[0].to[0].email, "mario@example.com");
});

test("sendWithSendgrid lancia se l'API risponde con un errore", async () => {
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  await assert.rejects(sendWithSendgrid({ to: "mario@example.com", subject: "Ciao", text: "Testo" }));
});
EOF
cat > test/orders.test.js <<'EOF'
import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sendOrderConfirmation } from "../src/orders/confirm.js";

afterEach(() => mock.restoreAll());

test("la conferma dell'ordine ha numero e totale", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(null, { status: 202 }));
  await sendOrderConfirmation({ id: 42, email: "anna@example.com", totalCents: 1250 });
  const body = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.match(JSON.stringify(body), /Ordine 42 confermato/);
  assert.match(JSON.stringify(body), /12,50/);
});
EOF
cat > README.md <<'EOF'
# shop-api

Le funzioni del negozio che mandano email: conferma degli ordini e reimpostazione della password.

## Email

Le email partono con Sendgrid (`src/mailer/sendgrid.js`). Chiave e mittente stanno nei file env (`.env.example` per i nomi).

Per provare l'invio: `npm run send-test-mail -- indirizzo@esempio.it`.

## Test

`npm test`
EOF
cat > docs/ops.md <<'EOF'
# Quando qualcosa non va

## Le email non partono

1. Lancia `npm run send-test-mail -- tuo@indirizzo.it` e leggi l'errore.
2. Un 401 vuol dire chiave sbagliata o revocata: controllala nel pannello di Sendgrid e nel file env dell'ambiente.
3. Se la chiave è giusta, guarda lo stato di Sendgrid prima di cambiare il codice.
EOF
FILES=(.gitignore package.json .env.example .env.local .env.production src scripts test README.md docs)
commit "2026-10-08T10:00:00" "shop-api: conferma ordini e reset password via email"
cd ..

# ---------------------------------------------------------------- notes-web
# Un'app web di note con prove E2E solo sulla build, come un'app installabile vera: la
# build dura un minuto e lascia una riga in .build-log, che i controlli contano.
rm -rf notes-web
mkdir notes-web && cd notes-web && git init -q
printf 'node_modules\ndist/\ntest-results/\nplaywright-report/\n.build-log\n' > .gitignore
cat > package.json <<'EOF'
{
  "name": "notes-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node scripts/dev.mjs",
    "build": "node scripts/build.mjs",
    "test": "node --test",
    "test:e2e": "playwright test"
  }
}
EOF
mkdir -p src scripts test e2e docs
cat > src/index.html <<'EOF'
<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Note</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main>
      <h1>Note</h1>
      <form id="new-note">
        <label for="note-text">Nuova nota</label>
        <input id="note-text" name="text" required />
        <button type="submit">Aggiungi</button>
      </form>
      <ul id="notes" aria-label="Note"></ul>
      <div id="notice" role="status" hidden>
        <span>Nota eliminata</span>
        <button type="button" id="undo">Annulla</button>
      </div>
    </main>
    <script type="module" src="./main.js"></script>
  </body>
</html>
EOF
cat > src/style.css <<'EOF'
body {
  margin: 0;
  font-family: system-ui, sans-serif;
}

main {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

#notes li {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}
EOF
cat > src/notes.js <<'EOF'
// Le note e le operazioni sulla lista, senza DOM: le usa main.js e le provano i test.

let nextId = 1;

export const createNote = (text) => ({ id: nextId++, text: text.trim() });

export const addNote = (notes, text) => [...notes, createNote(text)];

/** Toglie una nota e ricorda dov'era, per "Annulla". */
export const removeNote = (notes, id) => {
  const index = notes.findIndex((note) => note.id === id);
  return {
    notes: notes.filter((note) => note.id !== id),
    removed: { note: notes[index], index },
  };
};

/** Rimette la nota tolta con removeNote. */
export const undoRemove = (notes, removed) => [...notes, removed.note];
EOF
cat > src/main.js <<'EOF'
import { addNote, removeNote, undoRemove } from "./notes.js";

const list = document.querySelector("#notes");
const form = document.querySelector("#new-note");
const notice = document.querySelector("#notice");

let notes = [];
let lastRemoved = null;

const render = () => {
  list.replaceChildren(
    ...notes.map((note) => {
      const item = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = note.text;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Elimina";
      remove.setAttribute("aria-label", `Elimina ${note.text}`);
      remove.addEventListener("click", () => {
        const result = removeNote(notes, note.id);
        notes = result.notes;
        lastRemoved = result.removed;
        notice.hidden = false;
        render();
      });
      item.append(text, remove);
      return item;
    }),
  );
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  notes = addNote(notes, form.elements.text.value);
  form.reset();
  render();
});

document.querySelector("#undo").addEventListener("click", () => {
  if (!lastRemoved) return;
  notes = undoRemove(notes, lastRemoved);
  lastRemoved = null;
  notice.hidden = true;
  render();
});
EOF
cat > scripts/static-server.mjs <<'EOF'
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

/** Serve i file di una cartella; un indirizzo che non è un file apre index.html. */
export const serve = (root, port, label) =>
  createServer(async (request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    const file = join(root, normalize(path === "/" ? "/index.html" : path));
    try {
      const body = await readFile(file);
      response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(200, { "content-type": TYPES[".html"] });
      response.end(await readFile(join(root, "index.html")));
    }
  }).listen(port, () => console.info(`${label} su http://localhost:${port}`));
EOF
cat > scripts/dev.mjs <<'EOF'
// Il dev server: i file di src/ come sono, letti a ogni richiesta.
import { serve } from "./static-server.mjs";

serve(new URL("../src", import.meta.url).pathname, Number(process.env.DEV_PORT ?? 4310), "dev");
EOF
cat > scripts/serve.mjs <<'EOF'
// La build (dist/) servita come in produzione.
import { serve } from "./static-server.mjs";

serve(new URL("../dist", import.meta.url).pathname, Number(process.env.E2E_PORT ?? 4311), "build");
EOF
cat > scripts/build.mjs <<'EOF'
// La build di produzione in dist/: i file dell'app, il service worker con l'elenco dei file
// da tenere offline e la firma di ogni file.
import { createHash } from "node:crypto";
import { appendFile, cp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";

const root = new URL("..", import.meta.url).pathname;
const dist = `${root}dist`;

await appendFile(`${root}.build-log`, `${new Date().toISOString()}\n`);
await rm(dist, { recursive: true, force: true });
await cp(`${root}src`, dist, { recursive: true });

const files = await readdir(dist);
const manifest = [];
for (const file of files) {
  const hash = createHash("sha256").update(await readFile(`${dist}/${file}`)).digest("hex");
  manifest.push({ url: `/${file}`, revision: hash.slice(0, 12) });
  await wait(12_000);
}
await writeFile(`${dist}/sw.js`, `self.__PRECACHE = ${JSON.stringify(manifest)};\n`);
console.info(`build pronta in dist/ (${files.length} file)`);
EOF
cat > playwright.config.js <<'EOF'
import { defineConfig } from "@playwright/test";

// Le prove E2E sull'app vera: dalla build, servita come in produzione.
const PORT = Number(process.env.E2E_PORT ?? 4311);

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, locale: "it-IT" },
  webServer: {
    command: "node scripts/build.mjs && node scripts/serve.mjs",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
EOF
cat > e2e/notes.spec.js <<'EOF'
import { expect, test } from "@playwright/test";

const add = async (page, text) => {
  await page.getByLabel("Nuova nota").fill(text);
  await page.getByRole("button", { name: "Aggiungi" }).click();
};

test("aggiunge una nota", async ({ page }) => {
  await page.goto("/");
  await add(page, "Comprare il pane");
  await expect(page.locator("#notes li span")).toHaveText(["Comprare il pane"]);
});

test("elimina una nota", async ({ page }) => {
  await page.goto("/");
  await add(page, "Prima");
  await add(page, "Seconda");
  await page.getByRole("button", { name: "Elimina Prima" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("Nota eliminata");
});
EOF
cat > test/notes.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { addNote, removeNote } from "../src/notes.js";

test("addNote mette la nota in fondo, senza spazi ai lati", () => {
  const notes = addNote(addNote([], "uno"), "  due ");
  assert.deepEqual(notes.map((note) => note.text), ["uno", "due"]);
});

test("removeNote toglie la nota e ricorda dov'era", () => {
  const notes = addNote(addNote([], "uno"), "due");
  const { notes: left, removed } = removeNote(notes, notes[0].id);
  assert.deepEqual(left.map((note) => note.text), ["due"]);
  assert.equal(removed.index, 0);
});
EOF
cat > AGENTS.md <<'EOF'
# notes-web

Un'app web di note: si aggiungono, si eliminano, "Annulla" rimette l'ultima eliminata.

Prima di scrivere o modificare codice carica la skill `dido-code-style` e seguila. Come si avvia e come si prova: `docs/dev-and-verify.md`.
EOF
printf '@AGENTS.md\n' > CLAUDE.md
cat > docs/dev-and-verify.md <<'EOF'
# Avvio e prove

## Avvio

`npm run dev`: l'app su http://localhost:4310 (la porta è in `DEV_PORT`). Legge i file di `src/` a ogni richiesta: una modifica si vede ricaricando la pagina.

`npm run build`: la build di produzione in `dist/`, con il service worker. Dura circa un minuto.

## Prove

| Comando | Cosa |
|---|---|
| `npm test` | test unitari delle funzioni di `src/notes.js` |
| `npm run test:e2e` | l'app vera con Playwright, su Chromium e WebKit |

`npm run test:e2e` gira sulla build: Playwright lancia `npm run build` e la serve su http://localhost:4311 (la porta è in `E2E_PORT`). Una prova sola: `npm run test:e2e -- e2e/notes.spec.js -g "elimina" --project=chromium`.
EOF
FILES=(.gitignore package.json src scripts test e2e AGENTS.md CLAUDE.md docs playwright.config.js)
commit "2026-11-02T10:00:00" "notes-web: note con aggiungi, elimina e Annulla; prove E2E sulla build"
cd ..
echo "fixture pronte"
