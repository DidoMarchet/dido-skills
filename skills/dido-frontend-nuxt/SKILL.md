---
name: dido-frontend-nuxt
description: Usare ogni volta che si scrive, modifica, revisiona o crea codice in un frontend Nuxt, anche per un ritocco a un componente o a uno stile (pagine, componenti Vue, composable, store Pinia, SCSS con slamp e react, i18n, configurazione di Nuxt, query GraphQL, terze parti, animazioni, accessibilità e SEO), e quando si avvia un sito nuovo dal boilerplate Nuxt.
---

# Frontend Nuxt

Il metodo dei frontend Nuxt. **Skill richiesta:** dido-code-style, con i principi validi per ogni stack. Qui c'è solo ciò che è specifico del frontend.

**Implementazione di riferimento:** il boilerplate Nuxt 4 (`DidoMarchet/starter-kit-nuxt-webapp` su GitHub). Un sito nuovo parte da lì, e lì si legge il codice di composable, plugin e configurazione. I fatti del boilerplate (cosa è già cablato, moduli, rendering, sistema SCSS) stanno nei suoi `docs/project-architecture.md` e `docs/scss-system.md`.

**Lo controlla il lint** (`eslint.starter.mjs`, `stylelint.starter.mjs`, dopo ogni file che scrive Claude Code), quindi qui non si ripete: arrow function e nomi interi, file e cartelle in kebab-case, `<script setup>` e ordine dei blocchi, niente `v-html` né testo scritto nel template, niente `process.env` nell'app, niente `fetch` né client del CMS, HTTP o di terze parti in pagine e componenti, niente `!important`, `@media`, `@keyframes`, `animation`, colori scritti a mano, misure fuori scala. Dove il lint non c'è, queste regole le controlli tu.

Se il progetto (il suo `CLAUDE.md` o le sue doc, non il codice) dice una cosa diversa da questa skill, vale il progetto, e la differenza va segnalata nel report perché una delle due fonti è da correggere.

| Stai per toccare | Leggi |
|---|---|
| un'animazione, una modale, un foglio o un cassetto, un carosello, una galleria, foto che compaiono, lo scroll | `riferimento/motion.md` |
| chiamate a un backend dello starter: login, token, errori | `riferimento/chiamate-al-backend.md` |
| un admin (SPA con Tailwind) | la sezione "Admin" in fondo |
| una skill che non è `dido-*` (design, GSAP, DatoCMS, Vue, FormKit…) | `riferimento/skill-di-terzi.md` |

## Principi

- **Componi con il design system.** Margini e padding con le classi utility, i gap con i token, la larghezza con le righe (`.row-*`). Riusa tipografia, bottoni e card che ci sono già, niente spaziature su misura.
- **Token pragmatici.** I token sono variabili SCSS esposte come classi numerate, non un sistema formale di design token. Un valore usato una volta sola si scrive dov'è, sono token solo i valori ricorrenti.
- **Valori disciplinati.** Numeri pieni o multipli di 5, anche nelle misure di layout, e font a multipli di 2 o 4. Se il progetto ha un Figma, i valori vengono da lì e non si inventano, ma si arrotondano: un valore che non è un token della scala né un multiplo di 5 diventa il più vicino dei due (67 → 65, 17 → 16). Le regole di questa skill valgono sopra il layout: una differenza dal frame dovuta a loro non è un errore.
- **Dal Figma.** Se c'è un Figma, prima di scrivere lo si legge con l'MCP (struttura, valori, screenshot del nodo giusto) e si misurano content box, gap e padding: niente a memoria.
- **Testi staccati dalle righe.** Un testo, un titolo o una CTA non stanno mai appoggiati a una riga visibile (righe della griglia di sfondo, divisori verticali): hanno un padding minimo dalla riga anche se il Figma li allinea lì, con un token del progetto applicato da una classe. Le immagini possono toccarla.
- **Degrada, non cadere.** Un dato o una config che manca produce uno stato gestito (fallback, messaggio, sezione assente), mai una pagina in errore. Fa eccezione il contenuto principale della pagina: se il CMS non risponde la pagina risponde 500, se il contenuto non c'è 404. In SSR una proprietà letta su un oggetto che può mancare fa fallire tutta la pagina, quindi il valore di sicurezza va dove leggi (`config?.chiave ?? default`).

## JS e Vue

