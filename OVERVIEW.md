# Cosa fanno le skill dido-*

Il riassunto per chi entra in un progetto nato da questi starter. Le regole vere stanno nelle skill, in `skills/`: se qui qualcosa non torna, vale la skill.

## Cosa ti può fermare

Nei progetti nati dallo starter Nuxt le regole che una macchina sa controllare le controlla il lint. Admin e backend hanno un lint loro, nel loro repo.

**Avvisi o errori**

- Di base le regole sono avvisi: `pnpm lint` li mostra, ma build e deploy partono.
- Con `"lintStrict": true` nel `package.json` diventano errori e fermano `build` e `generate`.
- Una regola si spegne per una riga, con il motivo: `// eslint-disable-next-line regola -- motivo`. Per tutto il sito si spegne in `eslint.config.mjs` o `stylelint.config.mjs`, mai nei file `*.starter.mjs`.

**ESLint (JS e Vue)**

- Formattazione con Prettier, sistemata da sola.
- Funzioni arrow: `const name = () => {}`. `function` solo se usa `this` o è un generatore.
- Niente `console.log`; `console.warn` e `console.error` sì. Negli `scripts/` il log è libero.
- Nomi di almeno due lettere (tranne `_`, `x`, `y`). Vietati `e`, `err`, `el`, `cur`, `out`, `tmp`, `val`, `obj`, `arr`, `str`, `idx`, `res`, anche nel destructuring. Le chiavi degli oggetti sono libere.
- File e cartelle in kebab-case. Le rotte di Nuxt (`[slug]`, `(legal)`) e le migration di DatoCMS vanno bene come sono.
- Vue: solo `<script setup>`, blocchi nell'ordine template, script, style, niente `v-html`.
- Niente testo scritto nel template: passa da i18n (`$t`). Fa eccezione la styleguide.
- In `app/` niente `process.env`: le variabili arrivano da `runtimeConfig`.
- Pagine, componenti e layout non chiamano `fetch` o `$fetch` e non importano il client di DatoCMS, `ofetch`, Sentry o GTM. Il CMS passa da `useGraphql()`, le API da `useApiFetch()`.

**stylelint (SCSS e CSS)**

- Niente `!important`.
- Niente `@media`: si usa `@include react("chiave")`.
- Niente `@keyframes` né `animation`: le animazioni si fanno in GSAP. In CSS restano hover e pressione.
- Niente colori esadecimali o con il nome: solo i token di `vars/_colors.scss`.
- Margin, padding, gap, inset, top/right/bottom/left: un token, un multiplo di 5px, un'unità relativa o `slamp()`.
- `font-size`: un token, un numero pari di px o `slamp()`.

**Hook di Claude Code**

- Dopo ogni file che Claude scrive, il lint sistema la formattazione e confronta il file con l'ultimo commit. I problemi nuovi, avvisi compresi, Claude li deve correggere subito; quelli che c'erano già restano.
- Bloccati i comandi git che prendono o cancellano lavoro di altri: `git add -A` o `git add .`, `commit -a`, `stash`, `reset --hard`, `clean -f`, `push --force`, cancellare branch. Se servono, li lancia una persona.
- All'avvio di Claude e a ogni `pnpm dev` un controllo dice se skill, plugin e regole sono indietro: allora `pnpm ai:update`.

## Nomi e lingua

- Il codice che scrivi è in inglese, i testi per le persone in italiano.
- In inglese ogni nome nuovo: variabili, funzioni, file, cartelle, classi, chiavi, campi, variabili d'ambiente.
- In italiano commenti, doc, commit e risposte di Claude.
- I nomi che ci sono già restano come sono, in qualunque lingua: non si traducono e non si rinominano.
- Il lint non controlla la lingua dei nomi.

## dido-code-style: ogni progetto

