---
name: dido-frontend-nuxt
description: Usare ogni volta che si scrive, modifica, revisiona o crea codice in un frontend Nuxt di Dido, anche per un ritocco a un componente o a uno stile (pagine, componenti Vue, composable, store Pinia, SCSS con slamp e react, i18n, configurazione di Nuxt, query GraphQL, terze parti, animazioni, accessibilità e SEO), e quando si avvia un sito nuovo dal boilerplate Nuxt.
---

# Frontend Nuxt di Dido

Il metodo dei frontend Nuxt di Dido. **Skill richiesta:** dido-code-style, con i principi validi per ogni stack. Qui c'è solo ciò che è specifico del frontend.

**Implementazione di riferimento:** il boilerplate Nuxt 4 di Dido (`DidoMarchet/starter-kit-nuxt-webapp` su GitHub). Un sito nuovo parte da lì, e lì si legge il codice di composable, plugin e configurazione. I fatti del boilerplate (cosa è già cablato, moduli, rendering, sistema SCSS) stanno nei suoi `docs/project-architecture.md` e `docs/scss-system.md`.

Nei progetti nati dal boilerplate lo stesso metodo sta anche in `docs/code-style.md`. Se il progetto dice una cosa diversa da questa skill, vale il progetto, e la differenza va segnalata nel report perché una delle due fonti è da correggere. In un progetto più vecchio con convenzioni diverse, allineati al codice attorno.

| Stai per toccare | Leggi |
|---|---|
| chiamate a un backend di Dido: login, token, errori | `riferimento/chiamate-al-backend.md` |

## Principi

- **Componi con il design system.** Margini e padding con le classi utility, i gap con i token, la larghezza con le righe (`.row-*`). Riusa tipografia, bottoni e card che ci sono già, niente spaziature su misura.
- **Token pragmatici.** I token sono variabili SCSS esposte come classi numerate, non un sistema formale di design token. Un valore usato una volta sola si scrive dov'è, sono token solo i valori ricorrenti.
- **Valori disciplinati.** Numeri pieni o multipli di 5, anche nelle misure di layout, e font a multipli di 2 o 4. I valori vengono dal Figma, non si inventano.
- **Degrada, non cadere.** Un dato o una config che manca produce uno stato gestito (fallback, messaggio, sezione assente), mai una pagina in errore. In SSR una proprietà letta su un oggetto che può mancare fa fallire tutta la pagina, quindi il valore di sicurezza va dove leggi (`config?.chiave ?? default`).

## JS e Vue

- Arrow function sempre (`const nome = (args) => {}`), mai `function`. Le arrow non sono hoistate, quindi si definiscono prima dell'uso. Fanno eccezione solo le API che vogliono `function` per `this`.
- Sempre `<script setup>`, niente Options API. Il nome del componente si dichiara con `defineOptions({ name: "WidgetMediaText" })`.
- Gli effetti su DOM, scroll e animazioni stanno in un composable (`app/composables/`, `useX`), che espone stato e azioni e non markup. La logica pura sta in `app/utils/`, con i suoi test. Query e chiamate stanno in cartelle dedicate, mai dentro i componenti.
- Nomi interi in camelCase: `article`, `currentArticle`, `index`, `rows`. Niente lettere singole o abbreviazioni (`a`, `cur`, `el`, `out`). Per eventi ed errori preferisci `event` ed `error` a `e` ed `err`, e attento a non riusare un nome dello scope esterno.
- Niente `console.log` lasciati, e `eslint-disable` solo con il motivo scritto accanto.
- Niente testo statico nei template: il brand viene dalla config (`siteName`), le label da i18n, i contenuti dal CMS.

## Nomi

- File e cartelle in kebab-case, sempre (`widget/media-text`). Nel template i tag restano PascalCase (`<WidgetMediaText>`), perché l'auto-import concatena il percorso.
- Composable `useX`, util con un nome d'azione (`buildTrack`, `isLightHex`), plugin con il suffisso d'ambiente dove serve (`*.client.js`).
- Classi BEM: blocco `.componente`, `__elemento`, `--modificatore`. Le varianti si chiamano per sezione o brand, mai per colore (`--footer`, non `--dark`).
- Una sola scala tipografica numerata (`.title-1…4`, `.text-1…3`), mai due nomenclature insieme.
- Colori a scala per famiglia (`$black-1`, `$grey-2`), non semantici. Gli id solo quando servono (àncora, `aria-*`, JS), in kebab-case. Il maiuscolo si fa con `text-transform`, mai scritto nel testo.

## Componenti

- Un componente è una cartella `components/<area>/<nome>/` con `index.vue`, `style.scss` e i suoi asset, raggruppata per dominio (`article/`, `navigation/`).
- In `widget/` stanno solo i componenti agnostici e riusabili: ricevono tutto da prop ed espongono slot. Un pattern ripetuto, come un carosello, esiste una volta sola come widget. Un componente di una sezione specifica resta nella sua area.
- Ordine nel `.vue`: `<template>`, `<script setup>`, `<style lang="scss" src="./style.scss"></style>`. Gli stili non sono scoped.
- Asset permanenti in `app/assets/img/` con nomi kebab-case descrittivi per la SEO (`<azienda>-logo.svg`), i segnaposto in una cartella a parte. In `<img>` il path va in `src`, e l'`import` serve solo quando l'URL finisce in JS. Le icone sono SVG usate come immagini, ricolorate con un secondo file o con `mask`.

## SCSS

