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
echo "fixture pronte"
