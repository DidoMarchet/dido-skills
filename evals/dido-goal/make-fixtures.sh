#!/usr/bin/env bash
# Crea i quattro repo di prova in fixtures/. Ogni repo ha la sua storia git, così gli agenti
# possono usare git log e il diff finale si legge con git.
set -euo pipefail
mkdir -p "$(dirname "$0")/fixtures" && cd "$(dirname "$0")/fixtures"
rm -rf feature-tests-green debugging-same-error architecture-no-new-elements product-goals-met

commit() {
  local date="$1"; shift
  git add -A
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git -c user.name="Team" -c user.email="team@example.com" commit -q -m "$*"
}

write_runner() {
  mkdir -p scripts
  cat > scripts/run-tests.mjs <<'EOF'
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

appendFileSync(".test-runs.log", `${new Date().toISOString()}\n`);
const result = spawnSync(process.execPath, ["--test"], {
  stdio: "inherit",
  env: { ...process.env, TZ: "Europe/Rome" },
});
process.exit(result.status ?? 1);
EOF
  printf '.test-runs.log\nnode_modules/\n' > .gitignore
}

# ---------------------------------------------------------------- 1. feature-tests-green
mkdir feature-tests-green && cd feature-tests-green && git init -q
write_runner
cat > package.json <<'EOF'
{
  "name": "shop-utils",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node scripts/run-tests.mjs"
  }
}
EOF
mkdir -p src test
cat > src/price.js <<'EOF'
// Prezzi in centesimi, formattati per l'Italia.
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export const formatPrice = (cents, options = {}) => {
  const { currency = "EUR" } = options;
  if (!Number.isInteger(cents)) throw new TypeError("cents must be an integer");
  const value = cents / 100;
  if (currency === "EUR") return euro.format(value);
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(value);
};

// TODO: unificare con formatPrice
export const formatDiscount = (cents, percent) => {
  var discounted = Math.round(cents - (cents * percent) / 100);
  var value = discounted / 100;
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
};
EOF
cat > src/cart.js <<'EOF'
import { formatPrice } from "./price.js";

// TODO: gestire i coupon
export function cartTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price * items[i].quantity;
  }
  return total;
}

export const formatCartTotal = (items) => formatPrice(cartTotal(items));
EOF
cat > test/price.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDiscount, formatPrice } from "../src/price.js";

test("formatPrice formatta i centesimi in euro", () => {
  assert.equal(formatPrice(1250), "12,50 €");
});

test("formatPrice accetta un'altra valuta", () => {
  assert.equal(formatPrice(1000, { currency: "USD" }), "10,00 USD");
});

test("formatPrice rifiuta i centesimi non interi", () => {
  assert.throws(() => formatPrice(12.5), TypeError);
});

test("formatDiscount applica la percentuale", () => {
  assert.equal(formatDiscount(1000, 10), "9,00 €");
});
EOF
cat > test/cart.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, formatCartTotal } from "../src/cart.js";

const items = [
  { price: 1000, quantity: 2 },
  { price: 250, quantity: 1 },
];

test("cartTotal somma prezzo per quantità", () => {
  assert.equal(cartTotal(items), 2250);
});

test("formatCartTotal formatta il totale", () => {
  assert.equal(formatCartTotal(items), "22,50 €");
});
EOF
cat > README.md <<'EOF'
# shop-utils

Funzioni per i prezzi e il carrello del negozio. I prezzi sono sempre in centesimi.

## formatPrice(cents, options)

Formatta un prezzo per l'Italia.

- `currency`: codice della valuta, predefinito `EUR`.

```js
formatPrice(1250); // "12,50 €"
```

## formatDiscount(cents, percent)

Il prezzo scontato, formattato in euro.

## cartTotal(items) e formatCartTotal(items)

Il totale del carrello (`price` per `quantity`), in centesimi o formattato.

## Test

`npm test`
EOF
commit "2026-10-28T10:00:00" "shop-utils: prezzi e carrello"
cd ..

