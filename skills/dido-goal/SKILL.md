---
name: dido-goal
description: "Usare all'inizio di ogni compito di più passi (analisi, progettazione o architettura, implementazione, debugging, analisi di prodotto) per fissare risultato, prova e perimetro, e durante il lavoro quando: i test passano e viene voglia di migliorare ancora, lo stesso errore si ripresenta dopo un fix, si sta per rifare una ricerca, una lettura o una verifica già fatta, si riapre un'analisi o una decisione già presa, si sta per fare una domanda a chi lavora con te, si sta per dire che il lavoro è finito."
---

# Obiettivo, perimetro e fine del lavoro

Un compito è finito quando il suo criterio di fine è vero e provato, non quando non resta niente da migliorare. Questa skill fissa il criterio all'inizio e lo usa durante il lavoro per tre cose: restare nel perimetro, non rifare ciò che è fatto, fermarsi al momento giusto, né prima né dopo.

Non è un processo e non sostituisce le altre skill: il piano dei lavori grandi resta a dido-planning, la diagnosi dei bug a systematic-debugging, le prove a "Fatto vuol dire verificato" di dido-code-style (o a verification-before-completion). Qui si decide solo cosa conta come finito e quando smettere.

## 1. L'obiettivo, prima di lavorare

Per un compito di più passi scrivi l'obiettivo nel primo messaggio, in chat, in due o tre righe. Una richiesta di un passo (una domanda, un ritocco, un comando) non ne ha bisogno: si fa e basta.

```
Obiettivo: <cosa sarà vero alla fine, concreto>
Prova: <il comando, il test, la pagina o la domanda a cui rispondere che lo dimostra>
Fuori: <cosa non tocchi, solo dove la richiesta lascia un dubbio>
```

- È un risultato, non un'attività: "il login accetta l'email scritta in maiuscolo, con un test che lo prova", non "indagare sul login".
- Il tipo di compito (punto 2) serve a te per scegliere il criterio di fine: non serve scriverlo. Un compito misto, come "analizza e poi correggi", ha i criteri di entrambi, in ordine.
- Se manca un dato, scegli il default più ragionevole e reversibile e scrivilo nell'obiettivo: chi legge lo corregge al volo. Si chiede solo nei casi del punto 5.
- Con un piano (dido-planning) l'obiettivo è il suo "Si chiude quando": non scriverne un altro.
- Se a metà la richiesta cambia, riscrivi l'obiettivo in una riga e dillo.

## 2. Quando è finito, per tipo

| Tipo | È finito quando | Non fa parte del compito |
|---|---|---|
| Analisi | la domanda ha una risposta, ogni affermazione ha la sua prova (file e riga, comando, numero) e c'è cosa cambierebbe la risposta | coprire tutto il repo, elencare miglioramenti |
| Progettazione, architettura | c'è una scelta con il perché, le alternative scartate in una riga ciascuna e il segnale che la riapre | progettare per crescite non misurate, disegnare ciò che non è chiesto |
| Implementazione | il comportamento chiesto c'è, la prova passa dopo l'ultima modifica, test e doc di ciò che hai cambiato sono aggiornati, il diff ha solo ciò che serve | refactor vicini, opzioni in più, una seconda passata di pulizia |
| Debugging | il sintomo è riprodotto, la causa è detta con la sua prova, e dopo il fix il sintomo non c'è più, con un test che senza il fix fallisce | sistemare altro trovato per strada |
| Analisi di prodotto | ogni obiettivo o requisito ha un esito (soddisfatto, no, non verificabile) con la prova | proposte di funzioni o miglioramenti non chiesti |

Il criterio è quello scritto nella richiesta, nel brief o nel piano, letto insieme agli altri requisiti: non renderlo più severo né più largo. Se il materiale non basta per decidere, l'esito è "non verificabile", con cosa servirebbe per verificarlo.

Quando la colonna centrale è vera: una verifica fresca, il report, e ti fermi.

## 3. Non rifare ciò che è fatto

Ciò che è stabilito (file letti, ricerche, ipotesi escluse, verifiche passate, decisioni prese) resta stabilito finché non arriva un elemento nuovo. Ripetere costa tempo e non aggiunge prove.

