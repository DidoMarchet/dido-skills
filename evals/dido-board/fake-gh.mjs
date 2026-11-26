#!/usr/bin/env node
// Un gh finto per le prove di dido-board: risponde alle chiamate GraphQL di board.mjs con un repo e
// il suo Project tenuti in un file, e scrive ogni chiamata in un log. Così prove e scenari non
// toccano GitHub e possono contare cosa è stato chiamato.
//
// FAKE_GH_STATE  il file JSON di repo e Project: i campi che ha valgono sopra quelli di initialState
// FAKE_GH_LOG    il log JSONL delle chiamate (facoltativo)
// FAKE_GH_MODE   ok (di base), auth, scope, slow: come risponde gh
//
// Ogni card del Project è un elemento di items, con dentro la sua bozza o la sua issue:
//   { id, kind: "DraftIssue" | "Issue" | "PullRequest", contentId, title, body, status, archived,
//     inProject, number, state, stateReason, assignees: [login], labels: [nome], milestone: titolo,
//     type: nome, fields: { "<campo del Project>": valore } }
// Una issue creata e non ancora aggiunta al Project ha inProject false. Come su GitHub, la lista del
// Project non dà le card archiviate: una card archiviata torna con unarchiveProjectV2Item, con i
// suoi campi; una issue tolta dal Project torna con addProjectV2ItemById, senza campi.
//
// Oltre a "gh api graphql --input -" simula solo le chiamate REST delle milestone, che GraphQL non
// crea né chiude. Ogni altro comando finisce nel log e fallisce: negli scenari dice se l'agente ha
// usato gh da solo invece dello script.

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const statePath = process.env.FAKE_GH_STATE
const logPath = process.env.FAKE_GH_LOG
const mode = process.env.FAKE_GH_MODE || 'ok'
const args = process.argv.slice(2)

const statusOptions = ['Backlog', 'Ready', 'In progress', 'In review', 'Done']

const initialState = () => ({
  linked: true,
  repository: { id: 'R_1', owner: 'acme', name: 'notes-app' },
  issueTypes: ['Task', 'Bug', 'Feature'].map((name, index) => ({ id: `IT_${index}`, name })),
  labels: [{ id: 'LA_bug', name: 'bug' }],
  milestones: [],
  // Chi si può assegnare nel repo.
  users: [{ id: 'U_dido', login: 'dido' }, { id: 'U_lorenzo', login: 'lorenzo' }],
  project: { id: 'PVT_1', title: 'Writing App', url: 'https://github.com/users/acme/projects/1' },
  fields: [
    { id: 'PVTSSF_1', name: 'Status', dataType: 'SINGLE_SELECT', options: statusOptions.map((name, index) => ({ id: `OPT_${index}`, name })) },
    { id: 'PVTF_title', name: 'Title', dataType: 'TITLE' },
  ],
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

const saved = statePath && existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {}
const state = { ...initialState(), ...saved }
const save = () => statePath && writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
const nextId = () => state.nextId++

const checkMode = () => {
  if (mode === 'auth') fail('To get started with GitHub CLI, please run:  gh auth login', 4)
  if (mode === 'scope') {
    fail("gh: Your token has not been granted the required scopes to execute this query. The 'projectsV2' field requires one of the following scopes: ['read:project']")
  }
  if (mode === 'slow') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000)
}

// REST: POST repos/<owner>/<repo>/milestones (-f title=…) e PATCH …/milestones/<numero> (-f state=closed).
const milestonePath = `repos/${state.repository.owner}/${state.repository.name}/milestones`
const restMilestone = args[0] === 'api' && args[1]?.startsWith(milestonePath)
if (restMilestone) {
  log({ args, operation: 'RestMilestone', simulated: true })
  checkMode()
  const fieldValue = (name) => args.find((arg, index) => args[index - 1] === '-f' && arg.startsWith(`${name}=`))?.slice(name.length + 1)
  const method = args[args.indexOf('-X') + 1] ?? args[args.indexOf('--method') + 1]
  if (args[1] === milestonePath && method === 'POST') {
    const number = state.milestones.length + 1
    const milestone = { id: `MI_${number}`, number, title: fieldValue('title'), state: 'OPEN' }
    state.milestones.push(milestone)
    save()
    process.stdout.write(JSON.stringify({ node_id: milestone.id, number, title: milestone.title, state: 'open' }))
    process.exit(0)
  }
  const number = Number(args[1].slice(milestonePath.length + 1))
  const milestone = state.milestones.find((candidate) => candidate.number === number)
  if (method === 'PATCH' && milestone) {
    milestone.state = fieldValue('state') === 'closed' ? 'CLOSED' : 'OPEN'
    save()
    process.stdout.write(JSON.stringify({ node_id: milestone.id, number, state: milestone.state.toLowerCase() }))
    process.exit(0)
  }
  fail(`fake gh: chiamata alle milestone non simulata: gh ${args.join(' ')}`)
}

const isGraphql = args[0] === 'api' && args[1] === 'graphql' && args.includes('--input')
if (!isGraphql) {
  log({ args, simulated: false })
  fail(`fake gh: comando non simulato: gh ${args.join(' ')}`)
}

const request = JSON.parse(readFileSync(0, 'utf8'))
const operation = request.query.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] ?? 'anonima'
log({ args, operation, variables: request.variables })
checkMode()

