export const meta = {
  name: 'repo-audit',
  description: 'Analisi completa di un repo secondo la skill dido-code-style: contesto, ogni file letto, test, verifica avversariale, copertura',
  whenToUse: 'Quando Dido chiede di analizzare un repo, un modulo o una cartella con la skill dido-code-style',
  phases: [
    { title: 'Contesto', detail: 'CLAUDE.md, doc, memoria, git log, stack, comandi, gruppi di file' },
    { title: 'Analisi', detail: 'un agente per gruppo, ogni file letto per intero' },
    { title: 'Test', detail: 'test, lint, build, typecheck, audit delle dipendenze' },
    { title: 'Verifica', detail: 'scettici che provano a smentire ogni problema' },
    { title: 'Completezza', detail: 'file non letti o non assegnati' },
  ],
}

// Orchestrazione della "Full analysis" di SKILL.md (Parte 2). Checklist, criteri di
// verifica e gravità stanno solo in SKILL.md: gli agenti li leggono da lì, qui si
// decide soltanto chi fa cosa e come si combinano i risultati.

if (!args?.skill) throw new Error('Manca args.skill: percorso assoluto di SKILL.md della skill dido-code-style')

const SCOPE = args.scope ? [].concat(args.scope).join(', ') : null
const SEVERITIES = ['Alta', 'Media', 'Bassa']

const RULES = `Regole: leggi ${args.skill} fino all'intestazione "# 3." (Parte 1 e Parte 2: principi, checklist, criteri di verifica, gravità). Leggi la Parte 3 (backend Node) o la Parte 4 (Nuxt/Vue) solo se riguarda il codice che hai davanti. Testi in italiano.`

const FINDING = {
  type: 'object',
  properties: {
    severity: { type: 'string', enum: SEVERITIES },
    category: {
      type: 'string',
      enum: ['bug', 'side-effect', 'sicurezza', 'overengineering', 'codice-morto', 'semplicita', 'scalabilita', 'doc', 'test'],
    },
    file: { type: 'string' },
    line: { type: 'integer' },
    title: { type: 'string' },
    problem: { type: 'string' },
    evidence: { type: 'string' },
    fix: { type: 'string' },
  },
  required: ['severity', 'category', 'file', 'line', 'title', 'problem', 'evidence', 'fix'],
}

const CONTEXT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    stack: { type: 'string' },
    knownChoices: { type: 'array', items: { type: 'string' } },
    commands: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          purpose: { type: 'string', enum: ['test', 'lint', 'format', 'build', 'typecheck', 'audit'] },
          command: { type: 'string' },
          cwd: { type: 'string' },
          setup: { type: 'string' },
        },
        required: ['purpose', 'command', 'cwd', 'setup'],
      },
    },
    trackedFiles: { type: 'array', items: { type: 'string' } },
    excluded: {
      type: 'array',
      items: {
        type: 'object',
        properties: { reason: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } },
        required: ['reason', 'files'],
      },
    },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } },
        required: ['name', 'files'],
      },
    },
  },
  required: ['summary', 'stack', 'knownChoices', 'commands', 'trackedFiles', 'excluded', 'groups'],
}

const ANALYSIS = {
  type: 'object',
  properties: {
    filesRead: { type: 'array', items: { type: 'string' } },
    findings: { type: 'array', items: FINDING },
    notes: { type: 'string' },
  },
  required: ['filesRead', 'findings', 'notes'],
}

const CHECKS = {
  type: 'object',
  properties: {
    commands: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          purpose: { type: 'string' },
          command: { type: 'string' },
          status: { type: 'string', enum: ['ok', 'fallito', 'non eseguito'] },
          summary: { type: 'string' },
        },
        required: ['purpose', 'command', 'status', 'summary'],
      },
    },
    findings: { type: 'array', items: FINDING },
  },
  required: ['commands', 'findings'],
}

