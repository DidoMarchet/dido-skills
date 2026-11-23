// La board del GitHub Project collegato al repo, attraverso gh. Le card sono bozze del Project e
// la colonna è il campo Status. Il Project non ha un campo per le cose da fare: stanno nel testo,
// come lista con le caselle, che GitHub mostra spuntabile.

import { execFileSync } from 'node:child_process'
import { finish, notUpdated, sameName, timeoutMs } from './output.mjs'

// Le prove fingono gh con DIDO_BOARD_GH.
const ghCommand = process.env.DIDO_BOARD_GH || 'gh'
const maxItemPages = 20

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

export const openGithubBoard = async (config) => {
  const repository = originRepository()
  const data = graphql(contextQuery, repository)
  const projects = (data.repository?.projectsV2?.nodes ?? []).filter((project) => project && !project.closed)
  // Senza Project e senza docs/plans/board.json nessuno ha ancora detto quale board ha il progetto.
  const noFile = config.hasFile ? '' : ' e nessun docs/plans/board.json'
  if (!projects.length) finish(`nessun Project collegato a ${repository.owner}/${repository.name}${noFile}`)
  const [project, ...others] = projects
  // Status è il campo degli stati di ogni Project nuovo; se manca, le card restano senza stato.
  const statusField = project.field?.options ? project.field : null

  const setStatus = (card, column) => {
    const option = statusField.options.find((candidate) => candidate.name === column)
    graphql(setStatusMutation, { project: project.id, item: card.itemId, field: statusField.id, option: option.id })
    card.column = column
  }

  return {
    name: `"${project.title}" (${project.url})`,
    note: others.length
      ? `; collegati anche ${others.map((other) => `"${other.title}"`).join(', ')}, che la skill non usa`
      : '',
    place: 'nel Project',
    columns: statusField?.options.map((option) => option.name) ?? null,
    noColumns: 'il Project non ha il campo Status',
    noColumnsInCheck: 'nessun campo Status',
    keepsBody: true,
    storedBody: (body) => body,
    // Campi e priorità sono delle board di Infinity: il Project non li ha.
    fieldsLine: null,
    fieldProblems: [],
    completeCard: async () => [],
    todoLine: ({ text, done }) => `- [${done ? 'x' : ' '}] ${text}`,
    todoProblem: null,
    // Le cose da fare sono nel testo: se cambiano, cambia il testo.
    todoChanged: () => false,

    loadCards: async () => {
      const cards = []
      let after = null
      for (let page = 0; page < maxItemPages; page += 1) {
        const { items } = graphql(itemsQuery, { project: project.id, after }).node
        for (const item of items.nodes) {
          // Solo le card bozza ancora sulla board: issue, PR e card archiviate non sono della skill.
          if (item.isArchived || item.content?.__typename !== 'DraftIssue') continue
          cards.push({
            itemId: item.id,
            draftId: item.content.id,
            title: item.content.title,
            body: item.content.body ?? '',
            column: item.fieldValueByName?.name ?? null,
          })
        }
        if (!items.pageInfo.hasNextPage) break
        after = items.pageInfo.endCursor
      }
      return cards
    },

    createCard: async ({ title, body, column }) => {
      const { projectItem } = graphql(addDraftMutation, { project: project.id, title, body }).addProjectV2DraftIssue
      const card = { itemId: projectItem.id, draftId: projectItem.content?.id, title, body, column: null }
      if (column) setStatus(card, column)
      return { card, notes: [] }
    },

    editCard: async (card, { title, body }) => {
      graphql(editDraftMutation, { draft: card.draftId, title, body })
      Object.assign(card, { title, body })
    },

    moveCard: async (card, column) => setStatus(card, column),

    archiveCard: async (card) => {
      graphql(archiveMutation, { project: project.id, item: card.itemId })
    },
  }
}
