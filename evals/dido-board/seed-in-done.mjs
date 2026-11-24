// La board di Infinity finta del caso infinity-in-done: le card di in-done-board.json, scritte
// come le scrive board.mjs (titolo, testo HTML con la riga dello step, colonna, Sub task).
// Uso: node seed-in-done.mjs <infinity-state.json>
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { attributeIds, folderId, initialState, labelId } from './fake-infinity.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const cards = JSON.parse(readFileSync(join(here, 'in-done-board.json'), 'utf8'))

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const toHtml = (text) =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.split('\n').map(escapeHtml).join('<br>')}</p>`)
    .join('')
const keyLine = (key) => key.replace(/^(.+) step (\S+)$/, 'Step $2 del piano $1')

const items = cards.map((card, index) => ({
  id: `item${String(index + 1).padStart(7, '0')}`,
  object: 'item',
  folder_id: folderId,
  parent_id: null,
  sort_order: (index + 1) * 65536,
  deleted: false,
  values: [
    { attribute_id: attributeIds.name, data: card.title },
    { attribute_id: attributeIds.description, data: toHtml(`${card.body}\n\n${keyLine(card.key)}`) },
    { attribute_id: attributeIds.status, data: [labelId(card.column)] },
    { attribute_id: attributeIds.checklist, data: card.todo.map(({ text, done }) => ({ id: randomUUID(), name: text, done })) },
  ],
}))

writeFileSync(process.argv[2], `${JSON.stringify({ ...initialState(), items, nextId: items.length + 1 }, null, 2)}\n`)
