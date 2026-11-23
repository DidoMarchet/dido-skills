// La board di Infinity (startinfinity.com) indicata in docs/plans/board.json, attraverso l'API v2.
// Una card è un item della cartella dell'URL: il titolo è il primo attributo di testo, il testo il
// primo testo lungo (HTML), la colonna un attributo etichetta con una sola etichetta: la vista a
// colonne raggruppa per l'insieme delle etichette, quindi una card con due etichette starebbe in
// un'altra colonna. Gli altri attributi li scrive solo quando board.json li nomina (fields, priority).

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { finish, notUpdated, sameName, timeoutMs } from './output.mjs'

const apiBase = 'https://app.startinfinity.com/api/v2/'
const apiVersion = '2026-06-01.neretva'
const pageLimit = 100
const maxPages = 20

// Le prove fingono l'API con un modulo che sostituisce fetch (DIDO_BOARD_FETCH).
const loadFetch = async () =>
  process.env.DIDO_BOARD_FETCH ? (await import(pathToFileURL(process.env.DIDO_BOARD_FETCH).href)).default : fetch

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Il testo lungo di Infinity è HTML: un paragrafo per blocco, le righe con <br>.
const textToHtml = (text) =>
  text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p>${paragraph.split('\n').map(escapeHtml).join('<br>')}</p>`)
    .join('')

const htmlToText = (html) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

// Il token dall'ambiente o, se lì non c'è, da .env.local del repo, dove sta con le altre variabili
// del progetto (anche scritto "INFINITY_TOKEN = valore", con o senza virgolette).
const readToken = (root) => {
  const fromEnvironment = process.env.INFINITY_TOKEN?.trim()
  if (fromEnvironment) return fromEnvironment
  const path = join(root, '.env.local')
  if (!existsSync(path)) return ''
  const line = readFileSync(path, 'utf8')
    .split('\n')
    .map((candidate) => candidate.match(/^\s*(?:export\s+)?INFINITY_TOKEN\s*=\s*(.*?)\s*$/))
    .find(Boolean)
  return line ? line[1].replace(/^(["'])(.*)\1$/, '$2').trim() : ''
}

// L'URL della board nel browser: https://app.startinfinity.com/b/<board>/<cartella>.
const parseBoardUrl = (url) => {
  const match = String(url ?? '').match(/startinfinity\.com\/b\/([A-Za-z0-9]+)(?:\/([A-Za-z0-9]+))?/)
  if (!match) notUpdated(`in docs/plans/board.json "url" non è l'indirizzo di una board di Infinity (${url ?? 'manca'})`)
  return { boardId: match[1], folderId: match[2] ?? null }
}

