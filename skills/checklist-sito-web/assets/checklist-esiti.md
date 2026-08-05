# Checklist spuntata — {{nome sito}}

**Data:** {{data}} · **Ambiente:** {{URL}} · **Perimetro:** tag attivi {{…}} — {{N}} voci su 249
**Report di riferimento:** {{nome del file di report}}

Questo file è la **vista sintetica** di quel report, generata da esso. Non contiene esiti che
là non ci siano, e in caso di divergenza vale il report.

## Legenda — leggila prima delle caselle

`[x]` significa una cosa sola: **verificato e conforme** (esito `OK` nel report).

Tutte le altre caselle restano vuote **e portano sempre il motivo scritto di seguito**. Una
casella vuota non significa "rotto": significa "non spuntata, per il motivo che leggi
accanto". Una casella vuota senza motivo è un errore di compilazione, non un esito.

- [x] `XXX-00` voce verificata e conforme
- [ ] `XXX-00` voce con un problema — **KO ALTA** → piano #4
- [ ] `XXX-00` voce verificata solo in parte — **PARZIALE**: osservata solo su /blog
- [ ] `XXX-00` voce non pertinente a questo sito — *N/A: nessuna ricerca interna*
- [ ] `XXX-00` voce non verificabile qui — *NON VERIFICATO: serve accesso a Search Console*

## Come si compila

**Per ultimo, dal report già scritto**, riga per riga. Non è una seconda passata di verifica e
non introduce giudizi nuovi: traduce esiti già emessi e già passati per il Gate 1.

| Esito nel report | Riga in questo file |
|---|---|
| `OK` | ``- [x] `ID` Titolo voce`` |
| `KO` | ``- [ ] `ID` Titolo voce — **KO {SEVERITÀ}** → piano #{n}`` |
| `PARZIALE` | ``- [ ] `ID` Titolo voce — **PARZIALE**: {cosa resta scoperto}`` |
| `N/A` | ``- [ ] `ID` Titolo voce — *N/A: {motivo}*`` |
| `NON VERIFICATO` | ``- [ ] `ID` Titolo voce — *NON VERIFICATO: {strumento o accesso mancante}*`` |

Le voci **fuori perimetro** (tag non attivo) non compaiono qui: restano nella tabella "Sezioni
e voci non applicabili" del report e sono contate solo in fondo a questo file. Le voci **in**
perimetro che risultano `N/A` perché la funzionalità non esiste restano invece nell'elenco,
con il loro motivo: sono un'osservazione, e si vedono.

## Esiti per sezione

Una sezione per ogni sezione in perimetro, nell'ordine della checklist.

### {{SIGLA}} — {{Nome sezione}} · in perimetro {{n}}/{{tot}} · ✔ {{n_ok}}

- [x] `{{ID}}` {{titolo voce}}
- [ ] `{{ID}}` {{titolo voce}} — {{motivo obbligatorio}}

## Conteggi

| | N. |
|---|---|
| Voci in perimetro (= righe in questo file) | |
| Spuntate `[x]` | |
| Non spuntate | |
| Voci fuori perimetro (nel report, non qui) | |
| **Totale checklist** | 249 |

I numeri si contano, non si stimano, e quadrano col report: le spuntate sono **esattamente** il
conteggio `OK` della tabella di sintesi, e in perimetro + fuori perimetro fa 249.
