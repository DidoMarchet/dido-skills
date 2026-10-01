# Report QA — {{nome sito}}

**Data:** {{data}} · **Ambiente collaudato:** {{URL e se staging o produzione}}
**Tipo di sito:** {{vetrina / blog / e-commerce / web app}} · **Occasione:** {{pre-lancio / audit / post-migrazione}}
**Eseguito da:** {{chi}} · **Sezioni applicate:** {{elenco}}
**Eseguito con:** {{host}} · **Capacità:** fetch {{sì/no}} · shell HTTP {{sì/no}} · browser {{sì/no}}
**Perimetro:** tag attivi {{…}} — {{N}} voci su 249 · **Promozioni [M]→auto:** {{elenco ID}}
**Esito gate 1:** {{X}} voci riviste, {{Y}} declassate
**Vista sintetica:** {{nome del file checklist spuntata}} — derivato da questo documento, che prevale in caso di divergenza

## Limiti di questa verifica

Da scrivere **per prima cosa**, non alla fine.

- Non verificato per mancanza di accessi: {{elenco}}
- Non verificato perché richiede strumenti esterni: {{elenco + strumento necessario}}
- Non verificato perché richiede intervento umano: {{elenco}}
- Pagine campionate: {{elenco URL}}
- Assunzioni fatte in assenza di risposte dal cliente: {{elenco}}

> Questo documento riporta rilievi tecnici. Non costituisce una valutazione di conformità
> normativa (GDPR, accessibilità, codice del consumo): le voci della sezione LEG e ACC vanno
> validate da un professionista.

## Sintesi

{{Tre-cinque righe: stato generale, cosa impedisce il lancio, cosa preoccupa di più.}}

| Esito | N. |
|---|---|
| OK | |
| KO bloccanti | |
| KO alta | |
| KO media / bassa | |
| Parziale | |
| Non verificato | |
| N/A | |

Regola di conteggio: **una voce di checklist = una unità**, mai una riga di tabella né una
sezione. Il denominatore sono le voci in perimetro (tag attivi), dichiarato in testa. I
numeri si contano, non si stimano: nessuna tilde. La somma degli esiti deve dare esattamente
il numero di voci in perimetro, e i KO per severità devono corrispondere riga per riga al
piano di intervento.

## Sezioni e voci non applicabili

Sia le sezioni intere sia le singole voci escluse dal filtro dei tag. Una riga per voce
sparsa: non collassare in range.

| Sezione / ID | Motivo | Tag mancante |
|---|---|---|
| ECM (20 voci) | nessun e-commerce | #ecom |
| NAV-03, NAV-05 | nessuna paginazione né breadcrumb: sito senza listing | #ecom #blog |

## Piano di intervento

Ordinato per severità, poi per rapporto impatto/sforzo. È la tabella che verrà letta.

| # | ID | Problema | Azione | Chi | Sforzo | Severità |
|---|---|---|---|---|---|---|
| 1 | | | | | | BLOCCANTE |

## Esiti per sezione

Ripetere per ogni sezione eseguita.

### {{SIGLA}} — {{Nome sezione}}

| ID | Voce | Esito | Prova / URL | Nota |
|---|---|---|---|---|
| | | | | |

## Da fare a cura del cliente

Voci `[M]` con istruzioni operative, perché chi le eseguirà non ha letto la checklist.

| ID | Cosa fare | Come | Cosa considerare OK |
|---|---|---|---|

## Proposte di aggiornamento checklist

Voci risultate obsolete o mancanti durante l'esecuzione.
