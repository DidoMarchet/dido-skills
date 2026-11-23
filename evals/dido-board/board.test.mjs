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
import { attributeIds, columnNames, departmentNames, folderId, labelId, priorityNames } from './fake-infinity.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const boardScript = join(here, '../../skills/dido-board/board.mjs')
const fakeGh = join(here, 'fake-gh.mjs')
const fakeInfinity = join(here, 'fake-infinity.mjs')
chmodSync(fakeGh, 0o755)

const planLink = 'Piano: https://github.com/acme/notes-app/blob/main/docs/plans/M1.md'
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
  const writes = () => calls().filter((call) => /Add|Edit|Set|Archive/.test(call.operation ?? ''))
  const card = (key) => items().find((item) => !item.archived && item.title.startsWith(`${key}:`))
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
      }
    })
  }
  infinity.card = (key) => infinity.cards().find((item) => item.title.startsWith(`${key}:`))
  return { run, items, calls, writes, card, infinity }
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

test('check dice il Project, il link e gli stati', () => {
  const result = session().run(['check'])
  assert.deepEqual(result.lines, [
    'board: collegato a "Writing App" (https://github.com/users/acme/projects/1), stati: Backlog, Ready, In progress, In review, Done',
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
    'board: creata "M1 step 1: Design" in Backlog',
    'board: creata "M1 step 2: Backend, le note" in Backlog',
    'board: creata "M1 step 10: Chiusura" in Backlog',
    'board: 3 card: 3 create, 0 cambiate, 0 già allineate',
  ])
  assert.deepEqual(
    board.items().map(({ title, body, status }) => ({ title, body, status })),
    plan.map(({ key, title, body }) => ({ title: `${key}: ${title}`, body, status: 'Backlog' })),
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
    'board: "M1 step 1: Design": testo aggiornato',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  assert.equal(board.card('M1 step 1').body, changed[0].body)
  assert.equal(board.card('M1 step 1').status, 'In progress')
})

test('sync con lo stato porta le card dove dice il piano, senza toccare titolo e testo', () => {
  const board = session()
  syncPlan(board)
  const result = syncPlan(board, [{ key: 'M1 step 1', status: 'Done' }, { key: 'M1 step 2', status: 'in progress' }])
  assert.deepEqual(result.lines, [
    'board: "M1 step 1: Design": ora in Done',
    'board: "M1 step 2: Backend, le note": ora in In progress',
    'board: 2 card: 0 create, 2 cambiate, 0 già allineate',
  ])
  assert.equal(board.card('M1 step 1').body, plan[0].body)
  assert.equal(board.card('M1 step 10').status, 'Backlog')
})

test('sync con solo key e stato riallinea le card che ci sono e segnala quelle che mancano, senza crearle', () => {
  const board = session()
  syncPlan(board, [plan[0]])
  const result = syncPlan(board, [{ key: 'M1 step 1', status: 'In review' }, { key: 'M1 step 2', status: 'Done' }])
  assert.deepEqual(result.lines, [
    'board: "M1 step 1: Design": ora in In review',
    'board: manca la card di "M1 step 2": rimanda lo step con title e body',
    'board: 2 card: 0 create, 1 cambiate, 0 già allineate, 1 mancanti',
  ])
  assert.equal(board.items().length, 1)
})

test('move sposta la card dello step giusto, anche con step 1 e step 10', () => {
  const board = session()
  // Lo step 10 per primo sulla board: una ricerca per inizio del titolo troverebbe lui.
  syncPlan(board, [plan[2], plan[0], plan[1]])
  const result = board.run(['move', 'M1 step 1', 'in progress'])
  assert.equal(result.status, 0)
  assert.deepEqual(result.lines, ['board: "M1 step 1: Design" ora è in In progress'])
  assert.equal(board.card('M1 step 1').status, 'In progress')
  assert.equal(board.card('M1 step 10').status, 'Backlog')
})

test('move verso lo stato che la card ha già non scrive niente', () => {
  const board = session()
  syncPlan(board)
  const writesBefore = board.writes().length
  assert.deepEqual(board.run(['move', 'M1 step 2', 'Backlog']).lines, ['board: "M1 step 2: Backend, le note" è già in Backlog'])
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

test('archive toglie la card, e lo step che torna nel piano ne ha una nuova', () => {
  const board = session()
  syncPlan(board)
  assert.deepEqual(board.run(['archive', 'M1 step 2']).lines, ['board: archiviata "M1 step 2: Backend, le note"'])
  assert.equal(board.card('M1 step 2'), undefined)
  syncPlan(board, [plan[1]])
  assert.equal(board.card('M1 step 2').status, 'Backlog')
  assert.equal(board.items().length, 4)
})

test('issue e pull request del Project non si toccano', () => {
  const issue = { id: 'PVTI_99', type: 'Issue', title: 'M1 step 1: una issue', body: '', status: 'Done' }
  const board = session({ state: { items: [issue], nextId: 100 } })
  syncPlan(board)
  assert.deepEqual(board.items().find((item) => item.id === 'PVTI_99'), issue)
  assert.equal(board.items().length, 4)
})

test('legge tutte le pagine della board', () => {
  const items = Array.from({ length: 150 }, (_, index) => ({
    id: `PVTI_${index + 1}`, draftId: `DI_${index + 1}`, title: `M9 step ${index + 1}: passo`, body: '', status: 'Backlog',
  }))
  const board = session({ state: { items, nextId: 151 } })
  assert.deepEqual(board.run(['move', 'M9 step 150', 'Done']).lines, ['board: "M9 step 150: passo" ora è in Done'])
  assert.equal(board.card('M9 step 150').status, 'Done')
})

test('un comando sbagliato risponde con una riga, esce con 0 e non chiama gh', () => {
  const cases = [
    [['sync', '-'], 'non è JSON', /^board: sync non riesce a leggere le card: /],
    [['sync', '-'], JSON.stringify([{ title: 'senza key' }]), /^board: sync vuole un array JSON/],
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
    'board: creata "M1 step 1: Design" in Backlog ("Stopped")',
    'board: creata "M1 step 2: Backend, le note" in Ready ("To-do")',
    'board: 2 card: 2 create, 0 cambiate, 0 già allineate',
  ])
  assert.deepEqual(
    board.infinity.cards().map(({ title, html, column }) => ({ title, html, column })),
    [
      {
        title: 'M1 step 1: Design',
        html: '<p>Le schermate della lista delle note.</p><p>Repo: app<br>Piano: https://github.com/acme/notes-app/blob/main/docs/plans/M1.md</p>',
        column: 'Stopped',
      },
      {
        title: 'M1 step 2: Backend, le note',
        html: '<p>Le rotte delle note, con i test.</p><p>Repo: backend<br>Piano: https://github.com/acme/notes-app/blob/main/docs/plans/M1.md</p>',
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
  assert.equal(board.infinity.card('M1 step 3').title, 'M1 step 3: Lista <vuota> & piena')
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
    'board: "M1 step 1: Design": testo aggiornato',
    'board: 1 card: 0 create, 1 cambiate, 0 già allineate',
  ])
  const card = board.infinity.card('M1 step 1')
  assert.equal(card.html, `<p>Le schermate della lista, anche vuota.</p><p>Repo: app<br>${planLink}</p>`)
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
    assert.deepEqual(board.run(['move', 'M1 step 10', status]).lines, [`board: "M1 step 10: Chiusura" ora è in ${label}`])
    assert.equal(board.infinity.card('M1 step 10').column, column)
    assert.equal(board.infinity.card('M1 step 1').column, 'Stopped')
  }
  assert.deepEqual(board.run(['move', 'M1 step 10', 'Backlog']).lines, ['board: "M1 step 10: Chiusura" è già in Backlog ("Stopped")'])
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
  assert.deepEqual(board.run(['archive', 'M1 step 2']).lines, ['board: archiviata "M1 step 2: Backend, le note": ora è in Done'])
  assert.equal(board.infinity.card('M1 step 2').column, 'Done')
  assert.deepEqual(board.run(['archive', 'M1 step 2']).lines, ['board: archiviata "M1 step 2: Backend, le note": era già in Done'])
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
  assert.deepEqual(board.run(['archive', 'M1 step 1']).lines, ['board: archiviata "M1 step 1: Design": ora è in Done'])
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
  assert.deepEqual(board.run(['move', 'M1 step 1', 'In review']).lines, ['board: "M1 step 1: Design" ora è in In review ("Done")'])
  assert.deepEqual(board.run(['archive', 'M1 step 2']).lines, ['board: archiviata "M1 step 2: Backend, le note": ora è in Done'])
  assert.equal(board.card('M1 step 2').status, 'Done')
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
    'board: creata "M1 step 1: Design" in Ready ("To-do") (priorità Alta)',
    'board: creata "M1 step 2: Backend, le note" in Backlog ("Stopped") (priorità Normale)',
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
    'board: "M1 step 1: Design": Referente lorenzo@example.com, Reparto develop, priorità Media',
    'board: "M1 step 2: Backend, le note": Responsabile Davide Marchet, Referente lorenzo@example.com, Reparto develop, priorità Alta',
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
    'board: creata "M1 step 1: Design" in Backlog ("Stopped") (la priorità "Urgente" non c\'è (ci sono: Alta, Media, Normale, Delivered))',
    'board: creata "M1 step 2: Backend, le note" in Backlog ("Stopped")',
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
