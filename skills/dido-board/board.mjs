#!/usr/bin/env node
// La board del progetto, tenuta allineata al piano (skill dido-board): il GitHub Project collegato
// al repo o la board di Infinity scritta in docs/plans/board.json.
// Non ferma mai il lavoro: esce sempre con 0 e risponde con righe che cominciano con "board:".
//
//   node board.mjs check                          a quale board è collegato il repo, con gli stati
//   node board.mjs show [M5 | "M5 step 3"]        le card in JSON, come le vuole sync
//   node board.mjs sync - <<'EOF' … EOF           crea o aggiorna le card (anche: sync <file>)
//   node board.mjs move "M5 step 3" "In progress"
//   node board.mjs archive "M5 step 3"
//   node board.mjs close-milestone M5             chiude la milestone del piano (GitHub)
//
// sync legge un array JSON di { key, title, body, todo, priority, status, type, assignee, milestone }.
// type è il tipo (Task, Bug, Feature, Domanda), assignee chi prende la card se non è quello di
// board.json, milestone la milestone se non è il piano della key. Il titolo della card è
// title, da leggere per una persona; la key ("M5 step 3") sta nell'ultima riga del testo ("Step 3
// del piano M5") e da lì sync, move e archive ritrovano la card. todo è un array di { text, done }:
// su Infinity va nel campo checklist della cartella, su GitHub nel testo come lista con le caselle.
// Senza status una card nuova va in Backlog e una che c'è resta dov'è. Di title, body e todo
// cambia solo quello che sync riceve, e todo è sempre la lista intera; una card che manca si crea
// solo con il title. show risponde con le card (tutte, di un piano o una) nella stessa forma:
// { key, title, body, todo, status }, senza key le card che non sono della skill. Tutti gli altri
// comandi rispondono con righe "board:".
//
// docs/plans/board.json (facoltativo; senza, la board è il GitHub Project):
//   { "service": "github" | "infinity" | "none", "url": "<board di Infinity>",
//     "columns": { "<stato della skill>": "<colonna della board>", "archive": "<colonna>" },
//     "fields": { "<attributo>": "<valore>" }, "assignee": "<campo di fields con chi prende la card>",
//     "priority": "<attributo della priorità>", "type": "<attributo del tipo>",
//     "milestone": "<attributo della milestone>" }
// Uno stato che non è in columns va nella colonna con il suo nome. archive senza colonna archivia
// la card del Project; su Infinity, che non archivia, la porta nella colonna di Done. I campi di
// fields vanno sulle card nuove e su quelle dove sono vuoti; la priorità, il tipo, la milestone e
// chi prende la card sono quelli che sync riceve con la card. Su GitHub chi prende la card è
// l'assegnatario della issue, gli altri campi sono campi del Project, tipo e milestone quelli della
// issue; su Infinity type e milestone nominano un attributo etichetta, e senza non si scrivono.
// "none" vuol dire che il progetto non ha una board.

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
// Gli stati della skill, quelli della tabella "Quando" di SKILL.md.
const skillStates = ['Backlog', 'Ready', 'In progress', 'In review', 'Done']

const sameText = (first, second) => first.replace(/\r\n/g, '\n').trim() === second.replace(/\r\n/g, '\n').trim()
// Il titolo da leggere per una persona. Una board che non tiene il testo (una cartella di Infinity
// senza testo lungo) perderebbe la riga dello step: lì la key resta nel titolo, come "M5 step 3: …".
const titleFor = (board, key, title) => {
  if (!title?.trim()) return key
  return board.keepsBody ? title.trim() : `${key}: ${title.trim()}`
}

// La riga con cui la card dice il suo step: "M5 step 3" diventa "Step 3 del piano M5".
const keyLine = (key) => {
  const match = key.match(/^(.+) (step|domanda) (\S+)$/i)
  if (!match) return key
  const [, plan, kind, number] = match
  return `${kind[0].toUpperCase()}${kind.slice(1).toLowerCase()} ${number} del piano ${plan}`
}