- Ogni `style.scss` e ogni partial apre con il toolbox, che dà token e mixin senza emettere CSS: `@use "~/assets/styles/scss/core" as *;`. Arriva anche da `additionalData`, ma scritto in cima il file si legge da solo.
- Un token che `core` non `@forward`-a non esiste nei file che lo usano: un file nuovo in `vars/` o `mixins/` va aggiunto al suo `_index.scss`.
- Fluido con `slamp(min, max)`. La finestra di viewport si configura una volta per progetto, e si passa esplicita solo per una finestra diversa.
- Media query con `@include react("chiave")` (`large`, `<medium`), mai `>=` scritti a mano. L'hover sta sempre dentro `react("pointer-and-hover")`, così sul touch non resta attaccato.
- Classi, non mixin: i token diventano classi numerate generate da un `@each` sulla scala, nel layer giusto (`layout/`, `typo/`). I mixin servono solo per gli helper responsive e per i comportamenti interattivi, come la sottolineatura animata dei link.
- Margini e padding con le classi, i `gap` con i token nello stile del componente, la larghezza con `.row-*`. Uno sfondo a tutta pagina è una sezione con una row dentro.
- Motion con una sola easing di sito e durate a token (`$speed-*`), in `vars/_timings.scss`.

## i18n

- I testi passano da `$t`, mai ternari sulla lingua nel template.
- Dizionari divisi per area: una cartella per lingua, un file per area, e l'entry della lingua compone i moduli senza stringhe. Negli import dei file-area serve l'alias `~~`, perché con un percorso relativo `@nuxtjs/i18n` v10 non li carica.
- Le lingue sono specchi: una stringa nuova va in tutte, con la stessa chiave e nella stessa area. Il file unico si divide alla prima sezione, non dopo.
- Gli slug localizzati stanno nella config i18n (`pages`). Ogni pagina va dichiarata lì anche quando lo slug è uguale nelle due lingue, altrimenti non entra nella sitemap. Per gli slug dinamici si impostano i parametri per lingua, così hreflang e canonical puntano allo slug giusto.

## Configurazione

- `nuxt.config.ts` fa solo lo spread degli slice di `configuration/`, uno per area, e un'impostazione si cambia nel suo slice. Modificare uno slice non fa ripartire il dev server.
- Env e segreti arrivano da `runtimeConfig` letto da `process.env`, mai scritti nei componenti. `runtimeConfig.public` finisce nel bundle client, quindi contiene solo valori pubblici per natura (es. un token CMS in sola lettura).
- `robots` e `noindex` dipendono dall'ambiente: si indicizza solo la produzione.

## Dati e terze parti

- Il CMS si legge solo con `useGraphql()`, con query e fragment in `app/graphql/<cms>/`. Le chiamate REST passano da `useApiFetch()`. Le pagine non parlano direttamente con Apollo o con il client HTTP.
- Un errore del CMS non è una pagina che non esiste: la pagina risponde 500, e 404 solo quando il contenuto non c'è.
- SEO e hreflang con `useSeo()` nella pagina. Con gli slug localizzati servono `generateSeoLocaleParams` e `setI18nParams`, altrimenti gli alternate dichiarano URL che non esistono.
- `useLenis()` si inizializza una volta sola per l'app, nel layout o in `app.vue`.
- Una terza parte che serve a tutto il sito (analytics, error tracking, consenso) è un plugin. Una che serve a una pagina o a un componente (un form, un widget di prenotazione, un player) è un composable per l'effetto più un componente per il markup.
- Gli embed si vestono con il design system: niente CSS del servizio, le classi dei tuoi bottoni. Se il servizio rende in un `<iframe>` non si può vestire, quindi va verificato prima di prometterlo.
- Prima di dire cosa fa una terza parte, misura quali domini contatta e quali cookie scrive.
- Le sorgenti dinamiche lato server, come la sitemap, non usano l'SDK client, paginano dove il servizio lo chiede e non rompono il build quando falliscono. Un modello con pagina di dettaglio entra nella sitemap interrogando ogni lingua.
- Lo schema del CMS cambia solo con migration versionate, mai a mano sull'ambiente live.

## Motion

- Una sola easing di sito e durate a token. Lineare solo per il motion legato allo scroll. Il pinning si fa con `position: sticky`, non in JS.
- `prefers-reduced-motion` sempre rispettato: niente scale o translate animati.
- Mai lo zoom delle immagini all'hover: al massimo un overlay o il testo.

## Accessibilità e SEO

- Immagini decorative con `alt=""`, informative con un `alt` che le descrive. Nomi dei file pensati per la SEO, `loading="lazy"` e `decoding="async"` dove ha senso.
- Un solo `<h1>` per pagina, heading in ordine, markup semantico e landmark.
- Contrasto almeno WCAG AA (4,5:1, 3:1 per i testi grandi). Le combinazioni che non passano si segnalano, non si scelgono in silenzio.
- Focus visibile con `:focus-visible`, distinto da `:focus`.
- L'esito di un'azione asincrona si annuncia spostando il focus sul messaggio (`tabindex="-1"` e `.focus()`). Una live region funziona solo se era già nel DOM prima che il contenuto cambiasse.
- In `<noscript>` solo testo, con una sola interpolazione, e nessun `display` nel CSS. Con il JavaScript attivo il browser lo legge come testo, e dei tag dentro danno un mismatch di idratazione.
- Immagini dimensionate per larghezza, mai con un'altezza fissa (`block-size: auto`, o un box con un `object-fit` scelto apposta).

## Verifica

Oltre a quanto chiede dido-code-style:

- lint pulito, JS e CSS, sui file toccati;
- la pagina toccata risponde 200 con zero errori in console e nel log, compresi i mismatch di idratazione;
- test verdi sulle util toccate;
- screenshot alla colonna più stretta e alla più larga, dove si può;
- se hai toccato una terza parte, domini e cookie misurati.
