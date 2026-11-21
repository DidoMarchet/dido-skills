// Le prove di board.mjs, la parte di dido-board che parla con GitHub, con fake-gh.mjs al posto
// di gh. Si lanciano dalla root del repo con: node --test evals/dido-board/board.test.mjs
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const boardScript = join(here, '../../skills/dido-board/board.mjs')
const fakeGh = join(here, 'fake-gh.mjs')
chmodSync(fakeGh, 0o755)

const planLink = 'Piano: https://github.com/acme/notes-app/blob/main/docs/plans/M1.md'
const plan = [
  { key: 'M1 step 1', title: 'Design', body: `Le schermate della lista delle note.\n\nRepo: app\n${planLink}` },
  { key: 'M1 step 2', title: 'Backend, le note', body: `Le rotte delle note, con i test.\n\nRepo: backend\n${planLink}` },
  { key: 'M1 step 10', title: 'Chiusura', body: `Report e "Dove siamo".\n\nRepo: app\n${planLink}` },
]

// Un repo di prova con il suo Project finto: state sono i campi del Project diversi da quelli di base.
const session = ({ state, origin = 'https://github.com/acme/notes-app.git', git = true } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'dido-board-'))
  const repo = join(root, 'repo')
  mkdirSync(repo)
  if (git) {
    execFileSync('git', ['init', '-q'], { cwd: repo })
    if (origin) execFileSync('git', ['remote', 'add', 'origin', origin], { cwd: repo })
  }
  const statePath = join(root, 'state.json')
  const logPath = join(root, 'calls.jsonl')
  if (state) writeFileSync(statePath, JSON.stringify(state))
  const run = (args, { mode = 'ok', input, env = {} } = {}) => {
    const started = Date.now()
    const result = spawnSync('node', [boardScript, ...args], {
      cwd: repo,
      input,
      encoding: 'utf8',
      env: { ...process.env, DIDO_BOARD_GH: fakeGh, FAKE_GH_STATE: statePath, FAKE_GH_LOG: logPath, FAKE_GH_MODE: mode, ...env },
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
  return { run, items, calls, writes, card }
}

const syncPlan = (board, cards = plan) => board.run(['sync', '-'], { input: JSON.stringify(cards) })

test('senza un Project collegato si ferma alla prima domanda e lo dice in una riga', () => {
  const board = session({ state: { linked: false } })
  const result = syncPlan(board)
  assert.equal(result.status, 0)
  assert.deepEqual(result.lines, ['board: nessun Project collegato a acme/notes-app'])
  assert.deepEqual(board.calls().map((call) => call.operation), ['BoardContext'])
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