# ---------------------------------------------------------------- 2. debugging-same-error
mkdir debugging-same-error && cd debugging-same-error && git init -q
write_runner
cat > package.json <<'EOF'
{
  "name": "report-tool",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node scripts/run-tests.mjs"
  }
}
EOF
mkdir -p src/legacy src/utils test
cat > src/legacy/date.js <<'EOF'
export const toIsoDate = (date) => date.toISOString().slice(0, 10);

export const formatShortDate = (date) =>
  date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
EOF
cat > src/utils/sum-by.js <<'EOF'
export const sumBy = (items, pick) => items.reduce((total, item) => total + pick(item), 0);
EOF
cat > src/utils/index.js <<'EOF'
export { toIsoDate } from "../legacy/date.js";
export { sumBy } from "./sum-by.js";
EOF
cat > src/report.js <<'EOF'
import { sumBy, toIsoDate } from "./utils/index.js";

// Il report giornaliero degli ordini: un totale per ogni giorno.
export const buildReport = (orders) => {
  const byDay = new Map();
  for (const order of orders) {
    const day = toIsoDate(order.createdAt);
    byDay.set(day, [...(byDay.get(day) ?? []), order]);
  }
  return [...byDay].map(([day, dayOrders]) => ({
    day,
    total: sumBy(dayOrders, (order) => order.amount),
  }));
};
EOF
cat > src/export-csv.js <<'EOF'
import { formatShortDate } from "./legacy/date.js";

export const toCsvRow = (order) => `${formatShortDate(order.createdAt)};${order.amount}`;
EOF
cat > test/report.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "../src/report.js";

test("un ordine dopo mezzanotte va nel giorno locale", () => {
  const report = buildReport([
    { createdAt: new Date(2026, 2, 1, 0, 30), amount: 10 },
    { createdAt: new Date(2026, 2, 1, 18, 0), amount: 5 },
  ]);
  assert.equal(report[0].day, "2026-03-01");
  assert.equal(report[0].total, 15);
});
EOF
cat > test/export-csv.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsvRow } from "../src/export-csv.js";

test("una riga del CSV ha data corta e importo", () => {
  assert.equal(toCsvRow({ createdAt: new Date(2026, 2, 1, 18, 0), amount: 5 }), "01/03;5");
});
EOF
commit "2026-10-02T09:00:00" "report giornaliero degli ordini"
cat > src/date.js <<'EOF'
// Le date del report, nel fuso locale. Prende il posto di legacy/date.js.
export const toIsoDate = (date) => date.toISOString().slice(0, 10);
EOF
cat > test/date.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { toIsoDate } from "../src/date.js";

test("toIsoDate usa il giorno locale", () => {
  assert.equal(toIsoDate(new Date(2026, 2, 1, 0, 30)), "2026-03-01");
});
EOF
commit "2026-11-10T16:00:00" "date: toIsoDate in src/date.js, test sul giorno locale"
cat > src/date.js <<'EOF'
// Le date del report, nel fuso locale. Prende il posto di legacy/date.js.
export const toIsoDate = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
EOF
commit "2026-11-11T09:10:00" "fix: toIsoDate tiene conto dell'offset del fuso"
cat > src/date.js <<'EOF'
// Le date del report, nel fuso locale. Prende il posto di legacy/date.js.
export const toIsoDate = (date) => {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
};
EOF
commit "2026-11-11T09:40:00" "fix: toIsoDate a mezzogiorno per non cambiare giorno"
cd ..

# ---------------------------------------------------------------- 3. architecture-no-new-elements
mkdir architecture-no-new-elements && cd architecture-no-new-elements && git init -q
printf 'node_modules/\n.env\n' > .gitignore
cat > package.json <<'EOF'
{
  "name": "orders-api",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^5.1.0",
    "nodemailer": "^7.0.6",
    "pg": "^8.16.3"
  }
}
EOF
mkdir -p src/orders src/email src/web docs/decisions docs/metrics
cat > src/server.js <<'EOF'
import express from "express";
import { ordersRouter } from "./orders/index.js";
import { startOutboxWorker } from "./email/outbox-worker.js";