const VERDICT = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    severity: { type: 'string', enum: SEVERITIES },
    reason: { type: 'string' },
  },
  required: ['refuted', 'severity', 'reason'],
}

const VERDICTS = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { index: { type: 'integer' }, ...VERDICT.properties },
        required: ['index', ...VERDICT.required],
      },
    },
  },
  required: ['verdicts'],
}

const contextBlock = (ctx) =>
  [
    `Progetto: ${ctx.summary}`,
    `Stack: ${ctx.stack}`,
    'Scelte documentate e limiti noti, da NON segnalare come problemi:',
    ...(ctx.knownChoices.length ? ctx.knownChoices.map((c) => `- ${c}`) : ['- nessuna']),
  ].join('\n')

const contextPrompt = `Prepara l'analisi completa del repository nella directory corrente${SCOPE ? `, limitata a: ${SCOPE}` : ''}.

${RULES}

Il tuo compito è l'inventario, non l'analisi: leggi solo ciò che serve ai punti qui sotto, senza studiare il codice né confrontarlo con le doc.

1. Leggi i CLAUDE.md, l'indice delle doc, il file dei limiti noti se esiste${args.memoryDir ? `, la memoria in ${args.memoryDir} (MEMORY.md e i file che indica)` : ''} e git log --oneline -30.
2. summary: cos'è il progetto e com'è fatto, in poche righe. stack: linguaggi, framework e strumenti, in una riga.
3. knownChoices: le scelte documentate come volute, fuori scope o limiti noti, e le segnalazioni già scartate in passato, ognuna con la fonte ("scelta — fonte").
4. commands: come si lanciano test, lint, format, build, typecheck e audit delle dipendenze${SCOPE ? ' per il codice dello scope' : ''}, ricavati da CLAUDE.md, doc, package.json, Makefile. setup: i prerequisiti documentati (DB isolato, variabili d'ambiente, servizi). Non lanciarli.
5. trackedFiles: l'elenco completo dei file tracciati${SCOPE ? ' dello scope' : ''}, copiato dall'output di git ls-files${SCOPE ? ` ${SCOPE.replace(/, /g, ' ')}` : ''} (fuori da git: tutti i file tranne dipendenze, output di build e cartelle di sistema).
6. excluded: i file tracciati che non possono contenere un problema (lockfile, binari, immagini, font, file generati o vendorizzati da terzi), raggruppati per motivo, con l'elenco dei file.
7. groups: dividi tutti gli altri file tracciati in gruppi coerenti per modulo, di circa 2500-4000 righe ciascuno (contale con wc -l), così che un agente li legga tutti per intero. Ogni file in un solo gruppo; test e doc con il modulo che riguardano se ci stanno, altrimenti in gruppi propri.${SCOPE ? ' Aggiungi ai gruppi anche le doc che descrivono il codice dello scope (README, docs/, CLAUDE.md), così che chi le analizza le confronti con il codice: non vanno in trackedFiles.' : ''}

Percorsi relativi alla root del repo, come li stampa git ls-files. Sola lettura: non creare, modificare o cancellare file.`

const analyze = (group, ctx, phase) =>
  agent(
    `Sei uno degli analisti di un'analisi completa del repository nella directory corrente.

${RULES}

${contextBlock(ctx)}

I tuoi file — leggili TUTTI per intero, nessuno saltato o letto a metà:
${group.files.map((f) => `- ${f}`).join('\n')}

1. Applica a questi file tutta la checklist di "Full analysis", tranne l'esecuzione di test, lint e build: se ne occupa un altro agente.
2. Per i controlli che attraversano il repo (chi usa un export, helper già esistenti, per una doc il codice che descrive) cerca in tutto il repo.
3. Segnala solo problemi che si trovano nei TUOI file. Una doc la confronta con il codice chi analizza quella doc: se non è tra i tuoi file, non leggerla.${SCOPE ? ` Delle doc tra i tuoi file confronta solo le parti che descrivono lo scope (${SCOPE}).` : ''}
4. Verifica ogni problema prima di riportarlo: file e riga esatti e una prova (scenario riproducibile, grep senza utilizzatori, comportamento dimostrato dal codice). Senza prova non si riporta. Se qualcosa sembra voluto, controlla commenti e git log prima di segnalarlo.
5. Non modificare il repo: prove e script solo in una cartella temporanea fuori dal repo. Non lanciare la suite di test, build o server: li lancia un altro agente.

filesRead: i file che hai letto per intero, con lo stesso percorso della lista. notes: cosa non sei riuscito a controllare e perché (vuoto se niente).`,
    { label: `analisi: ${group.name}`, phase, schema: ANALYSIS },
  )

