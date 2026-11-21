#!/usr/bin/env node
// La board del GitHub Project collegato al repo, tenuta allineata al piano (skill dido-board).
// Non ferma mai il lavoro: esce sempre con 0 e risponde con righe che cominciano con "board:".
//
//   node board.mjs check                          a quale Project è collegato il repo, con gli stati
//   node board.mjs sync - <<'EOF' … EOF           crea o aggiorna le card (anche: sync <file>)
//   node board.mjs move "M5 step 3" "In progress"
//   node board.mjs archive "M5 step 3"
//
// sync legge un array JSON di { key, title, body, status }. La key ("M5 step 3") trova la card,
// il cui titolo è "<key>: <title>". Senza status una card nuova va in Backlog e una che c'è resta
// dov'è; senza title o body una card che c'è tiene i suoi, e una che manca non si crea.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Le prove fingono gh con DIDO_BOARD_GH e accorciano l'attesa con DIDO_BOARD_TIMEOUT_MS.
const ghCommand = process.env.DIDO_BOARD_GH || 'gh'
const timeoutMs = Number(process.env.DIDO_BOARD_TIMEOUT_MS) || 20000
const newCardStatus = 'Backlog'
const maxItemPages = 20

// Un'uscita anticipata porta la riga da scrivere; il processo poi finisce da solo, con 0.
// Niente process.exit: su macOS stdout verso una pipe è asincrono e la riga andrebbe persa.
class BoardExit extends Error {}
const finish = (text) => {
  throw new BoardExit(text)
}
const notUpdated = (reason) => finish(`non aggiornata: ${reason}`)
const say = (text) => process.stdout.write(`board: ${text}\n`)

const sameName = (first, second) => first.trim().toLowerCase() === second.trim().toLowerCase()
const sameText = (first, second) => first.replace(/\r\n/g, '\n').trim() === second.replace(/\r\n/g, '\n').trim()
const titleFor = (key, title) => (title?.trim() ? `${key}: ${title.trim()}` : key)

const describeFailure = (error) => {
  if (error.code === 'ENOENT') return 'gh non è installato'
  if (error.code === 'ETIMEDOUT') return `GitHub non ha risposto in ${timeoutMs / 1000} secondi`
  const output = `${error.stderr ?? ''}\n${error.stdout ?? ''}`
  if (/required scopes|INSUFFICIENT_SCOPES/i.test(output)) return 'a gh manca lo scope project: gh auth refresh -s project'
  if (error.status === 4 || /gh auth login/.test(output)) return 'gh non è autenticato: gh auth login'
  if (/rate limit/i.test(output)) return 'GitHub chiede di rallentare: riprova tra qualche minuto, sync riparte da dove era'
  const firstLine = String(error.stderr ?? '').split('\n').find((line) => line.trim()) ?? error.message
  return firstLine.replace(/^gh: /, '').slice(0, 160)
}

