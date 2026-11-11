# Skill di terzi nei frontend: cosa vale qui

Le eccezioni che valgono per ogni stack stanno in `dido-code-style/riferimento/skill-di-terzi.md`. Qui ci sono quelle dei siti Nuxt e degli admin: nell'admin valgono solo "Vue, store, form" e "Admin". Per animazioni, scroll e GSAP vale `motion.md`, accanto a questo file. Sono scritte per argomento: valgono anche se una skill cambia nome o viene tolta. Quello che SKILL.md dice già non si ripete: vale anche quando una skill di terzi dice altro.

## Design: fonte e direzione

- Con un Figma, il Figma è il brief: palette, font, composizione, sezioni, immagini e motion (cosa si muove e in che ordine; easing e durate dai token) vengono da lì. Niente direzioni estratte da una libreria o tirate a sorte, interviste su tono e stile, comp generati da un modello di immagini o valori presi da un'immagine.
- Senza Figma una skill può proporre la direzione: prima del codice la proposta diventa token del progetto, e la sceglie chi lavora con te.
- Quello che il Figma ha resta, anche se una checklist di design lo vieta (righe della griglia, divisori, eyebrow, ombre, gradienti, monospace, colori di brand, card, hero diviso). I divieti estetici delle skill valgono solo dove il Figma non dice niente.
- Un testo sotto AA o un punto del Figma che va contro una regola si segnala nel report, non si cambia in silenzio.
- Niente sezioni, interazioni, immagini, animazioni o temi che il brief, il Figma o dido-frontend-nuxt non chiedono: si propongono nel report. Tema scuro e lingue RTL solo se il progetto li ha.
- Le estrazioni da un sito di riferimento servono a leggere: i loro file (Tailwind, shadcn, temi React, variabili CSS, markdown, variabili Figma) non entrano nel progetto né nel suo Figma.
- Prima di caricare il progetto in Figma si controlla che l'archivio non contenga i file env.
- Gli hook e la telemetria di impeccable sono spenti nel progetto (`env` di `.claude/settings.json`): la critica e la rifinitura si chiedono quando servono. Il live di impeccable, che modifica la config, non si usa.

## Design: token, layout, tipografia, immagini

- Un valore preso da una skill o da un sito di riferimento si arrotonda come quelli del Figma. Un valore fuori scala non diventa un token o una variante nuova.
- Niente custom property con nomi di ruolo (`--bg`, `--primary`), OKLCH ricalcolati, `clamp`, container query, griglie a 12 colonne o max-width scritti a mano, anche quando un esempio li usa.
- Niente reset, griglie, classi o fogli di stile copiati da una skill: bottoni, link, input e card si riusano dal design system.
- I font sono quelli del Figma, scaricati da @nuxt/fonts, con almeno il Latin-1; niente `<link>` a servizi di font. Un avviso "font troppo usato" su questi font si ignora.
- Niente card che si alzano, ripple o zoom delle immagini.
- Niente cartella `assets/` in root, URL temporanei del Figma o foto linkate da domini esterni. Una foto stock, generata o di un archivio aperto è un segnaposto e si elenca nel report.
- Niente librerie di icone né SVG lunghi nel template.
- Niente attributi o marcatori messi solo per gli strumenti (`data-node-id`, `data-ui`) né `// TODO`: un limite va nel report.
- Viewport, `theme-color` e `color-scheme` stanno in `configuration/app.ts`, con i colori della palette; `color-scheme: light dark` solo se il sito ha il tema scuro.
- Il codice che arriva dal Figma o da una skill (React, JSX, TypeScript, Tailwind, stili inline, posizioni assolute, wrapper annidati) è un riferimento: si riscrive in Vue nei componenti, nelle classi e nei token del progetto.

## DatoCMS

