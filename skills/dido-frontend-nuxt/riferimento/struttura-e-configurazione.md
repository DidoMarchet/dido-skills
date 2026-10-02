# Struttura e configurazione

- Struttura del progetto
- `nuxt.config.ts`
- File di configurazione: `modules.ts`, `experimental.ts`, `runtimeConfig.ts`, `vite.ts`, `css.ts`, `nitro.ts`, `i18n.ts`
- Linting: `eslint.config.mjs`, `stylelint.config.mjs`

## Struttura del progetto (Nuxt 4)

```
project/
├── app/                                  ← ALL source files
│   ├── app.vue
│   ├── app.config.ts
│   ├── error.vue
│   ├── assets/
│   │   ├── js/
│   │   │   ├── utils.js                  # debounce, misc helpers
│   │   │   └── page-transitions/         # one GSAP file per page
│   │   │       ├── home.js
│   │   │       └── product.js
│   │   └── styles/scss/
│   │       ├── _core.scss                # @forward vars + mixins → injected globally
│   │       ├── vars/
│   │       │   ├── _index.scss           # @forward all
│   │       │   ├── _colors.scss
│   │       │   ├── _fonts.scss
│   │       │   ├── _spacing.scss
│   │       │   └── _timings.scss
│   │       ├── mixins/
│   │       │   ├── _index.scss
│   │       │   ├── _utility.scss         # scss-react + scss-slamp setup
│   │       │   ├── _fonts.scss
│   │       │   ├── _buttons.scss
│   │       │   ├── _links.scss
│   │       │   └── _input.scss
│   │       ├── layout/
│   │       │   ├── _setup.scss
│   │       │   ├── _layout.scss          # .row-*, .flex utilities
│   │       │   ├── _paddings.scss
│   │       │   ├── _margins.scss
│   │       │   ├── _images.scss
│   │       │   └── _visibility.scss
│   │       ├── typo/
│   │       │   ├── _setup.scss
│   │       │   ├── _heading.scss
│   │       │   ├── _text.scss
│   │       │   └── _cta.scss
│   │       └── globals/
│   │           ├── _lenis.scss
│   │           └── _formkit.scss
│   ├── bucket/                           # Static data: nav, filters, lists
│   │   └── navigations.js
│   ├── components/
│   │   └── [category]/
│   │       └── [name]/
│   │           ├── index.vue
│   │           └── style.scss
│   ├── composables/
│   │   ├── graphql.js
│   │   ├── api-fetch.js
│   │   ├── helpers.js
│   │   ├── lenis.js
│   │   └── seo.js
│   ├── graphql/
│   │   └── [cms]/                        # craft/, dato/, etc.
│   │       ├── queries/
│   │       │   ├── index.js              # re-exports all queries
│   │       │   └── [content-type].js
│   │       └── fragments/
│   │           └── [fragment-name].js
│   ├── layouts/
│   │   └── default.vue
│   ├── middleware/
│   │   ├── netlify-redirects.global.ts
│   │   └── remove-trailing-slash.global.ts
│   ├── pages/
│   │   ├── index.vue
│   │   └── [content-type]/[slug]/index.vue
│   ├── plugins/
│   │   ├── apollo.js
│   │   ├── animation-directives.client.js
│   │   ├── leaflet.client.js
│   │   └── sentry.client.js
│   ├── public/
│   ├── server/
│   │   └── api/
│   │       └── sitemap.js
│   ├── stores/                           # Pinia, always plural
│   │   └── [store-name].js
│   └── utils/
├── configuration/                        # Nuxt config split by concern, at root level
│   ├── apollo.ts
│   ├── app.ts
│   ├── build.ts
│   ├── css.ts
│   ├── delayHydration.ts
│   ├── devtools.ts
│   ├── experimental.ts
│   ├── formkit.ts
│   ├── gtm.ts
│   ├── i18n.ts
│   ├── modules.ts
│   ├── nitro.ts
│   ├── runtimeConfig.ts
│   ├── site.ts
│   ├── sitemap.ts
│   ├── sourcemap.ts
│   ├── ssr.ts
│   └── vite.ts
├── i18n/locales/
│   ├── it.js
│   └── en.js
├── nuxt.config.ts                        # thin: only spreads ./configuration/*
├── formkit.config.js
├── i18n.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── stylelint.config.mjs
└── vite.config.js                        # Sentry vite plugin
```

## `nuxt.config.ts`

