// La board del GitHub Project collegato al repo, attraverso gh. Ogni card è una issue del repo,
// aggiunta al Project, con le stesse proprietà di una card di Infinity: la colonna è il campo
// Status, chi la prende l'assegnatario, il tipo il tipo della issue (o una label con quel nome, se
// il repo non ha quel tipo), la milestone quella del repo, gli altri campi di board.json i campi
// del Project con lo stesso nome. Le cose da fare stanno nel testo, come lista con le caselle, che
// GitHub mostra spuntabile. In Done e in archivio la issue è chiusa, negli altri stati aperta.
// Le bozze del Project con la riga di uno step, scritte dalla versione di prima, diventano issue
// alla prima sync.

import { execFileSync } from 'node:child_process'
import { finish, notUpdated, sameName, timeoutMs } from './output.mjs'

// Le prove fingono gh con DIDO_BOARD_GH.
const ghCommand = process.env.DIDO_BOARD_GH || 'gh'
const maxItemPages = 20
// Il colore delle label dei tipi che il repo non ha: grigio, come le label nuove di GitHub.
const labelColor = 'ededed'
// Una cosa da fare nel testo della issue: "- [ ] testo", "- [x] testo" quando è fatta.
const todoPattern = /^- \[([ xX])\] (.+)$/

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