- Pagine e componenti non chiamano `executeQuery`, `useFetch` con `buildRequestInit` né `useQuerySubscription`, e non nasce un secondo composable come `useQuery`.
- I valori dinamici delle query passano come variabili GraphQL. Niente `gql.tada`, codegen, `schema:generate` o file di tipi.
- Le variabili tengono i nomi che ci sono (`GQL_URL`, `GQL_API_KEY`) e si leggono in `configuration/`. Una nuova va con il valore vero in tutti e tre i file env: niente `NUXT_*`. Config, route rules e CORS vanno nel loro slice, mai in `nuxt.config.ts`.
- Un contenuto che manca dà 404 con `createError`, mai con `throw new Error`. Senza token o endpoint `useGraphql()` non lancia: restituisce l'errore. Al visitatore non arrivano messaggi grezzi, risposte del CMS né stack. `excludeInvalid` resta spento.
- Niente `_seoMetaTags`, `toHead()` né `faviconMetaTags`: titolo con il brand, favicon, canonical e hreflang li danno già la config, `useSeo()` e `@nuxtjs/i18n`.
- Restano `@nuxtjs/sitemap`, la sorgente `server/api/sitemap.js` e il `public/robots.txt` dello starter: niente `sitemap.xml` scritta a mano. Oltre 500 record la sorgente usa `executeQueryWithAutoPagination`.
- Immagini con `NuxtImg` e il provider `datocms` dello starter (predefinito): niente `<datocms-image>` né placeholder che si dissolvono in CSS. Del CMS valgono `imgixParams` nella query (il punto focale con `fit: crop` e `ar`, o `w` e `h`) e `auto: format`, che il provider aggiunge.
- Lo Structured Text si rende in un solo widget del progetto, l'unico a importare il renderer; i link ai record usano le rotte localizzate.
- Player video e ricerca nel sito sono terze parti di pagina: composable più componente, vestiti con il design system, testi da i18n.
- Anteprima delle bozze, click-to-edit, tempo reale e cache tag solo su richiesta. Il token delle bozze non arriva mai nel browser, e le pagine in bozza non passano da prerender o cache.
- Le migration si scrivono in JavaScript (`migrations:new --js`). Gli importer scrivono sull'ambiente primario: solo con l'ok di chi lavora con te. `datocms.config.json` e la cartella delle migration stanno nella root del repo e in git.
- Un sito nuovo parte dallo starter Nuxt, mai da uno starter ufficiale del CMS. Il plugin dell'editor DatoCMS è un progetto a parte.

## Vue, store, form

- Da una guida di debug di Vue si prende la diagnosi, non il codice. La correzione usa `<script setup>`, gli stili del componente, GSAP (nell'admin le transizioni della sezione Admin), i dati dal setup con `useGraphql()` o `useApiFetch()` (nell'admin `useApi()`), e plugin, composable, `useState`, `useId()`, `<NuxtLink>` e l'auto-import di Nuxt al posto di `createApp`, `app.use`, router, `main.js` e `process.client`. Non aggiunge dipendenze e, nel sito, gira in SSR prima di dirla fatta.
- Un errore catturato con `onErrorCaptured` continua a salire, quindi niente `return false`: l'error tracking lo deve vedere. Un mismatch di idratazione si corregge, non si zittisce con `data-allow-mismatch`.
- Gli store si scrivono in forma setup con arrow function, in `app/stores/`, senza `mapState`, plugin con opzioni proprie o `console.log` in `$onAction`. Lo stato di autenticazione sta solo in memoria: niente token né utente nello storage del browser. Lo storage si usa solo nel client, dentro try/catch.
- Lo stile dei form resta quello del progetto (SCSS nel sito): niente temi Tailwind, Regenesis o `formkit theme`. Fa eccezione il tema genesis dello starter (`globals/_formkit.scss`, con le icone in `formkit.config.js`): è la base che rende i form usabili da subito, e ogni progetto lo veste con il suo design system. Gli input Pro solo su richiesta, con la chiave da una variabile d'ambiente in tutti e tre i file env.
- L'errore di un backend dello starter è un solo messaggio. Va sul campo quando la pagina sa a quale si riferisce (la password corrente nel cambio password), altrimenti è l'errore del form; niente adattatori che lo dividano sui campi. I campi li valida il client.

## Admin

- La direzione è `docs/design-system.md` dell'admin, con i token `--color-*` di `main.css`: nessuno strumento propone palette, font o pattern nuovi.
- Il motion resta quello di `docs/design-system.md`: transizioni CSS (Tailwind o `<Transition>`) con le `--ease-*` di `main.css` e le sue durate; il reduced motion lo annulla la regola di `main.css`. Niente GSAP, WAAPI, `@starting-style`, motion.dev, molle, curve nuove o keyframes con i valori del Figma.
