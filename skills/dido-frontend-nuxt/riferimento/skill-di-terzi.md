# Skill di terzi nei frontend: cosa vale qui

Le eccezioni che valgono per ogni stack stanno in `dido-code-style/riferimento/skill-di-terzi.md`. Qui ci sono quelle dei siti Nuxt e degli admin: nell'admin valgono solo "Vue, store, form" e "Admin". Sono scritte per argomento: valgono anche se una skill cambia nome o viene tolta.

## Design: fonte e direzione

- Con un Figma, il Figma è il brief: palette, font, composizione, sezioni, immagini e motion (cosa si muove e in che ordine; easing e durate dai token) vengono da lì. Niente direzioni estratte da una libreria o tirate a sorte, interviste su tono e stile, comp generati da un modello di immagini o valori presi da un'immagine.
- Senza Figma una skill può proporre la direzione: prima del codice la proposta diventa token del progetto, e la sceglie Dido.
- Quello che il Figma ha resta, anche se una checklist di design lo vieta (righe della griglia, divisori, eyebrow, ombre, gradienti, monospace, colori di brand, card, hero diviso). I divieti estetici delle skill valgono solo dove il Figma non dice niente.
- Le regole di dido-frontend-nuxt valgono sopra il layout: una differenza dal frame dovuta a loro non è un errore da correggere. Un testo sotto AA o un punto del Figma che va contro una regola si segnala nel report, non si cambia in silenzio.
- Niente sezioni, interazioni, immagini, animazioni o temi che il brief, il Figma o dido-frontend-nuxt non chiedono: si propongono nel report. Tema scuro e lingue RTL solo se il progetto li ha.
- Le estrazioni da un sito di riferimento servono a leggere: i loro file (Tailwind, shadcn, temi React, variabili CSS, markdown, variabili Figma) non entrano nel progetto né nel suo Figma.
- Prima di caricare il progetto in Figma si controlla che l'archivio non contenga i file env.
- Gli hook e la telemetria di impeccable sono spenti nel progetto (`env` di `.claude/settings.json`): la critica e la rifinitura si chiedono quando servono.

## Design: token, layout, tipografia, immagini

- Ogni valore preso dal Figma, da una skill o da un sito di riferimento si arrotonda: token della scala o multiplo di 5, font a multipli di 2 o 4. Un valore fuori scala non diventa un token o una variante nuova: è token solo se ricorre.
- I token sono variabili SCSS in `vars/`, con i colori a scala per famiglia, esposte come classi. Niente custom property con nomi di ruolo (`--bg`, `--primary`), OKLCH ricalcolati o esadecimali nei componenti.
- Fluido solo con `slamp`, media query solo con `react("chiave")`, larghezza solo con le `.row-*`. Niente `clamp`, `@media`, container, griglie a 12 colonne o max-width scritti a mano, anche quando un esempio li usa.
- Niente reset, griglie, classi o fogli di stile copiati da una skill: bottoni, link, input e card si riusano dal design system.
- Una sola scala tipografica numerata (`.title-*`, `.text-*`). I font sono quelli del Figma, scaricati da @nuxt/fonts, con almeno il Latin-1; niente `<link>` a servizi di font. Un avviso "font troppo usato" su questi font si ignora.
- Hover e pressione: dentro `react("pointer-and-hover")`, scritti dal mixin del progetto con durata a token. Niente card che si alzano, ripple o zoom delle immagini.
- Le immagini vengono dal Figma o dal CMS, dimensionate per larghezza. Quelle del CMS passano da `NuxtImg`; quelle permanenti stanno in `app/assets/img/` con nomi per la SEO e si usano con `<img>` (dido-frontend-nuxt, Componenti). Niente cartella `assets/` in root, URL temporanei del Figma o foto linkate da domini esterni. Una foto stock, generata o di un archivio aperto è un segnaposto e si elenca nel report.
- Icone e illustrazioni sono SVG usati come immagini, ricolorati con un secondo file o con `mask`: niente librerie di icone né SVG lunghi nel template.
- Un'immagine con `mix-blend-mode` non ha `opacity`, `filter` o `transform` animati: compare sotto un velo del colore del fondo.
- Niente attributi o marcatori messi solo per gli strumenti (`data-node-id`, `data-ui`) né `// TODO`: un limite va nel report.
- Viewport, `theme-color` e `color-scheme` stanno in `configuration/app.ts`, con i colori della palette; `color-scheme: light dark` solo se il sito ha il tema scuro.
- Il codice che arriva dal Figma o da una skill (React, JSX, TypeScript, Tailwind, stili inline, posizioni assolute, wrapper annidati) è un riferimento: si riscrive in Vue nei componenti, nelle classi e nei token del progetto.