- **Prima di scrivere**: leggere `CLAUDE.md`, le doc, la storia git della zona e tutto il flusso coinvolto. Non riaprire decisioni già prese.
- **Parti chiuse**: quelle elencate in `docs/parti-chiuse.md` non si toccano senza l'ok di chi le ha chiuse.
- **Semplice**: il codice per il requisito di oggi. Niente astrazioni, opzioni o factory con un solo utilizzatore.
- **Una cosa, un componente**: prima di scrivere si cerca chi lo fa già e lo si estende. Mai una seconda copia.
- **Modulare**: ogni funzionalità ha la sua cartella e il suo nome; si usa un modulo dal suo punto d'ingresso. Le parti opzionali (statistiche, error tracking, widget) si agganciano al nucleo, mai il contrario. Se una manca, si spegne solo lei.
- **Scalabile senza esagerare**: liste paginate, niente query in un ciclo, indici sulle colonne filtrate. Niente cache o code senza una misura.
- **Niente effetti nascosti**: `get`, `find`, `check` non scrivono. Email e webhook partono dopo il salvataggio.
- **Niente codice morto**: si cancella il vecchio nella stessa modifica, senza shim di compatibilità.
- **File env**: tre file nel repo (`.env.example`, `.env.local`, `.env.production`) con i valori veri. Non si tolgono, non si accorpano, nessuna variabile si toglie.
- **Una protezione per problema**: niente controlli doppi "per sicurezza"; si valida al confine e poi ci si fida.
- **Modifiche minime**: un fix tocca le righe rotte. Niente refactor "già che ci sono".
- **Commenti** sul perché, non sul cosa.
- **Testi d'interfaccia**: titolo, contenuto, azioni. Aiuti solo per un formato o un limite, un'azione che non si annulla o un errore. Virgolette dritte, niente emoji né scuse.
- **Bug**: prima la causa. Dopo tre fix falliti ci si ferma e se ne parla.
- **Test**: li scrive l'agente, nella stessa modifica. Ogni fix ha un test che senza il fix fallisce. Si testa dall'interfaccia pubblica e si finge solo il confine.
- **Sicurezza**: a ogni modifica, in proporzione: input, permessi, dati esposti, injection, segreti, rate limit, file, CORS e cookie, dipendenze.
- **Fatto vuol dire verificato**: niente "funziona" senza averlo eseguito. Il report è lungo quanto il lavoro: per un fix bastano tre righe.
- **Commit** a lavoro verificato, solo dei propri file. Push solo con l'ok di chi lavora con te.
- **Revisioni**: solo problemi di gravità Alta e Media, niente estetica.
- **"Analizza il repo"**: un workflow con più agenti che legge tutto e verifica ogni problema. Costa molto: si avvisa prima.

## dido-frontend-nuxt: siti Nuxt e admin

- **Base**: ogni sito parte dallo starter Nuxt. Già cablati: `useGraphql()`, `useApiFetch()`, Lenis, Sentry, GTM, FormKit, sitemap, SEO.
- **Valori**: dal Figma, arrotondati a un token o a un multiplo di 5; font a multipli di 2 o 4.
- **SCSS**: ogni file apre con `@use "~/assets/styles/scss/core" as *;`. Fluido con `slamp()`, media query con `react()`, larghezze con `.row-*`, spazi con le classi utility. Font e spazi grandi sempre fluidi.
- **Componenti**: una cartella kebab-case con `index.vue` e `style.scss`, stili non scoped, classi BEM. In `widget/` solo componenti riusabili; un pattern esiste una volta sola.
- **Stesso elemento, stesso comportamento**: caroselli, schede, hover, dissolvenze uguali in tutto il sito.
- **Hover** dentro `react("pointer-and-hover")`, con la stessa transizione e lo stesso stato alla pressione.
- **i18n**: testi con `$t`, un file per area, le lingue sempre allineate. Gli slug localizzati stanno nella config i18n.
- **Configurazione**: `nuxt.config.ts` unisce gli slice di `configuration/`; si cambia lo slice.
- **Dati**: il CMS solo con `useGraphql()`, query in `app/graphql/dato/`. Errore del CMS: 500; contenuto che non c'è: 404.
- **Terze parti**: per tutto il sito un plugin, per una pagina un composable più un componente. Si tolgono cancellando i loro file.
- **Motion** (dettagli in `riferimento/motion.md`, letto solo quando si tocca qualcosa che si muove): tutto in GSAP, a componenti, con easing e durate solo dai token. Apertura e chiusura sono la stessa timeline. Solo `transform` e `opacity`. Reduced motion sempre rispettato. Lo scroll è solo Lenis.
- **Foto**: mai visibili mentre arrivano; segnaposto e dissolvenza. Sempre `NuxtImg` per le immagini del CMS.
- **Accessibilità e SEO**: un `<h1>`, contrasto AA, `:focus-visible`, `alt` giusti, `useSeo()` in ogni pagina.
- **Schema DatoCMS**: cambia solo con migration in JavaScript, provate su una sandbox.
- **Verifica**, in proporzione: sempre lint pulito, pagina 200 senza errori in console e test di util e composable; per un ritocco uno screenshot mobile e uno desktop; per un'interfaccia nuova le larghezze 375, 768, 1024, 1440 e 1920.
- **Admin** (SPA con Tailwind): token di `main.css`, niente GSAP, chiamate con `useApi()`.

