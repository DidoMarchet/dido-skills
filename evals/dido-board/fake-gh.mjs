#!/usr/bin/env node
// Un gh finto per le prove di dido-board: risponde alle chiamate GraphQL di board.mjs con un
// Project tenuto in un file, e scrive ogni chiamata in un log. Così prove e scenari non toccano
// GitHub e possono contare cosa è stato chiamato.
//
// FAKE_GH_STATE  il file JSON del Project: i campi che ha valgono sopra quelli di initialState
// FAKE_GH_LOG    il log JSONL delle chiamate (facoltativo)
// FAKE_GH_MODE   ok (di base), auth, scope, slow: come risponde gh
//
// Ogni comando che non è "gh api graphql --input -" finisce nel log e fallisce: negli scenari
// dice se l'agente ha usato gh da solo invece dello script.

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const statePath = process.env.FAKE_GH_STATE
const logPath = process.env.FAKE_GH_LOG
const mode = process.env.FAKE_GH_MODE || 'ok'
const args = process.argv.slice(2)

const initialState = () => ({
  linked: true,
  project: { id: 'PVT_1', title: 'Writing App', url: 'https://github.com/users/acme/projects/1' },
  statusField: {
    id: 'PVTSSF_1',
    options: ['Backlog', 'Ready', 'In progress', 'In review', 'Done'].map((name, index) => ({ id: `OPT_${index}`, name })),
  },
  items: [],
  nextId: 1,
})

const log = (entry) => {
  if (logPath) appendFileSync(logPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`)
}

const fail = (message, code = 1) => {
  process.stderr.write(`${message}\n`)
  process.exit(code)
}

const isGraphql = args[0] === 'api' && args[1] === 'graphql' && args.includes('--input')
if (!isGraphql) {
  log({ args, simulated: false })
  fail(`fake gh: comando non simulato: gh ${args.join(' ')}`)
}

const request = JSON.parse(readFileSync(0, 'utf8'))
const operation = request.query.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] ?? 'anonima'
log({ args, operation, variables: request.variables })

if (mode === 'auth') fail('To get started with GitHub CLI, please run:  gh auth login', 4)
if (mode === 'scope') {
  fail("gh: Your token has not been granted the required scopes to execute this query. The 'projectsV2' field requires one of the following scopes: ['read:project']")
}
if (mode === 'slow') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000)

const saved = statePath && existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {}
const state = { ...initialState(), ...saved }
const save = () => statePath && writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
const variables = request.variables ?? {}
const findItem = (match) => state.items.find(match) ?? fail(`fake gh: elemento non trovato (${JSON.stringify(variables)})`)

const answers = {
  BoardContext: () => ({
    repository: {
      projectsV2: {
        nodes: state.linked
          ? [{ ...state.project, closed: false, field: state.statusField }, ...(state.otherProjects ?? [])]
          : [],
      },
    },
  }),
  BoardItems: () => {
    const start = variables.after ? Number(variables.after) : 0
    const page = state.items.slice(start, start + 100)
    return {
      node: {
        items: {
          pageInfo: { hasNextPage: start + 100 < state.items.length, endCursor: String(start + 100) },
          nodes: page.map((item) => ({
            id: item.id,
            isArchived: Boolean(item.archived),
            content: item.type === 'Issue'
              ? { __typename: 'Issue' }
              : { __typename: 'DraftIssue', id: item.draftId, title: item.title, body: item.body },
            fieldValueByName: item.status ? { name: item.status } : null,
          })),
        },
      },
    }
  },
  BoardAddDraft: () => {
    const number = state.nextId++
    const item = { id: `PVTI_${number}`, draftId: `DI_${number}`, title: variables.title, body: variables.body ?? '', status: null }
    state.items.push(item)
    save()
    return { addProjectV2DraftIssue: { projectItem: { id: item.id, content: { id: item.draftId } } } }
  },
  BoardEditDraft: () => {
    const item = findItem((candidate) => candidate.draftId === variables.draft)
    Object.assign(item, { title: variables.title, body: variables.body ?? '' })
    save()
    return { updateProjectV2DraftIssue: { draftIssue: { id: item.draftId } } }
  },
  BoardSetStatus: () => {
    const item = findItem((candidate) => candidate.id === variables.item)
    const option = state.statusField.options.find((candidate) => candidate.id === variables.option)
    if (!option) fail(`fake gh: opzione sconosciuta ${variables.option}`)
    item.status = option.name
    save()
    return { updateProjectV2ItemFieldValue: { projectV2Item: { id: item.id } } }
  },
  BoardArchive: () => {
    const item = findItem((candidate) => candidate.id === variables.item)
    item.archived = true
    save()
    return { archiveProjectV2Item: { item: { id: item.id } } }
  },
}

if (!answers[operation]) fail(`fake gh: operazione GraphQL sconosciuta ${operation}`)
process.stdout.write(JSON.stringify({ data: answers[operation]() }))
