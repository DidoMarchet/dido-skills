// Un'API di Infinity finta per le prove di dido-board: board.mjs la usa al posto di fetch quando
// DIDO_BOARD_FETCH punta a questo file. Risponde come l'API v2 con una board tenuta in un file e
// scrive ogni richiesta in un log, così prove e scenari non toccano Infinity e possono contare le
// chiamate.
//
// FAKE_INFINITY_STATE  il file JSON della board: i campi che ha valgono sopra quelli di initialState
// FAKE_INFINITY_LOG    il log JSONL delle richieste (facoltativo)
// FAKE_INFINITY_MODE   ok (di base), unauthorized, slow, ratelimit: come risponde Infinity

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const apiPrefix = '/api/v2/'
const pageLimit = 100

export const boardId = 'wBMjf2pNi5a'
export const folderId = 'ifdZU4AdwJH'
export const attributeIds = {
  name: '0b6f3c1e-1111-4a1a-9a01-000000000001',
  description: '0b6f3c1e-1111-4a1a-9a01-000000000002',
  status: '0b6f3c1e-1111-4a1a-9a01-000000000003',
  members: '0b6f3c1e-1111-4a1a-9a01-000000000004',
  createdAt: '0b6f3c1e-1111-4a1a-9a01-000000000005',
  referent: '0b6f3c1e-1111-4a1a-9a01-000000000006',
  department: '0b6f3c1e-1111-4a1a-9a01-000000000007',
  priority: '0b6f3c1e-1111-4a1a-9a01-000000000008',
  checklist: '0b6f3c1e-1111-4a1a-9a01-000000000009',
}
// Come su bici.pro: le colonne sono una parte delle etichette dell'attributo, che è a scelta multipla.
export const columnNames = ['Da quotare', 'To-do', 'Doing', 'Test', 'Done', 'Stopped']
const otherActivityLabels = ['Review', 'Deadline', '+']
export const departmentNames = ['Design', 'Develop', 'Seo']
export const priorityNames = ['Alta', 'Media', 'Normale', 'Delivered']
export const labelId = (name) => `lbl-${name.toLowerCase().replace(/[^a-z+]+/g, '-').replace(/\+/g, 'plus')}`
const labelsOf = (names) => names.map((name) => ({ id: labelId(name), name, color: '#92F3EC' }))
export const members = [
  { id: 53509, object: 'member', name: 'Davide Marchet', email: 'davide@example.com', role: 'full-member', deleted: false },
  { id: 51103, object: 'member', name: 'Lorenzo Furno', email: 'lorenzo@example.com', role: 'full-member', deleted: false },
  { id: 372681, object: 'member', name: 'Luca', email: 'luca.uno@example.com', role: 'full-member', deleted: false },
  { id: 330952, object: 'member', name: 'Luca', email: 'luca.due@example.com', role: 'full-member', deleted: false },
]

export const initialState = () => ({
  workspaces: [
    { id: 501, object: 'workspace', name: 'Personale', boards: [] },
    { id: 669, object: 'workspace', name: 'Studio', boards: [boardId] },
  ],
  boards: [{ id: boardId, object: 'board', name: 'bici.pro', color: '#3B82F6', description: '', deleted: false }],
  folders: [
    {
      id: folderId,
      object: 'folder',
      name: 'Sviluppo',
      parent_id: boardId,
      attribute_ids: Object.values(attributeIds),
      deleted: false,
    },
    { id: 'fPreventivi1', object: 'folder', name: 'Preventivi', parent_id: boardId, attribute_ids: [attributeIds.name], deleted: false },
  ],
  attributes: [
    { id: attributeIds.name, object: 'attribute', name: 'Name', type: 'text', settings: {}, deleted: false },
    { id: attributeIds.description, object: 'attribute', name: 'Descrizione', type: 'longtext', settings: {}, deleted: false },
    {
      id: attributeIds.status,
      object: 'attribute',
      name: 'Attività',
      type: 'label',
      settings: { multiple: true, allowNew: false, allowEmpty: true, labels: labelsOf([...columnNames, ...otherActivityLabels]) },
      deleted: false,
    },
    {
      id: attributeIds.department,
      object: 'attribute',
      name: 'Reparto',
      type: 'label',
      settings: { multiple: true, allowNew: false, allowEmpty: true, labels: labelsOf(departmentNames) },
      deleted: false,
    },
    { id: attributeIds.members, object: 'attribute', name: 'Responsabile', type: 'members', settings: {}, deleted: false },
    { id: attributeIds.referent, object: 'attribute', name: 'Referente', type: 'members', settings: {}, deleted: false },
    {
      id: attributeIds.priority,
      object: 'attribute',
      name: 'Priorità',
      type: 'label',
      settings: { multiple: false, allowNew: false, allowEmpty: true, labels: labelsOf(priorityNames) },
      deleted: false,
    },
    { id: attributeIds.checklist, object: 'attribute', name: 'Sub task', type: 'checklist', settings: {}, deleted: false },
    { id: attributeIds.createdAt, object: 'attribute', name: 'Creato', type: 'created_at', settings: {}, deleted: false },
  ],
  items: [],
  nextId: 1,
})

