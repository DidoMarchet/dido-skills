---
name: dido-frontend-nuxt
description: Usare ogni volta che si scrive, modifica, revisiona o crea codice in un frontend Nuxt di Dido, anche per un ritocco a un componente o a uno stile (pagine, componenti Vue, composable, store Pinia, SCSS con scss-react e slamp, configurazione di Nuxt, query GraphQL con Apollo, ISR, transizioni con GSAP e Lenis).
---

# Frontend Nuxt di Dido

Convenzioni dei frontend Nuxt di Dido, prese dai progetti in produzione. Qui c'è solo ciò che è specifico di Nuxt. **Skill richiesta:** dido-code-style, con i principi validi per ogni stack (semplicità, sicurezza, test, testi, revisioni). Quando il `CLAUDE.md` del progetto è più specifico, vale quello.

Il codice di riferimento sta in `riferimento/`. Prima di creare o cambiare un file di questi tipi, leggi quello che lo riguarda:

| Stai per toccare | Leggi |
|---|---|
| cartelle, `nuxt.config.ts`, `configuration/*.ts`, ESLint e Stylelint | `riferimento/struttura-e-configurazione.md` |
| componenti, `app.vue`, `error.vue`, layout, pagine, transizioni, plugin | `riferimento/componenti-e-pagine.md` |
| composable, store, query GraphQL, `bucket/` | `riferimento/composable-e-dati.md` |
| stili | `riferimento/scss.md` |
| chiamate a un backend di Dido: login, token, errori | `riferimento/chiamate-al-backend.md` |

## Stack

| Ambito | Strumento |
|---|---|
| Framework | Nuxt 4 (`nuxt: ^4.x`) |
| Gestore pacchetti | pnpm |
| Linguaggio | JS per composable e plugin, TS per i file di configurazione |
| Stato | Pinia, store in stile composition |
| GraphQL | @nuxtjs/apollo + `useGraphql()` personalizzato |
| API REST | composable `useApiFetch()` personalizzato |
| Form | FormKit + @formkit/nuxt |
| Animazioni | GSAP + Lenis |
| Mappe | Leaflet (solo client) |
| Carosello | Swiper |
| i18n | @nuxtjs/i18n |
| Reset CSS | the-new-css-reset |
| Tracciamento errori | Sentry (@sentry/vue + @sentry/vite-plugin) |
| Analytics | GTM con @saslavik/nuxt-gtm |
| Prestazioni | nuxt-delay-hydration |
| SEO aggiuntivo | nuxt-schema-org |
| Librerie SCSS | `scss-react` + `scss-slamp` (scritte da Dido) |
| Deploy | Netlify Edge + ISR |

## Regole

### Struttura e configurazione

- In Nuxt 4 i sorgenti stanno tutti in `app/`: pagine, componenti, composable, store. Configurazione, lingue (`i18n/locales/`) e lint restano nella root.
- `nuxt.config.ts` resta snello: sparge i file di `configuration/`, uno per ambito, e ognuno esporta un oggetto semplice. Mai configurazione inline in `nuxt.config.ts`.
- TypeScript solo nei file di configurazione, e `configuration/i18n.ts` è l'unico che tipizza l'export. Niente TypeScript nei `.vue`, nei composable e nei plugin (voluto).
- `stores/` al plurale, come vuole Nuxt. Gli store Pinia sono in stile composition.
- I dati statici (navigazione, filtri, liste di paesi, configurazione statica) stanno in `app/bucket/` come semplici export JS. Mai negli store, mai nel CMS.

### Componenti e pagine

- Un componente è una cartella `components/[categoria]/[nome]/` con `index.vue` e `style.scss`. Niente tag `<style>` nei `.vue`.
- Doppio blocco script, voluto: `<script>` per il `name`, `<script setup>` per la logica.
- I componenti si importano in automatico, mai a mano. Quelli pesanti hanno il prefisso `Lazy` (`<LazyPagesHomeProjects />`).
- Un solo layout, `layouts/default.vue`, con navigazione, cursore e footer.
- `useAsyncData` sempre con una chiave esplicita, per evitare mismatch di idratazione SSR.
- Le transizioni di pagina stanno in `assets/js/page-transitions/`, un file per pagina, con target `data-animate="page-wrap"` e `data-animate="page-content"`.
- `window.lenis` è voluto: lo imposta `useLenis()` e lo usano le transizioni di pagina, che girano fuori dal contesto Vue.
- Suffisso `.client.js` per Leaflet, Sentry e direttive di animazione.
- In `error.vue` il `console.error(props.error)` resta: serve a far emergere l'errore.

### Stili

- SCSS con `@use` e `@forward`, mai `@import` (deprecato in Dart Sass). Variabili e mixin arrivano da soli in ogni `style.scss` tramite `additionalData` di Vite: non si importano.
- `slamp()` per tutto ciò che deve scalare, mai px fissi.
- `@include react()` con al massimo due breakpoint (`<medium`, `<large`) e due orientamenti.
- Larghezze di contenuto con `.row-1`, `.row-2` e `.row-3`, non con wrapper personalizzati.

### Dati e chiamate

- GraphQL con `useGraphql()`, REST con `useApiFetch()`. SEO e hreflang con `useSeo()`, chiamato nel `<script setup>` della pagina.
- Le query stanno in `graphql/[cms]/queries/`, un file per tipo di contenuto, riesportate da `index.js`. I fragment stanno in `fragments/`.
- Un errore della query non è una pagina che non esiste: la pagina risponde 500, e 404 solo quando il contenuto non c'è.
- Fetch policy di Apollo: `cache-and-network` ovunque.
- ISR senza TTL, voluto: `{ isr: true }` su tutte le rotte, si rivalida al redeploy.
- `runtimeConfig.public` finisce nel bundle client, quindi contiene solo valori pubblici per natura (es. un token CMS in sola lettura).