const variables = request.variables ?? {}
const findItem = (match) => state.items.find(match) ?? fail(`fake gh: elemento non trovato (${JSON.stringify(variables)})`)
// Una risposta di GitHub con un errore al posto dei dati.
const refused = (message) => ({ refused: message })
const issueById = (id) => findItem((item) => item.kind === 'Issue' && item.contentId === id)
const userById = (id) => state.users.find((user) => user.id === id) ?? fail(`fake gh: utente sconosciuto ${id}`)
const milestoneById = (id) => state.milestones.find((milestone) => milestone.id === id) ?? fail(`fake gh: milestone sconosciuta ${id}`)
const labelById = (id) => state.labels.find((label) => label.id === id) ?? fail(`fake gh: label sconosciuta ${id}`)
const typeById = (id) => state.issueTypes.find((type) => type.id === id) ?? fail(`fake gh: tipo sconosciuto ${id}`)

const issueContent = (item) => ({
  __typename: 'Issue',
  id: item.contentId,
  number: item.number,
  title: item.title,
  body: item.body,
  state: item.state,
  stateReason: item.stateReason ?? null,
  repository: { nameWithOwner: `${state.repository.owner}/${state.repository.name}` },
  assignees: { nodes: item.assignees.map((login) => ({ login })) },
  labels: { nodes: item.labels.map((name) => ({ name })) },
  milestone: item.milestone ? { title: item.milestone } : null,
  issueType: item.type ? { name: item.type } : null,
})

const fieldValues = (item) => [
  ...(item.status ? [{ __typename: 'ProjectV2ItemFieldSingleSelectValue', name: item.status, field: { name: 'Status' } }] : []),
  ...Object.entries(item.fields ?? {}).map(([name, value]) => {
    const field = state.fields.find((candidate) => candidate.name === name)
    return field.dataType === 'TEXT'
      ? { __typename: 'ProjectV2ItemFieldTextValue', text: value, field: { name } }
      : { __typename: 'ProjectV2ItemFieldSingleSelectValue', name: value, field: { name } }
  }),
]