// La key di una card: dalla riga dello step o, card scritta prima del 23/11/2026, dal titolo
// ("M5 step 3: …"). null per le card che non sono della skill.
const keyOf = (card) => {
  const line = card.body
    .split('\n')
    .map((candidate) => candidate.trim().match(/^(step|domanda) (\S+) del piano (.+)$/i))
    .findLast(Boolean)
  if (line) return `${line[3]} ${line[1].toLowerCase()} ${line[2]}`
  if (card.keyInTitle === false) return null
  return card.title.match(/^(.+? (?:step|domanda) [^\s:]+)(?::|$)/i)?.[1] ?? null
}

// Il testo della card: quello dello step, le cose da fare se la board le tiene nel testo (GitHub)
// e per ultima la riga dello step.
const cardBody = (board, key, body, todo) =>
  [body.trim(), board.todoLine ? todo.map(board.todoLine).join('\n') : '', keyLine(key)].filter(Boolean).join('\n\n')

// La card come la manda sync: il titolo senza la key, il testo senza la riga dello step e le cose
// da fare, che la board legge dal suo campo o, su GitHub, dalle righe con la casella subito prima
// della riga dello step. Il testo che una persona ha scritto dopo quella riga resta nel testo.
// È il contrario di titleFor e cardBody: rimandata a sync, una card scritta dallo script resta com'è.
const cardParts = (board, card, key) => {
  let { title } = card
  if (key && title === key) title = ''
  else if (key && title.startsWith(`${key}:`)) title = title.slice(key.length + 1).trim()
  const lines = card.body.replace(/\r\n/g, '\n').split('\n')
  const line = key ? keyLine(key) : null
  const at = line ? lines.findLastIndex((candidate) => sameName(candidate, line)) : -1
  const before = at === -1 ? lines : lines.slice(0, at)
  const after = at === -1 ? '' : lines.slice(at + 1).join('\n').trim()
  const { body, todo } = board.splitTodo(card, before.join('\n'))
  return { title, body: [body, after].filter(Boolean).join('\n\n'), todo }
}

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
  for (const name of ['priority', 'assignee', 'type', 'milestone']) {
    if (config[name] !== undefined && typeof config[name] !== 'string') {
      notUpdated(`in ${configFile} "${name}" va il nome di un attributo o di un campo`)
    }
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

// Lo stato di una colonna, il contrario di findColumn: quello che columns le dà (non archive), o il
// nome della colonna.
const stateOf = (config, column) =>
  Object.keys(config.columns).find((state) => !sameName(state, archiveStatus) && sameName(config.columns[state], column)) ?? column

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

const findCard = (cards, key) => {
  const line = keyLine(key)
  return (
    cards.find((card) => card.body.split('\n').some((candidate) => sameName(candidate, line))) ??
    // Le card scritte prima del 23/11/2026 hanno la key nel titolo ("M5 step 3: …"): la prima sync
    // con il testo le porta al titolo nuovo. Il ":" separa "M5 step 1" da "M5 step 10".
    cards.find((card) => card.keyInTitle !== false && (card.title === key || card.title.startsWith(`${key}:`)))
  )
}

// Il piano della key, che di base è anche la milestone: "M5 step 3" è del piano M5.
const planOf = (key) => key.match(/^(.+) (?:step|domanda) \S+$/i)?.[1]

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
  const isTodo = (todo) =>
    todo === undefined ||
    (Array.isArray(todo) &&
      todo.every((item) => typeof item?.text === 'string' && item.text.trim() && [undefined, true, false].includes(item.done)))
  const usage = 'sync vuole un array JSON di { key, title, body, todo, status, priority, type, assignee, milestone }, ognuno con la sua key'
  const hasKeys = Array.isArray(entries) && entries.every((entry) => typeof entry?.key === 'string' && entry.key.trim())
  if (!hasKeys || !entries.every((entry) => isTodo(entry.todo))) finish(`${usage}; todo è un array di { text, done }`)
  const isText = (value) => value === undefined || (typeof value === 'string' && value.trim())
  if (!entries.every((entry) => ['type', 'assignee', 'milestone'].every((name) => isText(entry[name])))) {
    finish(`${usage}; type, assignee e milestone sono testi`)
  }
  return entries
}

