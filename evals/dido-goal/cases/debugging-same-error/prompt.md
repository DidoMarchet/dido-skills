---
tags: [dido-goal]
max_turns: 60
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Il test del report giornaliero continua a fallire con `'2026-02-28'` al posto di `'2026-03-01'`. Ho già corretto `toIsoDate` in `src/date.js` due volte (prima con l'offset del fuso, poi portando l'ora a mezzogiorno) e l'errore è sempre identico. Sistemalo tu.
