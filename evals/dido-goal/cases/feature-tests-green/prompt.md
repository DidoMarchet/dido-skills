---
tags: [dido-goal]
max_turns: 60
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

In shop-utils aggiungi a `formatPrice` l'opzione `freeLabel`: quando il prezzo è 0 e l'opzione c'è, restituisce quel testo (per esempio "Gratis") invece di "0,00 €".