const answers = {
  BoardContext: () => ({
    repository: {
      id: state.repository.id,
      issueTypes: { nodes: state.issueTypes },
      labels: { nodes: state.labels },
      milestones: { nodes: state.milestones },
      projectsV2: {
        nodes: state.linked
          ? [{ ...state.project, closed: false, fields: { nodes: state.fields } }, ...(state.otherProjects ?? [])]
          : [],
      },
    },
  }),
  BoardItems: () => {
    const visible = state.items.filter((item) => item.inProject !== false && !item.archived)
    const start = variables.after ? Number(variables.after) : 0
    const page = visible.slice(start, start + 100)
    return {
      node: {
        items: {
          pageInfo: { hasNextPage: start + 100 < visible.length, endCursor: String(start + 100) },
          nodes: page.map((item) => ({
            id: item.id,
            isArchived: false,
            content: item.kind === 'Issue'
              ? issueContent(item)
              : item.kind === 'DraftIssue'
                ? { __typename: 'DraftIssue', id: item.contentId, title: item.title, body: item.body }
                : { __typename: item.kind },
            fieldValues: { nodes: fieldValues(item) },
          })),
        },
      },
    }
  },
  BoardAssignable: () => ({
    repository: {
      assignableUsers: { nodes: state.users.filter((user) => user.login.toLowerCase().includes(variables.login.toLowerCase())) },
    },
  }),
  BoardCreateIssue: () => {
    const number = nextId()
    const item = {
      id: `PVTI_${number}`,
      kind: 'Issue',
      contentId: `I_${number}`,
      number,
      title: variables.title,
      body: variables.body ?? '',
      status: null,
      state: 'OPEN',
      stateReason: null,
      inProject: false,
      assignees: (variables.assignees ?? []).map((id) => userById(id).login),
      labels: (variables.labels ?? []).map((id) => labelById(id).name),
      milestone: variables.milestone ? milestoneById(variables.milestone).title : null,
      type: variables.type ? typeById(variables.type).name : null,
      fields: {},
    }
    state.items.push(item)
    save()
    return { createIssue: { issue: { id: item.contentId, number } } }
  },
  BoardAddItem: () => {
    const item = issueById(variables.content)
    if (item.archived) fail('fake gh: la issue ha già una card archiviata: va tolta dall\'archivio')
    if (item.inProject === false) Object.assign(item, { status: null, fields: {} })
    item.inProject = true
    save()
    return { addProjectV2ItemById: { item: { id: item.id } } }
  },
  BoardEditIssue: () => {
    const item = issueById(variables.issue)
    Object.assign(item, { title: variables.title, body: variables.body ?? '' })
    save()
    return { updateIssue: { issue: { id: item.contentId } } }
  },
  BoardSetAssignees: () => {
    const item = issueById(variables.issue)
    item.assignees = variables.assignees.map((id) => userById(id).login)
    save()
    return { updateIssue: { issue: { id: item.contentId } } }
  },
  BoardSetMilestone: () => {
    const item = issueById(variables.issue)
    item.milestone = milestoneById(variables.milestone).title
    save()
    return { updateIssue: { issue: { id: item.contentId } } }
  },
  BoardSetType: () => {
    const item = issueById(variables.issue)
    item.type = typeById(variables.type).name
    save()
    return { updateIssueIssueType: { issue: { id: item.contentId } } }
  },
  BoardCreateLabel: () => {
    const label = { id: `LA_${nextId()}`, name: variables.name }
    state.labels.push(label)
    save()
    return { createLabel: { label } }
  },
  BoardAddLabels: () => {
    const item = issueById(variables.issue)
    item.labels = [...new Set([...item.labels, ...variables.labels.map((id) => labelById(id).name)])]
    save()
    return { addLabelsToLabelable: { clientMutationId: null } }
  },
  BoardCloseIssue: () => {
    const item = issueById(variables.issue)
    // La chiusura dell'automazione "Auto-close issue" è ancora in corso: GitHub rifiuta la seconda.
    if (item.closingByWorkflow) {
      delete item.closingByWorkflow
      save()
      return refused('Could not close the issue.')
    }
    Object.assign(item, { state: 'CLOSED', stateReason: variables.reason })
    save()
    return { closeIssue: { issue: { id: item.contentId } } }
  },
  BoardReopenIssue: () => {
    const item = issueById(variables.issue)
    Object.assign(item, { state: 'OPEN', stateReason: 'REOPENED' })
    save()
    return { reopenIssue: { issue: { id: item.contentId } } }
  },
  BoardConvertDraft: () => {
    const item = findItem((candidate) => candidate.id === variables.item && candidate.kind === 'DraftIssue')
    if (variables.repository !== state.repository.id) fail(`fake gh: repo sconosciuto ${variables.repository}`)
    const number = nextId()
    Object.assign(item, {
      kind: 'Issue', contentId: `I_${number}`, number, state: 'OPEN', stateReason: null,
      assignees: [], labels: [], milestone: null, type: null, fields: item.fields ?? {},
    })
    save()
    return { convertProjectV2DraftIssueItemToIssue: { item: { id: item.id, content: { id: item.contentId, number } } } }
  },
  BoardEditDraft: () => {
    const item = findItem((candidate) => candidate.contentId === variables.draft)
    Object.assign(item, { title: variables.title, body: variables.body ?? '' })
    save()
    return { updateProjectV2DraftIssue: { draftIssue: { id: item.contentId } } }
  },
  // I campi in una chiamata: f0/v0, f1/v1… come gli alias della mutation.
  BoardSetFields: () => {
    const item = findItem((candidate) => candidate.id === variables.item)
    for (let index = 0; variables[`f${index}`] !== undefined; index += 1) {
      const field = state.fields.find((candidate) => candidate.id === variables[`f${index}`]) ?? fail(`fake gh: campo sconosciuto ${variables[`f${index}`]}`)
      const value = variables[`v${index}`]
      const shown = value.text ?? field.options?.find((option) => option.id === value.singleSelectOptionId)?.name
      if (shown === undefined) fail(`fake gh: valore sconosciuto ${JSON.stringify(value)}`)
      if (field.name === 'Status') {
        item.status = shown
        // Con state.autoClose il Project ha "Auto-close issue": in Done GitHub chiude la issue da solo.
        if (state.autoClose && shown === 'Done' && item.kind === 'Issue' && item.state === 'OPEN') {
          Object.assign(item, { state: 'CLOSED', stateReason: 'COMPLETED', closingByWorkflow: true })
        }
      }
      else item.fields = { ...item.fields, [field.name]: shown }
    }
    save()
    return {}
  },
  BoardUnarchive: () => {
    const item = findItem((candidate) => candidate.id === variables.item && candidate.archived)
    item.archived = false
    save()
    return { unarchiveProjectV2Item: { item: { id: item.id } } }
  },
  BoardItem: () => ({ node: { fieldValues: { nodes: fieldValues(findItem((candidate) => candidate.id === variables.item)) } } }),
  BoardRepoIssues: () => {
    const issues = state.items.filter((item) => item.kind === 'Issue')
    const start = variables.after ? Number(variables.after) : 0
    return {
      repository: {
        issues: {
          pageInfo: { hasNextPage: start + 100 < issues.length, endCursor: String(start + 100) },
          nodes: issues.slice(start, start + 100).map((item) => ({
            ...issueContent(item),
            projectItems: { nodes: item.inProject === false ? [] : [{ id: item.id, isArchived: Boolean(item.archived), project: { id: state.project.id } }] },
          })),
        },
      },
    }
  },
  BoardIssueState: () => {
    const item = issueById(variables.issue)
    return { node: { state: item.state, stateReason: item.stateReason } }
  },
  BoardArchive: () => {
    const item = findItem((candidate) => candidate.id === variables.item)
    item.archived = true
    save()
    return { archiveProjectV2Item: { item: { id: item.id } } }
  },
}

if (!answers[operation]) fail(`fake gh: operazione GraphQL sconosciuta ${operation}`)
const answer = answers[operation]()
process.stdout.write(JSON.stringify(answer?.refused ? { data: null, errors: [{ message: answer.refused }] } : { data: answer }))