const runChecks = (ctx) =>
  agent(
    `Esegui i controlli automatici del repository nella directory corrente, per un'analisi completa.

${RULES}

${contextBlock(ctx)}

Comandi individuati:
${ctx.commands.length ? ctx.commands.map((c) => `- [${c.purpose}] ${c.command} (cwd: ${c.cwd}; prerequisiti: ${c.setup || 'nessuno'})`).join('\n') : '- nessuno: cercali tu in CLAUDE.md, doc, package.json, Makefile'}

1. Prima di lanciare, segui la procedura documentata dal progetto (DB isolato, SMTP finto, variabili d'ambiente).
2. Lint e format solo in verifica: niente --fix o --write. Se lo script del progetto li contiene, lancia lo strumento direttamente senza quei flag.
3. Vietato ciò che è distruttivo o esce dal repo: reset o migrate dev del DB di sviluppo, cancellare dati, docker compose down -v, git commit o push, deploy, mail vere, modifiche ai file tracciati.
4. Se manca un prerequisito (Docker spento, env mancante) non improvvisare: stato "non eseguito", con il motivo e il comando esatto per lanciarlo.
5. Alla fine rimuovi ciò che hai avviato tu (container, cartelle temporanee).
6. Dove manca un test automatico basta una prova di funzionamento del punto d'ingresso principale (es. lanciare lo script una volta in un container usa-e-getta), non una batteria di test inventati.
7. findings: un test che fallisce per un errore del codice (file e riga del codice o del test, output come prova); un errore di lint che indica un bug o codice morto; una vulnerabilità alta o critica in una dipendenza usata a runtime. Fallimenti dovuti all'ambiente e regole di stile vanno solo nel summary del comando.`,
    { label: 'test, lint, build, audit', phase: 'Test', schema: CHECKS, effort: 'medium' },
  )

// Scettici indipendenti per ogni problema Alta/Media, ognuno con un punto di partenza
// diverso così che non arrivino alle stesse conclusioni per la stessa strada.
const LENSES = [
  'Parti dal codice: con input concreti, il comportamento descritto succede davvero?',
  'Parti dal contesto: è una scelta documentata, un limite noto o un rischio già coperto da un altro meccanismo?',
  "Parti dall'impatto: in produzione cosa succede, a chi e quanto spesso? La gravità è quella giusta?",
]

const verifyOne = (f, i, ctx) =>
  agent(
    `Prova a SMENTIRE questo problema trovato dall'analisi del repository nella directory corrente.

${RULES}
Usa i criteri di "Verification" e le definizioni di "Severity" della Parte 2.

${contextBlock(ctx)}

Problema:
${JSON.stringify(f, null, 2)}

Leggi il codice citato e ciò che serve (chiamanti, test, doc, git log). ${LENSES[i]} Tutti i criteri valgono comunque.
Se un criterio di smentita si applica, o resti in dubbio: refuted = true. Se il problema regge: refuted = false e severity = la gravità giusta secondo le definizioni.
Non modificare il repo: se serve una prova, riproduci in una cartella temporanea fuori dal repo.`,
    { label: `verifica ${i + 1}/3: ${f.file}:${f.line}`, phase: 'Verifica', schema: VERDICT },
  )

