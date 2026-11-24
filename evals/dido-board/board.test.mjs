// Le prove di board.mjs, la parte di dido-board che parla con la board: fake-gh.mjs al posto di gh
// per il GitHub Project, fake-infinity.mjs al posto dell'API per la board di Infinity.
// Si lanciano dalla root del repo con: node --test evals/dido-board/board.test.mjs
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { attributeIds, columnNames, departmentNames, folderId, initialState, labelId, priorityNames } from './fake-infinity.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const boardScript = join(here, '../../skills/dido-board/board.mjs')
const fakeGh = join(here, 'fake-gh.mjs')
const fakeInfinity = join(here, 'fake-infinity.mjs')
chmodSync(fakeGh, 0o755)

const planLink = 'Piano: https://github.com/acme/notes-app/blob/main/docs/plans/M1.md'
// L'ultima riga che lo script scrive nel testo di ogni card, scritta a mano per le key delle prove.
const keyLines = { 'M1 step 1': 'Step 1 del piano M1', 'M1 step 2': 'Step 2 del piano M1', 'M1 step 3': 'Step 3 del piano M1', 'M1 step 10': 'Step 10 del piano M1', 'M1 domanda 2': 'Domanda 2 del piano M1' }
const keyLine = (key) => keyLines[key] ?? key
const plan = [
  { key: 'M1 step 1', title: 'Design', body: `Le schermate della lista delle note.\n\nRepo: app\n${planLink}` },
  { key: 'M1 step 2', title: 'Backend, le note', body: `Le rotte delle note, con i test.\n\nRepo: backend\n${planLink}` },
  { key: 'M1 step 10', title: 'Chiusura', body: `Report e "Dove siamo".\n\nRepo: app\n${planLink}` },
]