## dido-backend: backend Node

- **Livelli**: rotta, controller (valida e risponde), service (logica ed errori di dominio). Niente repository.
- **API**: rotte sotto `/v1`. Risposte `{ status: "ok", data }` o `{ status: "error", error }`. Status code precisi (400, 401, 403, 404, 409, 429, 503).
- **Errori**: un solo gestore globale; in produzione il 500 è generico e il dettaglio va nei log.
- **Validazione** con uno schema in cima al controller; unicità ed esistenza nel service.
- **Autenticazione**: un middleware, che rilegge l'utente dal database a ogni richiesta.
- **Sessioni**: password con bcrypt; token e OTP salvati solo come hash; refresh token in un cookie HttpOnly che ruota a ogni uso.
- **Rate limit** per IP o per challenge, mai solo per account.
- **Dati**: schema solo con migration, campi delle query sempre elencati.
- **Configurazione**: senza la variabile di un servizio opzionale l'app parte e quel servizio resta spento.
- **Audit log** degli eventi di sicurezza; non fa mai fallire la richiesta.
- **Test** end-to-end su un database vero; nessuna mail parte davvero.
- **Spec OpenAPI**: cambia nella stessa modifica dell'API.

## dido-planning: lavori grandi

- Un lavoro piccolo si fa e basta. Uno di più passi ha un piano in `docs/plans/`, che chi lavora con te approva.
- Passi piccoli, ognuno verificato e con un commit.
- "Dove siamo", in fondo al piano, è la memoria tra una sessione e l'altra.
- Le decisioni tecniche vanno in `docs/decisions/`, il report di chiusura in `docs/reports/`.
- Chi lavora con te decide il prodotto e il design; l'agente le scelte tecniche, scritte nel piano.

## dido-rilascio: chiudere un lavoro

Si lancia a mano con `/dido-rilascio`.

1. Controllo del perimetro: resta solo ciò che serve alla richiesta.
2. Revisione dell'agente `revisore`, che non ha scritto il codice.
3. Lint e test dei file toccati.
4. Correzione dei problemi Alti e Medi, ognuno con il suo test.
5. Suite completa e build.
6. Commit dei soli file del lavoro.
7. Push, deploy e controllo della CI solo con l'ok di chi lavora con te.

## Le altre skill dido-*

- **dido-checklist-sito-web**: collaudo di un sito (tecnica, performance, SEO, accessibilità, privacy, sicurezza). Una voce non verificata si scrive "NON VERIFICATO", mai spuntata.
- **dido-platform-docs-writer**: README e doc operative (avvio, deploy, variabili, guasti). Si scrive solo ciò che i file dimostrano; il resto è "NON DEDUCIBILE".

## Le skill di altri

Danno conoscenza, ma dove dicono altro valgono le skill `dido-*`. Le eccezioni sono in `skills/dido-code-style/riferimento/skill-di-terzi.md` e nei file `riferimento/skill-di-terzi.md` di frontend e backend. Le più frequenti:

- niente TypeScript, Tailwind nei siti, `@media` o `clamp` scritti a mano, anche se l'esempio li usa;
- niente CSS animations, View Transitions o Framer Motion: solo GSAP;
- niente `gql.tada`, codegen o `<datocms-image>`;
- niente brainstorming o piani obbligatori: il processo lo danno dido-planning e dido-code-style;
- skill e plugin si installano con `pnpm ai:add`, mai globali.