## Motion e GSAP

- Il motion si scrive in GSAP, a componenti, anche quando una fonte propone CSS (transition, keyframes, `@starting-style`, una classe che accende una transizione), WAAPI, View Transitions, Framer Motion, motion.dev o molle: di quelle fonti si prende solo cosa si muove, in che ordine e di quanto. In CSS restano hover e pressione di bottoni e link.
- Easing e durate solo dai token (`$ease-site`, `$speed-*`, `$stagger`), letti con `useMotion()`, anche dove una fonte sceglie la curva caso per caso (ease-out, back, elastic, bounce, fisica) o dà durate in millisecondi. Nel JS non si scrive nessun numero di easing o di durata: né nelle `defaults` di una timeline, né in `quickTo`, né nello snap, né in `delay` o negli scarti della timeline (`"-=0.3"`): lì vanno `stagger`, etichette o token. `CustomEase` serve solo a dare a GSAP la easing del sito.
- Lo scroll fluido è solo Lenis, già collegato a ScrollTrigger in `useLenis()`: niente ScrollSmoother, `scrollerProxy`, ScrollToPlugin o un secondo smooth scroll. Lo scrub è `true` con `ease: "none"`, mai un numero. Il pinning, anche dello scroll orizzontale finto, si fa con `position: sticky`.
- I plugin di GSAP si registrano solo in `plugins/gsap.client.js`: niente composable `useGSAP()` né caricamento pigro dai componenti.
- Ogni componente annulla solo il suo contesto con `revert()`, mai tutti i trigger con `ScrollTrigger.getAll()`. `gsap.matchMedia()` con lo scope del componente vale come contesto. Le sue media query usano i breakpoint di `react`, esportati nel modulo SCSS del motion la prima volta che servono, mai scritti a mano.
- Si anima come dice dido-frontend-nuxt (Motion): `transform` e `autoAlpha`, l'altezza solo in una fisarmonica, il colore del velo sopra un'immagine fusa. `clip-path`, `filter`, tracciati SVG e variabili CSS solo su superfici piccole. Su un elemento animato da GSAP non si scrive `style.transform` a mano.
- Apertura e chiusura sono la stessa timeline: niente uscite separate, più brevi o con ease-in, anche quando una fonte le consiglia. Fogli e cassetti scorrono senza dissolvenza e durano in base alla corsa.
- Con reduced motion niente scale né translate, al massimo una dissolvenza. Nel CSS un elemento non parte nascosto in attesa dell'animazione: lo nasconde GSAP, così senza JavaScript si vede.
- `will-change` resta sulla superficie della modale (dido-frontend-nuxt, Motion) anche se un audit lo segnala.
- Un'animazione gira a tutti i fotogrammi, 60 o 120: stare sopra i 50 non basta. Si verifica con `gsap.globalTimeline.timeScale(0.1)`, non allungando le durate né con il pannello Animations di Chrome, che non vede GSAP.
- Strumenti temporanei (selettori di varianti, dati di prova, pagine `/prototypes`, GSDevTools, `markers`) non toccano componenti e composable del sito e si tolgono prima di chiudere. Le varianti usano token, easing e durate del sito. Il live di impeccable, che modifica la config, non si usa.
- Un contenitore che scorre da solo ha il suo Lenis, non solo `overflow-y: auto`. Un carosello trascinabile usa Draggable e InertiaPlugin, non `scroll-snap`.

## DatoCMS

