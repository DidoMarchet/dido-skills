# Componenti e pagine

## Componente

```
components/widget/accordion/index.vue
components/widget/accordion/style.scss
```

`index.vue`:

```vue
<template>
  <!-- markup -->
</template>

<script>
export default {
  name: 'WidgetAccordion',
}
</script>

<script setup>
const props = defineProps({
  items: Array,
})
</script>
```

## app.vue

```vue
<template>
  <div>
    <NuxtLayout>
      <NuxtLoadingIndicator :color="'#000'" />
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Init smooth scroll and provide to all children
const { lenis } = useLenis()
provide('lenis', lenis)

// Fetch global CMS config, always with an explicit key
await useAsyncData('site-configuration', () => useStore().fetchConfiguration())

const { locale } = useI18n()
watch(() => locale.value, async () => {
  await useAsyncData('site-configuration', () => useStore().fetchConfiguration())
})
</script>
```

## error.vue

```vue
<template>
  <div>
    <NuxtLayout>
      <div class="page page-error">
        <div v-html="error.statusCode === 500 ? $t('errors.500.text') : $t('errors.404.text')" />
        <NuxtLink :to="$localePath({ name: 'index' })" external>Home</NuxtLink>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup>
const props = defineProps({
  error: { type: Object, required: true },
})

console.error(props.error)  // keep: required to surface the error

const { lenis } = useLenis()
provide('lenis', lenis)
</script>
```

## layouts/default.vue

```vue
<template>
  <main class="layout-default">
    <NavigationMenu />
    <SeoTemplatePreset>
      <slot />
    </SeoTemplatePreset>
    <FooterMain />
  </main>
</template>

<script setup></script>
```

## Struttura delle pagine

```vue
<!-- pages/product/[slug]/index.vue -->
<template>
  <div class="page page-product">
    <div class="page__wrap" data-animate="page-wrap">
      <PagesProductHeader :header="product.header[0]" />
      <div data-animate="page-content">
        <LazyPagesProductSpecifications :specs="product.specifications" />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'PageProduct' }
</script>

<script setup>
import queries from '@/graphql/craft/queries/index.js'
import { onBeforeEnter, onEnter, onLeave } from '~/assets/js/page-transitions/product.js'

definePageMeta({
  layout: 'default',
  pageTransition: {
    onBeforeEnter: (el) => onBeforeEnter(el),
    onEnter: async (el, done) => {
      const tl = onEnter(el, done)
      await tl.delay(0.5).play()
      done()
    },
    onLeave: async (el, done) => {
      const tl = onLeave(el)
      await tl.play()
      window.lenis.scrollTo(0, { immediate: true })
      done()
    },
  },
})

// storeToRefs keeps it reactive: app.vue refetches the configuration on locale change
const { configuration } = storeToRefs(useStore())
const variables = computed(() => ({
  site: configuration.value.site,
  slug: useRoute().params.slug,
}))

const { data, error } = await useGraphql(queries.product.getProduct, variables)

// A CMS error is not a missing page: 500, and 404 only when the entry does not exist
if (error.value) throw createError({ statusCode: 500 })
if (!data.value?.productEntries?.[0]) throw createError({ statusCode: 404 })

const product = computed(() => data.value.productEntries[0])

useSeo({
  ...product.value.seo,
  meta: [{ name: 'description', content: product.value.seo?.description }],
})
</script>
```

## Transizioni di pagina

```js
// assets/js/page-transitions/product.js
import { gsap } from 'gsap'

export const onBeforeEnter = (el) => {
  gsap.set('[data-animate="page-wrap"]', { opacity: 0 })
}

export const onEnter = (el, done) => {
  return gsap.timeline({ paused: true })
    .to('[data-animate="page-wrap"]', { opacity: 1, duration: 0.5, ease: 'power2.out' })
}

export const onLeave = (el) => {
  return gsap.timeline({ paused: true })
    .to('[data-animate="page-wrap"]', { opacity: 0, duration: 0.3, ease: 'power2.in' })
}
```

## Direttive di animazione (plugin solo client)

```js
// plugins/animation-directives.client.js
import { revealText } from '~/plugins/animation-directives/reveal-text.js'
import { scrollSpeed } from '~/plugins/animation-directives/scroll-speed.js'
import { parallaxElement } from '~/plugins/animation-directives/parallax-element.js'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('anim-reveal-text', {
    mounted(el) { revealText(el) },
  })
  nuxtApp.vueApp.directive('anim-scroll-speed', {
    mounted(el, binding) { scrollSpeed(el, binding) },
  })
  nuxtApp.vueApp.directive('anim-parallax-element', {
    mounted(el, binding) { parallaxElement(el, binding) },
  })
})
```

Uso: `v-anim-reveal-text`, `v-anim-scroll-speed`, `v-anim-parallax-element`.

## Plugin Sentry (solo client)

```js
// plugins/sentry.client.js
import * as Sentry from '@sentry/vue'
import { browserTracingIntegration } from '@sentry/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const { public: { sentryURL, enviroment } } = useRuntimeConfig()

  if (!sentryURL) { console.warn('Missing Sentry dsn'); return }

  Sentry.init({
    app: nuxtApp.vueApp,
    environment: enviroment,
    dsn: sentryURL,
    integrations: [browserTracingIntegration({ router })],
    tracesSampleRate: 1.0,
  })
})
```