```ts
import apollo from './configuration/apollo'
import app from './configuration/app'
import build from './configuration/build'
import css from './configuration/css'
import delayHydration from './configuration/delayHydration'
import devtools from './configuration/devtools'
import experimental from './configuration/experimental'
import formkit from './configuration/formkit'
import gtm from './configuration/gtm'
import i18n from './configuration/i18n'
import modules from './configuration/modules'
import nitro from './configuration/nitro'
import runtimeConfig from './configuration/runtimeConfig'
import site from './configuration/site'
import sitemap from './configuration/sitemap'
import ssr from './configuration/ssr'
import vite from './configuration/vite'

export default defineNuxtConfig({
  ...apollo,
  ...app,
  ...build,
  ...css,
  ...delayHydration,
  ...devtools,
  ...experimental,
  ...formkit,
  ...gtm,
  i18n: {
    vueI18n: './i18n.config',
    ...i18n.i18n,
  },
  ...modules,
  ...nitro,
  ...runtimeConfig,
  ...site,
  ...sitemap,
  ...ssr,
  ...vite,
  compatibilityDate: '2025-xx-xx',
})
```

## Schemi dei file di configurazione

```ts
// configuration/modules.ts
export default {
  modules: [
    '@nuxt/devtools',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
    '@nuxtjs/apollo',
    '@pinia/nuxt',
    '@formkit/nuxt',
    'nuxt-delay-hydration',
    '@saslavik/nuxt-gtm',
  ],
}
```

```ts
// configuration/experimental.ts
export default {
  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
  },
}
```

```ts
// configuration/runtimeConfig.ts
export default {
  runtimeConfig: {
    public: {
      enviroment: process.env.NODE_ENV,
      baseURL: process.env.SITE_URL,
      siteName: process.env.SITE_NAME,
      sentryURL: process.env.SENTRY_URL,
      gqlURL: process.env.GQL_URL,
      gqlApiKey: process.env.GQL_API_KEY,
    },
  },
}
```

```ts
// configuration/vite.ts
export default {
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use '~/assets/styles/scss/core' as *;`,
        },
      },
    },
    build: {
      sourcemap: process.env.NODE_ENV !== 'production',
    },
  },
}
```

```ts
// configuration/css.ts
export default {
  css: [
    'the-new-css-reset/css/reset.css',
    '~/assets/styles/scss/typo/index.scss',
    '~/assets/styles/scss/layout/index.scss',
    '~/assets/styles/scss/globals/index.scss',
  ],
}
```

```ts
// configuration/nitro.ts
export default {
  nitro: {
    routeRules: {
      '/**': { isr: true },                // ISR on all routes, no TTL: revalidate on deploy
      '/sitemap.xml': { prerender: true },
      // redirects:
      '/it/old-path/**': { redirect: { to: '/it/new-path', statusCode: 301 } },
    },
    prerender: {
      autoSubfolderIndex: true,
      concurrency: 1,
      interval: 1,
      failOnError: false,
      crawlLinks: true,
      routes: ['/', '/sitemap.xml'],
      retries: 4,
      retryDelay: 1000,
    },
    preset: 'netlify-edge',
  },
}
```

```ts
// configuration/i18n.ts
// NOTE: this is the only config file that types its export explicitly
import type { NuxtI18nOptions } from '@nuxtjs/i18n'

const i18n: { i18n: NuxtI18nOptions } = {
  i18n: {
    baseUrl: process.env.SITE_URL ?? '',
    defaultLocale: 'it',
    langDir: 'locales',
    locales: [
      { code: 'it', language: 'it-IT', name: 'Italiano', file: 'it.js' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.js' },
    ],
    strategy: 'prefix_except_default',  // default locale has no URL prefix
    detectBrowserLanguage: false,
    pages: {
      contacts: { it: '/contatti', en: '/contacts' },
      'projects/index': { it: '/progetti', en: '/projects' },
      'projects/[slug]/index': { it: '/progetti/[slug]', en: '/projects/[slug]' },
    },
  },
}

export default i18n
```

## Linting

### eslint.config.mjs

```js
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default createConfigForNuxt({})
  .append(
    {
      files: ['**/*.js', '**/*.ts', '**/*.vue'],
      plugins: { prettier: prettierPlugin },
      rules: {
        'vue/multi-word-component-names': 'off',
        'no-console': 'off',
        'no-undef': 'off',
        'prettier/prettier': 'error',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    prettierConfig,
    { ignores: ['node_modules/**', '.nuxt/**', '.output/**', 'dist/**', 'public/**'] }
  )
```

### stylelint.config.mjs

```js
export default {
  ignoreFiles: ['node_modules/**', 'dist/**', 'public/**', '.nuxt/**', '.output/**'],
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-standard-vue/scss',
  ],
  rules: {
    'selector-max-compound-selectors': 6,
    'selector-class-pattern': null,
    'function-name-case': null,
    'selector-id-pattern': null,
    'selector-pseudo-element-no-unknown': null,
    'keyframes-name-pattern': null,
    'custom-property-no-missing-var-function': null,
    'color-function-notation': 'legacy',
    'selector-no-qualifying-type': null,
    'alpha-value-notation': 'number',
    'no-descending-specificity': null,
  },
}
```