- Il CMS si legge solo con `useGraphql()` (`useAsyncData` più `executeQuery` di `@datocms/cda-client`). Il client lo importano solo `useGraphql()` e le sorgenti lato server, come la sitemap. Pagine e componenti non chiamano `executeQuery`, `useFetch` con `buildRequestInit` né `useQuerySubscription`, e non nasce un secondo composable come `useQuery`.
- Query e fragment stanno in `app/graphql/dato/`, mai accanto ai componenti; i valori dinamici passano come variabili GraphQL. Niente `gql.tada`, codegen, `schema:generate` o file di tipi.
- Le variabili tengono i nomi che ci sono (`GQL_URL`, `GQL_API_KEY`) e si leggono in `configuration/`. Una nuova va con il valore vero in tutti e tre i file env: niente `NUXT_*` né valori solo in un file ignorato da git. Config, route rules e CORS vanno nel loro slice, mai in `nuxt.config.ts`.
- Un errore del CMS rende la pagina 500, un contenuto che manca la rende 404 con `createError`, mai con `throw new Error`. Senza token o endpoint `useGraphql()` non lancia: restituisce l'errore. Al visitatore non arrivano messaggi grezzi, risposte del CMS né stack. `excludeInvalid` resta spento.
- La SEO passa da `useSeo()` con i campi SEO delle query: niente `_seoMetaTags`, `toHead()` né `faviconMetaTags`. Titolo con il brand, favicon, canonical e hreflang li danno già la config e `@nuxtjs/i18n`; robots dipende dall'ambiente.
- Restano `@nuxtjs/sitemap`, la sorgente `server/api/sitemap.js` e il `public/robots.txt` dello starter: niente `sitemap.xml` scritta a mano. Oltre 500 record la sorgente usa `executeQueryWithAutoPagination`, interroga ogni lingua e, se il CMS non risponde, restituisce una lista vuota.
- Immagini con `NuxtImg` e l'URL dell'asset: niente `<datocms-image>` né placeholder che si dissolvono in CSS. Del CMS valgono `imgixParams`, focal point e `auto: format`.
- Lo Structured Text si rende in un solo widget del progetto, l'unico a importare il renderer; i link ai record usano le rotte localizzate.
- Player video e ricerca nel sito sono terze parti di pagina: composable più componente, vestiti con il design system, testi da i18n. Prima di dire che un player non traccia si misurano domini e cookie.
- Anteprima delle bozze, click-to-edit, tempo reale e cache tag solo su richiesta di Dido. Il token delle bozze non arriva mai nel browser, e le pagine in bozza non passano da prerender o cache.
- Lo schema del CMS cambia solo con migration versionate in JavaScript (`migrations:new --js`), provate su una sandbox: niente modifiche dirette, nemmeno su una sandbox. Gli importer scrivono sull'ambiente primario: solo con l'ok di Dido. `datocms.config.json` e la cartella delle migration stanno nella root del repo e in git.
- Label e hint di campi, fieldset e modelli del CMS sono nella lingua di chi modifica i contenuti; un hint c'è solo per un formato o un limite.
- Un sito nuovo parte dallo starter di Dido, mai da uno starter ufficiale del CMS. Il plugin dell'editor DatoCMS è un progetto a parte.

## Vue, store, form

- Da una guida di debug di Vue si prende la diagnosi, non il codice. La correzione usa `<script setup>`, gli stili del componente, GSAP, i dati dal setup con `useGraphql()` o `useApiFetch()`, e plugin, composable, `useState`, `useId()`, `<NuxtLink>` e l'auto-import di Nuxt al posto di `createApp`, `app.use`, router, `main.js` e `process.client`. Non aggiunge dipendenze e, nel sito, gira in SSR prima di dirla fatta.
- Un errore catturato con `onErrorCaptured` continua a salire, quindi niente `return false`: l'error tracking lo deve vedere. Un mismatch di idratazione si corregge, non si zittisce con `data-allow-mismatch`.
- Gli store si scrivono in forma setup con arrow function, in `app/stores/`, senza `mapState`, plugin con opzioni proprie o `console.log` in `$onAction`. Lo stato di autenticazione sta solo in memoria: niente token né utente nello storage del browser. Lo storage si usa solo nel client, dentro try/catch.
- Lo stile dei form resta quello del progetto (SCSS nel sito): niente temi Tailwind, Regenesis o `formkit theme`. Gli input Pro solo su richiesta, con la chiave da una variabile d'ambiente in tutti e tre i file env.
- L'errore di un backend di Dido è un solo messaggio. Va sul campo quando la pagina sa a quale si riferisce (la password corrente nel cambio password), altrimenti è l'errore del form; niente adattatori che lo dividano sui campi. I campi li valida il client.

## Admin

- La direzione è `docs/design-system.md` dell'admin, con i token `--color-*` di `main.css`: nessuno strumento propone palette, font o pattern nuovi.
- Il motion resta quello di `docs/design-system.md`: transizioni CSS (Tailwind o `<Transition>`) con le `--ease-*` di `main.css`, le sue durate e `motion-reduce`. Niente GSAP, WAAPI, `@starting-style`, motion.dev, molle, curve nuove o keyframes con i valori del Figma.
