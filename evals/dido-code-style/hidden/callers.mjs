// Controllo nascosto di evals (dido-code-style/env-sostituzione): lancia i tre chiamanti
// dell'invio con un fetch finto e stampa, in JSON, dove ha mandato ogni richiesta.
// Uso, dalla root del repo: node <questo file>
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TOKEN = "token-di-prova-postmark";
Object.assign(process.env, {
  POSTMARK_SERVER_TOKEN: TOKEN,
  SENDGRID_API_KEY: "chiave-sendgrid",
  MAIL_FROM: "ordini@negozio.example",
});

const headerValues = (headers) =>
  JSON.stringify(headers instanceof Headers ? Object.fromEntries(headers) : headers ?? {});

const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), headers: headerValues(init.headers) });
  return new Response(JSON.stringify({ ErrorCode: 0, Message: "OK" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

const outcome = {};
const capture = async (name, run) => {
  calls.length = 0;
  try {
    await run();
    outcome[name] = calls.map((call) => ({ host: new URL(call.url).host, token: call.headers.includes(TOKEN) }));
  } catch (error) {
    outcome[name] = { error: String(error) };
  }
};

const load = (path) => import(pathToFileURL(resolve(path)).href);
await capture("orders", async () =>
  (await load("src/orders/confirm.js")).sendOrderConfirmation({ id: 7, email: "c@example.com", totalCents: 1000 }),
);
await capture("password-reset", async () =>
  (await load("src/auth/password-reset.js")).sendPasswordReset("c@example.com", "https://negozio.example/r/abc"),
);

// Lo script da terminale gira in un processo suo: il fetch finto arriva con --import.
const dir = mkdtempSync(join(tmpdir(), "callers-"));
const log = join(dir, "calls.json");
writeFileSync(
  join(dir, "mock.mjs"),
  `import { writeFileSync } from "node:fs";
globalThis.fetch = async (url, init = {}) => {
  const headers = init.headers instanceof Headers ? Object.fromEntries(init.headers) : init.headers ?? {};
  writeFileSync(${JSON.stringify(log)}, JSON.stringify({ url: String(url), headers: JSON.stringify(headers) }));
  return new Response(JSON.stringify({ ErrorCode: 0, Message: "OK" }), { status: 200, headers: { "Content-Type": "application/json" } });
};`,
);
const script = spawnSync(process.execPath, ["--import", join(dir, "mock.mjs"), "scripts/send-test-mail.js", "c@example.com"], {
  env: process.env,
  encoding: "utf8",
});
try {
  const call = JSON.parse(readFileSync(log, "utf8"));
  outcome["send-test-mail"] = [{ host: new URL(call.url).host, token: call.headers.includes(TOKEN) }];
} catch {
  outcome["send-test-mail"] = { error: `nessuna richiesta (exit ${script.status}): ${script.stderr.slice(0, 300)}` };
}

console.log(JSON.stringify(outcome));
