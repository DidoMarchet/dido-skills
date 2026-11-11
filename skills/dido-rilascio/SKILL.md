---
name: dido-rilascio
description: "Usare quando Dido scrive /dido-rilascio per chiudere un lavoro: perimetro, revisione indipendente, correzioni, prove complete, commit, push e controllo del deploy."
disable-model-invocation: true
argument-hint: "[base del confronto, es. main]"
---

# Chiudere un lavoro

Per un lavoro di qualunque dimensione, quando Dido lo chiede con `/dido-rilascio`. **Skill richieste:** dido-code-style e la skill dello stack. Se il lavoro ha un piano, anche dido-planning: il passo e "Dove siamo".

Base del confronto: $ARGUMENTS (se è vuota, il branch principale). I comandi sono nella sezione "Comandi" dell'AGENTS.md del progetto. Un passo che il progetto non prevede (niente E2E, niente deploy) si salta e si scrive nel report.

Si passa al passo successivo solo quando la condizione è vera.

1. **Perimetro.** Rileggi la richiesta di Dido. Lancia `git status --short` e `git diff --stat <base>`. Per ogni file chiediti se serve alla richiesta o se lo chiede una regola delle skill `dido-*`:
   - è una tua modifica e non serve → annullala;
   - non l'hai fatta tu (un'altra sessione, Dido) → non toccarla e non metterla nel commit; scrivila nel report.

   Condizione: ogni file rimasto serve.

2. **Revisione indipendente.** Avvia il subagente `revisore`. Il messaggio contiene solo:
   - la richiesta di Dido, parola per parola;
   - i criteri di chiusura;
   - il Figma o il riferimento di design, se il lavoro tocca l'interfaccia;
   - la base del confronto.

   Le tue conclusioni non ci vanno: il revisore giudica il diff.

3. **Verifiche veloci**, mentre il revisore lavora: il lint in sola verifica e i test collegati ai file toccati. Condizione: tutto verde e rapporto del revisore arrivato.

4. **Correzioni.** Ogni problema Alto o Medio nel perimetro si corregge con un test che senza la correzione fallisce, dove un test si può scrivere (dido-code-style, "Test"). Poi rifai il passo 3. Dopo una correzione Alta il revisore fa un secondo giro sul diff nuovo. Se dopo due giri resta un problema Alto, fermati e chiedi a Dido.

5. **Prove complete, una volta.** La suite completa dei test e la build.
   - Se qualcosa fallisce: correggi e rilancia solo i test falliti finché passano.
   - La suite completa si rilancia solo se la correzione tocca codice condiviso (layout, componenti comuni, configurazione, store, rotte, middleware).
   - Un test che fallisce per motivi estranei alla modifica non si corregge qui: va nel report con l'output.

6. **Commit**, quando dido-code-style dice che si può. `git add` per nome dei soli file di questo lavoro, messaggio nella lingua del progetto, con piano e passo se c'è un piano.

7. **Push e deploy solo con l'ok di Dido.** Chiedilo insieme al report. Dopo il push aspetta la CI su GitHub, dove c'è: il lavoro è chiuso quando è verde. Dopo il deploy guarda lo stato e prova sull'ambiente ciò che è cambiato:
   - un'interfaccia: le pagine toccate, con screenshot da mobile e da desktop e la console del browser;
   - un'API: una chiamata vera.

8. **Report**, come lo vuole dido-code-style: cosa è cambiato, cosa è stato verificato (comando ed esito) e cosa no, cosa ha trovato la revisione e come è stato corretto, il controllo di sicurezza, le scelte fatte senza chiedere, cosa resta aperto. Se c'è un piano, aggiorna "Dove siamo".