const sync = async (source) => {
  const entries = readEntries(source)
  const context = await openBoard()
  const { board } = context
  const cards = await board.loadCards()
  const counts = { created: 0, changed: 0, aligned: 0, missing: 0 }
  if (board.fieldProblems.length) say(`campi non scritti: ${board.fieldProblems.join('; ')}`)
  if (board.todoProblem && entries.some((entry) => entry.todo?.length)) say(board.todoProblem)
  for (const entry of entries) {
    const key = entry.key.trim()
    let card = findCard(cards, key)
    const hasText = ['title', 'body', 'todo'].some((field) => entry[field] !== undefined)
    const changes = []
    let recoveredStatus = null
    // Una card che non è sulla board ma c'è ancora (GitHub: archiviata o tolta dal Project) torna.
    if (!card && hasText && board.recoverCard) {
      const recovered = await board.recoverCard(keyLine(key))
      if (recovered) {
        ;({ card } = recovered)
        recoveredStatus = recovered.status
        cards.push(card)
        changes.push(...recovered.changes)
      }
    }
    // Una card nuova vuole il titolo: senza, sulla board si leggerebbe solo la key.
    if (!card && !entry.title?.trim()) {
      counts.missing += 1
      say(`manca la card di "${key}": rimanda lo step con title, body e todo`)
      continue
    }
    // Quello che sync non riceve tra title, body e todo resta com'è sulla card.
    const current = card ? cardParts(board, card, key) : { title: '', body: '', todo: [] }
    // Una voce su una riga sola: su GitHub un a capo la spezzerebbe fuori dalla lista.
    const todo = entry.todo
      ? entry.todo.map((item) => ({ text: item.text.replace(/\s*\n\s*/g, ' ').trim(), done: item.done === true }))
      : current.todo
    const text = hasText
      ? { title: titleFor(board, key, entry.title ?? current.title), body: cardBody(board, key, entry.body ?? current.body, todo), todo }
      : null
    // Una card ritrovata senza colonna va dove dice chi l'ha ritrovata o dove va una nuova.
    const wantedStatus = entry.status ?? (card?.column || (card && !changes.length) ? null : (recoveredStatus ?? newCardStatus))
    const { column, label, problem } = wantedStatus ? findColumn(context, wantedStatus) : {}
    const properties = {
      priority: entry.priority,
      type: entry.type?.trim(),
      assignee: entry.assignee?.trim(),
      milestone: entry.milestone?.trim() ?? planOf(key),
    }
    if (!card) {
      const { card: created, notes } = await board.createCard({ ...text, column, ...properties })
      cards.push(created)
      counts.created += 1
      const details = [...notes, ...(problem ? [problem] : [])]
      say(`creata "${text.title}"${column ? ` in ${label}` : ''}${details.length ? ` (${details.join(', ')})` : ''}`)
      continue
    }
    if (board.prepareCard) changes.push(...(await board.prepareCard(card)))
    // Si scrive solo quello che sync ha ricevuto ed è cambiato: su Infinity riscrivere il testo
    // toglierebbe link e formattazione. Su GitHub le cose da fare stanno nel testo.
    const sent = (field) => entry[field] !== undefined
    const titleChanged = sent('title') && text.title !== card.title
    const bodyChanged = (sent('body') || (board.todoLine && sent('todo'))) && !sameText(board.storedBody(text.body), card.body)
    const todoChanged = sent('todo') && board.todoChanged(card, todo)
    if (titleChanged || bodyChanged || todoChanged) {
      await board.editCard(card, {
        ...(titleChanged ? { title: text.title } : {}),
        ...(bodyChanged ? { body: text.body } : {}),
        ...(todoChanged ? { todo } : {}),
      })
    }
    if (titleChanged || bodyChanged) changes.push('testo aggiornato')
    if (todoChanged) changes.push('cose da fare aggiornate')
    // La board che lega altro alla colonna (GitHub: la issue chiusa in Done) lo allinea sempre; la
    // riga lo dice solo quando la colonna era già quella.
    if (column && !sameName(card.column ?? '', column)) {
      await board.moveCard(card, column)
      await board.settleCard?.(card, column)
      changes.push(`ora in ${label}`)
    } else if (column) {
      changes.push(...((await board.settleCard?.(card, column)) ?? []))
    }
    changes.push(...(await board.completeCard(card, properties)))
    if (problem) changes.push(problem)
    if (changes.length) {
      counts.changed += 1
      say(`"${text?.title ?? card.title}": ${changes.join(', ')}`)
    } else {
      counts.aligned += 1
    }
  }
  const missing = counts.missing ? `, ${counts.missing} mancanti` : ''
  say(`${entries.length} card: ${counts.created} create, ${counts.changed} cambiate, ${counts.aligned} già allineate${missing}`)
}