const runGh = (args, input) => {
  try {
    return execFileSync(ghCommand, args, {
      input,
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (error) {
    notUpdated(describeFailure(error))
  }
}

const parseJson = (output) => {
  try {
    return JSON.parse(output)
  } catch {
    notUpdated('GitHub ha risposto con qualcosa che non è JSON')
  }
}

// La risposta intera di GitHub, con gli errori: graphql si ferma al primo, chi la usa decide.
const graphqlResponse = (query, variables) => parseJson(runGh(['api', 'graphql', '--input', '-'], JSON.stringify({ query, variables })))

const graphql = (query, variables) => {
  const response = graphqlResponse(query, variables)
  if (response.errors?.length) notUpdated(String(response.errors[0].message).slice(0, 160))
  return response.data
}

// Un'attesa breve senza async: lo script parla con gh in modo sincrono.
const wait = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)

// Le milestone si creano e si chiudono solo con l'API REST: GraphQL non ha le mutation.
const rest = (path, method, fields) =>
  parseJson(runGh(['api', path, '-X', method, ...Object.entries(fields).flatMap(([name, value]) => ['-f', `${name}=${value}`])]))

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
    id
    issueTypes(first: 20) { nodes { id name } }
    labels(first: 100) { nodes { id name } }
    milestones(first: 100, states: [OPEN, CLOSED]) { nodes { id number title state } }
    projectsV2(first: 10) {
      nodes {
        id
        title
        url
        closed
        fields(first: 50) {
          nodes {
            ... on ProjectV2FieldCommon { id name dataType }
            ... on ProjectV2SingleSelectField { options { id name } }
          }
        }
      }
    }
  }
}`

const issueFields = `id number title body state stateReason
  assignees(first: 10) { nodes { login } }
  labels(first: 20) { nodes { name } }
  milestone { title }
  issueType { name }`

const fieldValuesFields = `fieldValues(first: 30) {
  nodes {
    ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
    ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
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
          content {
            __typename
            ... on DraftIssue { id title body }
            ... on Issue { ${issueFields} repository { nameWithOwner } }
          }
          ${fieldValuesFields}
        }
      }
    }
  }
}`

const itemQuery = `query BoardItem($item: ID!) {
  node(id: $item) { ... on ProjectV2Item { ${fieldValuesFields} } }
}`

const repoIssuesQuery = `query BoardRepoIssues($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, after: $after, states: [OPEN, CLOSED]) {
      pageInfo { hasNextPage endCursor }
      nodes { ${issueFields} projectItems(first: 10, includeArchived: true) { nodes { id isArchived project { id } } } }
    }
  }
}`

const assignableQuery = `query BoardAssignable($owner: String!, $name: String!, $login: String!) {
  repository(owner: $owner, name: $name) {
    assignableUsers(query: $login, first: 10) { nodes { id login } }
  }
}`

const createIssueMutation = `mutation BoardCreateIssue($repository: ID!, $title: String!, $body: String, $assignees: [ID!], $labels: [ID!], $milestone: ID, $type: ID) {
  createIssue(input: { repositoryId: $repository, title: $title, body: $body, assigneeIds: $assignees, labelIds: $labels, milestoneId: $milestone, issueTypeId: $type }) {
    issue { id number }
  }
}`

const addItemMutation = `mutation BoardAddItem($project: ID!, $content: ID!) {
  addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
}`

const editIssueMutation = `mutation BoardEditIssue($issue: ID!, $title: String!, $body: String) {
  updateIssue(input: { id: $issue, title: $title, body: $body }) { issue { id } }
}`

const setAssigneesMutation = `mutation BoardSetAssignees($issue: ID!, $assignees: [ID!]!) {
  updateIssue(input: { id: $issue, assigneeIds: $assignees }) { issue { id } }
}`

const setMilestoneMutation = `mutation BoardSetMilestone($issue: ID!, $milestone: ID!) {
  updateIssue(input: { id: $issue, milestoneId: $milestone }) { issue { id } }
}`

const setTypeMutation = `mutation BoardSetType($issue: ID!, $type: ID!) {
  updateIssueIssueType(input: { issueId: $issue, issueTypeId: $type }) { issue { id } }
}`

const createLabelMutation = `mutation BoardCreateLabel($repository: ID!, $name: String!, $color: String!) {
  createLabel(input: { repositoryId: $repository, name: $name, color: $color }) { label { id name } }
}`

const addLabelsMutation = `mutation BoardAddLabels($issue: ID!, $labels: [ID!]!) {
  addLabelsToLabelable(input: { labelableId: $issue, labelIds: $labels }) { clientMutationId }
}`

const closeIssueMutation = `mutation BoardCloseIssue($issue: ID!, $reason: IssueClosedStateReason!) {
  closeIssue(input: { issueId: $issue, stateReason: $reason }) { issue { id } }
}`

const reopenIssueMutation = `mutation BoardReopenIssue($issue: ID!) {
  reopenIssue(input: { issueId: $issue }) { issue { id } }
}`

const issueStateQuery = `query BoardIssueState($issue: ID!) {
  node(id: $issue) { ... on Issue { state stateReason } }
}`

const convertDraftMutation = `mutation BoardConvertDraft($item: ID!, $repository: ID!) {
  convertProjectV2DraftIssueItemToIssue(input: { itemId: $item, repositoryId: $repository }) {
    item { id content { ... on Issue { id number } } }
  }
}`

const editDraftMutation = `mutation BoardEditDraft($draft: ID!, $title: String!, $body: String) {
  updateProjectV2DraftIssue(input: { draftIssueId: $draft, title: $title, body: $body }) {
    draftIssue { id }
  }
}`

// I campi di una card (Status compreso) in una chiamata sola, uno per alias: GitHub risponde in
// circa un secondo a chiamata, e un campo per chiamata faceva durare minuti la sync di un piano.
const setFieldsMutation = (count) => {
  const indexes = [...Array(count).keys()]
  const declarations = indexes.map((index) => `$f${index}: ID!, $v${index}: ProjectV2FieldValue!`).join(', ')
  const updates = indexes
    .map((index) => `f${index}: updateProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $f${index}, value: $v${index} }) { projectV2Item { id } }`)
    .join('\n  ')
  return `mutation BoardSetFields($project: ID!, $item: ID!, ${declarations}) {\n  ${updates}\n}`
}

const unarchiveMutation = `mutation BoardUnarchive($project: ID!, $item: ID!) {
  unarchiveProjectV2Item(input: { projectId: $project, itemId: $item }) { item { id } }
}`

const archiveMutation = `mutation BoardArchive($project: ID!, $item: ID!) {
  archiveProjectV2Item(input: { projectId: $project, itemId: $item }) { item { id } }
}`

// Le proprietà di una issue, come le legge una card.
const issueProperties = (issue) => ({
  kind: 'issue',
  contentId: issue.id,
  number: issue.number,
  title: issue.title,
  body: issue.body ?? '',
  state: issue.state,
  stateReason: issue.stateReason ?? null,
  assignees: issue.assignees.nodes.map((user) => user.login),
  labels: issue.labels.nodes.map((label) => label.name),
  milestone: issue.milestone?.title ?? null,
  type: issue.issueType?.name ?? null,
  // La key si cerca solo nella riga dello step: una issue con "M1 step 1: …" nel titolo è di qualcun altro.
  keyInTitle: false,
})

const hasLine = (body, line) => body.split('\n').some((candidate) => sameName(candidate, line))

// I campi del Project di una card, per nome: Status è la colonna.
const fieldsOf = (fieldValues) =>
  Object.fromEntries((fieldValues?.nodes ?? []).filter((value) => value?.field?.name).map((value) => [value.field.name, value.name ?? value.text]))

export const openGithubBoard = async (config) => {
  const repository = originRepository()
  const data = graphql(contextQuery, repository)
  const repo = data.repository
  const projects = (repo?.projectsV2?.nodes ?? []).filter((project) => project && !project.closed)
  // Senza Project e senza docs/plans/board.json nessuno ha ancora detto quale board ha il progetto.
  const noFile = config.hasFile ? '' : ' e nessun docs/plans/board.json'
  if (!projects.length) finish(`nessun Project collegato a ${repository.owner}/${repository.name}${noFile}`)
  const [project, ...others] = projects
  const projectFields = (project.fields?.nodes ?? []).filter((field) => field?.name)
  // Status è il campo degli stati di ogni Project nuovo; se manca, le card restano senza stato.
  const statusField = projectFields.find((field) => field.name === 'Status' && field.options) ?? null
  const issueTypes = repo.issueTypes?.nodes ?? []
  const labels = [...(repo.labels?.nodes ?? [])]
  const milestones = [...(repo.milestones?.nodes ?? [])]
  const repositoryName = `${repository.owner}/${repository.name}`
  const doneColumn = config.columns[Object.keys(config.columns).find((state) => sameName(state, 'Done')) ?? ''] ?? 'Done'

  // Chi si può assegnare, per login: id, o null se nel repo non c'è.
  const assignable = new Map()
  const userId = (login) => {
    const key = login.trim().toLowerCase()
    if (!assignable.has(key)) {
      const users = graphql(assignableQuery, { ...repository, login: login.trim() }).repository.assignableUsers.nodes
      assignable.set(key, users.find((user) => sameName(user.login, login)) ?? null)
    }
    return assignable.get(key)
  }

  // I campi di board.json: chi prende la card (assignee) e i campi del Project con lo stesso nome.
  const fieldProblems = []
  const assigneeName = config.assignee ? Object.keys(config.fields).find((name) => sameName(name, config.assignee)) : null
  let defaultAssignee = null
  const fieldValues = []
  for (const [name, wantedValue] of Object.entries(config.fields)) {
    if (name === assigneeName) {
      defaultAssignee = userId(wantedValue)
      if (!defaultAssignee) fieldProblems.push(`"${wantedValue}" non si può assegnare in ${repositoryName}`)
      continue
    }
    const field = projectFields.find((candidate) => candidate.name !== 'Status' && sameName(candidate.name, name))
    if (!field) {
      fieldProblems.push(`il campo "${name}" non c'è nel Project`)
      continue
    }
    if (field.dataType === 'TEXT') {
      fieldValues.push({ field, value: { text: wantedValue }, shown: wantedValue })
    } else if (field.options) {
      const option = field.options.find((candidate) => sameName(candidate.name, wantedValue))
      if (!option) {
        fieldProblems.push(`"${wantedValue}" non è tra le scelte di ${field.name} (ci sono: ${field.options.map((candidate) => candidate.name).join(', ')})`)
        continue
      }
      fieldValues.push({ field, value: { singleSelectOptionId: option.id }, shown: option.name })
    } else {
      fieldProblems.push(`il campo "${field.name}" è di un tipo che lo script non scrive (${field.dataType})`)
    }
  }
  const priorityField = config.priority
    ? projectFields.find((field) => field.name !== 'Status' && field.options && sameName(field.name, config.priority))
    : null
  if (config.priority && !priorityField) fieldProblems.push(`la priorità "${config.priority}" non è un campo a scelta del Project`)

  // Per check: i campi di board.json, o quelli del Project tra cui scegliere; poi i tipi delle issue.
  const describeField = (field) =>
    field.options ? `${field.name} (${field.options.map((option) => option.name).join(', ')})` : `${field.name} (testo)`
  const choices = projectFields.filter((field) => field.name !== 'Status' && (field.dataType === 'TEXT' || field.dataType === 'SINGLE_SELECT'))
  const configured = [
    ...Object.entries(config.fields).map(([name, value]) => `${name} → ${value}${name === assigneeName ? ' (assegnatario)' : ''}`),
    ...(config.priority ? [`priorità in ${config.priority}`] : []),
  ]
  const fieldsPart = configured.length
    ? `campi: ${configured.join(', ')}${fieldProblems.length ? `; non scritti: ${fieldProblems.join('; ')}` : ''}`
    : `campi del Project: ${choices.map(describeField).join(', ') || 'nessuno'}`
  const typesPart = `tipi delle issue: ${issueTypes.map((type) => type.name).join(', ') || 'nessuno, il tipo va in una label'}`

  // updates: [{ field, value, shown }], con shown il valore come lo rilegge la card.
  const setFields = (card, updates) => {
    if (!updates.length) return
    const variables = { project: project.id, item: card.itemId }
    updates.forEach(({ field, value }, index) => Object.assign(variables, { [`f${index}`]: field.id, [`v${index}`]: value }))
    graphql(setFieldsMutation(updates.length), variables)
    for (const { field, shown } of updates) card.fields[field.name] = shown
    card.column = card.fields.Status ?? card.column
  }
  const statusUpdate = (column) => ({
    field: statusField,
    value: { singleSelectOptionId: statusField.options.find((candidate) => candidate.name === column).id },
    shown: column,
  })
  const priorityUpdate = (option) => ({ field: priorityField, value: { singleSelectOptionId: option.id }, shown: option.name })

  // La milestone con quel titolo, creata se il repo non ce l'ha.
  const milestoneId = (title) => {
    let milestone = milestones.find((candidate) => sameName(candidate.title, title))
    if (!milestone) {
      const created = rest(`repos/${repositoryName}/milestones`, 'POST', { title })
      milestone = { id: created.node_id, number: created.number, title, state: 'OPEN' }
      milestones.push(milestone)
    }
    return milestone.id
  }

  // Il tipo: { type } se il repo ha quel tipo di issue, { label } se va in una label.
  const typeFor = (name) => {
    const type = issueTypes.find((candidate) => sameName(candidate.name, name))
    if (type) return { type }
    let label = labels.find((candidate) => sameName(candidate.name, name))
    if (!label) {
      label = graphql(createLabelMutation, { repository: repo.id, name: name.trim(), color: labelColor }).createLabel.label
      labels.push(label)
    }
    return { label }
  }

  // Chi prende la card: quello che dice lo step o, se non lo dice, quello di board.json.
  const assigneeFor = (assignee) => {
    if (!assignee) return { user: defaultAssignee, explicit: false }
    const user = userId(assignee)
    return user ? { user, explicit: true } : { problem: `"${assignee}" non si può assegnare in ${repositoryName}` }
  }

  const priorityFor = (priority) => {
    if (!priority || !priorityField) return {}
    const option = priorityField.options.find((candidate) => sameName(candidate.name, priority))
    if (!option) return { problem: `la priorità "${priority}" non c'è (ci sono: ${priorityField.options.map((candidate) => candidate.name).join(', ')})` }
    return { option }
  }

  // Una bozza con la riga di uno step diventa issue del repo, nello stesso posto del Project.
  const ensureIssue = (card) => {
    if (card.kind === 'issue') return []
    const { item } = graphql(convertDraftMutation, { item: card.itemId, repository: repo.id }).convertProjectV2DraftIssueItemToIssue
    Object.assign(card, {
      kind: 'issue', contentId: item.content.id, number: item.content.number, state: 'OPEN', stateReason: null,
      assignees: [], labels: [], milestone: null, type: null, keyInTitle: true,
    })
    return [`ora è la issue #${card.number}`]
  }

  // Con "Auto-close issue" acceso nel Project, GitHub chiude da solo la issue che va in Done e
  // rifiuta la chiusura che arriva nello stesso momento ("Could not close the issue"): se la
  // issue risulta chiusa, va bene così.
  const closeIssue = (card, reason) => {
    const response = graphqlResponse(closeIssueMutation, { issue: card.contentId, reason })
    if (!response.errors?.length) {
      Object.assign(card, { state: 'CLOSED', stateReason: reason })
      return
    }
    let issue = graphql(issueStateQuery, { issue: card.contentId }).node
    if (issue?.state !== 'CLOSED') {
      wait(2000)
      issue = graphql(issueStateQuery, { issue: card.contentId }).node
    }
    if (issue?.state !== 'CLOSED') notUpdated(String(response.errors[0].message).slice(0, 160))
    Object.assign(card, { state: 'CLOSED', stateReason: issue.stateReason ?? reason })
  }
  const reopenIssue = (card) => {
    graphql(reopenIssueMutation, { issue: card.contentId })
    Object.assign(card, { state: 'OPEN', stateReason: 'REOPENED' })
  }

  // Le issue del repo, lette solo quando serve ritrovare una card.
  let repoIssues = null
  const loadRepoIssues = () => {
    const issues = []
    let after = null
    for (let page = 0; page < maxItemPages; page += 1) {
      const { issues: connection } = graphql(repoIssuesQuery, { ...repository, after }).repository
      issues.push(...connection.nodes)
      if (!connection.pageInfo.hasNextPage) break
      after = connection.pageInfo.endCursor
    }
    return issues
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
    fieldsLine: `${fieldsPart}; ${typesPart}`,
    fieldProblems,
    todoLine: ({ text, done }) => `- [${done ? 'x' : ' '}] ${text}`,
    // Le cose da fare sono le righe con la casella in fondo al testo, come le scrive todoLine (o le
    // spunta una persona su GitHub): il testo senza di loro e la lista.
    splitTodo: (card, body) => {
      const lines = body.trimEnd().split('\n')
      const start = lines.findLastIndex((line) => !todoPattern.test(line)) + 1
      const todo = lines.slice(start).map((line) => {
        const [, mark, text] = line.match(todoPattern)
        return { text: text.trim(), done: mark !== ' ' }
      })
      return { body: lines.slice(0, start).join('\n').trim(), todo }
    },
    todoProblem: null,
    // Le cose da fare sono nel testo: se cambiano, cambia il testo.
    todoChanged: () => false,

    loadCards: async () => {
      const cards = []
      let after = null
      for (let page = 0; page < maxItemPages; page += 1) {
        const { items } = graphql(itemsQuery, { project: project.id, after }).node
        for (const item of items.nodes) {
          const { content } = item
          // Solo bozze e issue del repo: pull request e issue di altri repo non sono della skill.
          if (content?.__typename !== 'DraftIssue' && !(content?.__typename === 'Issue' && sameName(content.repository.nameWithOwner, repositoryName))) continue
          // La lista non dà le card archiviate: quelle si ritrovano tra le issue del repo.
          if (item.isArchived) continue
          const fields = fieldsOf(item.fieldValues)
          cards.push({
            itemId: item.id,
            column: fields.Status ?? null,
            fields,
            ...(content.__typename === 'Issue'
              ? issueProperties(content)
              : { kind: 'draft', contentId: content.id, title: content.title, body: content.body ?? '', keyInTitle: true }),
          })
        }
        if (!items.pageInfo.hasNextPage) break
        after = items.pageInfo.endCursor
      }
      return cards
    },

    // Una issue del repo con la riga dello step che non è sulla board: archiviata o tolta dal
    // Project. L'archiviata esce dall'archivio con i suoi campi, che si rileggono; quella tolta si
    // aggiunge di nuovo. Si riapre se l'archivio l'aveva chiusa come non pianificata.
    recoverCard: async (line) => {
      repoIssues ??= loadRepoIssues()
      const issue = repoIssues.find((candidate) => hasLine(candidate.body ?? '', line))
      if (!issue) return null
      const archivedItem = issue.projectItems.nodes.find((item) => item.project.id === project.id && item.isArchived)
      const itemId = archivedItem
        ? (graphql(unarchiveMutation, { project: project.id, item: archivedItem.id }), archivedItem.id)
        : graphql(addItemMutation, { project: project.id, content: issue.id }).addProjectV2ItemById.item.id
      const fields = fieldsOf(graphql(itemQuery, { item: itemId }).node.fieldValues)
      const card = { itemId, column: fields.Status ?? null, fields, ...issueProperties(issue) }
      const changes = ['tornata sulla board']
      if (card.state === 'CLOSED' && card.stateReason === 'NOT_PLANNED') {
        reopenIssue(card)
        changes.push('riaperta')
      }
      // Senza colonna, una issue chiusa come completata va in Done, le altre dove va una card nuova.
      const status = card.state === 'CLOSED' && card.stateReason !== 'NOT_PLANNED' ? 'Done' : null
      return { card, changes, status }
    },

    prepareCard: async (card) => ensureIssue(card),

    createCard: async ({ title, body, column, priority, type, assignee, milestone }) => {
      const notes = []
      const { user, problem: assigneeProblem } = assigneeFor(assignee)
      const kind = type ? typeFor(type) : {}
      const { option, problem: priorityProblem } = priorityFor(priority)
      const { createIssue } = graphql(createIssueMutation, {
        repository: repo.id,
        title,
        body,
        assignees: user ? [user.id] : [],
        labels: kind.label ? [kind.label.id] : [],
        ...(milestone ? { milestone: milestoneId(milestone) } : {}),
        ...(kind.type ? { type: kind.type.id } : {}),
      })
      const { item } = graphql(addItemMutation, { project: project.id, content: createIssue.issue.id }).addProjectV2ItemById
      const card = {
        itemId: item.id, column: null, fields: {}, kind: 'issue', contentId: createIssue.issue.id, number: createIssue.issue.number,
        title, body, state: 'OPEN', stateReason: null, assignees: user ? [user.login] : [], labels: kind.label ? [kind.label.name] : [],
        milestone: milestone ?? null, type: kind.type?.name ?? null, keyInTitle: false,
      }
      setFields(card, [...(column ? [statusUpdate(column)] : []), ...fieldValues, ...(option ? [priorityUpdate(option)] : [])])
      if (option) notes.push(`priorità ${option.name}`)
      notes.push(...[assigneeProblem, priorityProblem].filter(Boolean))
      return { card, notes }
    },

    // Le proprietà della card che il piano o board.json dicono: le cose cambiate, per la riga di sync.
    completeCard: async (card, { priority, type, assignee, milestone }) => {
      if (card.kind !== 'issue') return []
      const changes = []
      if (type) {
        const kind = typeFor(type)
        if (kind.type && card.type !== kind.type.name) {
          graphql(setTypeMutation, { issue: card.contentId, type: kind.type.id })
          card.type = kind.type.name
          changes.push(`tipo ${kind.type.name}`)
        }
        if (kind.label && !card.labels.some((name) => sameName(name, kind.label.name))) {
          graphql(addLabelsMutation, { issue: card.contentId, labels: [kind.label.id] })
          card.labels.push(kind.label.name)
          changes.push(`tipo ${kind.label.name}`)
        }
      }
      // Lo step che dice chi lo prende vale sopra la board; quello di board.json solo se nessuno c'è.
      const { user, explicit, problem: assigneeProblem } = assigneeFor(assignee)
      const isAssigned = user && card.assignees.some((login) => sameName(login, user.login))
      if (user && !isAssigned && (explicit || !card.assignees.length)) {
        graphql(setAssigneesMutation, { issue: card.contentId, assignees: [user.id] })
        card.assignees = [user.login]
        changes.push(explicit ? `assegnata a ${user.login}` : `${assigneeName} ${user.login}`)
      }
      if (milestone && !sameName(card.milestone ?? '', milestone)) {
        graphql(setMilestoneMutation, { issue: card.contentId, milestone: milestoneId(milestone) })
        // Una milestone che manca si mette senza dirlo: è quella del piano.
        if (card.milestone) changes.push(`milestone ${milestone}`)
        card.milestone = milestone
      }
      const updates = fieldValues.filter(({ field }) => card.fields[field.name] === undefined || card.fields[field.name] === '')
      changes.push(...updates.map(({ field, shown }) => `${field.name} ${shown}`))
      const { option, problem: priorityProblem } = priorityFor(priority)
      if (option && card.fields[priorityField.name] !== option.name) {
        updates.push(priorityUpdate(option))
        changes.push(`priorità ${option.name}`)
      }
      setFields(card, updates)
      return [...changes, ...[assigneeProblem, priorityProblem].filter(Boolean)]
    },

    // Scrive il titolo e il testo che sync passa; quello che non passa resta.
    editCard: async (card, { title = card.title, body = card.body }) => {
      if (card.kind === 'issue') graphql(editIssueMutation, { issue: card.contentId, title, body })
      else graphql(editDraftMutation, { draft: card.contentId, title, body })
      Object.assign(card, { title, body })
    },

    // La issue come vuole la colonna: chiusa in Done, aperta nelle altre. Una card archiviata in una
    // colonna (columns.archive) si chiude come non pianificata: lo step è uscito dal piano. Si chiama
    // anche quando la card è già nella colonna (una bozza in Done appena diventata issue è aperta).
    settleCard: async (card, column, { archive = false } = {}) => {
      if (card.kind !== 'issue') return []
      const isDone = sameName(column, doneColumn)
      if ((archive || isDone) && card.state === 'OPEN') {
        closeIssue(card, archive ? 'NOT_PLANNED' : 'COMPLETED')
        return ['issue chiusa']
      }
      if (!archive && !isDone && card.state === 'CLOSED') {
        reopenIssue(card)
        return ['issue riaperta']
      }
      return []
    },

    moveCard: async (card, column) => setFields(card, [statusUpdate(column)]),

    archiveCard: async (card) => {
      if (card.kind === 'issue' && card.state === 'OPEN') closeIssue(card, 'NOT_PLANNED')
      graphql(archiveMutation, { project: project.id, item: card.itemId })
    },

    closeMilestone: async (title) => {
      const milestone = milestones.find((candidate) => sameName(candidate.title, title))
      if (!milestone) return `nessuna milestone "${title}" nel repo`
      if (milestone.state === 'CLOSED') return `la milestone "${milestone.title}" è già chiusa`
      rest(`repos/${repositoryName}/milestones/${milestone.number}`, 'PATCH', { state: 'closed' })
      return `chiusa la milestone "${milestone.title}"`
    },
  }
}