- Una verifica si rilancia solo se dopo è cambiato qualcosa che la riguarda. Test verdi e nessuna modifica dopo: il risultato vale ancora.
- Una ricerca o una lettura si rifà solo per una domanda nuova, non per "essere sicuri".
- Un'analisi o una decisione già scritta (una decisione, un report, un piano) si riapre solo con un elemento nuovo: codice cambiato in quella zona da quella data, misure nuove, un requisito nuovo, una condizione di riapertura diventata vera, una premessa che il codice di oggi non rispetta. Controllarlo costa poco: git log da quella data, le misure più recenti, e la lettura del codice che realizza la decisione, per vedere se fa davvero ciò su cui la decisione si regge. Fallo. Se non c'è niente di nuovo, la risposta è la conclusione di prima, con il riferimento e la data, più cosa la riaprirebbe. Non rifare l'analisi da capo e non estenderla a ciò che la decisione non tocca.
- Quello che chi lavora con te dice di aver già provato è un'ipotesi esclusa: non riproporlo.

## 4. Tentativi di correzione

Un tentativo è una modifica fatta per far sparire un sintomo: un test rosso, un errore, un comando che fallisce. Leggere il codice, riprodurre, aggiungere un log, controllare cosa gira davvero non sono tentativi: sono il modo per uscire dai tentativi.

- Dopo un tentativo che lascia l'errore identico, la mossa successiva non è un'altra variante della stessa modifica ma una domanda sui fatti. La modifica arriva al codice che gira (import, copia doppia, build, cache, processo vecchio, ambiente)? Il test misura quello che pensi? Rispondi con una prova, poi modifica.
- Se chi lavora con te ha già fatto tentativi a vuoto, parti da lì: prima i fatti, poi la modifica.
- Se l'errore cambia perché il sintomo di prima è sparito, è un passo avanti e il nuovo errore ha il suo conto. Se a ogni fix il problema si sposta altrove, ogni fix conta come fallito: il problema è nell'approccio.
- Dopo tre tentativi falliti sullo stesso sintomo ti fermi e riporti cosa hai provato, cosa hai escluso e con quale prova, l'ipotesi migliore e la prova che la deciderebbe.
- Non fermarti prima: finché c'è un'ipotesi che si prova con poco e senza rischi, provala. Ci si ferma quando le ipotesi sono finite o la prossima costa molto o è rischiosa, non quando il problema è solo difficile.
- Lo stesso per revisioni e verifiche: un giro di revisione, le correzioni, una verifica. Un altro giro solo dopo una correzione di gravità alta. Mai "finché non trova più niente".

## 5. Quando chiedere

Chiedi solo quando la scelta:

- è di prodotto: cosa fa, per chi, come appare, cosa viene prima;
- non si annulla o tocca altri: dati, produzione, push, pubblicazioni, cancellazioni, parti chiuse;
- se è sbagliata, butta via buona parte del lavoro.

Il resto lo scegli tu, con il default più ragionevole e reversibile, e lo scrivi nel report tra le scelte fatte senza chiedere. Una domanda sola, con la tua proposta, e intanto vai avanti con ciò che non dipende dalla risposta. Ciò che le regole del progetto affidano già a te non si chiede: si fa.

## 6. Perimetro

- Dentro: ciò che serve al risultato e ciò che le regole del progetto chiedono insieme alla modifica o per chiuderla, come i test e le doc di ciò che hai cambiato.
- Fuori: tutto il resto, anche se lo miglioreresti. Un bug vicino, un refactor utile, un'idea di prodotto vanno in una riga tra le cose aperte del report: non si fanno e non si propongono.
- Un problema grave che vedi nel codice che leggi (sicurezza, dati persi, una parte che può bloccare le altre) si segnala sempre, con la gravità, anche se è fuori perimetro. Segnalarlo non vuol dire correggerlo.
- Se per arrivare al risultato il perimetro deve crescere (il fix tocca un modulo condiviso), dillo prima di farlo; se è grande o rischioso, chiedi.

## 7. Prima di dire finito

1. Il criterio del punto 2 è vero? Ogni punto della richiesta ha un esito?
2. La prova è fresca, cioè lanciata dopo l'ultima modifica, e l'hai letta? Se non passa o non hai potuto lanciarla, non è finito: dillo, con cosa manca.
3. Il diff ha solo cose del perimetro?

Poi il report, lungo quanto il lavoro, e ti fermi. Niente "se vuoi posso anche…": ciò che resta è tra le cose aperte.
