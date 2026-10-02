# Struttura dei documenti: repertorio

**Non è un indice da riempire.** Una sezione entra nel documento solo se la discovery l'ha
trovata, oppure se l'utente l'ha chiesta esplicitamente — e in quel secondo caso il contenuto
è il blocco `NON DEDUCIBILE`, non testo plausibile.

---

## 1. README principale

Deve dare il quadro operativo d'insieme. Ordine consigliato:

**Panoramica**: cosa fa il progetto, in due righe. Non tre paragrafi, non un pitch.

**Ambienti a confronto**: sempre in tabella, mai in prosa. Colonne minime:

| Aspetto | Sviluppo locale | Produzione |
|---|---|---|
| File di orchestrazione usati | | |
| Comando di avvio | | |
| Reverse proxy / TLS | | |
| Motore di deploy | | |
| Origine delle variabili | | |

Se una cella non è deducibile, scrivi `NON DEDUCIBILE` nella cella e apri il blocco esteso
più sotto. Non lasciare celle vuote e non inventare il valore "tipico".

**Flusso end-to-end**: i passi logici per portare il progetto online, dall'inizio alla fine.
Serve a chi non ha mai visto il repo: deve poter seguire l'ordine senza saltare avanti.

**Prerequisiti**: strumenti da installare e accessi necessari. Per la versione di un runtime
scrivi il file che la fissa (`engines`, `FROM`, `.tool-versions`), non il numero.

**Sviluppo locale**: avvio, arresto, pulizia, URL locali, come si vedono i log, come si entra
in un container, come si lancia una migrazione. Ogni comando completo e copiabile.

**Deploy e configurazione server**: chi fa il deploy, con quale comando o quale trigger, cosa
succede al codice, come si fa rollback. Se il repo non contiene il meccanismo di deploy, questa
sezione è un blocco `NON DEDUCIBILE`: è normalissimo e va detto.

**Variabili d'ambiente**: l'elenco sta in `.env.example` e il documento rimanda lì, vedi
`assets/variabili.md`.

**Servizi**: uno per riga, con il suo ruolo nel progetto. Immagine, porte, volumi e dipendenze
stanno nel compose e il documento rimanda lì. Se i servizi sono più di tre o hanno procedure
proprie, rimanda a un documento per servizio invece di gonfiare il README.

**Backup e dati persistenti**: quali volumi contengono dati che non si possono perdere, e cosa
li salva. Attenzione: identificare i volumi è quasi sempre deducibile, identificare la
*strategia* di backup quasi mai. Sono due cose separate e vanno scritte separate.

**Problemi comuni**: vedi `reference/troubleshooting.md`, derivate dai componenti reali. Al
massimo cinque voci, le più probabili per questo repo.

**Da completare**: tutti i blocchi `NON DEDUCIBILE` raccolti in fondo, con chi può chiuderli.

**Punti da verificare**: anomalie viste durante la lettura (secret versionati, servizi senza
healthcheck, lockfile mancante, script che puntano a host non definiti da nessuna parte). Al
massimo i cinque più gravi; gli altri vanno nella risposta.

**Documenti collegati**: link ai documenti per servizio.

---

## 2. Documento per servizio (`docs/NODE.md`, `docs/DATABASE.md`, …)

Uno per servizio che abbia procedure proprie. Struttura fissa:

1. **Ruolo**: cosa fa nel progetto, cosa usa e chi lo usa. Immagine, porte, volumi, dipendenze e
   variabili stanno nel compose e in `.env.example`: il documento rimanda lì.
2. **Comandi operativi**: avvio locale, avvio in produzione, come ci si collega, come si
   eseguono le operazioni ordinarie (migrazioni, seed, svuotamento cache).
3. **Deploy**: come viene aggiornato sul server. Se non deducibile, blocco esplicito.
4. **Debug rapido**: comandi diretti per capire se è vivo: `docker compose ps`, `docker compose
   logs -f <servizio>`, `pg_isready`, `redis-cli ping`, `curl` sull'endpoint di health. Solo
   quelli che hanno senso per *questo* servizio.

---

## Regole trasversali

- **I secret non si copiano mai**, nemmeno se sono versionati. Un secret reale trovato nel repo
  finisce in "Punti da verificare".
- **Le sezioni si numerano** solo se il documento supera le due schermate.