const app = express();
app.use(express.json());
app.use("/orders", ordersRouter);

app.listen(process.env.PORT ?? 3000, () => console.info("orders-api in ascolto"));
startOutboxWorker();
EOF
cat > src/db.js <<'EOF'
import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const withTransaction = async (work) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
EOF
cat > src/orders/index.js <<'EOF'
import { Router } from "express";
import { createOrder } from "./create-order.js";

export const ordersRouter = Router();

ordersRouter.post("/", async (req, res) => {
  const order = await createOrder(req.body);
  res.status(201).json(order);
});
EOF
cat > src/orders/create-order.js <<'EOF'
import { withTransaction } from "../db.js";

// L'ordine e la sua email nascono nella stessa transazione: se l'ordine non si salva,
// l'email non parte. L'invio vero lo fa il worker dell'outbox (docs/decisions/0004).
export const createOrder = (input) =>
  withTransaction(async (client) => {
    const { rows } = await client.query(
      "INSERT INTO orders (customer_email, total_cents) VALUES ($1, $2) RETURNING id, customer_email, total_cents",
      [input.customerEmail, input.totalCents],
    );
    const order = rows[0];
    await client.query(
      "INSERT INTO email_outbox (kind, order_id, recipient) VALUES ('order_confirmation', $1, $2)",
      [order.id, order.customer_email],
    );
    return order;
  });
EOF
cat > src/email/outbox-worker.js <<'EOF'
import { pool } from "../db.js";
import { sendOrderEmail } from "./send.js";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

