---
name: dido-planning
description: Usare quando un lavoro di Dido ha più passi o va oltre una sessione (un progetto nuovo, una milestone, una funzionalità grande, un ridisegno, una migrazione, una richiesta che tocca app e backend insieme), quando Dido chiede un piano, una roadmap, gli step, "dove siamo", di riprendere un lavoro, di chiudere una milestone o di scrivere un report, e quando arriva una sua richiesta a metà di un piano.
---

# Pianificare e portare a termine i lavori grandi

Il metodo con cui Dido porta avanti un lavoro di più passi: un piano scritto e approvato, passi piccoli verificati uno alla volta, un report alla chiusura, e le doc come memoria tra una sessione e l'altra. **Skill richiesta:** dido-code-style, più la skill dello stack.

Una richiesta piccola (un fix, un ritocco, una pagina) non passa da qui: si fa e basta. Se non è chiaro se serve un piano, proponilo in chat in poche righe e lascia scegliere a Dido.

## Chi decide cosa

- **Dido** decide il prodotto (cosa fa, per chi, le priorità), il design delle schermate e dei gesti, quando una milestone si apre e si chiude, e fa le prove sui dispositivi veri.
- **L'agente** prende e approva le scelte tecniche (piano, schema, migration, librerie, decisioni), dentro i paletti di Dido: semplicità, scalabilità, niente colli di bottiglia, niente risorse sprecate, niente overengineering. A Dido si chiedono solo le decisioni di prodotto.
- Prima del piano si chiede solo ciò che manca e cambia il risultato, in un messaggio solo, con una proposta per ogni domanda. Se Dido approva senza rispondere vale la proposta, e il piano lo scrive. Con un Figma, il brief è il Figma.

## Dove stanno le cose

Nel `docs/` del repo principale del progetto. Gli altri repo dello stesso progetto (backend, admin) tengono il loro stato in `docs/ROADMAP.md` e rimandano ai documenti del repo principale: una copia sola.

| File | Cosa |
|---|---|
| `docs/PROJECT_CHARTER.md` | solo per un prodotto nuovo: requisiti, invarianti, milestone con i criteri di chiusura, registro delle richieste di Dido (D1, D2…). Su cosa fa il prodotto vince il charter, su come si scrive il codice vincono le skill |
| `docs/plans/<nome>.md` | un piano per milestone o per funzionalità |
| `docs/design/<nome>.html` | il design da far approvare prima di costruire |
| `docs/decisions/NNNN-<titolo>.md` | una decisione tecnica non banale |
| `docs/reports/<nome>.md` | il report di chiusura |
| `docs/README.md`, sezione "Dove siamo" | lo stato, aggiornato a ogni passo: è la memoria tra le sessioni |

## Il piano

```md
# Piano <nome> · <cosa, in una riga>

> Stato: **bozza, da approvare** (oppure **approvato da Dido il gg/mm/aaaa**, "<le sue parole>").
> Riguarda <repo e parti>. Lo stato sta in "Dove siamo".

## Cosa si chiede e cosa si fa
| Voce (dal charter o dalla richiesta) | Cosa si fa |

**Si chiude quando**: <criteri che si verificano con una prova>.

## Cosa c'è già
## Step
1. **Design** delle schermate e dei gesti, da approvare prima di costruire (`docs/design/`).
2. **Decisione tecnica** (`docs/decisions/NNNN-<titolo>.md`), con le misure che servono a prenderla.
3. Un passo per ogni pezzo che si verifica da solo (backend, app, una funzione).
4. **Prove** di chiusura.
5. **Revisione del codice** indipendente, con le correzioni.
6. **Chiusura**: report e "Dove siamo".
## Misure            (solo se il lavoro ha un rischio di memoria, carico o tempi)
## Dipendenze nuove  (o "nessuna")
## Cosa non si fa    (e dove andrà)
## Domande per Dido  (solo di prodotto, con la proposta; le risposte con la data)
```

- I passi sono piccoli e ognuno si verifica da solo. Uno che non si riesce a provare va diviso.
- Una richiesta di Dido a metà piano diventa un passo con la sua data, messo dove va fatto (8b, 9b.1, 9b.2…). Se c'è il charter, entra anche nel registro.
- Ciò che resta fuori si scrive in "Cosa non si fa", così non torna a ogni sessione.

## Eseguire

- Un passo alla volta, nell'ordine del piano. Niente funzioni di una milestone successiva: al massimo gli agganci nel modello dei dati.
- Il design viene prima del codice: un'interfaccia nuova non si costruisce prima dell'ok di Dido. Il design lo propone l'agente, con le foto o il prototipo.
- Un invariante del charter non si viola mai: se un passo sembra chiederlo, ci si ferma e si chiede.
- Una scelta tecnica non banale va in `docs/decisions/` nella stessa modifica: contesto, scelta, cosa è stato verificato, alternative scartate. Se cambia il charter, si aggiorna anche lui.
- Ogni passo finisce verificato (dido-code-style, "Fatto vuol dire verificato") e con "Dove siamo" aggiornato: cosa è fatto, come è stato provato, cosa resta, le scelte fatte senza chiedere.
- Un commit per passo, con piano e passo nel messaggio, nella lingua del progetto: `M3 step 9b.10: capitolo o scena quando si aggiunge ai Pareri`.

## Chiudere

Prima del report, una revisione del codice indipendente sulle modifiche dall'ultima revisione: solo Alta e Media (dido-code-style, Parte 2), ognuna corretta con un test che senza la correzione fallisce. Poi il report:

```md
# Report <nome> · <cosa>

> Stato al gg/mm/aaaa: **chiusa** (o cosa manca). Piano: [<nome>](../plans/<nome>.md).

## In breve
| Voce | Esito (con la decisione o il passo) |
## La prova di chiusura    (cosa, su cosa, con i numeri)
## Prove                   (lint, test, E2E, moduli spenti: comando, data, esito)
## Revisione del codice    (cosa è stato trovato e come è stato corretto)
## Cosa resta aperto
## Come rifare le prove
```

La milestone la chiude Dido. Fino ad allora il piano resta in corso.

## Riprendere

A inizio sessione si leggono "Dove siamo", il piano in corso e le ultime decisioni, prima di toccare il codice. Ciò che è segnato come fatto non si rifà: si riapre solo con un difetto riprodotto.