// Un repo di prova con il suo Project finto: state sono i campi del Project diversi da quelli di base.
// Con config il repo ha docs/plans/board.json (un oggetto, o il testo del file), e infinityState
// sono i campi della board di Infinity finta diversi da quelli di base.
const session = ({ state, origin = 'https://github.com/acme/notes-app.git', git = true, config, infinityState, files = {} } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'dido-board-'))
  const repo = join(root, 'repo')
  mkdirSync(repo)
  if (git) {
    execFileSync('git', ['init', '-q'], { cwd: repo })
    if (origin) execFileSync('git', ['remote', 'add', 'origin', origin], { cwd: repo })
  }
  for (const [path, content] of Object.entries(files)) writeFileSync(join(repo, path), content)
  if (config) {
    mkdirSync(join(repo, 'docs/plans'), { recursive: true })
    writeFileSync(join(repo, 'docs/plans/board.json'), typeof config === 'string' ? config : JSON.stringify(config))
  }
  const statePath = join(root, 'state.json')
  const logPath = join(root, 'calls.jsonl')
  const infinityStatePath = join(root, 'infinity-state.json')
  const infinityLogPath = join(root, 'infinity-calls.jsonl')
  if (state) writeFileSync(statePath, JSON.stringify(state))
  if (infinityState) writeFileSync(infinityStatePath, JSON.stringify(infinityState))
  const run = (args, { mode = 'ok', infinityMode = 'ok', input, env = {} } = {}) => {
    const started = Date.now()
    const result = spawnSync('node', [boardScript, ...args], {
      cwd: repo,
      input,
      encoding: 'utf8',
      env: {
        ...process.env,
        DIDO_BOARD_GH: fakeGh,
        FAKE_GH_STATE: statePath,
        FAKE_GH_LOG: logPath,
        FAKE_GH_MODE: mode,
        INFINITY_TOKEN: 'token-di-prova',
        DIDO_BOARD_FETCH: fakeInfinity,
        FAKE_INFINITY_STATE: infinityStatePath,
        FAKE_INFINITY_LOG: infinityLogPath,
        FAKE_INFINITY_MODE: infinityMode,
        ...env,
      },
    })
    return {
      status: result.status,
      lines: result.stdout.trim().split('\n'),
      stderr: result.stderr,
      seconds: (Date.now() - started) / 1000,
    }
  }
  const items = () => (existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')).items ?? [] : [])
  const calls = () => (existsSync(logPath) ? readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  // Le chiamate che scrivono: tutte tranne le letture.
  const writes = () => calls().filter((call) => call.operation && !['BoardContext', 'BoardItems', 'BoardItem', 'BoardAssignable', 'BoardRepoIssues'].includes(call.operation))
  // La card di uno step sul Project: dall'ultima riga del testo o, bozza scritta prima del 23/11/2026, dal titolo.
  const card = (key) =>
    items().find((item) => !item.archived && item.inProject !== false &&
      (item.body.split('\n').includes(keyLine(key)) || (item.kind === 'DraftIssue' && item.title.startsWith(`${key}:`))))
  const readJsonLines = (path) =>
    existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []
  const infinity = {
    state: () => (existsSync(infinityStatePath) ? JSON.parse(readFileSync(infinityStatePath, 'utf8')) : null),
    calls: () => readJsonLines(infinityLogPath),
    writes: () => readJsonLines(infinityLogPath).filter((call) => call.method !== 'GET'),
    save: (value) => writeFileSync(infinityStatePath, JSON.stringify(value)),
  }
  // Le card della board di Infinity con titolo, testo (HTML) e colonna leggibili.
  infinity.cards = () => {
    const labels = Object.fromEntries([...columnNames, ...departmentNames, ...priorityNames].map((name) => [labelId(name), name]))
    return (infinity.state()?.items ?? []).filter((item) => !item.deleted).map((item) => {
      const value = (attribute) => item.values.find((candidate) => candidate.attribute_id === attribute)?.data
      return {
        id: item.id,
        title: value(attributeIds.name),
        html: value(attributeIds.description),
        column: labels[value(attributeIds.status)?.[0]] ?? null,
        members: value(attributeIds.members),
        referent: value(attributeIds.referent),
        department: value(attributeIds.department)?.map((id) => labels[id]),
        priority: value(attributeIds.priority)?.map((id) => labels[id]),
        todo: value(attributeIds.checklist),
      }
    })
  }
  infinity.card = (key) =>
    infinity.cards().find((item) => (item.html ?? '').includes(`<p>${keyLine(key)}</p>`) || item.title.startsWith(`${key}:`))
  return { run, items, calls, writes, card, infinity, statePath }
}

const syncPlan = (board, cards = plan) => board.run(['sync', '-'], { input: JSON.stringify(cards) })

test('senza un Project collegato si ferma alla prima domanda e lo dice in una riga', () => {
  const board = session({ state: { linked: false } })
  const result = syncPlan(board)
  assert.equal(result.status, 0)
  assert.deepEqual(result.lines, ['board: nessun Project collegato a acme/notes-app e nessun docs/plans/board.json'])
  assert.deepEqual(board.calls().map((call) => call.operation), ['BoardContext'])
})

test('con docs/plans/board.json la riga senza Project non chiede più quale board', () => {
  const github = session({ state: { linked: false }, config: { service: 'github' } })
  assert.deepEqual(github.run(['check']).lines, ['board: nessun Project collegato a acme/notes-app'])
  const none = session({ config: { service: 'none' } })
  assert.deepEqual(syncPlan(none).lines, ['board: nessun Project collegato: docs/plans/board.json dice che il progetto non ha una board'])
  assert.equal(none.calls().length + none.infinity.calls().length, 0)
})

test('senza remote origin, fuori da git o con origin fuori da GitHub non chiama gh', () => {
  for (const options of [{ origin: null }, { git: false }, { origin: 'https://gitlab.com/acme/notes-app.git' }]) {
    const board = session(options)
    const result = board.run(['check'])
    assert.equal(result.status, 0)
    assert.match(result.lines[0], /^board: nessun Project collegato: /)
    assert.equal(board.calls().length, 0)
  }
})

test('quando gh non funziona esce con 0 e dice perché', () => {
  const cases = [
    [{ env: { DIDO_BOARD_GH: '/non/esiste/gh' } }, 'board: non aggiornata: gh non è installato'],
    [{ mode: 'auth' }, 'board: non aggiornata: gh non è autenticato: gh auth login'],
    [{ mode: 'scope' }, 'board: non aggiornata: a gh manca lo scope project: gh auth refresh -s project'],
  ]
  for (const [options, line] of cases) {
    const result = session().run(['check'], options)
    assert.equal(result.status, 0)
    assert.deepEqual(result.lines, [line])
  }
})

test('se GitHub non risponde aspetta solo fino al timeout', () => {
  const result = session().run(['check'], { mode: 'slow', env: { DIDO_BOARD_TIMEOUT_MS: '500' } })
  assert.equal(result.status, 0)
  assert.deepEqual(result.lines, ['board: non aggiornata: GitHub non ha risposto in 0.5 secondi'])
  assert.ok(result.seconds < 4, `${result.seconds} secondi`)
})

test('check dice il Project, il link, gli stati, i campi e i tipi', () => {
  const result = session().run(['check'])
  assert.deepEqual(result.lines, [
    'board: collegato a "Writing App" (https://github.com/users/acme/projects/1), stati: Backlog, Ready, In progress, In review, Done',
    'board: campi del Project: nessuno; tipi delle issue: Task, Bug, Feature',
  ])
})

test('con più Project collegati usa il primo e nomina gli altri', () => {
  const other = { id: 'PVT_2', title: 'Vecchia board', url: 'https://github.com/users/acme/projects/2', closed: false, field: null }
  const result = session({ state: { otherProjects: [other] } }).run(['check'])
  assert.match(result.lines[0], /^board: collegato a "Writing App" .*; collegati anche "Vecchia board", che la skill non usa$/)
})

test('sync crea una card per step in Backlog, con titolo e testo', () => {
  const board = session()
  const result = syncPlan(board)
  assert.equal(result.status, 0)
  assert.deepEqual(result.lines, [
    'board: creata "Design" in Backlog',
    'board: creata "Backend, le note" in Backlog',
    'board: creata "Chiusura" in Backlog',
    'board: 3 card: 3 create, 0 cambiate, 0 già allineate',
  ])
  assert.deepEqual(
    board.items().map(({ title, body, status }) => ({ title, body, status })),
    plan.map(({ key, title, body }) => ({ title, body: `${body}\n\n${keyLine(key)}`, status: 'Backlog' })),
  )
})

test('sync ripetuto non crea doppioni e non scrive niente', () => {
  const board = session()
  syncPlan(board)
  const writesBefore = board.writes().length
  const result = syncPlan(board)
  assert.deepEqual(result.lines, ['board: 3 card: 0 create, 0 cambiate, 3 già allineate'])
  assert.equal(board.items().length, 3)
  assert.equal(board.writes().length, writesBefore)
})

test('sync aggiorna il testo cambiato e lascia lo stato dov\'è', () => {
  const board = session()
  syncPlan(board)
  board.run(['move', 'M1 step 1', 'In progress'])
  const changed = [{ ...plan[0], body: `Le schermate della lista, anche vuota.\n\nRepo: app\n${planLink}` }]
  const result = syncPlan(board, changed)
  assert.deepEqual(result.lines, [
    'board: "Design": testo aggiornato',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.equal(board.card('M1 step 1').body, `${changed[0].body}\n\nStep 1 del piano M1`)
  assert.equal(board.card('M1 step 1').status, 'In progress')
})

test('sync con lo stato porta le card dove dice il piano, senza toccare titolo e testo', () => {
  const board = session()
  syncPlan(board)
  const result = syncPlan(board, [{ key: 'M1 step 1', status: 'Done' }, { key: 'M1 step 2', status: 'in progress' }])
  assert.deepEqual(result.lines, [
    'board: "Design": ora in Done',
    'board: "Backend, le note": ora in In progress',
    'board: 2 card: 0 create, 2 cambiate, 0 già allineate',
  ])
  assert.equal(board.card('M1 step 1').body, `${plan[0].body}\n\nStep 1 del piano M1`)
  assert.equal(board.card('M1 step 10').status, 'Backlog')
})

test('sync con solo key e stato riallinea le card che ci sono e segnala quelle che mancano, senza crearle', () => {
  const board = session()
  syncPlan(board, [plan[0]])
  const result = syncPlan(board, [{ key: 'M1 step 1', status: 'In review' }, { key: 'M1 step 2', status: 'Done' }])
  assert.deepEqual(result.lines, [
    'board: "Design": ora in In review',
    'board: manca la card di "M1 step 2": rimanda lo step con title, body e todo',
    'board: 2 card: 0 create, 1 cambiate, 0 già allineate, 1 mancanti',
  ])
  assert.equal(board.items().length, 1)
})

test('sync non crea una card senza title: sulla board si leggerebbe solo la key', () => {
  const board = session()
  const result = syncPlan(board, [{ key: 'M1 step 1', todo: [{ text: 'le schermate', done: false }] }, { key: 'M1 step 2', body: 'Solo il testo.' }])
  assert.deepEqual(result.lines, [
    'board: manca la card di "M1 step 1": rimanda lo step con title, body e todo',
    'board: manca la card di "M1 step 2": rimanda lo step con title, body e todo',
    'board: 2 card: 0 create, 0 cambiate, 0 già allineate, 2 mancanti',
  ])
  assert.equal(board.items().length, 0)
})

test('move sposta la card dello step giusto, anche con step 1 e step 10', () => {
  const board = session()
  // Lo step 10 per primo sulla board: una ricerca per inizio del titolo troverebbe lui.
  syncPlan(board, [plan[2], plan[0], plan[1]])
  const result = board.run(['move', 'M1 step 1', 'in progress'])
  assert.equal(result.status, 0)
  assert.deepEqual(result.lines, ['board: "Design" ora è in In progress'])
  assert.equal(board.card('M1 step 1').status, 'In progress')
  assert.equal(board.card('M1 step 10').status, 'Backlog')
})

test('move verso lo stato che la card ha già non scrive niente', () => {
  const board = session()
  syncPlan(board)
  const writesBefore = board.writes().length
  assert.deepEqual(board.run(['move', 'M1 step 2', 'Backlog']).lines, ['board: "Backend, le note" è già in Backlog'])
  assert.equal(board.writes().length, writesBefore)
})

test('move senza la card dice di crearla con sync', () => {
  const board = session()
  syncPlan(board)
  assert.deepEqual(board.run(['move', 'M1 step 7', 'Done']).lines, [
    'board: manca la card di "M1 step 7": creala con sync, poi ripeti move',
  ])
})

test('move verso uno stato che il Project non ha non scrive niente e dice quali ci sono', () => {
  const board = session()
  syncPlan(board)
  const writesBefore = board.writes().length
  assert.deepEqual(board.run(['move', 'M1 step 1', 'Testing']).lines, [
    'board: non aggiornata: lo stato "Testing" non c\'è nel Project (ci sono: Backlog, Ready, In progress, In review, Done)',
  ])
  assert.equal(board.writes().length, writesBefore)
})

test('archive chiude la issue come non pianificata e la toglie dalla board; lo step che torna nel piano riprende la stessa issue', () => {
  const board = session()
  syncPlan(board)
  assert.deepEqual(board.run(['archive', 'M1 step 2']).lines, ['board: archiviata "Backend, le note"'])
  assert.equal(board.card('M1 step 2'), undefined)
  const archived = board.items().find((item) => item.title === 'Backend, le note')
  assert.deepEqual([archived.state, archived.stateReason, archived.archived], ['CLOSED', 'NOT_PLANNED', true])
  assert.deepEqual(syncPlan(board, [plan[1]]).lines, [
    'board: "Backend, le note": tornata sulla board, riaperta',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.deepEqual([board.card('M1 step 2').state, board.card('M1 step 2').status], ['OPEN', 'Backlog'])
  assert.equal(board.items().length, 3)
})

test('le issue senza la riga di uno step e le pull request del Project non si toccano', () => {
  const issue = {
    id: 'PVTI_99', kind: 'Issue', contentId: 'I_99', number: 99, title: 'M1 step 1: una issue', body: 'Scritta a mano.', status: 'Done',
    state: 'OPEN', assignees: [], labels: [], milestone: null, type: null, fields: {},
  }
  const pullRequest = { id: 'PVTI_98', kind: 'PullRequest', title: 'M1 step 1: la PR', body: '', status: 'In review' }
  const board = session({ state: { items: [issue, pullRequest], nextId: 100 } })
  syncPlan(board)
  assert.deepEqual(board.items().find((item) => item.id === 'PVTI_99'), issue)
  assert.deepEqual(board.items().find((item) => item.id === 'PVTI_98'), pullRequest)
  assert.equal(board.items().length, 5)
})

test('legge tutte le pagine della board', () => {
  const items = Array.from({ length: 150 }, (_, index) => ({
    id: `PVTI_${index + 1}`, kind: 'DraftIssue', contentId: `DI_${index + 1}`, title: `M9 step ${index + 1}: passo`, body: '', status: 'Backlog',
  }))
  const board = session({ state: { items, nextId: 151 } })
  assert.deepEqual(board.run(['move', 'M9 step 150', 'Done']).lines, ['board: "M9 step 150: passo" ora è in Done'])
  assert.equal(board.card('M9 step 150').status, 'Done')
})

test('un comando sbagliato risponde con una riga, esce con 0 e non chiama gh', () => {
  const cases = [
    [['sync', '-'], 'non è JSON', /^board: sync non riesce a leggere le card: /],
    [['sync', '-'], JSON.stringify([{ title: 'senza key' }]), /^board: sync vuole un array JSON/],
    [['sync', '-'], JSON.stringify([{ key: 'M1 step 1', todo: ['senza done'] }]), /^board: sync vuole un array JSON .*todo è un array di \{ text, done \}$/],
    [['sync', '-'], JSON.stringify([{ key: 'M1 step 1', todo: [{ text: 'x', done: 'sì' }] }]), /^board: sync vuole un array JSON/],
    [['sync', '-'], JSON.stringify([{ key: 'M1 step 1', type: 3 }]), /^board: sync vuole un array JSON .*type, assignee e milestone sono testi$/],
    [['close-milestone'], undefined, /^board: close-milestone vuole il nome del piano/],
    [['sync'], undefined, /^board: sync vuole le card su stdin/],
    [['move', 'M1 step 1'], undefined, /^board: move vuole la key e lo stato/],
    [['archive'], undefined, /^board: archive vuole la key/],
    [['boh'], undefined, /^board: comando sconosciuto "boh"/],
    [[], undefined, /^board: comando sconosciuto ""/],
  ]
  for (const [args, input, line] of cases) {
    const board = session()
    const result = board.run(args, { input })
    assert.equal(result.status, 0)
    assert.equal(result.lines.length, 1)
    assert.match(result.lines[0], line)
    assert.equal(board.calls().length, 0)
  }
})

// La board di Infinity (bici.pro): le colonne del sito, e "Da quotare" che usa solo la persona.
const boardUrl = 'https://app.startinfinity.com/b/wBMjf2pNi5a/ifdZU4AdwJH'
const infinityConfig = {
  service: 'infinity',
  url: boardUrl,
  columns: { Backlog: 'Stopped', Ready: 'To-do', 'In progress': 'Doing', 'In review': 'Test', Done: 'Done', archive: 'Done' },
}
const infinitySession = (options = {}) => session({ config: infinityConfig, ...options })

test('Infinity senza INFINITY_TOKEN risponde come senza board e non chiama niente', () => {
  const board = infinitySession()
  for (const token of ['', '   ']) {
    const result = board.run(['sync', '-'], { input: JSON.stringify(plan), env: { INFINITY_TOKEN: token } })
    assert.equal(result.status, 0)
    assert.deepEqual(result.lines, ['board: nessun Project collegato: la board è su Infinity e manca INFINITY_TOKEN'])
  }
  assert.equal(board.calls().length + board.infinity.calls().length, 0)
})

test('Infinity con il token sbagliato, lento o che chiede di rallentare esce con 0 e dice perché', () => {
  const cases = [
    [{ infinityMode: 'unauthorized' }, 'board: non aggiornata: Infinity non accetta il token: controlla INFINITY_TOKEN'],
    [{ infinityMode: 'ratelimit' }, 'board: non aggiornata: Infinity chiede di rallentare: riprova tra qualche minuto, sync riparte da dove era'],
    [{ infinityMode: 'slow', env: { DIDO_BOARD_TIMEOUT_MS: '500' } }, 'board: non aggiornata: Infinity non ha risposto in 0.5 secondi'],
  ]
  for (const [options, line] of cases) {
    const result = infinitySession().run(['move', 'M1 step 1', 'Ready'], options)
    assert.equal(result.status, 0)
    assert.deepEqual(result.lines, [line])
  }
})

test('Infinity: check dice board, cartella e la colonna di ogni stato, senza chiamare gh', () => {
  const board = infinitySession()
  assert.deepEqual(board.run(['check']).lines, [
    `board: collegato a "bici.pro", cartella "Sviluppo" (${boardUrl}), stati: Backlog → Stopped, Ready → To-do, In progress → Doing, In review → Test, Done → Done, archive → Done`,
    'board: campi della cartella: Responsabile (persone), Referente (persone), Reparto (Design, Develop, Seo), Priorità (Alta, Media, Normale, Delivered)',
  ])
  assert.equal(board.calls().length, 0)
  assert.ok(board.infinity.calls().every((call) => call.method === 'GET'))
})

test('Infinity: check dice quale colonna della config manca sulla board', () => {
  const board = infinitySession({ config: { ...infinityConfig, columns: { Backlog: 'Stopped', 'In review': 'QA' } } })
  assert.deepEqual(board.run(['check']).lines[0],
    `board: collegato a "bici.pro", cartella "Sviluppo" (${boardUrl}), stati: Backlog → Stopped, In review → "QA", che non c'è`,
  )
})

test('Infinity: sync crea le card nella cartella dell\'URL, senza stato nella colonna di Backlog', () => {
  const board = infinitySession()
  const result = syncPlan(board, [plan[0], { ...plan[1], status: 'Ready' }])
  assert.deepEqual(result.lines, [
    'board: creata "Design" in Backlog ("Stopped")',
    'board: creata "Backend, le note" in Ready ("To-do")',
    'board: 2 card: 2 create, 0 cambiate, 0 già allineate',
  ])
  assert.deepEqual(
    board.infinity.cards().map(({ title, html, column }) => ({ title, html, column })),
    [
      {
        title: 'Design',
        html: '<p>Le schermate della lista delle note.</p><p>Repo: app<br>Piano: https://github.com/acme/notes-app/blob/main/docs/plans/M1.md</p><p>Step 1 del piano M1</p>',
        column: 'Stopped',
      },
      {
        title: 'Backend, le note',
        html: '<p>Le rotte delle note, con i test.</p><p>Repo: backend<br>Piano: https://github.com/acme/notes-app/blob/main/docs/plans/M1.md</p><p>Step 2 del piano M1</p>',
        column: 'To-do',
      },
    ],
  )
  assert.ok(board.infinity.state().items.every((item) => item.folder_id === folderId))
  assert.equal(board.calls().length, 0)
})

test('Infinity: sync ripetuto non crea doppioni e non scrive niente, anche con punti e caratteri speciali', () => {
  const board = infinitySession()
  const special = { key: 'M1 step 3', title: 'Lista <vuota> & piena', body: `Due casi:\n- lista "vuota"\n- lista piena & lunga\n\nRepo: app\n${planLink}` }
  syncPlan(board, [...plan, special])
  const writesBefore = board.infinity.writes().length
  const result = syncPlan(board, [...plan, special])
  assert.deepEqual(result.lines, ['board: 4 card: 0 create, 0 cambiate, 4 già allineate'])
  assert.equal(board.infinity.cards().length, 4)
  assert.equal(board.infinity.writes().length, writesBefore)
  assert.equal(board.infinity.card('M1 step 3').title, 'Lista <vuota> & piena')
})

test('Infinity: sync aggiorna il testo cambiato e lascia colonna e altri valori dove sono', () => {
  const members = [42]
  const board = infinitySession()
  syncPlan(board, [plan[0]])
  // La persona assegna la card: un valore che lo script non scrive.
  const state = board.infinity.state()
  state.items[0].values.push({ attribute_id: attributeIds.members, data: members })
  board.infinity.save(state)
  board.run(['move', 'M1 step 1', 'In progress'])
  const changed = [{ ...plan[0], body: `Le schermate della lista, anche vuota.\n\nRepo: app\n${planLink}` }]
  const result = syncPlan(board, changed)
  assert.deepEqual(result.lines, [
    'board: "Design": testo aggiornato',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  const card = board.infinity.card('M1 step 1')
  assert.equal(card.html, `<p>Le schermate della lista, anche vuota.</p><p>Repo: app<br>${planLink}</p><p>Step 1 del piano M1</p>`)
  assert.equal(card.column, 'Doing')
  assert.deepEqual(card.members, members)
})

test('Infinity: move porta la card in ogni colonna della tabella', () => {
  const board = infinitySession()
  syncPlan(board)
  const moves = [
    ['Ready', 'To-do', 'Ready ("To-do")'],
    ['In progress', 'Doing', 'In progress ("Doing")'],
    ['In review', 'Test', 'In review ("Test")'],
    ['Done', 'Done', 'Done'],
    ['backlog', 'Stopped', 'Backlog ("Stopped")'],
  ]
  for (const [status, column, label] of moves) {
    assert.deepEqual(board.run(['move', 'M1 step 10', status]).lines, [`board: "Chiusura" ora è in ${label}`])
    assert.equal(board.infinity.card('M1 step 10').column, column)
    assert.equal(board.infinity.card('M1 step 1').column, 'Stopped')
  }
  assert.deepEqual(board.run(['move', 'M1 step 10', 'Backlog']).lines, ['board: "Chiusura" è già in Backlog ("Stopped")'])
})

test('Infinity: move verso uno stato che non c\'è non scrive niente e dice le colonne', () => {
  const board = infinitySession()
  syncPlan(board)
  const writesBefore = board.infinity.writes().length
  assert.deepEqual(board.run(['move', 'M1 step 1', 'Testing']).lines, [
    'board: non aggiornata: lo stato "Testing" non c\'è nella board (ci sono: Da quotare, To-do, Doing, Test, Done, Stopped, Review, Deadline, +)',
  ])
  assert.equal(board.infinity.writes().length, writesBefore)
})

test('Infinity: archive porta la card in Done senza cancellarla, e le card in "Da quotare" restano lì', () => {
  const quote = {
    id: 'itemManual01', object: 'item', folder_id: folderId, parent_id: null, sort_order: 1, deleted: false,
    values: [{ attribute_id: attributeIds.name, data: 'Preventivo nuova pagina' }, { attribute_id: attributeIds.status, data: [labelId('Da quotare')] }],
  }
  const board = infinitySession({ infinityState: { items: [quote], nextId: 2 } })
  syncPlan(board)
  assert.deepEqual(board.run(['archive', 'M1 step 2']).lines, ['board: archiviata "Backend, le note": ora è in Done'])
  assert.equal(board.infinity.card('M1 step 2').column, 'Done')
  assert.deepEqual(board.run(['archive', 'M1 step 2']).lines, ['board: archiviata "Backend, le note": era già in Done'])
  assert.ok(board.infinity.calls().every((call) => call.method !== 'DELETE'))
  const manual = board.infinity.cards().find((card) => card.id === 'itemManual01')
  assert.equal(manual.column, 'Da quotare')
  assert.equal(board.infinity.cards().length, 4)
})

test('Infinity: senza la colonna di archive in columns, archive va nella colonna di Done', () => {
  const { archive, ...columns } = infinityConfig.columns
  assert.equal(archive, 'Done')
  const board = infinitySession({ config: { ...infinityConfig, columns } })
  syncPlan(board)
  assert.deepEqual(board.run(['archive', 'M1 step 1']).lines, ['board: archiviata "Design": ora è in Done'])
})

test('Infinity: legge tutte le pagine della cartella', () => {
  const items = Array.from({ length: 150 }, (_, index) => ({
    id: `item${index + 1}`, object: 'item', folder_id: folderId, parent_id: null, sort_order: index, deleted: false,
    values: [{ attribute_id: attributeIds.name, data: `M9 step ${index + 1}: passo` }, { attribute_id: attributeIds.status, data: [labelId('Stopped')] }],
  }))
  const board = infinitySession({ infinityState: { items, nextId: 151 } })
  assert.deepEqual(board.run(['move', 'M9 step 150', 'Done']).lines, ['board: "M9 step 150: passo" ora è in Done'])
  assert.equal(board.infinity.card('M9 step 150').column, 'Done')
})

test('Infinity: una board che il token non vede o un URL sbagliato lo dicono in una riga', () => {
  const cases = [
    [{ ...infinityConfig, url: 'https://app.startinfinity.com/b/nonEsiste01/ifdZU4AdwJH' }, /^board: non aggiornata: la board nonEsiste01 di docs\/plans\/board\.json non c'è tra quelle che il token di Infinity vede$/],
    [{ ...infinityConfig, url: 'https://app.startinfinity.com/b/wBMjf2pNi5a/nonEsiste01' }, /^board: non aggiornata: la cartella nonEsiste01 non c'è nella board "bici\.pro"$/],
    [{ ...infinityConfig, url: 'https://example.com/board' }, /^board: non aggiornata: in docs\/plans\/board\.json "url" non è l'indirizzo di una board di Infinity/],
  ]
  for (const [config, line] of cases) {
    const result = session({ config }).run(['check'])
    assert.equal(result.status, 0)
    assert.match(result.lines.join('\n'), line)
  }
})

test('docs/plans/board.json sbagliato risponde con una riga e non chiama niente', () => {
  const cases = [
    ['{ non è json', /^board: non aggiornata: docs\/plans\/board\.json non si legge: /],
    [{ service: 'trello' }, /^board: non aggiornata: in docs\/plans\/board\.json "service" è "trello": va "github", "infinity" o "none"$/],
    [{ service: 'infinity', url: boardUrl, fields: { Responsabile: 42 } }, /^board: non aggiornata: in docs\/plans\/board\.json "fields" va un oggetto/],
    [{ service: 'infinity', url: boardUrl, priority: ['Alta'] }, /^board: non aggiornata: in docs\/plans\/board\.json "priority" va il nome/],
    [{ service: 'infinity', url: boardUrl, columns: ['Stopped'] }, /^board: non aggiornata: in docs\/plans\/board\.json "columns" va un oggetto/],
  ]
  for (const [config, line] of cases) {
    const board = session({ config })
    const result = board.run(['check'])
    assert.equal(result.status, 0)
    assert.match(result.lines.join('\n'), line)
    assert.equal(board.calls().length + board.infinity.calls().length, 0)
  }
})

test('GitHub con docs/plans/board.json: columns cambia la colonna di uno stato e archive sposta invece di archiviare', () => {
  const board = session({ config: { service: 'github', columns: { 'In review': 'Done', archive: 'Done' } } })
  syncPlan(board)
  assert.deepEqual(board.run(['move', 'M1 step 1', 'In review']).lines, ['board: "Design" ora è in In review ("Done")'])
  assert.deepEqual(board.run(['archive', 'M1 step 2']).lines, ['board: archiviata "Backend, le note": ora è in Done'])
  assert.equal(board.card('M1 step 2').status, 'Done')
  assert.deepEqual([board.card('M1 step 2').state, board.card('M1 step 2').stateReason], ['CLOSED', 'NOT_PLANNED'])
  assert.ok(board.calls().every((call) => call.operation !== 'BoardArchive'))
  assert.equal(board.infinity.calls().length, 0)
})

// bici.pro con chi prende le card, il referente, il reparto e la priorità.
const assignedConfig = {
  ...infinityConfig,
  fields: { Responsabile: 'Davide Marchet', Referente: 'lorenzo@example.com', Reparto: 'develop' },
  priority: 'Priorità',
}

test('Infinity: le card nuove hanno i campi di board.json e la priorità di sync', () => {
  const board = infinitySession({ config: assignedConfig })
  const result = syncPlan(board, [{ ...plan[0], priority: 'Alta', status: 'Ready' }, { ...plan[1], priority: 'normale' }])
  assert.deepEqual(result.lines, [
    'board: creata "Design" in Ready ("To-do") (priorità Alta)',
    'board: creata "Backend, le note" in Backlog ("Stopped") (priorità Normale)',
    'board: 2 card: 2 create, 0 cambiate, 0 già allineate',
  ])
  const cards = board.infinity.cards()
  assert.deepEqual(cards.map(({ members, referent, department, priority }) => ({ members, referent, department, priority })), [
    { members: [53509], referent: [51103], department: ['Develop'], priority: ['Alta'] },
    { members: [53509], referent: [51103], department: ['Develop'], priority: ['Normale'] },
  ])
  const writesBefore = board.infinity.writes().length
  assert.deepEqual(syncPlan(board, [{ ...plan[0], priority: 'Alta' }]).lines, ['board: 1 card: 0 create, 0 cambiate, 1 già allineate'])
  assert.equal(board.infinity.writes().length, writesBefore)
})

test('Infinity: sync cambia la priorità e riempie i campi vuoti, senza toccare quelli scritti dalla persona', () => {
  const board = infinitySession()
  syncPlan(board, [plan[0], plan[1]])
  // La persona ha già dato la card dello step 1 a un altro: resta sua.
  const state = board.infinity.state()
  state.items[0].values.push({ attribute_id: attributeIds.members, data: [372681] })
  board.infinity.save(state)
  const assigned = infinitySession({ config: assignedConfig, infinityState: board.infinity.state() })
  const result = syncPlan(assigned, [{ ...plan[0], priority: 'Media' }, { key: 'M1 step 2', priority: 'Alta' }])
  assert.deepEqual(result.lines, [
    'board: "Design": Referente lorenzo@example.com, Reparto develop, priorità Media',
    'board: "Backend, le note": Responsabile Davide Marchet, Referente lorenzo@example.com, Reparto develop, priorità Alta',
    'board: 2 card: 0 create, 2 cambiate, 0 già allineate',
  ])
  assert.deepEqual(assigned.infinity.card('M1 step 1').members, [372681])
  assert.deepEqual(assigned.infinity.card('M1 step 2').members, [53509])
  assert.deepEqual(assigned.infinity.card('M1 step 2').priority, ['Alta'])
})

test('Infinity: check dice i campi di board.json, e quelli che non si scrivono', () => {
  const ok = infinitySession({ config: assignedConfig })
  assert.deepEqual(ok.run(['check']).lines[1],
    'board: campi: Responsabile → Davide Marchet, Referente → lorenzo@example.com, Reparto → develop, priorità in Priorità')
  const wrong = infinitySession({
    config: { ...infinityConfig, fields: { Responsabile: 'Luca', Referente: 'Mario', Reparto: 'Marketing', Cliente: 'Bici' }, priority: 'Urgenza' },
  })
  assert.deepEqual(wrong.run(['check']).lines[1], [
    'board: campi: Responsabile → Luca, Referente → Mario, Reparto → Marketing, Cliente → Bici, priorità in Urgenza; non scritti:',
    'ci sono più membri "Luca": scrivi l\'email;',
    '"Mario" non è tra i membri del workspace;',
    '"Marketing" non è tra le etichette di Reparto (ci sono: Design, Develop, Seo);',
    'il campo "Cliente" non c\'è nella cartella;',
    'la priorità "Urgenza" non è un attributo etichetta della cartella',
  ].join(' '))
})

test('Infinity: con un campo che non si scrive le card si creano lo stesso, e sync lo dice una volta', () => {
  const board = infinitySession({ config: { ...assignedConfig, fields: { ...assignedConfig.fields, Referente: 'Mario' } } })
  const result = syncPlan(board, [{ ...plan[0], priority: 'Urgente' }, plan[1]])
  assert.deepEqual(result.lines, [
    'board: campi non scritti: "Mario" non è tra i membri del workspace',
    'board: creata "Design" in Backlog ("Stopped") (la priorità "Urgente" non c\'è (ci sono: Alta, Media, Normale, Delivered))',
    'board: creata "Backend, le note" in Backlog ("Stopped")',
    'board: 2 card: 2 create, 0 cambiate, 0 già allineate',
  ])
  assert.deepEqual(board.infinity.card('M1 step 1').members, [53509])
  assert.equal(board.infinity.card('M1 step 1').referent, undefined)
})

test("Infinity: senza INFINITY_TOKEN nell'ambiente il token viene da .env.local, e quello dell'ambiente vale di più", () => {
  for (const line of ['INFINITY_TOKEN = token-di-prova', 'export INFINITY_TOKEN="token-di-prova"']) {
    const board = infinitySession({ files: { '.env.local': `SITE_URL = https://bicipro.it\n# INFINITY_TOKEN = vecchio\n${line}\n` } })
    const result = board.run(['check'], { env: { INFINITY_TOKEN: '' } })
    assert.match(result.lines[0], /^board: collegato a "bici\.pro"/)
    assert.ok(board.infinity.calls().length > 0)
  }
  const board = infinitySession({ files: { '.env.local': 'INFINITY_TOKEN = token-di-prova\n' } })
  const wrong = board.run(['check'], { infinityMode: 'unauthorized' })
  assert.deepEqual(wrong.lines, ['board: non aggiornata: Infinity non accetta il token: controlla INFINITY_TOKEN'])
  const empty = infinitySession({ files: { '.env.local': 'INFINITY_TOKEN =\n' } })
  assert.deepEqual(empty.run(['check'], { env: { INFINITY_TOKEN: '' } }).lines, [
    'board: nessun Project collegato: la board è su Infinity e manca INFINITY_TOKEN',
  ])
})

// Gli step 1 e 2 con le loro cose da fare, una già fatta.
const todoPlan = [
  { ...plan[0], todo: [{ text: 'schermate della lista piena', done: true }, { text: 'la lista vuota', done: false }] },
  { ...plan[1], todo: [{ text: 'GET /notes' }] },
]
const todoOf = (card) => card.todo?.map(({ name, done }) => ({ name, done }))

test('Infinity: le cose da fare vanno nel campo checklist, con le spunte del piano, e non nel testo', () => {
  const board = infinitySession()
  assert.deepEqual(syncPlan(board, todoPlan).lines, [
    'board: creata "Design" in Backlog ("Stopped")',
    'board: creata "Backend, le note" in Backlog ("Stopped")',
    'board: 2 card: 2 create, 0 cambiate, 0 già allineate',
  ])
  const card = board.infinity.card('M1 step 1')
  assert.deepEqual(todoOf(card), [
    { name: 'schermate della lista piena', done: true },
    { name: 'la lista vuota', done: false },
  ])
  assert.doesNotMatch(card.html, /lista vuota|lista piena/)
  assert.deepEqual(todoOf(board.infinity.card('M1 step 2')), [{ name: 'GET /notes', done: false }])
})

test('Infinity: sync con le stesse cose da fare non scrive; una voce fatta cambia la sua spunta e le voci tengono il loro id', () => {
  const board = infinitySession()
  syncPlan(board, todoPlan)
  const writesBefore = board.infinity.writes().length
  assert.deepEqual(syncPlan(board, todoPlan).lines, ['board: 2 card: 0 create, 0 cambiate, 2 già allineate'])
  assert.equal(board.infinity.writes().length, writesBefore)
  const ids = board.infinity.card('M1 step 1').todo.map((item) => item.id)
  const todo = [
    { text: 'schermate della lista piena', done: true },
    { text: 'la lista vuota', done: true },
    { text: 'la lista lunga', done: false },
  ]
  assert.deepEqual(syncPlan(board, [{ ...todoPlan[0], todo }]).lines, [
    'board: "Design": cose da fare aggiornate',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  const card = board.infinity.card('M1 step 1')
  assert.deepEqual(todoOf(card), todo.map(({ text, done }) => ({ name: text, done })))
  assert.deepEqual(card.todo.slice(0, 2).map((item) => item.id), ids)
})

test('Infinity: una spunta messa a mano sulla board torna come dice il piano', () => {
  const board = infinitySession()
  syncPlan(board, todoPlan)
  const state = board.infinity.state()
  const card = state.items.find((item) => item.values.some((value) => value.data === 'Backend, le note'))
  card.values.find((value) => value.attribute_id === attributeIds.checklist).data[0].done = true
  board.infinity.save(state)
  assert.deepEqual(syncPlan(board, [todoPlan[1]]).lines, [
    'board: "Backend, le note": cose da fare aggiornate',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.deepEqual(todoOf(board.infinity.card('M1 step 2')), [{ name: 'GET /notes', done: false }])
})

test('Infinity: senza campo checklist nella cartella sync lo dice una volta e fa le card senza le cose da fare', () => {
  const folders = initialState().folders.map((folder) => ({
    ...folder,
    attribute_ids: folder.attribute_ids.filter((id) => id !== attributeIds.checklist),
  }))
  const board = infinitySession({ infinityState: { folders } })
  assert.deepEqual(syncPlan(board, todoPlan).lines, [
    'board: la cartella "Sviluppo" non ha un campo checklist: le cose da fare restano solo nel piano',
    'board: creata "Design" in Backlog ("Stopped")',
    'board: creata "Backend, le note" in Backlog ("Stopped")',
    'board: 2 card: 2 create, 0 cambiate, 0 già allineate',
  ])
  assert.equal(board.infinity.card('M1 step 1').todo, undefined)
  assert.doesNotMatch(board.infinity.card('M1 step 1').html, /lista vuota/)
  assert.deepEqual(syncPlan(board, todoPlan).lines.slice(1), ['board: 2 card: 0 create, 0 cambiate, 2 già allineate'])
  assert.deepEqual(syncPlan(board, plan.slice(0, 2)).lines, ['board: 2 card: 0 create, 0 cambiate, 2 già allineate'])
})

test('GitHub: le cose da fare stanno nel testo come lista con le caselle, prima della riga dello step', () => {
  const board = session()
  syncPlan(board, todoPlan)
  assert.equal(
    board.card('M1 step 1').body,
    `${plan[0].body}\n\n- [x] schermate della lista piena\n- [ ] la lista vuota\n\nStep 1 del piano M1`,
  )
  const writesBefore = board.writes().length
  assert.deepEqual(syncPlan(board, todoPlan).lines, ['board: 2 card: 0 create, 0 cambiate, 2 già allineate'])
  assert.equal(board.writes().length, writesBefore)
  const done = [{ ...todoPlan[1], todo: [{ text: 'GET /notes', done: true }] }]
  assert.deepEqual(syncPlan(board, done).lines, [
    'board: "Backend, le note": testo aggiornato',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.match(board.card('M1 step 2').body, /\n\n- \[x\] GET \/notes\n\nStep 2 del piano M1$/)
})

// L'uscita di show: un array JSON su più righe.
const shown = (board, ...args) => JSON.parse(board.run(['show', ...args]).lines.join('\n'))
const todoItems = (card) => card.todo.map(({ text, done }) => ({ text, done: done === true }))

test('Infinity: show dà le card come le vuole sync, e rimandate a sync non cambiano', () => {
  const board = infinitySession()
  syncPlan(board, [{ ...todoPlan[0], status: 'In progress' }, todoPlan[1]])
  const cards = shown(board, 'M1')
  assert.deepEqual(cards, [
    { key: 'M1 step 1', title: 'Design', body: plan[0].body, todo: todoItems(todoPlan[0]), status: 'In progress' },
    { key: 'M1 step 2', title: 'Backend, le note', body: plan[1].body, todo: todoItems(todoPlan[1]), status: 'Backlog' },
  ])
  const writesBefore = board.infinity.writes().length
  assert.deepEqual(syncPlan(board, cards).lines, ['board: 2 card: 0 create, 0 cambiate, 2 già allineate'])
  assert.equal(board.infinity.writes().length, writesBefore)
  assert.deepEqual(shown(board, 'M1 step 2'), [cards[1]])
  assert.deepEqual(shown(board), cards)
  assert.deepEqual(board.run(['show', 'M2']).lines, ['board: nessuna card per "M2"'])
  assert.equal(board.infinity.writes().length, writesBefore)
})

test('Infinity: sync con solo le cose da fare e lo stato tiene titolo e testo; con solo il titolo tiene il resto', () => {
  const board = infinitySession()
  syncPlan(board, todoPlan)
  const before = board.infinity.card('M1 step 1')
  const todo = [{ text: 'schermate della lista piena', done: true }, { text: 'la lista vuota', done: true }]
  assert.deepEqual(syncPlan(board, [{ key: 'M1 step 1', todo, status: 'Done' }]).lines, [
    'board: "Design": cose da fare aggiornate, ora in Done',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  const after = board.infinity.card('M1 step 1')
  assert.deepEqual({ title: after.title, html: after.html, column: after.column }, { title: 'Design', html: before.html, column: 'Done' })
  assert.deepEqual(todoOf(after), todo.map(({ text, done }) => ({ name: text, done })))
  assert.deepEqual(syncPlan(board, [{ key: 'M1 step 2', title: 'Le note nel backend' }]).lines, [
    'board: "Le note nel backend": testo aggiornato',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.deepEqual(shown(board, 'M1 step 2'), [
    { key: 'M1 step 2', title: 'Le note nel backend', body: plan[1].body, todo: [{ text: 'GET /notes', done: false }], status: 'Backlog' },
  ])
})

test('GitHub: show legge le cose da fare dal fondo del testo; sync con solo le spunte tiene titolo e testo', () => {
  const board = session()
  syncPlan(board, todoPlan)
  const cards = shown(board)
  assert.deepEqual(cards, [
    { key: 'M1 step 1', title: 'Design', body: plan[0].body, todo: todoItems(todoPlan[0]), status: 'Backlog' },
    { key: 'M1 step 2', title: 'Backend, le note', body: plan[1].body, todo: todoItems(todoPlan[1]), status: 'Backlog' },
  ])
  const writesBefore = board.writes().length
  assert.deepEqual(syncPlan(board, cards).lines, ['board: 2 card: 0 create, 0 cambiate, 2 già allineate'])
  assert.equal(board.writes().length, writesBefore)
  assert.deepEqual(syncPlan(board, [{ key: 'M1 step 2', todo: [{ text: 'GET /notes', done: true }], status: 'Done' }]).lines, [
    'board: "Backend, le note": testo aggiornato, ora in Done',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  const card = board.card('M1 step 2')
  assert.equal(card.title, 'Backend, le note')
  assert.equal(card.body, `${plan[1].body}\n\n- [x] GET /notes\n\nStep 2 del piano M1`)
  assert.equal(card.state, 'CLOSED')
})

test('GitHub: il testo scritto sotto la riga dello step resta, e le cose da fare si leggono e si spuntano senza doppioni', () => {
  const issue = {
    id: 'PVTI_1', kind: 'Issue', contentId: 'I_1', number: 1, title: 'Design', status: 'In progress',
    body: 'Cosa fa.\n\n- [ ] a\n- [x] b\n\nStep 1 del piano M1\n\nCloses #12',
    state: 'OPEN', assignees: [], labels: [], milestone: 'M1', type: null, fields: {},
  }
  const board = session({ state: { items: [issue], nextId: 2 } })
  assert.deepEqual(shown(board), [
    { key: 'M1 step 1', title: 'Design', body: 'Cosa fa.\n\nCloses #12', todo: [{ text: 'a', done: false }, { text: 'b', done: true }], status: 'In progress' },
  ])
  syncPlan(board, [{ key: 'M1 step 1', todo: [{ text: 'a', done: true }, { text: 'b', done: true }] }])
  assert.equal(board.card('M1 step 1').body, 'Cosa fa.\n\nCloses #12\n\n- [x] a\n- [x] b\n\nStep 1 del piano M1')
})

test('Infinity: sync con solo le cose da fare non riscrive il testo, che tiene link e formattazione', () => {
  const board = infinitySession()
  syncPlan(board, [todoPlan[0]])
  const state = board.infinity.state()
  const html = '<p>Vedi <a href="https://figma.com/x">il Figma</a> e <strong>attenzione</strong></p><ul><li>uno</li></ul><p>Step 1 del piano M1</p>'
  state.items[0].values.find((value) => value.attribute_id === attributeIds.description).data = html
  board.infinity.save(state)
  const todo = [{ text: 'schermate della lista piena', done: true }, { text: 'la lista vuota', done: true }]
  assert.deepEqual(syncPlan(board, [{ key: 'M1 step 1', todo }]).lines, [
    'board: "Design": cose da fare aggiornate',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.equal(board.infinity.card('M1 step 1').html, html)
  assert.deepEqual(board.infinity.writes().at(-1).body.values.map((value) => value.attribute_id), [attributeIds.checklist])
})

test('GitHub: show non dà le card nella colonna di archive tutta sua, che rimandate a sync riaprirebbero la issue', () => {
  const statusField = { id: 'PVTSSF_1', name: 'Status', dataType: 'SINGLE_SELECT', options: ['Backlog', 'Ready', 'Done', 'Archived'].map((name, index) => ({ id: `OPT_${index}`, name })) }
  const board = session({ config: { service: 'github', columns: { archive: 'Archived' } }, state: { fields: [statusField] } })
  syncPlan(board, plan.slice(0, 2))
  assert.deepEqual(board.run(['archive', 'M1 step 1']).lines, ['board: archiviata "Design": ora è in Archived'])
  assert.deepEqual(shown(board).map((card) => card.key), ['M1 step 2'])
})

test('show: le card scritte prima con la key nel titolo hanno il titolo senza key, quelle non della skill nessuna key', () => {
  const items = [
    { id: 'PVTI_1', kind: 'DraftIssue', contentId: 'DI_1', title: 'M1 step 10: Chiusura', body: 'Testo vecchio.', status: 'Ready' },
    {
      id: 'PVTI_2', kind: 'Issue', contentId: 'I_2', number: 2, title: 'Il login non va', body: 'Scritta a mano.\n\n- [ ] capire perché', status: 'In progress',
      state: 'OPEN', assignees: [], labels: [], milestone: null, type: null, fields: {},
    },
  ]
  const board = session({ state: { items, nextId: 3 } })
  assert.deepEqual(shown(board), [
    { key: 'M1 step 10', title: 'Chiusura', body: 'Testo vecchio.', todo: [], status: 'Ready' },
    { title: 'Il login non va', body: 'Scritta a mano.', todo: [{ text: 'capire perché', done: false }], status: 'In progress' },
  ])
  assert.deepEqual(board.run(['show', 'M1 step 1']).lines, ['board: nessuna card per "M1 step 1"'])
})

test('la card di una domanda dice nell\'ultima riga di quale piano è', () => {
  const board = session()
  const question = { key: 'M1 domanda 2', title: 'Le parole contano anche i numeri?', body: `Proposta: sì.\n\nStep: M1 step 1\n\nRepo: app\n${planLink}` }
  syncPlan(board, [question])
  assert.match(board.card('M1 domanda 2').body, /\n\nDomanda 2 del piano M1$/)
  assert.deepEqual(board.run(['move', 'M1 domanda 2', 'Done']).lines, ['board: "Le parole contano anche i numeri?" ora è in Done'])
})

test('le bozze con la key nel titolo, scritte prima, si ritrovano: move le sposta e sync le fa issue con il titolo nuovo', () => {
  const items = [
    { id: 'PVTI_1', kind: 'DraftIssue', contentId: 'DI_1', title: 'M1 step 10: Chiusura', body: 'Testo vecchio.', status: 'Backlog' },
    { id: 'PVTI_2', kind: 'DraftIssue', contentId: 'DI_2', title: 'M1 step 1: Design', body: 'Testo vecchio.', status: 'Backlog' },
  ]
  const board = session({ state: { items, nextId: 3 } })
  assert.deepEqual(board.run(['move', 'M1 step 1', 'Ready']).lines, ['board: "M1 step 1: Design" ora è in Ready'])
  assert.deepEqual(syncPlan(board, [plan[0], plan[2]]).lines, [
    'board: "Design": ora è la issue #3, testo aggiornato',
    'board: "Chiusura": ora è la issue #4, testo aggiornato',
    'board: 2 card: 0 create, 2 cambiate, 0 già allineate',
  ])
  assert.deepEqual(board.items().map(({ kind, milestone }) => ({ kind, milestone })), [
    { kind: 'Issue', milestone: 'M1' },
    { kind: 'Issue', milestone: 'M1' },
  ])
  assert.deepEqual(board.items().map(({ title, status }) => ({ title, status })), [
    { title: 'Chiusura', status: 'Backlog' },
    { title: 'Design', status: 'Ready' },
  ])
  assert.equal(board.card('M1 step 1').body, `${plan[0].body}\n\nStep 1 del piano M1`)
  assert.deepEqual(syncPlan(board, [plan[0], plan[2]]).lines, ['board: 2 card: 0 create, 0 cambiate, 2 già allineate'])
})

test('Infinity: in una cartella senza testo lungo la key resta nel titolo, e sync e move ritrovano la card', () => {
  const folders = initialState().folders.map((folder) => ({
    ...folder,
    attribute_ids: folder.attribute_ids.filter((id) => id !== attributeIds.description),
  }))
  const board = infinitySession({ infinityState: { folders } })
  assert.deepEqual(syncPlan(board, [todoPlan[0]]).lines, [
    'board: creata "M1 step 1: Design" in Backlog ("Stopped")',
    'board: 1 card: 1 create, 0 cambiate, 0 già allineate',
  ])
  assert.deepEqual(syncPlan(board, [todoPlan[0]]).lines, ['board: 1 card: 0 create, 0 cambiate, 1 già allineate'])
  assert.deepEqual(board.run(['move', 'M1 step 1', 'Ready']).lines, ['board: "M1 step 1: Design" ora è in Ready ("To-do")'])
  assert.equal(board.infinity.cards().length, 1)
  assert.deepEqual(todoOf(board.infinity.card('M1 step 1')), [
    { name: 'schermate della lista piena', done: true },
    { name: 'la lista vuota', done: false },
  ])
})

// Le issue di GitHub: le stesse proprietà delle card di Infinity.

// Un Project con i campi di bici.pro: priorità, reparto e referente.
const projectFields = [
  { id: 'PVTSSF_1', name: 'Status', dataType: 'SINGLE_SELECT', options: ['Backlog', 'Ready', 'In progress', 'In review', 'Done'].map((name, index) => ({ id: `OPT_${index}`, name })) },
  { id: 'PVTSSF_priority', name: 'Priorità', dataType: 'SINGLE_SELECT', options: ['Alta', 'Media', 'Normale'].map((name) => ({ id: `OPT_${name}`, name })) },
  { id: 'PVTSSF_department', name: 'Reparto', dataType: 'SINGLE_SELECT', options: ['Develop', 'Design'].map((name) => ({ id: `OPT_${name}`, name })) },
  { id: 'PVTF_referent', name: 'Referente', dataType: 'TEXT' },
]
const githubConfig = {
  service: 'github',
  fields: { Responsabile: 'dido', Referente: 'Lorenzo Furno', Reparto: 'develop' },
  assignee: 'Responsabile',
  priority: 'Priorità',
}
const githubSession = (options = {}) => session({ config: githubConfig, state: { fields: projectFields }, ...options })

test('GitHub: sync crea issue del repo, aggiunte al Project, nella milestone del piano', () => {
  const board = session()
  syncPlan(board)
  const cards = board.items()
  assert.deepEqual(cards.map(({ kind, inProject, state, milestone }) => ({ kind, inProject, state, milestone })),
    Array(3).fill({ kind: 'Issue', inProject: true, state: 'OPEN', milestone: 'M1' }))
  assert.deepEqual(cards.map((item) => item.number), [1, 2, 3])
  // La milestone del piano si crea una volta sola.
  assert.equal(board.calls().filter((call) => call.operation === 'RestMilestone').length, 1)
  assert.ok(board.calls().every((call) => call.operation !== 'BoardAddDraft'))
})

test('GitHub: il tipo va nel tipo della issue, e un tipo che il repo non ha diventa una label creata una volta', () => {
  const board = session()
  const question = { key: 'M1 domanda 2', title: 'Le parole contano anche i numeri?', body: `Proposta: sì.\n\nStep: M1 step 1\n\nRepo: app\n${planLink}`, type: 'Domanda' }
  syncPlan(board, [{ ...plan[0], type: 'Feature' }, { ...plan[1], type: 'bug' }, question])
  assert.deepEqual([board.card('M1 step 1').type, board.card('M1 step 2').type], ['Feature', 'Bug'])
  assert.deepEqual([board.card('M1 domanda 2').type, board.card('M1 domanda 2').labels], [null, ['Domanda']])
  const writesBefore = board.writes().length
  syncPlan(board, [{ ...plan[0], type: 'Feature' }, { ...plan[1], type: 'bug' }, question])
  assert.equal(board.writes().length, writesBefore)
  assert.deepEqual(syncPlan(board, [{ ...plan[0], type: 'Task' }]).lines, [
    'board: "Design": tipo Task',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.equal(board.calls().filter((call) => call.operation === 'BoardCreateLabel').length, 1)
})

test('GitHub: assegnatario, referente, reparto e priorità come su Infinity; la seconda sync non scrive', () => {
  const board = githubSession()
  const result = syncPlan(board, [{ ...plan[0], priority: 'Alta', status: 'Ready' }, { ...plan[1], priority: 'normale', assignee: 'lorenzo' }])
  assert.deepEqual(result.lines, [
    'board: creata "Design" in Ready (priorità Alta)',
    'board: creata "Backend, le note" in Backlog (priorità Normale)',
    'board: 2 card: 2 create, 0 cambiate, 0 già allineate',
  ])
  assert.deepEqual(board.items().map(({ assignees, fields }) => ({ assignees, fields })), [
    { assignees: ['dido'], fields: { Referente: 'Lorenzo Furno', Reparto: 'Develop', Priorità: 'Alta' } },
    { assignees: ['lorenzo'], fields: { Referente: 'Lorenzo Furno', Reparto: 'Develop', Priorità: 'Normale' } },
  ])
  const writesBefore = board.writes().length
  assert.deepEqual(syncPlan(board, [{ ...plan[0], priority: 'Alta' }, { ...plan[1], priority: 'normale', assignee: 'lorenzo' }]).lines,
    ['board: 2 card: 0 create, 0 cambiate, 2 già allineate'])
  assert.equal(board.writes().length, writesBefore)
})

test('GitHub: i campi scritti dalla persona restano, la priorità e l\'assegnatario del piano cambiano', () => {
  const board = githubSession()
  syncPlan(board, [{ ...plan[0], priority: 'Alta' }])
  const state = JSON.parse(readFileSync(board.statePath, 'utf8'))
  Object.assign(state.items[0], { assignees: ['lorenzo'], fields: { ...state.items[0].fields, Reparto: 'Design' } })
  writeFileSync(board.statePath, JSON.stringify(state))
  assert.deepEqual(syncPlan(board, [{ ...plan[0], priority: 'Media' }]).lines, [
    'board: "Design": priorità Media',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.deepEqual(board.card('M1 step 1').assignees, ['lorenzo'])
  assert.equal(board.card('M1 step 1').fields.Reparto, 'Design')
  assert.deepEqual(syncPlan(board, [{ ...plan[0], priority: 'Media', assignee: 'dido' }]).lines, [
    'board: "Design": assegnata a dido',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
})

test('GitHub: un login che non si può assegnare e un campo che il Project non ha non fermano la sync', () => {
  const board = session({ config: { ...githubConfig, fields: { Responsabile: 'pippo', Referente: 'Lorenzo Furno' }, priority: undefined } })
  const result = syncPlan(board, [plan[0]])
  assert.deepEqual(result.lines, [
    'board: campi non scritti: "pippo" non si può assegnare in acme/notes-app; il campo "Referente" non c\'è nel Project',
    'board: creata "Design" in Backlog',
    'board: 1 card: 1 create, 0 cambiate, 0 già allineate',
  ])
  assert.deepEqual(board.card('M1 step 1').assignees, [])
})

test('GitHub: check dice i campi di board.json e quelli che non si scrivono', () => {
  assert.deepEqual(githubSession().run(['check']).lines.slice(1), [
    'board: campi: Responsabile → dido (assegnatario), Referente → Lorenzo Furno, Reparto → develop, priorità in Priorità; tipi delle issue: Task, Bug, Feature',
  ])
  const board = session({ config: githubConfig })
  assert.deepEqual(board.run(['check']).lines.slice(1), [
    'board: campi: Responsabile → dido (assegnatario), Referente → Lorenzo Furno, Reparto → develop, priorità in Priorità; non scritti: il campo "Referente" non c\'è nel Project; il campo "Reparto" non c\'è nel Project; la priorità "Priorità" non è un campo a scelta del Project; tipi delle issue: Task, Bug, Feature',
  ])
})

test('GitHub: in Done la issue si chiude, tornando indietro si riapre', () => {
  const board = session()
  syncPlan(board)
  assert.deepEqual(board.run(['move', 'M1 step 1', 'Done']).lines, ['board: "Design" ora è in Done'])
  assert.deepEqual([board.card('M1 step 1').state, board.card('M1 step 1').stateReason], ['CLOSED', 'COMPLETED'])
  board.run(['move', 'M1 step 1', 'In progress'])
  assert.equal(board.card('M1 step 1').state, 'OPEN')
  syncPlan(board, [{ key: 'M1 step 2', status: 'Done' }])
  assert.equal(board.card('M1 step 2').state, 'CLOSED')
})

test('GitHub: una issue chiusa a mano resta chiusa con una sync senza stato', () => {
  const board = session()
  syncPlan(board)
  const state = JSON.parse(readFileSync(board.statePath, 'utf8'))
  Object.assign(state.items[0], { state: 'CLOSED', stateReason: 'COMPLETED' })
  writeFileSync(board.statePath, JSON.stringify(state))
  assert.deepEqual(syncPlan(board).lines, ['board: 3 card: 0 create, 0 cambiate, 3 già allineate'])
  assert.equal(board.card('M1 step 1').state, 'CLOSED')
})

test('GitHub: le bozze con la riga dello step diventano issue alla prima sync, nella stessa colonna', () => {
  const items = [{ id: 'PVTI_1', kind: 'DraftIssue', contentId: 'DI_1', title: 'Design', body: `${plan[0].body}\n\nStep 1 del piano M1`, status: 'In progress' }]
  const board = session({ state: { items, nextId: 2 } })
  assert.deepEqual(syncPlan(board, [{ ...plan[0], type: 'Task' }]).lines, [
    'board: "Design": ora è la issue #2, tipo Task',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.deepEqual(
    (({ kind, status, milestone, type }) => ({ kind, status, milestone, type }))(board.card('M1 step 1')),
    { kind: 'Issue', status: 'In progress', milestone: 'M1', type: 'Task' },
  )
  assert.equal(board.items().length, 1)
})

test('GitHub: una issue tolta dal Project si ritrova nel repo e torna sulla board, senza doppioni', () => {
  const board = session()
  syncPlan(board)
  const state = JSON.parse(readFileSync(board.statePath, 'utf8'))
  state.items[1].inProject = false
  writeFileSync(board.statePath, JSON.stringify(state))
  assert.deepEqual(syncPlan(board, [plan[1]]).lines, [
    'board: "Backend, le note": tornata sulla board, ora in Backlog',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.equal(board.items().length, 3)
  assert.equal(board.card('M1 step 2').number, 2)
})

test('GitHub: la milestone che lo step dice vale sopra quella del piano', () => {
  const board = session()
  syncPlan(board, [{ ...plan[0], milestone: 'MVP' }])
  assert.equal(board.card('M1 step 1').milestone, 'MVP')
  assert.deepEqual(syncPlan(board, [{ ...plan[0], milestone: 'M1' }]).lines, [
    'board: "Design": milestone M1',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
})

test('GitHub: close-milestone chiude la milestone del piano, una volta', () => {
  const board = session()
  syncPlan(board)
  assert.deepEqual(board.run(['close-milestone', 'M1']).lines, ['board: chiusa la milestone "M1"'])
  assert.deepEqual(board.run(['close-milestone', 'M1']).lines, ['board: la milestone "M1" è già chiusa'])
  assert.deepEqual(board.run(['close-milestone', 'M7']).lines, ['board: nessuna milestone "M7" nel repo'])
})

// Una cartella di Infinity con gli attributi del tipo e della milestone.
const typedFolderState = () => {
  const state = initialState()
  // Gli id a mano: labelId darebbe lo stesso id a M1 e M2.
  const labels = (names) => names.map((name) => ({ id: `lbl-attr-${name}`, name, color: '#92F3EC' }))
  state.attributes.push(
    { id: 'attr-type', object: 'attribute', name: 'Tipo', type: 'label', settings: { multiple: false, labels: labels(['Task', 'Bug', 'Feature', 'Domanda']) }, deleted: false },
    { id: 'attr-milestone', object: 'attribute', name: 'Milestone', type: 'label', settings: { multiple: false, labels: labels(['M1', 'M2']) }, deleted: false },
  )
  state.folders[0].attribute_ids.push('attr-type', 'attr-milestone')
  return { attributes: state.attributes, folders: state.folders }
}
const typedConfig = { ...assignedConfig, assignee: 'Responsabile', type: 'Tipo', milestone: 'Milestone' }

test('Infinity: tipo, milestone e chi prende la card vanno nei loro attributi, se board.json li nomina', () => {
  const board = infinitySession({ config: typedConfig, infinityState: typedFolderState() })
  syncPlan(board, [{ ...plan[0], type: 'Feature' }, { ...plan[1], type: 'Bug', assignee: 'Lorenzo Furno', milestone: 'M2' }])
  const raw = board.infinity.state().items.map((item) => Object.fromEntries(item.values.map((value) => [value.attribute_id, value.data])))
  assert.deepEqual(raw.map((values) => [values['attr-type'], values['attr-milestone'], values[attributeIds.members]]), [
    [['lbl-attr-Feature'], ['lbl-attr-M1'], [53509]],
    [['lbl-attr-Bug'], ['lbl-attr-M2'], [51103]],
  ])
  const writesBefore = board.infinity.writes().length
  syncPlan(board, [{ ...plan[0], type: 'Feature' }, { ...plan[1], type: 'Bug', assignee: 'Lorenzo Furno', milestone: 'M2' }])
  assert.equal(board.infinity.writes().length, writesBefore)
  assert.deepEqual(syncPlan(board, [{ ...plan[0], type: 'Task', assignee: 'Lorenzo Furno', milestone: 'M2' }]).lines, [
    'board: "Design": tipo Task, milestone M2, assegnata a Lorenzo Furno',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
})

test('Infinity: senza type e milestone in board.json le card restano come prima; un valore che non c\'è lo dice', () => {
  const plain = infinitySession({ infinityState: typedFolderState() })
  syncPlan(plain, [{ ...plan[0], type: 'Feature' }])
  assert.deepEqual(plain.infinity.state().items[0].values.map((value) => value.attribute_id).filter((id) => id.startsWith('attr-')), [])
  const board = infinitySession({ config: typedConfig, infinityState: typedFolderState() })
  assert.deepEqual(syncPlan(board, [{ ...plan[0], type: 'Chore', milestone: 'M9' }]).lines, [
    'board: creata "Design" in Backlog ("Stopped") (il tipo "Chore" non c\'è in Tipo (ci sono: Task, Bug, Feature, Domanda), la milestone "M9" non c\'è in Milestone (ci sono: M1, M2))',
    'board: 1 card: 1 create, 0 cambiate, 0 già allineate',
  ])
})

test('su Infinity close-milestone non scrive niente', () => {
  const board = infinitySession({ config: typedConfig, infinityState: typedFolderState() })
  assert.deepEqual(board.run(['close-milestone', 'M1']).lines, ['board: su Infinity la milestone è un\'etichetta: non si chiude'])
  assert.equal(board.infinity.writes().length, 0)
})

test('GitHub: una issue chiusa come completata e tolta dal Project torna in Done, chiusa', () => {
  const board = session()
  syncPlan(board, [plan[0]])
  board.run(['move', 'M1 step 1', 'Done'])
  const state = JSON.parse(readFileSync(board.statePath, 'utf8'))
  state.items[0].inProject = false
  writeFileSync(board.statePath, JSON.stringify(state))
  assert.deepEqual(syncPlan(board, [plan[0]]).lines, [
    'board: "Design": tornata sulla board, ora in Done',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.deepEqual([board.card('M1 step 1').status, board.card('M1 step 1').state], ['Done', 'CLOSED'])
})

test('GitHub: una bozza in Done convertita in issue si chiude, con sync o move nella stessa colonna', () => {
  const items = [
    { id: 'PVTI_1', kind: 'DraftIssue', contentId: 'DI_1', title: 'Design', body: `${plan[0].body}\n\nStep 1 del piano M1`, status: 'Done' },
    { id: 'PVTI_2', kind: 'DraftIssue', contentId: 'DI_2', title: 'Backend, le note', body: `${plan[1].body}\n\nStep 2 del piano M1`, status: 'Done' },
  ]
  const board = session({ state: { items, nextId: 3 } })
  assert.deepEqual(syncPlan(board, [{ key: 'M1 step 1', status: 'Done' }]).lines, [
    'board: "Design": ora è la issue #3, issue chiusa',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.deepEqual([board.card('M1 step 1').state, board.card('M1 step 1').stateReason], ['CLOSED', 'COMPLETED'])
  syncPlan(board, [plan[1]])
  assert.equal(board.card('M1 step 2').state, 'OPEN')
  assert.deepEqual(board.run(['move', 'M1 step 2', 'Done']).lines, ['board: "Backend, le note" è già in Done: issue chiusa'])
  assert.equal(board.card('M1 step 2').state, 'CLOSED')
  assert.deepEqual(board.run(['move', 'M1 step 2', 'Done']).lines, ['board: "Backend, le note" è già in Done'])
})

test('GitHub: archive in una colonna dove la card è già chiude la issue come non pianificata', () => {
  const board = session({ config: { service: 'github', columns: { archive: 'Done' } } })
  syncPlan(board, [{ ...plan[0], status: 'Done' }])
  const state = JSON.parse(readFileSync(board.statePath, 'utf8'))
  Object.assign(state.items[0], { state: 'OPEN', stateReason: null })
  writeFileSync(board.statePath, JSON.stringify(state))
  assert.deepEqual(board.run(['archive', 'M1 step 1']).lines, ['board: archiviata "Design": era già in Done, issue chiusa'])
  assert.deepEqual([board.card('M1 step 1').state, board.card('M1 step 1').stateReason], ['CLOSED', 'NOT_PLANNED'])
})

test('GitHub: la card archiviata che torna nel piano esce dall\'archivio con la sua mutation', () => {
  const board = session()
  syncPlan(board, [plan[0]])
  board.run(['archive', 'M1 step 1'])
  syncPlan(board, [plan[0]])
  assert.ok(board.calls().some((call) => call.operation === 'BoardUnarchive'))
  assert.ok(board.calls().filter((call) => call.operation === 'BoardAddItem').length === 1)
  assert.deepEqual(syncPlan(board, [plan[0]]).lines, ['board: 1 card: 0 create, 0 cambiate, 1 già allineate'])
})
