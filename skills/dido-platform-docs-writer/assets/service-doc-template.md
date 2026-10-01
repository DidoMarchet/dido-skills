# {{nome servizio}}

## 1. Architettura

**Ruolo:** {{…}}
**Dipende da:** {{servizi}} — risulta da `{{file:riga}}`
**Da lui dipendono:** {{servizi}} — risulta da `{{file:riga}}`

## 2. Requisiti

| Requisito | Valore | Da dove risulta |
|---|---|---|
| Runtime e versione | | |
| Rete | | |
| Volumi | | |

## 3. Variabili d'ambiente

Solo quelle che **questo** servizio consuma. Attenzione a `env_file`: una variabile può finire
in più container di quanti sembri.

| Nome | Obbligatoria | Origine (file:riga) | Descrizione | Esempio | Ambiente |
|---|---|---|---|---|---|
| | | | | | |

## 4. Comandi operativi

**Avvio locale**
```bash
{{…}}
```

**Avvio in produzione**
```bash
{{…}}
```

**Accesso e operazioni ordinarie**
```bash
{{…}}
```

## 5. Deploy

{{Come viene aggiornato sul server. Se non deducibile, blocco NON DEDUCIBILE.}}

## 6. Debug rapido

Solo i comandi che hanno senso per questo servizio.

```bash
{{…}}
```