const graphql = (query, variables) => {
  let output
  try {
    output = execFileSync(ghCommand, ['api', 'graphql', '--input', '-'], {
      input: JSON.stringify({ query, variables }),
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (error) {
    notUpdated(describeFailure(error))
  }
  let response
  try {
    response = JSON.parse(output)
  } catch {
    notUpdated('GitHub ha risposto con qualcosa che non è JSON')
  }
  if (response.errors?.length) notUpdated(String(response.errors[0].message).slice(0, 160))
  return response.data
}

const originRepository = () => {
  let url = ''
  try {
    url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    finish("nessun Project collegato: qui non c'è un repo git con il remote origin")
  }
  const match = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
  if (!match) finish(`nessun Project collegato: origin non è su GitHub (${url})`)
  return { owner: match[1], name: match[2] }
}

const contextQuery = `query BoardContext($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    projectsV2(first: 10) {
      nodes {
        id
        title
        url
        closed
        field(name: "Status") {
          ... on ProjectV2SingleSelectField { id options { id name } }
        }
      }
    }
  }
}`

const loadBoard = () => {
  const repository = originRepository()
  const data = graphql(contextQuery, repository)
  const projects = (data.repository?.projectsV2?.nodes ?? []).filter((project) => project && !project.closed)
  if (!projects.length) finish(`nessun Project collegato a ${repository.owner}/${repository.name}`)
  const [project, ...others] = projects
  // Status è il campo degli stati di ogni Project nuovo; se manca, le card restano senza stato.
  return { project, others, statusField: project.field?.options ? project.field : null }
}

const findOption = (board, statusName) => {
  if (!board.statusField) return { problem: 'il Project non ha il campo Status' }
  const option = board.statusField.options.find((candidate) => sameName(candidate.name, statusName))
  if (option) return { option }
  const names = board.statusField.options.map((candidate) => candidate.name).join(', ')
  return { problem: `lo stato "${statusName}" non c'è nel Project (ci sono: ${names})` }
}

const itemsQuery = `query BoardItems($project: ID!, $after: String) {
  node(id: $project) {
    ... on ProjectV2 {
      items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isArchived
          content { __typename ... on DraftIssue { id title body } }
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
        }
      }
    }
  }
}`

const loadCards = (board) => {
  const cards = []
  let after = null
  for (let page = 0; page < maxItemPages; page += 1) {
    const { items } = graphql(itemsQuery, { project: board.project.id, after }).node
    for (const item of items.nodes) {
      // Solo le card bozza ancora sulla board: issue, PR e card archiviate non sono della skill.
      if (item.isArchived || item.content?.__typename !== 'DraftIssue') continue
      cards.push({
        itemId: item.id,
        draftId: item.content.id,
        title: item.content.title,
        body: item.content.body ?? '',
        status: item.fieldValueByName?.name ?? null,
      })
    }
    if (!items.pageInfo.hasNextPage) break
    after = items.pageInfo.endCursor
  }
  return cards
}

// Il ":" dopo la key separa "M5 step 1" da "M5 step 10".
const findCard = (cards, key) => cards.find((card) => card.title === key || card.title.startsWith(`${key}:`))

const addDraftMutation = `mutation BoardAddDraft($project: ID!, $title: String!, $body: String) {
  addProjectV2DraftIssue(input: { projectId: $project, title: $title, body: $body }) {
    projectItem { id content { ... on DraftIssue { id } } }
  }
}`

const editDraftMutation = `mutation BoardEditDraft($draft: ID!, $title: String!, $body: String) {
  updateProjectV2DraftIssue(input: { draftIssueId: $draft, title: $title, body: $body }) {
    draftIssue { id }
  }
}`

const setStatusMutation = `mutation BoardSetStatus($project: ID!, $item: ID!, $field: ID!, $option: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option }
  }) {
    projectV2Item { id }
  }
}`

const archiveMutation = `mutation BoardArchive($project: ID!, $item: ID!) {
  archiveProjectV2Item(input: { projectId: $project, itemId: $item }) { item { id } }
}`

const setStatus = (board, card, option) => {
  graphql(setStatusMutation, {
    project: board.project.id,
    item: card.itemId,
    field: board.statusField.id,
    option: option.id,
  })
  card.status = option.name
}

const check = () => {
  const board = loadBoard()
  const statuses = board.statusField
    ? board.statusField.options.map((option) => option.name).join(', ')
    : 'nessun campo Status'
  const others = board.others.length
    ? `; collegati anche ${board.others.map((project) => `"${project.title}"`).join(', ')}, che la skill non usa`
    : ''
  say(`collegato a "${board.project.title}" (${board.project.url}), stati: ${statuses}${others}`)
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

const sync = (source) => {
  const entries = readEntries(source)
  const board = loadBoard()
  const cards = loadCards(board)
  const counts = { created: 0, changed: 0, aligned: 0, missing: 0 }
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
    const { option, problem } = wantedStatus ? findOption(board, wantedStatus) : {}
    if (!card) {
      const title = titleFor(key, entry.title)
      const body = entry.body ?? ''
      const { projectItem } = graphql(addDraftMutation, { project: board.project.id, title, body }).addProjectV2DraftIssue
      const created = { itemId: projectItem.id, draftId: projectItem.content?.id, title, body, status: null }
      cards.push(created)
      if (option) setStatus(board, created, option)
      counts.created += 1
      say(`creata "${title}"${option ? ` in ${option.name}` : ''}${problem ? ` (${problem})` : ''}`)
      continue
    }
    const title = entry.title === undefined ? card.title : titleFor(key, entry.title)
    const body = entry.body === undefined ? card.body : entry.body
    const changes = []
    if (title !== card.title || !sameText(body, card.body)) {
      graphql(editDraftMutation, { draft: card.draftId, title, body })
      Object.assign(card, { title, body })
      changes.push('testo aggiornato')
    }
    if (option && !sameName(card.status ?? '', option.name)) {
      setStatus(board, card, option)
      changes.push(`ora in ${option.name}`)
    }
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

const move = (key, statusName) => {
  if (!key?.trim() || !statusName?.trim()) finish('move vuole la key e lo stato: move "M5 step 3" "In progress"')
  const board = loadBoard()
  const { option, problem } = findOption(board, statusName)
  if (problem) notUpdated(problem)
  const card = findCard(loadCards(board), key.trim())
  if (!card) finish(`manca la card di "${key.trim()}": creala con sync, poi ripeti move`)
  if (sameName(card.status ?? '', option.name)) finish(`"${card.title}" è già in ${option.name}`)
  setStatus(board, card, option)
  say(`"${card.title}" ora è in ${option.name}`)
}

const archive = (key) => {
  if (!key?.trim()) finish('archive vuole la key: archive "M5 step 3"')
  const board = loadBoard()
  const card = findCard(loadCards(board), key.trim())
  if (!card) finish(`nessuna card per "${key.trim()}", niente da archiviare`)
  graphql(archiveMutation, { project: board.project.id, item: card.itemId })
  say(`archiviata "${card.title}"`)
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
  commands[command]()
} catch (error) {
  // Anche un errore dello script diventa una riga: la board non ferma mai il lavoro.
  say(error instanceof BoardExit ? error.message : `non aggiornata: errore dello script (${String(error?.message).slice(0, 160)})`)
}