- Il nome del componente lo dà Nuxt dal percorso (`components/widget/media-text/index.vue` è `WidgetMediaText`), quindi niente `defineOptions({ name })`.
- Gli effetti su DOM, scroll e animazioni stanno in un composable (`app/composables/`, `useX`), che espone stato e azioni e non markup. La logica pura sta in `app/utils/`, con i suoi test. Query e chiamate stanno in cartelle dedicate, mai dentro i componenti.
- I testi vengono da i18n, il brand dalla config (`siteName`), i contenuti dal CMS. La styleguide (`app/pages/styleguide.vue`) è una pagina di servizio: testi nel template, senza traduzioni.

## Nomi

- Nel template i tag restano PascalCase (`<WidgetMediaText>`), perché l'auto-import concatena il percorso.
- Composable `useX`, in un file senza `use` (`composables/api-fetch.js` esporta `useApiFetch`); componenti in una cartella con `index.vue`, anche nell'admin (`components/ui/button/index.vue` è `<UiButton>`); util con un nome d'azione (`buildTrack`, `isLightHex`), plugin con il suffisso d'ambiente dove serve (`*.client.js`).
- Classi BEM: blocco `.componente`, `__elemento`, `--modificatore`. Le varianti si chiamano per sezione o brand, mai per colore (`--footer`, non `--dark`).
- Una sola scala tipografica numerata (`.title-1…4`, `.text-1…3`), mai due nomenclature insieme.
- Colori a scala per famiglia (`$black-1`, `$grey-2`), non semantici. Gli id solo quando servono (àncora, `aria-*`, JS), in kebab-case. Il maiuscolo si fa con `text-transform`, mai scritto nel testo.

## Componenti

- Un componente è una cartella `components/<area>/<nome>/` con `index.vue`, `style.scss` e i suoi asset, raggruppata per dominio (`article/`, `navigation/`). Lo stile si carica con `<style lang="scss" src="./style.scss"></style>` e non è scoped.
- In `widget/` stanno solo i componenti agnostici e riusabili: ricevono tutto da prop ed espongono slot. Un pattern ripetuto, come un carosello, esiste una volta sola come widget. Un componente di una sezione specifica resta nella sua area.
- Stesso tipo di elemento, stesso comportamento in tutto il sito: caroselli, schede, sottolineature, hover, dissolvenze e cambi d'immagine si muovono uguali, con la stessa easing e lo stesso stato alla pressione. Il file di un componente contiene solo ciò che è suo: quello che si ripete sta una volta sola nel widget, composable, mixin o classe globale che lo fa.
- Un componente usa solo le classi del suo blocco e quelle del design system, e parla con gli altri con prop, eventi, slot o uno store, mai cercando il loro DOM.
- Asset permanenti in `app/assets/img/` con nomi descrittivi per la SEO (`<azienda>-logo.svg`), i segnaposto in una cartella a parte. In `<img>` il path va in `src`, e l'`import` serve solo quando l'URL finisce in JS. Le icone sono SVG usate come immagini, ricolorate con un secondo file o con `mask` e `currentcolor`.

## SCSS

