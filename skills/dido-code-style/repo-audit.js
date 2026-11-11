export const meta = {
  name: 'repo-audit',
  description: 'Analisi completa di un repo secondo la skill dido-code-style: contesto, ogni file letto, test, verifica avversariale, copertura',
  whenToUse: 'Quando si chiede di analizzare un repo, un modulo o una cartella con la skill dido-code-style',
  phases: [
    { title: 'Contesto', detail: 'CLAUDE.md, doc, memoria, git log, stack, comandi, gruppi di file' },
    { title: 'Analisi', detail: 'un agente per gruppo, ogni file letto per intero' },
    { title: 'Test', detail: 'test, lint, build, typecheck, audit delle dipendenze' },
    { title: 'Verifica', detail: 'scettici che provano a smentire ogni problema' },
    { title: 'Completezza', detail: 'file non letti o non assegnati' },
  ],
}

// Orchestrazione dell'analisi completa descritta in analisi.md. Checklist e criteri di
// verifica stanno solo lì, principi e gravità solo in SKILL.md: gli agenti li leggono da
// quei file, qui si decide soltanto chi fa cosa e come si combinano i risultati.

if (!args?.skill) throw new Error('Manca args.skill: percorso assoluto di SKILL.md della skill dido-code-style')
const ANALISI = args.skill.replace(/SKILL\.md$/, 'analisi.md')

const SCOPE = args.scope ? [].concat(args.scope).join(', ') : null
const STACK = [].concat(args.stackSkills ?? []).join(', ')
const SEVERITIES = ['Alta', 'Media', 'Bassa']

const RULES = `Regole: leggi ${args.skill} (principi e gravità) e ${ANALISI} (checklist e criteri di verifica).${STACK ? ` Se il codice che hai davanti è di uno di questi stack, leggi anche la sua skill: ${STACK}.` : ''} Testi in italiano e brevi: title in poche parole, problem in una o due frasi su cosa succede e a chi, evidence le righe o il comando che lo mostrano, fix la modifica minima.`