export const openInfinityBoard = async (config) => {
  const token = readToken(config.root)
  if (!token) finish('nessun Project collegato: la board è su Infinity e manca INFINITY_TOKEN')
  const { boardId, folderId } = parseBoardUrl(config.url)
  const fetchApi = await loadFetch()

  // Un 404 torna null quando chi chiama lo aspetta (allowMissing); gli altri errori fermano tutto.
  const request = async (method, path, { query = [], body, allowMissing = false } = {}) => {
    const url = new URL(path, apiBase)
    for (const [name, value] of query) url.searchParams.append(name, value)
    let response
    try {
      response = await fetchApi(url.href, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Version': apiVersion,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      if (error?.name === 'TimeoutError') notUpdated(`Infinity non ha risposto in ${timeoutMs / 1000} secondi`)
      notUpdated(`Infinity non risponde (${error?.cause?.code ?? error?.message})`)
    }
    if (response.status === 401) notUpdated('Infinity non accetta il token: controlla INFINITY_TOKEN')
    if (response.status === 403) notUpdated('il token di Infinity non ha accesso a questa board')
    if (response.status === 429) notUpdated('Infinity chiede di rallentare: riprova tra qualche minuto, sync riparte da dove era')
    if (response.status === 404 && allowMissing) return null
    let data
    try {
      data = await response.json()
    } catch {
      notUpdated(`Infinity ha risposto ${response.status} con qualcosa che non è JSON`)
    }
    if (!response.ok) {
      notUpdated(`Infinity ha risposto ${response.status}: ${String(data?.message ?? data?.error ?? '').slice(0, 160)}`)
    }
    return data
  }

  const listAll = async (path, query = []) => {
    const records = []
    let after = null
    for (let page = 0; page < maxPages; page += 1) {
      const pageQuery = [...query, ['limit', String(pageLimit)], ...(after ? [['after', after]] : [])]
      const { data, has_more: hasMore, after: next } = await request('GET', path, { query: pageQuery })
      records.push(...data.filter((record) => !record.deleted))
      if (!hasMore || !next) break
      after = next
    }
    return records
  }

  // L'URL non dice il workspace: è quello in cui la board c'è.
  let workspaceId = null
  let board = null
  for (const workspace of await listAll('workspaces')) {
    board = await request('GET', `workspaces/${workspace.id}/boards/${boardId}`, { allowMissing: true })
    if (board) {
      workspaceId = workspace.id
      break
    }
  }
  if (!board) notUpdated(`la board ${boardId} di docs/plans/board.json non c'è tra quelle che il token di Infinity vede`)
  const boardPath = `workspaces/${workspaceId}/boards/${boardId}`

  const folder = folderId
    ? await request('GET', `${boardPath}/folders/${folderId}`, { allowMissing: true })
    : (await listAll(`${boardPath}/folders`))[0]
  if (!folder) notUpdated(`la cartella ${folderId ?? ''} non c'è nella board "${board.name}"`)

  // Gli attributi della cartella, nel suo ordine.
  const attributes = await listAll(`${boardPath}/attributes`)
  const folderAttributes = folder.attribute_ids
    .map((id) => attributes.find((attribute) => attribute.id === id))
    .filter(Boolean)
  const titleAttribute = folderAttributes.find((attribute) => attribute.type === 'text')
  if (!titleAttribute) notUpdated(`la cartella "${folder.name}" non ha un attributo di testo per il titolo delle card`)
  const bodyAttribute = folderAttributes.find((attribute) => attribute.type === 'longtext') ?? null
  // Le colonne: l'attributo etichetta che ha più colonne di docs/plans/board.json.
  const wanted = Object.values(config.columns)
  const labelAttributes = folderAttributes.filter((attribute) => attribute.type === 'label')
  const matches = (attribute) =>
    (attribute.settings?.labels ?? []).filter((label) => wanted.some((name) => sameName(name, label.name))).length
  const columnAttribute = labelAttributes.toSorted((first, second) => matches(second) - matches(first))[0] ?? null
  const labels = columnAttribute?.settings?.labels ?? []

  // I campi di board.json, già tradotti nei valori dell'API: le persone dai membri del workspace
  // (per nome o email), le etichette per nome. Quello che non si traduce va in fieldProblems.
  const fieldProblems = []
  const labelOf = (attribute, name) => attribute.settings?.labels?.find((label) => sameName(label.name, name))
  const labelNames = (attribute) => (attribute.settings?.labels ?? []).map((label) => label.name).join(', ')
  let workspaceMembers = null
  const memberId = async (name) => {
    workspaceMembers ??= await listAll(`workspaces/${workspaceId}/members`)
    const found = workspaceMembers.filter((member) => sameName(member.name ?? '', name) || sameName(member.email ?? '', name))
    if (found.length === 1) return found[0].id
    fieldProblems.push(found.length ? `ci sono più membri "${name}": scrivi l'email` : `"${name}" non è tra i membri del workspace`)
    return null
  }
  const fieldValues = []
  for (const [name, wantedValue] of Object.entries(config.fields ?? {})) {
    const attribute = folderAttributes.find((candidate) => sameName(candidate.name, name))
    if (!attribute) {
      fieldProblems.push(`il campo "${name}" non c'è nella cartella`)
      continue
    }
    let data = null
    if (attribute.type === 'members') {
      const id = await memberId(wantedValue)
      data = id === null ? null : [id]
    } else if (attribute.type === 'label') {
      const label = labelOf(attribute, wantedValue)
      if (!label) fieldProblems.push(`"${wantedValue}" non è tra le etichette di ${attribute.name} (ci sono: ${labelNames(attribute)})`)
      data = label ? [label.id] : null
    } else if (attribute.type === 'text') {
      data = wantedValue
    } else {
      fieldProblems.push(`il campo "${attribute.name}" è di un tipo che lo script non scrive (${attribute.type})`)
    }
    if (data !== null) fieldValues.push({ attribute, data, text: `${attribute.name} ${wantedValue}` })
  }
  const priorityAttribute = config.priority
    ? folderAttributes.find((candidate) => candidate.type === 'label' && sameName(candidate.name, config.priority))
    : null
  if (config.priority && !priorityAttribute) fieldProblems.push(`la priorità "${config.priority}" non è un attributo etichetta della cartella`)
  // La priorità di una card: { value } da scrivere, { problem } se non si traduce, {} se non c'è.
  const priorityFor = (priority) => {
    if (!priority || !priorityAttribute) return {}
    const label = labelOf(priorityAttribute, priority)
    if (!label) return { problem: `la priorità "${priority}" non c'è (ci sono: ${labelNames(priorityAttribute)})` }
    return { value: { attribute_id: priorityAttribute.id, data: [label.id] }, text: `priorità ${label.name}` }
  }

  const value = (item, attribute) => item.values?.find((candidate) => candidate.attribute_id === attribute?.id)?.data
  const labelName = (ids) => labels.find((label) => label.id === ids?.[0])?.name ?? null
  const columnValue = (column) => ({
    attribute_id: columnAttribute.id,
    data: [labels.find((label) => label.name === column).id],
  })
  const textValues = ({ title, body }) => [
    { attribute_id: titleAttribute.id, data: title },
    ...(bodyAttribute ? [{ attribute_id: bodyAttribute.id, data: textToHtml(body) }] : []),
  ]
  const itemPath = (card) => `${boardPath}/items/${card.id}`
  const isEmpty = (data) => data === undefined || data === null || data === '' || (Array.isArray(data) && !data.length)
  const sameData = (first, second) => JSON.stringify(first ?? null) === JSON.stringify(second ?? null)

  // Per check: i campi scritti sulle card, o quelli della cartella tra cui scegliere.
  const describeAttribute = (attribute) =>
    attribute.type === 'members' ? `${attribute.name} (persone)` : `${attribute.name} (${labelNames(attribute)})`
  const choices = folderAttributes.filter(
    (attribute) => attribute.id !== columnAttribute?.id && ['members', 'label'].includes(attribute.type),
  )
  const configured = [
    ...Object.entries(config.fields ?? {}).map(([name, wantedValue]) => `${name} → ${wantedValue}`),
    ...(config.priority ? [`priorità in ${config.priority}`] : []),
  ]
  const fieldsLine = configured.length
    ? `campi: ${configured.join(', ')}${fieldProblems.length ? `; non scritti: ${fieldProblems.join('; ')}` : ''}`
    : `campi della cartella: ${choices.map(describeAttribute).join(', ') || 'nessuno'}`

  return {
    name: `"${board.name}", cartella "${folder.name}" (${config.url})`,
    note: '',
    place: 'nella board',
    columns: columnAttribute ? labels.map((label) => label.name) : null,
    noColumns: `la cartella "${folder.name}" non ha un attributo etichetta per le colonne`,
    noColumnsInCheck: 'nessun attributo etichetta per le colonne',
    // Il testo come si rilegge dalla board dopo averlo scritto, per vedere se è cambiato.
    storedBody: (body) => (bodyAttribute ? htmlToText(textToHtml(body)) : ''),
    fieldsLine,
    fieldProblems,

    loadCards: async () => {
      const items = await listAll(`${boardPath}/items`, [
        ['folder_id', folder.id],
        ['expand[]', 'values'],
      ])
      return items.map((item) => ({
        id: item.id,
        title: String(value(item, titleAttribute) ?? ''),
        body: htmlToText(String(value(item, bodyAttribute) ?? '')),
        column: labelName(value(item, columnAttribute)),
        values: item.values ?? [],
      }))
    },

    createCard: async ({ title, body, column, priority }) => {
      const { value: priorityValue, text: priorityText, problem } = priorityFor(priority)
      const values = [
        ...textValues({ title, body }),
        ...(column ? [columnValue(column)] : []),
        ...fieldValues.map((field) => ({ attribute_id: field.attribute.id, data: field.data })),
        ...(priorityValue ? [priorityValue] : []),
      ]
      const item = await request('POST', `${boardPath}/items`, { body: { folder_id: folder.id, values } })
      const card = { id: item.id, title, body: htmlToText(textToHtml(body)), column: column ?? null, values }
      return { card, notes: [priorityText ?? problem].filter(Boolean) }
    },

    // I campi vuoti della card e la priorità, se cambia: le cose scritte, per la riga di sync.
    completeCard: async (card, { priority }) => {
      const current = (attribute) => card.values.find((candidate) => candidate.attribute_id === attribute.id)?.data
      const missing = fieldValues.filter((field) => isEmpty(current(field.attribute)))
      const { value: priorityValue, text: priorityText, problem } = priorityFor(priority)
      const newPriority = priorityValue && !sameData(current(priorityAttribute), priorityValue.data) ? priorityValue : null
      const values = [
        ...missing.map((field) => ({ attribute_id: field.attribute.id, data: field.data })),
        ...(newPriority ? [newPriority] : []),
      ]
      if (values.length) {
        await request('PUT', itemPath(card), { body: { values } })
        card.values = [...card.values.filter((old) => !values.some((next) => next.attribute_id === old.attribute_id)), ...values]
      }
      return [...missing.map((field) => field.text), ...(newPriority ? [priorityText] : []), ...(problem ? [problem] : [])]
    },

    editCard: async (card, { title, body }) => {
      await request('PUT', itemPath(card), { body: { values: textValues({ title, body }) } })
      Object.assign(card, { title, body })
    },

    moveCard: async (card, column) => {
      await request('PUT', itemPath(card), { body: { values: [columnValue(column)] } })
      card.column = column
    },

    // Infinity non archivia: la card va nella colonna di archive (board.mjs).
    archiveCard: null,
  }
}
