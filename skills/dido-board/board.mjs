#!/usr/bin/env node
// La board del progetto, tenuta allineata al piano (skill dido-board): il GitHub Project collegato
// al repo o la board di Infinity scritta in docs/plans/board.json.
// Non ferma mai il lavoro: esce sempre con 0 e risponde con righe che cominciano con "board:".
//
//   node board.mjs check                          a quale board è collegato il repo, con gli stati
//   node board.mjs sync - <<'EOF' … EOF           crea o aggiorna le card (anche: sync <file>)
//   node board.mjs move "M5 step 3" "In progress"
//   node board.mjs archive "M5 step 3"
//
// sync legge un array JSON di { key, title, body, status }. La key ("M5 step 3") trova la card,
// il cui titolo è "<key>: <title>". Senza status una card nuova va in Backlog e una che c'è resta
// dov'è; senza title o body una card che c'è tiene i suoi, e una che manca non si crea.
//
// docs/plans/board.json (facoltativo; senza, la board è il GitHub Project):
//   { "service": "github" | "infinity" | "none", "url": "<board di Infinity>",
//     "columns": { "<stato della skill>": "<colonna della board>", "archive": "<colonna>" },
//     "fields": { "<attributo>": "<valore>" }, "priority": "<attributo della priorità>" }
// Uno stato che non è in columns va nella colonna con il suo nome. archive senza colonna archivia
// la card del Project; su Infinity, che non archivia, la porta nella colonna di Done. fields e
// priority valgono su Infinity: i campi vanno sulle card nuove e su quelle dove sono vuoti, la
// priorità è quella che sync riceve con la card. "none" vuol dire che il progetto non ha una board.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { openGithubBoard } from './github.mjs'
import { openInfinityBoard } from './infinity.mjs'
import { BoardExit, finish, notUpdated, sameName, say } from './output.mjs'

const configFile = 'docs/plans/board.json'
const newCardStatus = 'Backlog'
const doneStatus = 'Done'
const archiveStatus = 'archive'

const sameText = (first, second) => first.replace(/\r\n/g, '\n').trim() === second.replace(/\r\n/g, '\n').trim()
const titleFor = (key, title) => (title?.trim() ? `${key}: ${title.trim()}` : key)

const repositoryRoot = () => {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return process.cwd()
  }
}

const isStringMap = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every((item) => typeof item === 'string')

const readConfig = () => {
  const root = repositoryRoot()
  const path = join(root, configFile)
  if (!existsSync(path)) return { service: 'github', columns: {}, fields: {}, hasFile: false, root }
  let config
  try {
    config = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    notUpdated(`${configFile} non si legge: ${error.message.slice(0, 120)}`)
  }
  const service = config?.service ?? 'github'
  if (!['github', 'infinity', 'none'].includes(service)) {
    notUpdated(`in ${configFile} "service" è "${service}": va "github", "infinity" o "none"`)
  }
  if (service === 'none') finish(`nessun Project collegato: ${configFile} dice che il progetto non ha una board`)
  const columns = config.columns ?? {}
  if (!isStringMap(columns)) notUpdated(`in ${configFile} "columns" va un oggetto { "<stato>": "<colonna>" }`)
  const fields = config.fields ?? {}
  if (!isStringMap(fields)) notUpdated(`in ${configFile} "fields" va un oggetto { "<attributo>": "<valore>" }`)
  if (config.priority !== undefined && typeof config.priority !== 'string') {
    notUpdated(`in ${configFile} "priority" va il nome dell'attributo della priorità`)
  }
  return { ...config, service, columns, fields, hasFile: true, root }
}

const openBoard = async () => {
  const config = readConfig()
  const board = config.service === 'infinity' ? await openInfinityBoard(config) : await openGithubBoard(config)
  return { config, board }
}

// La colonna di uno stato: quella di columns in docs/plans/board.json, o quella con il suo nome.
const configuredState = (config, status) => Object.keys(config.columns).find((state) => sameName(state, status))

const findColumn = ({ config, board }, status) => {
  if (!board.columns) return { problem: board.noColumns }
  const state = configuredState(config, status)
  const wanted = state ? config.columns[state] : status
  const column = board.columns.find((candidate) => sameName(candidate, wanted))
  const names = board.columns.join(', ')
  if (!column && state) return { problem: `la colonna "${wanted}" di ${state} non c'è ${board.place} (ci sono: ${names})` }
  if (!column) return { problem: `lo stato "${status}" non c'è ${board.place} (ci sono: ${names})` }
  // Nelle righe lo stato della skill, e la colonna della board quando ha un altro nome.
  return { column, label: !state || sameName(state, column) ? column : `${state} ("${column}")` }
}

// Il ":" dopo la key separa "M5 step 1" da "M5 step 10".
const findCard = (cards, key) => cards.find((card) => card.title === key || card.title.startsWith(`${key}:`))

const check = async () => {
  const context = await openBoard()
  const { config, board } = context
  let statuses = board.columns ? board.columns.join(', ') : board.noColumnsInCheck
  const configured = Object.keys(config.columns)
  if (configured.length && board.columns) {
    statuses = configured
      .map((state) => {
        const { column } = findColumn(context, state)
        return column ? `${state} → ${column}` : `${state} → "${config.columns[state]}", che non c'è`
      })
      .join(', ')
  }
  say(`collegato a ${board.name}, stati: ${statuses}${board.note}`)
  if (board.fieldsLine) say(board.fieldsLine)
}