const FINDING = {
  type: 'object',
  properties: {
    severity: { type: 'string', enum: SEVERITIES },
    category: {
      type: 'string',
      enum: ['bug', 'side-effect', 'sicurezza', 'overengineering', 'modularita', 'codice-morto', 'semplicita', 'scalabilita', 'doc', 'test', 'testi'],
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

const contextBlock = (context) =>
  [
    `Progetto: ${context.summary}`,
    `Stack: ${context.stack}`,
    'Scelte documentate e limiti noti, da NON segnalare come problemi:',
    ...(context.knownChoices.length ? context.knownChoices.map((choice) => `- ${choice}`) : ['- nessuna']),
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

const analyze = (group, context, phase) =>
  agent(
    `Sei uno degli analisti di un'analisi completa del repository nella directory corrente.

${RULES}

${contextBlock(context)}

I tuoi file — leggili TUTTI per intero, nessuno saltato o letto a metà:
${group.files.map((file) => `- ${file}`).join('\n')}

1. Applica a questi file tutta la checklist di "Analisi completa", tranne l'esecuzione di test, lint e build: se ne occupa un altro agente.
2. Per i controlli che attraversano il repo (chi usa un export, helper già esistenti, per una doc il codice che descrive) cerca in tutto il repo.
3. Segnala solo problemi che si trovano nei TUOI file. Una doc la confronta con il codice chi analizza quella doc: se non è tra i tuoi file, non leggerla.${SCOPE ? ` Delle doc tra i tuoi file confronta solo le parti che descrivono lo scope (${SCOPE}).` : ''}
4. Verifica ogni problema prima di riportarlo: file e riga esatti e una prova (scenario riproducibile, grep senza utilizzatori, comportamento dimostrato dal codice). Senza prova non si riporta. Se qualcosa sembra voluto, controlla commenti e git log prima di segnalarlo.
5. Non modificare il repo: prove e script solo in una cartella temporanea fuori dal repo. Non lanciare la suite di test, build o server: li lancia un altro agente.

filesRead: i file che hai letto per intero, con lo stesso percorso della lista. notes: cosa non sei riuscito a controllare e perché (vuoto se niente).`,
    { label: `analisi: ${group.name}`, phase, schema: ANALYSIS },
  )

const runChecks = (context) =>
  agent(
    `Esegui i controlli automatici del repository nella directory corrente, per un'analisi completa.

${RULES}

${contextBlock(context)}

Comandi individuati:
${context.commands.length ? context.commands.map((command) => `- [${command.purpose}] ${command.command} (cwd: ${command.cwd}; prerequisiti: ${command.setup || 'nessuno'})`).join('\n') : '- nessuno: cercali tu in CLAUDE.md, doc, package.json, Makefile'}

1. Prima di lanciare, segui la procedura documentata dal progetto (DB isolato, SMTP finto, variabili d'ambiente).
2. Lint e format solo in verifica: niente --fix o --write. Se lo script del progetto li contiene, lancia lo strumento direttamente senza quei flag.
3. Vietato ciò che è distruttivo o esce dal repo: reset o migrate dev del DB di sviluppo, cancellare dati, docker compose down -v, git commit o push, deploy, mail vere, modifiche ai file tracciati.
4. Se manca un prerequisito (un servizio spento, env mancante) non improvvisare: stato "non eseguito", con il motivo e il comando esatto per lanciarlo.
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

const verifyOne = (finding, lensIndex, context) =>
  agent(
    `Prova a SMENTIRE questo problema trovato dall'analisi del repository nella directory corrente.

${RULES}
Usa i criteri di "Verifica: un problema è smentito quando" e le definizioni di "Gravità".

${contextBlock(context)}

Problema:
${JSON.stringify(finding, null, 2)}

Leggi il codice citato e ciò che serve (chiamanti, test, doc, git log). ${LENSES[lensIndex]} Tutti i criteri valgono comunque.
Se un criterio di smentita si applica, o resti in dubbio: refuted = true. Se il problema regge: refuted = false e severity = la gravità giusta secondo le definizioni.
Non modificare il repo: se serve una prova, riproduci in una cartella temporanea fuori dal repo.`,
    { label: `verifica ${lensIndex + 1}/3: ${finding.file}:${finding.line}`, phase: 'Verifica', schema: VERDICT },
  )

// I problemi Bassa (codice morto, overengineering, doc) si provano con un grep o una
// lettura: uno scettico per gruppo basta, invece di uno per problema.
const verifyMinor = (findings, context, label) =>
  agent(
    `Prova a SMENTIRE, uno per uno, questi problemi di gravità Bassa trovati dall'analisi del repository nella directory corrente.

${RULES}
Usa i criteri di "Verifica: un problema è smentito quando" e le definizioni di "Gravità".

${contextBlock(context)}

Problemi (index = posizione):
${findings.map((finding, index) => `[${index}] ${JSON.stringify(finding)}`).join('\n')}

Per ciascuno leggi il codice citato e ciò che serve. Se un criterio di smentita si applica, o resti in dubbio: refuted = true. Se regge: refuted = false e severity = la gravità giusta. Un verdetto per ogni index.
Non modificare il repo: se serve una prova, riproduci in una cartella temporanea fuori dal repo.`,
    { label: `verifica minori: ${label}`, phase: 'Verifica', schema: VERDICTS },
  )

// Confermato con la maggioranza dei verdetti previsti; gravità = la mediana delle
// conferme (con due conferme, la più bassa). Verdetti mancanti → "non verificato",
// mai scartato in silenzio.
const judge = (finding, votes, planned) => {
  const needed = Math.floor(planned / 2) + 1
  const confirmations = votes.filter((vote) => !vote.refuted)
  const refutations = votes.filter((vote) => vote.refuted)
  if (confirmations.length >= needed) {
    const ranks = confirmations.map((vote) => SEVERITIES.indexOf(vote.severity)).sort((first, second) => first - second)
    return {
      ...finding,
      status: 'confermato',
      severity: SEVERITIES[ranks[Math.floor(ranks.length / 2)]],
      reasons: confirmations.map((vote) => vote.reason),
    }
  }
  if (refutations.length >= needed) return { ...finding, status: 'smentito', reasons: refutations.map((vote) => vote.reason) }
  return { ...finding, status: 'non verificato', reasons: [`${votes.length} verdetti su ${planned}`] }
}

// Alta/Media: due scettici, il terzo solo se i primi due non concordano su smentita o
// gravità. L'esito è identico a tre verdetti sempre (quando concordano il terzo non
// cambierebbe la maggioranza né la mediana), con un agente in meno.
const verifyMajor = async (finding, context) => {
  const first = (await parallel([0, 1].map((lensIndex) => () => verifyOne(finding, lensIndex, context)))).filter(Boolean)
  const agree =
    first.length === 2 &&
    first[0].refuted === first[1].refuted &&
    (first[0].refuted || first[0].severity === first[1].severity)
  if (agree) return judge(finding, first, 3)
  const [third] = await parallel([() => verifyOne(finding, 2, context)])
  return judge(finding, [...first, third].filter(Boolean), 3)
}

// parallel() non rifiuta mai: un agente che fallisce diventa null, quindi ogni problema
// esce da qui con uno stato, anche quando i suoi verificatori non rispondono.
const verifyAll = async (findings, context, label) => {
  const major = findings.filter((finding) => finding.severity !== 'Bassa')
  const minor = findings.filter((finding) => finding.severity === 'Bassa')
  const [majorDone, minorDone] = await parallel([
    () => parallel(major.map((finding) => () => verifyMajor(finding, context))),
    async () => {
      if (!minor.length) return []
      const [minorResult] = await parallel([() => verifyMinor(minor, context, label)])
      return minor.map((finding, index) => {
        const verdict = minorResult?.verdicts?.find((candidate) => candidate.index === index)
        return judge(finding, verdict ? [verdict] : [], 1)
      })
    },
  ])
  return [...(majorDone ?? []), ...(minorDone ?? [])]
}

// Contesto, test e conteggio dei file sono lavoro meccanico: impegno ridotto. Analisi e
// verifica ereditano quello della sessione, perché lì serve il giudizio.
const context = await agent(contextPrompt, { label: 'contesto', phase: 'Contesto', schema: CONTEXT, effort: 'medium' })
if (!context) throw new Error('La fase Contesto non ha restituito risultati: analisi interrotta')

const notes = []
const tracked = [...new Set(context.trackedFiles)]
const trackedSet = new Set(tracked)
const assigned = [...new Set(context.groups.flatMap((group) => group.files))]
const assignedSet = new Set(assigned)
const excludedSet = new Set(context.excluded.flatMap((exclusion) => exclusion.files))
// Confronto fatto qui sugli elenchi, non affidato a un conteggio dell'agente.
const unassigned = tracked.filter((file) => !assignedSet.has(file) && !excludedSet.has(file))
log(`${context.stack} — ${tracked.length} file tracciati: ${assigned.length} da leggere in ${context.groups.length} gruppi, ${excludedSet.size} esclusi`)

const analyzeAndVerify = (groups, phase) =>
  pipeline(
    groups,
    (group) => analyze(group, context, phase),
    (analysis, group) =>
      verifyAll(analysis?.findings ?? [], context, group.name).then((verified) => ({
        group: group.name,
        filesRead: analysis?.filesRead ?? [],
        notes: analysis?.notes ?? '',
        verified,
      })),
  )

const [checks, analyzed] = await parallel([
  async () => {
    const checkResult = await runChecks(context)
    return checkResult && { commands: checkResult.commands, verified: await verifyAll(checkResult.findings, context, 'test') }
  },
  () => analyzeAndVerify(context.groups, 'Analisi'),
])
const results = (analyzed ?? []).filter(Boolean)
if (!checks) notes.push('La fase Test non ha restituito risultati: test, lint e build non controllati')

// Gli agenti a volte riportano "./x" o percorsi assoluti: si confronta sul suffisso.
const readPaths = () => results.flatMap((result) => result.filesRead.map((path) => path.replace(/^\.\//, '')))
const wasRead = (file, paths) => paths.some((path) => path === file || path.endsWith(`/${file}`))

const firstRead = readPaths()
const secondRound = [...assigned.filter((file) => !wasRead(file, firstRead)), ...unassigned]
if (secondRound.length) {
  log(`Secondo giro su ${secondRound.length} file non letti o non assegnati`)
  const chunks = []
  for (let start = 0; start < secondRound.length; start += 25) {
    chunks.push({ name: `recupero ${chunks.length + 1}`, files: secondRound.slice(start, start + 25) })
  }
  results.push(...(await analyzeAndVerify(chunks, 'Completezza')).filter(Boolean))
}

const finalRead = readPaths()
const unread = [...assigned, ...unassigned].filter((file) => !wasRead(file, finalRead))

const all = [...results.flatMap((result) => result.verified), ...(checks?.verified ?? [])]
const bySeverity = (first, second) =>
  SEVERITIES.indexOf(first.severity) - SEVERITIES.indexOf(second.severity) ||
  first.file.localeCompare(second.file) ||
  first.line - second.line
const confirmed = all.filter((finding) => finding.status === 'confermato').sort(bySeverity)
const unverified = all.filter((finding) => finding.status === 'non verificato').sort(bySeverity)
const refuted = all.filter((finding) => finding.status === 'smentito')
log(`Confermati ${confirmed.length}, smentiti ${refuted.length}, non verificati ${unverified.length}`)

return {
  scope: SCOPE ?? 'intero repository',
  stack: context.stack,
  summary: context.summary,
  coverage: {
    tracked: tracked.length,
    analyzed: tracked.filter((file) => wasRead(file, finalRead)).length,
    excluded: context.excluded.map((exclusion) => ({ reason: exclusion.reason, files: exclusion.files.length })),
    docsAdded: assigned.filter((file) => !trackedSet.has(file)),
    unread,
  },
  commands: checks?.commands ?? [],
  confirmed,
  unverified,
  refuted: refuted.map(({ severity, file, line, title, reasons }) => ({ severity, file, line, title, reasons })),
  notes: [...notes, ...results.filter((result) => result.notes).map((result) => `${result.group}: ${result.notes}`)],
}