// Le card della board in JSON, come le vuole sync: tutte, quelle di un piano o quella di una key.
const show = async (filter) => {
  const { config, board } = await openBoard()
  const wanted = filter?.trim()
  const archiveColumn = config.columns[configuredState(config, archiveStatus) ?? '']
  const rows = []
  for (const card of await board.loadCards()) {
    const key = keyOf(card)
    if (wanted && !(key && (sameName(key, wanted) || sameName(planOf(key) ?? '', wanted)))) continue
    const status = card.column ? stateOf(config, card.column) : null
    // Una card nella colonna di archive tutta sua è archiviata: show non la dà, come GitHub non dà
    // quelle che archivia. Rimandata a sync con quello stato, riaprirebbe la issue.
    const isArchived = archiveColumn && status && sameName(card.column, archiveColumn) && !skillStates.some((state) => sameName(state, status))
    if (isArchived) continue
    rows.push({ ...(key ? { key } : {}), ...cardParts(board, card, key), ...(status ? { status } : {}) })
  }
  if (!rows.length) finish(wanted ? `nessuna card per "${wanted}"` : 'la board non ha card')
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`)
}

const move = async (key, status) => {
  if (!key?.trim() || !status?.trim()) finish('move vuole la key e lo stato: move "M5 step 3" "In progress"')
  const context = await openBoard()
  const { column, label, problem } = findColumn(context, status)
  if (problem) notUpdated(problem)
  const card = findCard(await context.board.loadCards(), key.trim())
  if (!card) finish(`manca la card di "${key.trim()}": creala con sync, poi ripeti move`)
  // Una board che lega altro alla colonna (GitHub: la issue chiusa in Done) lo allinea anche qui.
  const settle = async () => (await context.board.settleCard?.(card, column)) ?? []
  if (sameName(card.column ?? '', column)) {
    const settled = await settle()
    finish(`"${card.title}" è già in ${label}${settled.length ? `: ${settled.join(', ')}` : ''}`)
  }
  await context.board.moveCard(card, column)
  await settle()
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
  const settle = async () => (await board.settleCard?.(card, column, { archive: true })) ?? []
  if (sameName(card.column ?? '', column)) {
    const settled = await settle()
    finish(`archiviata "${card.title}": era già in ${column}${settled.length ? `, ${settled.join(', ')}` : ''}`)
  }
  await board.moveCard(card, column)
  await settle()
  say(`archiviata "${card.title}": ora è in ${column}`)
}

const closeMilestone = async (plan) => {
  if (!plan?.trim()) finish('close-milestone vuole il nome del piano: close-milestone M5')
  const { board } = await openBoard()
  say(await board.closeMilestone(plan.trim()))
}

const [command, ...args] = process.argv.slice(2)
const commands = {
  check: () => check(),
  show: () => show(args[0]),
  sync: () => sync(args[0]),
  move: () => move(args[0], args[1]),
  archive: () => archive(args[0]),
  'close-milestone': () => closeMilestone(args[0]),
}

try {
  if (!commands[command]) finish(`comando sconosciuto "${command ?? ''}": check, show, sync, move, archive o close-milestone`)
  await commands[command]()
} catch (error) {
  // Anche un errore dello script diventa una riga: la board non ferma mai il lavoro.
  say(error instanceof BoardExit ? error.message : `non aggiornata: errore dello script (${String(error?.message).slice(0, 160)})`)
}
