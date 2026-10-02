# Composable e dati

## Composable

### useGraphql, il wrapper delle query GraphQL

```js
// composables/graphql.js
export const useGraphql = async (query, variablesInput, options = { executeSSR: true }) => {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  // Accept both reactive and plain objects
  const variables = isRef(variablesInput) ? variablesInput : ref(variablesInput)

  // The error goes back to the caller: a page that only sees empty data would answer 404
  // while the CMS is down
  const executeQuery = async (vars) => {
    try {
      loading.value = true
      const result = await useAsyncQuery(query, vars, { fetchPolicy: 'cache-and-network' })
      data.value = result.data.value
      error.value = result.error.value
    } catch (e) {
      console.error(e)
      error.value = e
    } finally {
      loading.value = false
    }
  }

  if (options.executeSSR) await executeQuery(variables.value)

  watch(() => variables.value, (newVars) => executeQuery(newVars))

  return { data, error, loading }
}
```

### useApiFetch, API REST con retry e refresh del token

```js
// composables/api-fetch.js

// Retry only network errors of idempotent methods: a POST or PATCH may have reached
// the server before the connection dropped, and once a response has arrived the
// request already happened, and repeating it would duplicate it.
const RETRYABLE_METHODS = ['GET', 'HEAD', 'PUT', 'DELETE']

export const useApiFetch = ({ endpoint = '', initialToken = null, refreshTokenFunction = null } = {}) => {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)
  const authToken = ref(initialToken)

  // refreshTokenFunction must be single-flight: the backend rotates the refresh token, so two
  // concurrent refreshes log the user out. Calls that get a 401 together wait for the same
  // refresh (see chiamate-al-backend.md).
  const fetchWithRetry = async (url, options, retries = 3, refreshed = false) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(url, options).catch((e) => {
        if (retries > 0 && RETRYABLE_METHODS.includes(options.method)) return null
        throw e
      })
      if (!response) return await fetchWithRetry(url, options, retries - 1, refreshed)
      if (!response.ok) {
        // One refresh per request: a 401 after refreshing means the session is over
        if (response.status === 401 && !refreshed && refreshTokenFunction) {
          await refreshTokenFunction()
          options.headers.Authorization = `Bearer ${authToken.value}`
          return await fetchWithRetry(url, options, retries, true)
        }
        error.value = response
        return response
      }
      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('application/pdf')) return await response.blob()
      // A 2xx without a body counts as {}
      const text = await response.text()
      const result = text ? JSON.parse(text) : {}
      data.value = result
      return result
    } catch (e) {
      error.value = e
      return e
    } finally {
      loading.value = false
    }
  }

  const request = async ({ method = 'GET', api = '', params = {}, headers = {}, token = null } = {}) => {
    const usedToken = token || authToken.value
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(usedToken ? { Authorization: `Bearer ${usedToken}` } : {}),
        ...headers,
      },
      body: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.stringify(params) : null,
    }
    const base = endpoint.replace(/\/+$/, '')
    const path = api.replace(/^\/+/, '')
    const url = method === 'GET' && Object.keys(params).length
      ? `${base}/${path}?${new URLSearchParams(params)}`
      : `${base}/${path}`
    return fetchWithRetry(url, opts)
  }

  return {
    data, error, loading, request,
    setToken: (t) => (authToken.value = t),
    clearToken: () => (authToken.value = null),
  }
}
```

### useLenis per lo scroll fluido

```js
// composables/lenis.js
export const useLenis = () => {
  const lenis = ref(null)

  onMounted(() => {
    lenis.value = new Lenis()
    lenis.value.on('scroll', ScrollTrigger.update)
    window.lenis = lenis.value  // intentional: page transition files use window.lenis (non-Vue context)
    gsap.ticker.add((time) => lenis.value.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  })

  onUnmounted(() => lenis.value?.destroy())

  return { lenis }
}
```

### useSeo per SEO e hreflang

```js
// called in page <script setup>
useSeo({
  title: 'Page Title',
  meta: [{ name: 'description', content: '...' }],
  link: [],
  localeParams: { it: { slug: 'slug-it' }, en: { slug: 'slug-en' } },
  market: [{ slug: 'it' }, { slug: 'en' }],  // hreflang fallback (CMS-driven)
})
```

Risultato: `"${title} | ${siteName} ${market}"` + tag OG + hreflang + `setI18nParams()`.

## Gestione dello stato con Pinia in stile composition

```js
// stores/index.js
import { defineStore } from 'pinia'
import queries from '@/graphql/craft/queries/index.js'

export const useStore = defineStore('store', () => {
  const { locale } = useI18n()
  const configuration = ref(null)

  const fetchConfiguration = async () => {
    const { data } = await useAsyncQuery(queries.site.getConfig, { locale: locale.value })
    configuration.value = data.value
  }

  return { configuration, fetchConfiguration }
})
```

## Organizzazione delle query GraphQL

```js
// graphql/craft/queries/index.js
import * as home from './home.js'
import * as product from './product.js'
import * as news from './news.js'

export default { home, product, news }
```

```js
// graphql/craft/queries/product.js
import { seoFragment } from '../fragments/seo.js'

export const getProduct = gql`
  ${seoFragment}
  query GetProduct($site: [String], $slug: [String]) {
    productEntries(site: $site, slug: $slug) {
      id
      title
      slug
      seo { ...SeoFragment }
    }
  }
`
```

## Dati statici in `bucket/`

```js
// bucket/navigations.js
export const navMenu = {
  linksMain: [
    { key: 'products', route: { name: 'products' } },
    { key: 'projects', route: { name: 'projects-index' } },
  ],
}
```

