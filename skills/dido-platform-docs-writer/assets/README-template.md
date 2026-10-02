# {{nome progetto}}

{{Cosa fa, in due righe. Nessun aggettivo non misurabile.}}

## Ambienti a confronto

| Aspetto | Sviluppo locale | Produzione |
|---|---|---|
| File di orchestrazione | | |
| Comando di avvio | | |
| Reverse proxy / TLS | | |
| Motore di deploy | | |
| Origine delle variabili | | |

## Flusso end-to-end

1. {{…}}

## Prerequisiti

| Strumento | File che fissa la versione |
|---|---|
| | |

## Sviluppo locale

```bash
{{comando completo e copiabile}}
```

**URL locali:** {{…}}
**Arresto e pulizia:** {{…}}

## Deploy

{{Se il repo non contiene il meccanismo di deploy, qui va il blocco NON DEDUCIBILE.}}

## Variabili d'ambiente

L'elenco delle variabili è in `{{.env.example}}`.

{{Da dove arrivano i valori di produzione e chi li gestisce. Se il repo non lo dice, blocco NON DEDUCIBILE.}}

## Servizi

Immagini, porte, volumi e dipendenze: `{{compose.yaml}}`.

| Servizio | Ruolo |
|---|---|
| | |

## Dati persistenti e backup

{{I volumi si deducono dai file. La strategia di backup quasi mai: separa le due cose.}}

## Problemi comuni

<!-- Al massimo cinque voci, le più probabili per questo repo. -->

### {{Titolo breve del problema}}

- **Sintomo:** {{…}}
- **Cause probabili:** {{…}}
- **Come verificare:** {{comando}}
- **Soluzione:** {{azione}}

## Da completare

<!-- Blocchi NON DEDUCIBILE raccolti, ciascuno con chi può chiudere il punto. -->

> **NON DEDUCIBILE — {{argomento}}.** Nel repository non c'è nessun file che descriva {{cosa}}.
> File controllati: {{elenco}}. Per completare la sezione serve: {{chi o cosa}}.

## Punti da verificare

<!-- Al massimo le cinque anomalie più gravi: quelle che impediscono l'avvio o espongono dati e
segreti. Le altre vanno nella risposta. -->

- {{…}}

## Documenti collegati

- [{{servizio}}](docs/{{FILE}}.md)