const readEntries = (source) => {
  if (!source) finish('sync vuole le card su stdin (sync -) o in un file (sync <file>)')
  let entries
  try {
    entries = JSON.parse(readFileSync(source === '-' ? 0 : source, 'utf8'))
  } catch (error) {
    finish(`sync non riesce a leggere le card: ${error.message.slice(0, 120)}`)
  }
  const valid = Array.isArray(entries) && entries.every((entry) => typeof entry?.key === 'string' && entry.key.trim())
  if (!valid) finish('sync vuole un array JSON di { key, title, body, status }, ognuno con la sua key')
  return entries
}

const sync = async (source) => {
  const entries = readEntries(source)
  const context = await openBoard()
  const { board } = context
  const cards = await board.loadCards()
  const counts = { created: 0, changed: 0, aligned: 0, missing: 0 }
  if (board.fieldProblems.length) say(`campi non scritti: ${board.fieldProblems.join('; ')}`)
  for (const entry of entries) {
    const key = entry.key.trim()
    const card = findCard(cards, key)
    // Solo key e stato servono a riallineare: una card nuova senza testo non direbbe niente.
    if (!card && entry.title === undefined && entry.body === undefined) {
      counts.missing += 1
      say(`manca la card di "${key}": rimanda lo step con title e body`)
      continue
    }
    const wantedStatus = entry.status ?? (card ? null : newCardStatus)
    const { column, label, problem } = wantedStatus ? findColumn(context, wantedStatus) : {}
    if (!card) {
      const title = titleFor(key, entry.title)
      const { card: created, notes } = await board.createCard({ title, body: entry.body ?? '', column, priority: entry.priority })
      cards.push(created)
      counts.created += 1
      const details = [...notes, ...(problem ? [problem] : [])]
      say(`creata "${title}"${column ? ` in ${label}` : ''}${details.length ? ` (${details.join(', ')})` : ''}`)
      continue
    }
    const title = entry.title === undefined ? card.title : titleFor(key, entry.title)
    const body = entry.body === undefined ? card.body : entry.body
    const changes = []
    if (title !== card.title || !sameText(board.storedBody(body), card.body)) {
      await board.editCard(card, { title, body })
      changes.push('testo aggiornato')
    }
    if (column && !sameName(card.column ?? '', column)) {
      await board.moveCard(card, column)
      changes.push(`ora in ${label}`)
    }
    changes.push(...(await board.completeCard(card, { priority: entry.priority })))
    if (problem) changes.push(problem)
    if (changes.length) {
      counts.changed += 1
      say(`"${title}": ${changes.join(', ')}`)
    } else {
      counts.aligned += 1
    }
  }
  const missing = counts.missing ? `, ${counts.missing} mancanti` : ''
  say(`${entries.length} card: ${counts.created} create, ${counts.changed} cambiate, ${counts.aligned} già allineate${missing}`)
}

const move = async (key, status) => {
  if (!key?.trim() || !status?.trim()) finish('move vuole la key e lo stato: move "M5 step 3" "In progress"')
  const context = await openBoard()
  const { column, label, problem } = findColumn(context, status)
  if (problem) notUpdated(problem)
  const card = findCard(await context.board.loadCards(), key.trim())
  if (!card) finish(`manca la card di "${key.trim()}": creala con sync, poi ripeti move`)
  if (sameName(card.column ?? '', column)) finish(`"${card.title}" è già in ${label}`)
  await context.board.moveCard(card, column)
  say(`"${card.title}" ora è in ${label}`)
}

const archive = async (key) => {
  if (!key?.trim()) finish('archive vuole la key: archive "M5 step 3"')
  const context = await openBoard()
  const { config, board } = context
  // Archiviare vuol dire spostare quando columns ha la colonna di archive o la board non archivia.
  const target = configuredState(config, archiveStatus) ?? (board.archiveCard ? null : doneStatus)
  const { column, problem } = target ? findColumn(context, target) : {}
  if (problem) notUpdated(problem)
  const card = findCard(await board.loadCards(), key.trim())
  if (!card) finish(`nessuna card per "${key.trim()}", niente da archiviare`)
  if (!column) {
    await board.archiveCard(card)
    say(`archiviata "${card.title}"`)
    return
  }
  if (sameName(card.column ?? '', column)) finish(`archiviata "${card.title}": era già in ${column}`)
  await board.moveCard(card, column)
  say(`archiviata "${card.title}": ora è in ${column}`)
}

const [command, ...args] = process.argv.slice(2)
const commands = {
  check: () => check(),
  sync: () => sync(args[0]),
  move: () => move(args[0], args[1]),
  archive: () => archive(args[0]),
}

try {
  if (!commands[command]) finish(`comando sconosciuto "${command ?? ''}": check, sync, move o archive`)
  await commands[command]()
} catch (error) {
  // Anche un errore dello script diventa una riga: la board non ferma mai il lavoro.
  say(error instanceof BoardExit ? error.message : `non aggiornata: errore dello script (${String(error?.message).slice(0, 160)})`)
}