// I problemi Bassa (codice morto, overengineering, doc) si provano con un grep o una
// lettura: uno scettico per gruppo basta, invece di uno per problema.
const verifyMinor = (findings, ctx, label) =>
  agent(
    `Prova a SMENTIRE, uno per uno, questi problemi di gravità Bassa trovati dall'analisi del repository nella directory corrente.

${RULES}
Usa i criteri di "Verification" e le definizioni di "Severity" della Parte 2.

${contextBlock(ctx)}

Problemi (index = posizione):
${findings.map((f, i) => `[${i}] ${JSON.stringify(f)}`).join('\n')}

Per ciascuno leggi il codice citato e ciò che serve. Se un criterio di smentita si applica, o resti in dubbio: refuted = true. Se regge: refuted = false e severity = la gravità giusta. Un verdetto per ogni index.
Non modificare il repo: se serve una prova, riproduci in una cartella temporanea fuori dal repo.`,
    { label: `verifica minori: ${label}`, phase: 'Verifica', schema: VERDICTS },
  )

// Confermato con la maggioranza dei verdetti previsti; gravità = la mediana delle
// conferme (con due conferme, la più bassa). Verdetti mancanti → "non verificato",
// mai scartato in silenzio.
const judge = (f, votes, planned) => {
  const needed = Math.floor(planned / 2) + 1
  const confirmations = votes.filter((v) => !v.refuted)
  const refutations = votes.filter((v) => v.refuted)
  if (confirmations.length >= needed) {
    const ranks = confirmations.map((v) => SEVERITIES.indexOf(v.severity)).sort((a, b) => a - b)
    return {
      ...f,
      status: 'confermato',
      severity: SEVERITIES[ranks[Math.floor(ranks.length / 2)]],
      reasons: confirmations.map((v) => v.reason),
    }
  }
  if (refutations.length >= needed) return { ...f, status: 'smentito', reasons: refutations.map((v) => v.reason) }
  return { ...f, status: 'non verificato', reasons: [`${votes.length} verdetti su ${planned}`] }
}

// Alta/Media: due scettici, il terzo solo se i primi due non concordano su smentita o
// gravità. L'esito è identico a tre verdetti sempre — quando concordano il terzo non
// cambierebbe la maggioranza né la mediana — con un agente in meno.
const verifyMajor = async (f, ctx) => {
  const first = (await parallel([0, 1].map((i) => () => verifyOne(f, i, ctx)))).filter(Boolean)
  const agree =
    first.length === 2 &&
    first[0].refuted === first[1].refuted &&
    (first[0].refuted || first[0].severity === first[1].severity)
  if (agree) return judge(f, first, 3)
  const [third] = await parallel([() => verifyOne(f, 2, ctx)])
  return judge(f, [...first, third].filter(Boolean), 3)
}

// parallel() non rifiuta mai: un agente che fallisce diventa null, quindi ogni problema
// esce da qui con uno stato, anche quando i suoi verificatori non rispondono.
const verifyAll = async (findings, ctx, label) => {
  const major = findings.filter((f) => f.severity !== 'Bassa')
  const minor = findings.filter((f) => f.severity === 'Bassa')
  const [majorDone, minorDone] = await parallel([
    () => parallel(major.map((f) => () => verifyMajor(f, ctx))),
    async () => {
      if (!minor.length) return []
      const [res] = await parallel([() => verifyMinor(minor, ctx, label)])
      return minor.map((f, i) => {
        const v = res?.verdicts?.find((x) => x.index === i)
        return judge(f, v ? [v] : [], 1)
      })
    },
  ])
  return [...(majorDone ?? []), ...(minorDone ?? [])]
}

// Contesto, test e conteggio dei file sono lavoro meccanico: impegno ridotto. Analisi e
// verifica ereditano quello della sessione, perché lì serve il giudizio.
const ctx = await agent(contextPrompt, { label: 'contesto', phase: 'Contesto', schema: CONTEXT, effort: 'medium' })
if (!ctx) throw new Error('La fase Contesto non ha restituito risultati: analisi interrotta')