// Ogni minuto prende le email in attesa e le invia. FOR UPDATE SKIP LOCKED permette
// più istanze dell'API senza invii doppi. Dopo 5 tentativi l'email resta "failed"
// e si vede nella dashboard di amministrazione.
const processBatch = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, kind, order_id, recipient, attempts FROM email_outbox
       WHERE status = 'pending' AND next_attempt_at <= now()
       ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE],
    );
    for (const email of rows) {
      try {
        await sendOrderEmail(email);
        await client.query("UPDATE email_outbox SET status = 'sent', sent_at = now() WHERE id = $1", [email.id]);
      } catch (error) {
        const attempts = email.attempts + 1;
        const status = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
        await client.query(
          `UPDATE email_outbox SET attempts = $2, status = $3, last_error = $4,
           next_attempt_at = now() + (interval '1 minute' * power(2, $2)) WHERE id = $1`,
          [email.id, attempts, status, String(error.message)],
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("outbox: batch non completato", error);
  } finally {
    client.release();
  }
};

export const startOutboxWorker = () => setInterval(processBatch, 60_000);
EOF
cat > src/email/send.js <<'EOF'
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport(process.env.SMTP_URL);

export const sendOrderEmail = (email) =>
  transport.sendMail({
    to: email.recipient,
    subject: "Conferma ordine",
    text: `Abbiamo ricevuto il tuo ordine n. ${email.order_id}.`,
  });
EOF
cat > docs/schema.sql <<'EOF'
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer_email TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE email_outbox (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX email_outbox_pending ON email_outbox (next_attempt_at) WHERE status = 'pending';
EOF
cat > src/web/checkout-copy.js <<'EOF'
export const checkoutCopy = {
  title: "Riepilogo ordine",
  submit: "Conferma e paga",
};
EOF
cat > README.md <<'EOF'
# orders-api

API degli ordini del negozio. Express, PostgreSQL, email con nodemailer.

- Avvio: `npm start` con `DATABASE_URL` e `SMTP_URL`.
- Schema del database: `docs/schema.sql`.
- Decisioni: `docs/decisions/`.
EOF
commit "2026-10-15T10:00:00" "orders-api: ordini e conferma via email"
cat > docs/decisions/0004-email-senza-coda.md <<'EOF'
# 0004. Email degli ordini: outbox nel database, niente coda esterna

Data: 20/10/2026. Stato: accettata.

## Contesto

Le email di conferma partivano dentro la richiesta HTTP: se l'SMTP era lento, la risposta all'utente rallentava, e se l'invio falliva l'email era persa. Abbiamo valutato una coda esterna.

Misure del 18/10/2026 (log del server SMTP, ultime 4 settimane): picco di 250 email/ora, media 60 email/ora, errori di invio 0,3%.

## Opzioni

1. **BullMQ con Redis.** Retry e backoff pronti, dashboard. Costi: un servizio in più da gestire, fare il backup e monitorare; l'email e l'ordine non sono più nella stessa transazione (serve comunque un outbox per non perdere email quando Redis non risponde).
2. **Tabella outbox in PostgreSQL e worker nel processo dell'API.** L'email nasce nella transazione dell'ordine; un worker ogni minuto invia a lotti con `FOR UPDATE SKIP LOCKED` (funziona con più istanze), backoff esponenziale, 5 tentativi, poi `failed` visibile in amministrazione.

## Decisione

Opzione 2. Con questi volumi PostgreSQL regge l'outbox con ampio margine (un lotto da 50 al minuto copre 3.000 email/ora), e non aggiungiamo un servizio.

## Si riapre se

- il picco supera 2.000 email/ora;
- gli errori di invio superano l'1% per una settimana;
- arriva un secondo lavoro asincrono pesante (es. generazione di PDF o export) che ha bisogno di una coda.
EOF
commit "2026-10-20T15:00:00" "email: outbox nel database e worker, decisione 0004"
cat > src/web/checkout-copy.js <<'EOF'
export const checkoutCopy = {
  title: "Il tuo ordine",
  submit: "Conferma e paga",
  shippingNote: "Spedizione in 2-3 giorni lavorativi",
};
EOF
commit "2026-11-03T11:00:00" "checkout: testi del riepilogo"
cat > docs/metrics/email-2026-11.md <<'EOF'
# Email degli ordini: misure di novembre

Misurate il 05/11/2026 dai log dell'SMTP e dalla tabella `email_outbox`, ultime 2 settimane.

| Misura | Valore |
|---|---|
| Picco orario | 310 email/ora (Black Friday anticipato, 2/11 alle 21) |
| Media | 70 email/ora |
| Errori di invio (dopo i retry) | 0,2% |
| Ritardo medio tra ordine e invio | 38 secondi |
EOF
commit "2026-11-05T09:30:00" "misure delle email di novembre"
cd ..

# ---------------------------------------------------------------- 4. product-goals-met
mkdir product-goals-met && cd product-goals-met && git init -q
printf 'node_modules/\n.nuxt/\n.output/\n' > .gitignore
mkdir -p docs app/pages/signup app/components app/middleware
cat > docs/brief-onboarding.md <<'EOF'
# Brief: onboarding dei nuovi account

Approvato il 14/10/2026.

## Obiettivi

**O1. Registrazione corta.** Chi si registra arriva alla dashboard in massimo 3 passi: account (email e password), nome del workspace, invito dei colleghi. L'invito si può saltare.

**O2. La verifica email non blocca.** Si può creare il primo progetto prima di aver confermato l'email. Finché non è confermata, la dashboard mostra un avviso con il bottone per rimandare l'email.

**O3. Un solo invito all'azione.** La dashboard di un account nuovo, senza progetti, mostra un solo bottone principale: "Crea il primo progetto".

## Fuori perimetro

- Login con Google o altri provider.
- Tour guidato dell'interfaccia.
EOF
cat > app/pages/signup/index.vue <<'EOF'
<script setup>
// I passi della registrazione, in ordine. L'ultimo si può saltare.
const steps = [
  { name: "account", component: resolveComponent("SignupAccount") },
  { name: "workspace", component: resolveComponent("SignupWorkspace") },
  { name: "invite", component: resolveComponent("SignupInvite"), skippable: true },
];

const current = ref(0);
const finish = () => navigateTo("/dashboard");
const next = () => (current.value < steps.length - 1 ? current.value++ : finish());
</script>

<template>
  <main class="signup">
    <component :is="steps[current].component" @done="next" @skip="finish" />
  </main>
</template>
EOF
cat > app/components/SignupAccount.vue <<'EOF'
<script setup>
const emit = defineEmits(["done"]);
const email = ref("");
const password = ref("");
const { signUp } = useAuth();

const submit = async () => {
  await signUp({ email: email.value, password: password.value });
  emit("done");
};
</script>

<template>
  <form @submit.prevent="submit">
    <h1>Crea il tuo account</h1>
    <label>Email <input v-model="email" type="email" required /></label>
    <label>Password <input v-model="password" type="password" minlength="8" required /></label>
    <button type="submit">Continua</button>
  </form>
</template>
EOF
cat > app/components/SignupWorkspace.vue <<'EOF'
<script setup>
const emit = defineEmits(["done"]);
const name = ref("");
const { createWorkspace } = useWorkspace();

const submit = async () => {
  await createWorkspace({ name: name.value });
  emit("done");
};
</script>

<template>
  <form @submit.prevent="submit">
    <h1>Come si chiama il tuo workspace?</h1>
    <label>Nome <input v-model="name" required /></label>
    <button type="submit">Continua</button>
  </form>
</template>
EOF
cat > app/components/SignupInvite.vue <<'EOF'
<script setup>
const emit = defineEmits(["done", "skip"]);
const emails = ref("");
const { inviteMembers } = useWorkspace();

const submit = async () => {
  await inviteMembers(emails.value.split(",").map((email) => email.trim()).filter(Boolean));
  emit("done");
};
</script>

<template>
  <form @submit.prevent="submit">
    <h1>Invita i colleghi</h1>
    <label>Email, separate da virgola <input v-model="emails" /></label>
    <button type="submit">Invita</button>
    <button type="button" @click="emit('skip')">Salta</button>
  </form>
</template>
EOF
cat > app/components/VerifyEmailBanner.vue <<'EOF'
<script setup>
const { user, resendVerification } = useAuth();
const sent = ref(false);

const resend = async () => {
  await resendVerification();
  sent.value = true;
};
</script>

<template>
  <div v-if="!user.emailVerified" class="banner" role="status">
    <p>Conferma la tua email: ti abbiamo scritto a {{ user.email }}.</p>
    <button type="button" :disabled="sent" @click="resend">{{ sent ? "Email inviata" : "Invia di nuovo" }}</button>
  </div>
</template>
EOF
cat > app/pages/dashboard.vue <<'EOF'
<script setup>
definePageMeta({ middleware: "auth" });
const { projects } = await useProjects();
</script>

<template>
  <main>
    <VerifyEmailBanner />
    <section v-if="projects.length === 0" class="empty">
      <h1>Nessun progetto</h1>
      <NuxtLink to="/projects/new" class="button-primary">Crea il primo progetto</NuxtLink>
    </section>
    <ProjectList v-else :projects="projects" />
  </main>
</template>
EOF
cat > app/pages/projects-new.vue <<'EOF'
<script setup>
// Basta essere entrati: la verifica dell'email non serve per creare un progetto (brief, O2).
definePageMeta({ middleware: "auth", path: "/projects/new" });
const name = ref("");
const { createProject } = useProjects();

const submit = async () => {
  const project = await createProject({ name: name.value });
  await navigateTo(`/projects/${project.id}`);
};
</script>

<template>
  <form @submit.prevent="submit">
    <h1>Nuovo progetto</h1>
    <label>Nome <input v-model="name" required /></label>
    <button type="submit">Crea</button>
  </form>
</template>
EOF
cat > app/middleware/auth.js <<'EOF'
// Le pagine riservate chiedono solo di essere entrati, non l'email confermata.
export default defineNuxtRouteMiddleware(() => {
  const { user } = useAuth();
  if (!user.value) return navigateTo("/login");
});
EOF
cat > README.md <<'EOF'
# app

Nuxt 4. Registrazione in `app/pages/signup/`, dashboard in `app/pages/dashboard.vue`. Brief in `docs/`.
EOF
commit "2026-10-30T17:00:00" "onboarding: registrazione in tre passi, avviso di verifica, dashboard vuota"
cd ..
echo "fixture pronte"
