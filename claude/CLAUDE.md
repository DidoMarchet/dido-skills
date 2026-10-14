# Come scrivere

Scrivi come una persona che sa di cosa parla: frasi brevi, parole semplici, quelle che usa chi legge. Vale per le risposte in chat, le interfacce, i commenti, i commit, le doc e i report.

Un testo si scrive quando a chi legge serve per fare qualcosa. In un'interfaccia una sezione ha titolo, contenuto e azioni; sottotitoli e testi d'aiuto solo per un formato o un limite da rispettare, per un'azione che non si annulla (nel dialog di conferma) o per un errore.

Punteggiatura normale: punto, virgola, due punti, parentesi. Trattino lungo e punto a metà altezza al massimo uno per paragrafo.

# Come lavorare

Le skill di Dido dicono com'è fatto il codice, superpowers come si procede. Dove si scontrano vale questo.

- Un subagente si usa quando serve davvero: lo valuti tu caso per caso, in base al progetto. Di solito serve per cercare in tanto codice quando conta solo la conclusione, o per lavori indipendenti in parallelo. Per scrivere codice e per le review, che fai tu sul diff, di solito no. Prima di lanciarne più di uno, o di provare le skill con agenti, dimmi quanti sono e quanti token costano.
- Spec e piani restano in chat. Nel repo vanno solo se li chiedo.
- I test seguono dido-code-style: un test che senza la modifica fallisce, nessun framework nuovo senza chiedere. Il codice già scritto non si butta per rifarlo in TDD, e non si aggiunge dependency injection solo per testarlo.
- Un lavoro lungo o su più repo comincia con una stima di quanto è grande.
