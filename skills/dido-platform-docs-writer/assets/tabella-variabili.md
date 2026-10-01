# Tabella delle variabili d'ambiente — convenzioni fisse

Formato obbligatorio:

| Nome | Obbligatoria | Origine (file:riga) | Consumata da | Descrizione | Esempio | Ambiente |
|---|---|---|---|---|---|---|
| `DB_PASSWORD` | Sì | `.env.example:4` | `db`, `api` (via `env_file`) | Password dell'utente applicativo | `{{stringa lunga generata}}` | entrambi |
| `REDIS_URL` | No | `.env.example:10` | **nessuno** | Dichiarata ma non letta da nessun file del codice | `redis://cache:6379` | — |

## Perché la colonna Origine è la più importante

Rende il gate meccanico invece che affidato alla memoria: se non riesci a scrivere
`file:riga`, quella variabile non l'hai verificata e non va in tabella come fatto.

## Regole

- **I secret non si copiano mai**, nemmeno se sono versionati nel repo. Nella colonna Esempio
  va la **forma**, non il valore: `postgres://user:pass@db:5432/app`, non la stringa reale.
  Un secret reale trovato versionato finisce in "Punti da verificare".
- **`Obbligatoria` si deduce, non si assume.** È obbligatoria se il codice fallisce senza di
  lei o se il compose la interpola senza default. Se il codice ha un fallback
  (`process.env.PORT || 8080`), è facoltativa e il default va scritto in Descrizione.
- **`Consumata da` va verificata con una ricerca nel codice**, non dedotta dal nome. Una
  variabile dichiarata in `.env.example` e mai letta da nessuna parte è un rilievo: scrivilo.
- **Attenzione a `env_file`**: iniettano l'intero file in un container, quindi variabili che
  sembrano di un servizio finiscono anche in altri. Guarda a quali servizi è applicato.
- **`Ambiente`** distingue le variabili che valgono solo in locale, solo in produzione, o in
  entrambi. Se il repo non permette di stabilirlo, la cella è `NON DEDUCIBILE`.
- **Nessuna cella vuota.** Se un dato non è deducibile si scrive, non si lascia in bianco.