const statePath = () => process.env.FAKE_INFINITY_STATE
const loadState = () => {
  const path = statePath()
  const saved = path && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
  return { ...initialState(), ...saved }
}
const saveState = (state) => {
  if (statePath()) writeFileSync(statePath(), `${JSON.stringify(state, null, 2)}\n`)
}
const log = (entry) => {
  const path = process.env.FAKE_INFINITY_LOG
  if (path) appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`)
}

const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const notFound = () => reply(404, { message: 'Not found.' })
const invalid = (message) => reply(422, { message, errors: {} })

// Le liste dell'API: data, has_more e i cursori before/after.
const page = (records, query) => {
  const limit = Math.min(Number(query.get('limit')) || 10, pageLimit)
  const start = query.get('after') ? Number(query.get('after')) : 0
  const data = records.slice(start, start + limit)
  const hasMore = start + limit < records.length
  return reply(200, { object: 'list', has_more: hasMore, before: String(start), after: hasMore ? String(start + limit) : null, data })
}

const publicItem = (item, withValues) => {
  const { values, ...rest } = item
  return withValues ? { ...rest, values: values.map((value) => ({ object: 'value', deleted: false, ...value })) } : rest
}

// La validazione stretta della versione neretva: ogni valore deve essere di un attributo della
// cartella e avere la forma del suo tipo.
const checkValues = (state, folder, values) => {
  if (!Array.isArray(values)) return 'values must be an array'
  for (const value of values) {
    if (!folder.attribute_ids.includes(value.attribute_id)) return `attribute ${value.attribute_id} is not in the folder`
    const attribute = state.attributes.find((candidate) => candidate.id === value.attribute_id)
    if (attribute.type === 'text' || attribute.type === 'longtext') {
      if (typeof value.data !== 'string') return `${attribute.name} must be a string`
    } else if (attribute.type === 'label') {
      const known = attribute.settings.labels.map((label) => label.id)
      if (!Array.isArray(value.data) || value.data.some((id) => !known.includes(id))) return `${attribute.name} has unknown labels`
    } else if (attribute.type === 'checklist') {
      // Come l'API vera: ogni voce vuole un id UUID, il nome e la spunta.
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const valid = (entry) => uuid.test(entry?.id ?? '') && typeof entry.name === 'string' && typeof entry.done === 'boolean'
      if (!Array.isArray(value.data) || !value.data.every(valid)) return `${attribute.name} must be a list of { id, name, done }`
    } else if (attribute.type === 'members') {
      const known = members.map((member) => member.id)
      if (!Array.isArray(value.data) || value.data.some((id) => !known.includes(id))) return `${attribute.name} has unknown members`
    } else {
      return `${attribute.name} is read only in this fake`
    }
  }
  return null
}

const route = (state, method, path, query, body) => {
  const parts = path.split('/')
  if (method === 'GET' && path === 'workspaces') return page(state.workspaces.map(({ boards, ...workspace }) => workspace), query)
  const [, workspaceText, , board, collection, recordId] = parts
  const workspace = state.workspaces.find((candidate) => String(candidate.id) === workspaceText)
  if (method === 'GET' && workspace && parts[2] === 'members' && parts.length === 3) return page(members, query)
  if (parts[0] !== 'workspaces' || !workspace || parts[2] !== 'boards') return notFound()
  if (!workspace.boards.includes(board)) return notFound()
  const boardRecord = state.boards.find((candidate) => candidate.id === board)
  if (method === 'GET' && !collection) return reply(200, boardRecord)
  if (method === 'GET' && collection === 'attributes' && !recordId) return page(state.attributes, query)
  if (method === 'GET' && collection === 'folders') {
    if (!recordId) return page(state.folders, query)
    const folder = state.folders.find((candidate) => candidate.id === recordId)
    return folder ? reply(200, folder) : notFound()
  }
  if (collection !== 'items') return notFound()
  const withValues = query.getAll('expand[]').includes('values')
  if (method === 'GET' && !recordId) {
    const folder = query.get('folder_id')
    const items = state.items.filter((item) => !item.deleted && (!folder || item.folder_id === folder))
    return page(items.map((item) => publicItem(item, withValues)), query)
  }
  if (method === 'POST' && !recordId) {
    const folder = state.folders.find((candidate) => candidate.id === body?.folder_id)
    if (!folder) return invalid('The folder id field is required.')
    const problem = checkValues(state, folder, body.values ?? [])
    if (problem) return invalid(problem)
    const number = state.nextId++
    const item = {
      id: `item${String(number).padStart(7, '0')}`,
      object: 'item',
      folder_id: folder.id,
      parent_id: null,
      sort_order: number * 65536,
      deleted: false,
      values: body.values ?? [],
    }
    state.items.push(item)
    saveState(state)
    return reply(201, publicItem(item, false))
  }
  const item = state.items.find((candidate) => candidate.id === recordId && !candidate.deleted)
  if (!item) return notFound()
  if (method === 'GET') return reply(200, publicItem(item, withValues))
  if (method === 'PUT') {
    const folder = state.folders.find((candidate) => candidate.id === item.folder_id)
    const problem = checkValues(state, folder, body?.values ?? [])
    if (problem) return invalid(problem)
    // Cambiano solo i valori passati: gli altri restano.
    for (const value of body?.values ?? []) {
      item.values = [...item.values.filter((current) => current.attribute_id !== value.attribute_id), value]
    }
    saveState(state)
    return reply(200, publicItem(item, false))
  }
  if (method === 'DELETE') {
    item.deleted = true
    saveState(state)
    return reply(200, { id: item.id, object: 'item', deleted: true })
  }
  return notFound()
}

// Aspetta finché chi chiama non rinuncia (il timeout di board.mjs), al massimo 5 secondi.
const waitForAbort = (signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 5000)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })

export default async (input, init = {}) => {
  const url = new URL(input)
  const method = init.method ?? 'GET'
  const body = init.body ? JSON.parse(init.body) : undefined
  const headers = new Headers(init.headers)
  const path = url.pathname.startsWith(apiPrefix) ? url.pathname.slice(apiPrefix.length) : url.pathname
  log({ method, path, query: url.search, body })
  const mode = process.env.FAKE_INFINITY_MODE || 'ok'
  if (mode === 'slow') await waitForAbort(init.signal)
  if (url.origin !== 'https://app.startinfinity.com' || !url.pathname.startsWith(apiPrefix)) return notFound()
  if (mode === 'unauthorized' || !/^Bearer \S+$/.test(headers.get('Authorization') ?? '')) {
    return reply(401, { error: 'Unauthenticated.' })
  }
  if (mode === 'ratelimit') return reply(429, { message: 'Too Many Attempts.' })
  if (!headers.get('X-API-Version')) return reply(400, { message: 'Missing X-API-Version header.' })
  return route(loadState(), method, path, url.searchParams, body)
}