- Ogni `style.scss` e ogni partial apre con il toolbox, che dà token e mixin senza emettere CSS: `@use "~/assets/styles/scss/core" as *;`. Un file nuovo in `vars/` o `mixins/` va aggiunto al suo `_index.scss`, altrimenti i suoi token non esistono.
- Fluido con `slamp(min, max)`. La finestra di viewport si configura una volta per progetto, e si passa esplicita solo per una finestra diversa.
- Font e spazi grandi sempre fluidi: i titoli della scala, i font da 40px in su, e margin, padding, gap, `top` e `bottom` da 80px in su. Il massimo viene dal Figma desktop, il minimo dallo stesso elemento nel Figma mobile; dove il frame mobile manca, circa la metà, arrotondato. Un valore che cambiava solo con `react("large")` diventa uno `slamp` tra i due. Restano fissi il testo corrente e i token di spazio piccoli. La spaziatura negativa dei titoli va in `em`.
- Controlli e card scalano insieme dal mobile al desktop: pochi token fluidi condivisi (altezza e testo dei controlli, padding e titolo delle card, altezza della CTA), con il valore del Figma a 1920, usati da tutti i componenti.
- Margini e padding laterali mai fissi, salvo indicazioni diverse: il margine della pagina va con `slamp` e un token del progetto (es. `$side-margin: slamp($grid-gutter, $grid-margin)`), e una colonna larga fissa nel Figma desktop si stringe sotto il desktop.
- Media query con `@include react("chiave")` (`large`, `<medium`). L'hover sta sempre dentro `react("pointer-and-hover")`, così sul touch non resta attaccato.
- Ogni elemento cliccabile ha un hover, con la transizione del sito: mai un cambio istantaneo. I testi-azione ("Chiudi", "Filtra", i link) prendono tutti la stessa sottolineatura animata, e in hover il testo cambia di un tono; i bottoni a icona un tono più scuro o un fondo, quelli pieni un tono più scuro. Lo stesso stato vale alla pressione (`:active`): un mixin del progetto scrive hover e pressione insieme, e i pulsanti pieni si stringono appena (0,97, fermi con reduced motion). Di base: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` su link e pulsanti, testo dei pulsanti non selezionabile.
- Un testo-azione accanto a un titolo è un passo sotto il titolo e sta sulla sua linea di base. I titoli sulla stessa riga in colonne diverse condividono la linea di base.
- La conferma di un'azione fatta da un pulsante (link copiato) è un tooltip attaccato a quel pulsante, non un avviso lontano.
- Nel mobile una scelta tra card si fa in una lista verticale a tutta larghezza, non in una fila che scorre di lato.
- Classi, non mixin: i token diventano classi numerate generate da un `@each` sulla scala, nel layer giusto (`layout/`, `typo/`). I mixin servono solo per gli helper responsive e per i comportamenti interattivi.
- Uno sfondo a tutta pagina è una sezione con una row dentro.

## i18n

- I testi passano da `$t`, mai ternari sulla lingua nel template.
- Dizionari divisi per area: una cartella per lingua, un file per area, e l'entry della lingua compone i moduli senza stringhe. Negli import dei file-area serve l'alias `~~`, perché con un percorso relativo `@nuxtjs/i18n` v10 non li carica.
- Le lingue sono specchi: una stringa nuova va in tutte, con la stessa chiave e nella stessa area. Il file unico si divide alla prima sezione, non dopo.
- Gli slug localizzati stanno nella config i18n (`pages`). Ogni pagina va dichiarata lì anche quando lo slug è uguale nelle due lingue, altrimenti non entra nella sitemap. Per gli slug dinamici si impostano i parametri per lingua, così hreflang e canonical puntano allo slug giusto.

## Configurazione

- `nuxt.config.ts` fa solo lo spread degli slice di `configuration/`, uno per area, e un'impostazione si cambia nel suo slice.
- Env e segreti arrivano da `runtimeConfig`. `runtimeConfig.public` finisce nel bundle client, quindi contiene solo valori pubblici per natura (es. un token CMS in sola lettura).
- `robots` e `noindex` dipendono dall'ambiente: si indicizza solo la produzione.

## Dati e terze parti

- Il CMS si legge solo con `useGraphql()`, con query e fragment in `app/graphql/<cms>/`; le chiamate REST passano da `useApiFetch()`. Il client del CMS lo importano solo `useGraphql()` e le sorgenti lato server.
- Un errore del CMS non è una pagina che non esiste: la pagina risponde 500, e 404 solo quando il contenuto non c'è.
- SEO e hreflang con `useSeo()` nella pagina. Con gli slug localizzati servono `generateSeoLocaleParams` e `setI18nParams`, altrimenti gli alternate dichiarano URL che non esistono.
- Una terza parte che serve a tutto il sito (analytics, error tracking, consenso) è un plugin. Una che serve a una pagina o a un componente (un form, un widget di prenotazione, un player) è un composable per l'effetto più un componente per il markup.
- La libreria di una terza parte la importa solo il suo plugin o il suo composable, che senza la sua config non fa niente. Così si toglie cancellando quei file, la dipendenza e il punto in cui si usa. Se deve ricevere qualcosa dal sito, si aggancia a un hook (`graphql:error`, che `useGraphql()` chiama sugli errori, o `vue:error`).
- Gli embed si vestono con il design system: niente CSS del servizio, le classi dei tuoi bottoni. Se il servizio rende in un `<iframe>` non si può vestire, quindi va verificato prima di prometterlo.
- Prima di dire cosa fa una terza parte, misura quali domini contatta e quali cookie scrive.
- Le sorgenti dinamiche lato server, come la sitemap, chiamano il servizio dal server con il suo client, senza `useGraphql()`, paginano dove il servizio lo chiede e non rompono il build quando falliscono. Un modello con pagina di dettaglio entra nella sitemap interrogando ogni lingua.
- Lo schema del CMS cambia solo con migration versionate, provate su una sandbox: mai a mano, nemmeno sulla sandbox.

## Motion, in breve

Tutto in GSAP, a componenti, con easing e durate solo dai token (`vars/_timings.scss`, letti nel JS con `useMotion()`). In CSS solo hover e pressione. Solo `transform` e `opacity`. Reduced motion sempre rispettato. Lo scroll è solo Lenis (`useLenis()`). Il resto, prima di toccare qualcosa che si muove, in `riferimento/motion.md`.

## Accessibilità e SEO

- Immagini decorative con `alt=""`, informative con un `alt` che le descrive. Nomi dei file pensati per la SEO, `loading="lazy"` e `decoding="async"` dove ha senso.
- Un solo `<h1>` per pagina, heading in ordine, markup semantico e landmark.
- Contrasto almeno WCAG AA (4,5:1, 3:1 per i testi grandi). Le combinazioni che non passano si segnalano, non si scelgono in silenzio.
- Focus visibile con `:focus-visible`, distinto da `:focus`.
- L'esito di un'azione asincrona si annuncia spostando il focus sul messaggio (`tabindex="-1"` e `.focus()`). Una live region funziona solo se era già nel DOM prima che il contenuto cambiasse.
- In `<noscript>` solo testo, con una sola interpolazione, e nessun `display` nel CSS: dei tag dentro danno un mismatch di idratazione.
- Immagini dimensionate per larghezza, mai con un'altezza fissa (`block-size: auto`, o un box con un `object-fit` scelto apposta).

## Verifica

Oltre a quanto chiede dido-code-style, in proporzione a cosa hai toccato:

- **sempre**: lint pulito sui file toccati; la pagina toccata risponde 200 con zero errori in console e nel log, compresi i mismatch di idratazione; i test di util e composable toccati (un componente li ha quando contiene della logica, con `@nuxt/test-utils`; motion e aspetto si verificano con gli screenshot);
- **un ritocco** (un colore, un margine, un testo): uno screenshot da mobile e uno da desktop della parte toccata;
- **un'interfaccia nuova o cambiata** (una sezione, un componente, un layout): ogni elemento confrontato con quelli simili del sito (stesso componente e stesso comportamento, compresi trascinamento, hover e pressione), e l'interfaccia guardata a 375, 768, 1024, 1440 e 1920 con le skill di design del progetto (impeccable, design-taste-frontend, mobile-native, dove ci sono): il contenuto si legge, è bilanciato e si usa bene;
- **motion e foto**: le prove di `riferimento/motion.md`;
- **una terza parte**: domini e cookie misurati; se è nuova, la pagina risponde 200 anche senza la sua variabile d'ambiente.

## Admin

Gli admin nati da `starterkit-backend-admin` (SPA, `ssr: false`) seguono questa skill, tranne dove lo stack è diverso:

- **Stile**: Tailwind con i token del `@theme` di `app/assets/styles/main.css` e i pattern di `docs/design-system.md`, al posto di SCSS, `slamp` e `react`. I colori hanno nomi di ruolo (`--color-ink`, `--color-surface`), i font stanno nella scala `title-1…2`, `text-1…3`. Niente colori né dimensioni scritti nelle classi; le dimensioni le segnala il lint.
- **Configurazione**: un solo `nuxt.config.ts`, senza gli slice di `configuration/`.
- **Motion**: le transizioni di Tailwind e le `<Transition>` di Vue, come dice `docs/design-system.md`. Il reduced motion lo annulla una regola sola in `main.css`: niente classi `motion-reduce:`. Niente GSAP.
- **Testi**: i18n solo se l'admin ha più lingue; in una lingua sola i testi stanno nel template.
- **Uguali al sito**: forma del codice, `<script setup>`, ordine dei blocchi, file e cartelle in kebab-case, componente in una cartella, chiamate al backend solo con `useApi()` (`riferimento/chiamate-al-backend.md`). Fanno eccezione login e reset della password, che usano la fetch diretta con `useApiUrl()`: lì un 401 vuol dire credenziali sbagliate, non sessione scaduta.
