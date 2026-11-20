# Guide, gate e guard: cosa prendere dal modello di Luca Rossi

> Stato: **da valutare**, annotato il 20/11/2026. Niente è approvato: sono le cose da vedere insieme.
> Fonte: "My AI Coding Workflow" (giugno 2026) e "How I Run the Tolaria Project" (maggio 2026), Refactoring.

## Il modello

- **Guide**: le istruzioni prima del lavoro (AGENTS.md, skill).
- **Gate**: controlli deterministici che bloccano durante il lavoro. Lui usa CodeScene 10/10, 0 issue su Codacy e copertura sopra l'85%, con hook Husky.
- **Guard**: controlli programmati, ogni notte, che non toccano il codice ma aprono task (refactoring, prestazioni, traduzioni, doc, test).

## Dove siamo

| Cosa | Noi oggi |
|---|---|
| Guide | AGENTS.md corto, skill `dido-*`, `docs/conventions.md` |
| Gate | `ai-lint.mjs` a ogni file scritto, `ai-git-guard.mjs`, `lint-gate.mjs` con `lintStrict` su `build` e `generate`, CI del backend (lint, `prisma validate`, migration, test) |
| Guard | `revisore` e prove a `/dido-rilascio`, `repo-audit` su richiesta. Nessuno programmato |

Il controllo al rilascio non vede tre cose: dipendenze che diventano vulnerabili dopo il rilascio, siti fermi da mesi, fix dello starter non copiati nei siti.

## Da vedere

1. **Sicurezza nei backend.** Primo passo: `npm audit --audit-level=high` nella CI, che segnala e non blocca. Poi, se serve, Dependabot e uno scanner del codice (Semgrep CE è gratis; CodeQL e Codacy sui repo privati si pagano). Il secret scanning va configurato per ignorare i file env, che stanno nel repo con i valori veri.
2. **Un guard settimanale in sola lettura** su starter e siti: `lint:check`, audit delle dipendenze, skill non aggiornate. Esce un report unico, niente commit né PR. Gira come routine cloud, job sul Mac o workflow GitHub programmato che solo riporta. Si scrive in circa mezza giornata.
3. **Fix dello starter mancanti nei siti.** Prima serve l'elenco dei file in comune tra starter e siti, perché `ai:update` non copia il codice.
4. **Prova pilota di un agente su una coda di task**, su un solo sito: lavora su un branch e apre una PR con anteprima Netlify, il merge resta a Dido. Cambia "commit solo su richiesta" per quel progetto, quindi va deciso prima.

## Cosa non prendiamo

- Copertura minima dei test nei siti: nei frontend i test non sono obbligatori.
- Hook di pre-commit: non li vogliamo.
- Una coda 24/7 come quella di Tolaria, finché la prova del punto 4 non dice che la revisione regge il ritmo.