const notes = []
const tracked = [...new Set(ctx.trackedFiles)]
const trackedSet = new Set(tracked)
const assigned = [...new Set(ctx.groups.flatMap((g) => g.files))]
const assignedSet = new Set(assigned)
const excludedSet = new Set(ctx.excluded.flatMap((e) => e.files))
// Confronto fatto qui sugli elenchi, non affidato a un conteggio dell'agente.
const unassigned = tracked.filter((f) => !assignedSet.has(f) && !excludedSet.has(f))
log(`${ctx.stack} — ${tracked.length} file tracciati: ${assigned.length} da leggere in ${ctx.groups.length} gruppi, ${excludedSet.size} esclusi`)

const analyzeAndVerify = (groups, phase) =>
  pipeline(
    groups,
    (group) => analyze(group, ctx, phase),
    (res, group) =>
      verifyAll(res?.findings ?? [], ctx, group.name).then((verified) => ({
        group: group.name,
        filesRead: res?.filesRead ?? [],
        notes: res?.notes ?? '',
        verified,
      })),
  )

const [checks, analyzed] = await parallel([
  async () => {
    const res = await runChecks(ctx)
    return res && { commands: res.commands, verified: await verifyAll(res.findings, ctx, 'test') }
  },
  () => analyzeAndVerify(ctx.groups, 'Analisi'),
])
const results = (analyzed ?? []).filter(Boolean)
if (!checks) notes.push('La fase Test non ha restituito risultati: test, lint e build non controllati')

// Gli agenti a volte riportano "./x" o percorsi assoluti: si confronta sul suffisso.
const readPaths = () => results.flatMap((r) => r.filesRead.map((p) => p.replace(/^\.\//, '')))
const wasRead = (file, paths) => paths.some((p) => p === file || p.endsWith(`/${file}`))

const firstRead = readPaths()
const secondRound = [...assigned.filter((f) => !wasRead(f, firstRead)), ...unassigned]
if (secondRound.length) {
  log(`Secondo giro su ${secondRound.length} file non letti o non assegnati`)
  const chunks = []
  for (let i = 0; i < secondRound.length; i += 25) {
    chunks.push({ name: `recupero ${chunks.length + 1}`, files: secondRound.slice(i, i + 25) })
  }
  results.push(...(await analyzeAndVerify(chunks, 'Completezza')).filter(Boolean))
}

const finalRead = readPaths()
const unread = [...assigned, ...unassigned].filter((f) => !wasRead(f, finalRead))

const all = [...results.flatMap((r) => r.verified), ...(checks?.verified ?? [])]
const bySeverity = (a, b) =>
  SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || a.file.localeCompare(b.file) || a.line - b.line
const confirmed = all.filter((f) => f.status === 'confermato').sort(bySeverity)
const unverified = all.filter((f) => f.status === 'non verificato').sort(bySeverity)
const refuted = all.filter((f) => f.status === 'smentito')
log(`Confermati ${confirmed.length}, smentiti ${refuted.length}, non verificati ${unverified.length}`)

return {
  scope: SCOPE ?? 'intero repository',
  stack: ctx.stack,
  summary: ctx.summary,
  coverage: {
    tracked: tracked.length,
    analyzed: tracked.filter((f) => wasRead(f, finalRead)).length,
    excluded: ctx.excluded.map((e) => ({ reason: e.reason, files: e.files.length })),
    docsAdded: assigned.filter((f) => !trackedSet.has(f)),
    unread,
  },
  commands: checks?.commands ?? [],
  confirmed,
  unverified,
  refuted: refuted.map(({ severity, file, line, title, reasons }) => ({ severity, file, line, title, reasons })),
  notes: [...notes, ...results.filter((r) => r.notes).map((r) => `${r.group}: ${r.notes}`)],
}
