# Struttura dei documenti — repertorio

**Non è un indice da riempire.** Una sezione entra nel documento solo se la discovery l'ha
trovata, oppure se l'utente l'ha chiesta esplicitamente — e in quel secondo caso il contenuto
è il blocco `NON DEDUCIBILE`, non testo plausibile.

---

## 1. README principale

Deve dare il quadro operativo d'insieme. Ordine consigliato:

**Panoramica** — cosa fa il progetto, in due righe. Non tre paragrafi, non un pitch.

**Ambienti a confronto** — sempre in tabella, mai in prosa. Colonne minime:

| Aspetto | Sviluppo locale | Produzione |
|---|---|---|
| File di orchestrazione usati | | |
| Comando di avvio | | |
| Reverse proxy / TLS | | |
| Motore di deploy | | |
| Origine delle variabili | | |
| Porte pubblicate | | |
| Utente del container | | |

Se una cella non è deducibile, scrivi `NON DEDUCIBILE` nella cella e apri il blocco esteso
più sotto. Non lasciare celle vuote e non inventare il valore "tipico".

**Flusso end-to-end** — i passi logici per portare il progetto online, dall'inizio alla fine.
Serve a chi non ha mai visto il repo: deve poter seguire l'ordine senza saltare avanti.

**Prerequisiti** — versioni di runtime, strumenti da installare, accessi necessari. Ricava le
versioni dai file (`engines`, `FROM`, `.tool-versions`, lockfile), non dalla memoria.

**Sviluppo locale** — avvio, arresto, pulizia, URL locali, come si vedono i log, come si entra
in un container, come si lancia una migrazione. Ogni comando completo e copiabile.

**Deploy e configurazione server** — chi fa il deploy, con quale comando o quale trigger, cosa
succede al codice, come si fa rollback. Se il repo non contiene il meccanismo di deploy, questa
sezione è un blocco `NON DEDUCIBILE`: è normalissimo e va detto.

**Variabili d'ambiente** — sempre in tabella, vedi `assets/tabella-variabili.md`. Mai un blocco
di `.env` incollato senza spiegazione.

**Servizi** — uno per riga: ruolo, immagine o build, porta interna, volumi, dipendenze, comando
di avvio. Se i servizi sono più di tre o hanno configurazione non banale, rimanda a un documento
per servizio invece di gonfiare il README.

**Backup e dati persistenti** — quali volumi contengono dati che non si possono perdere, e cosa
li salva. Attenzione: identificare i volumi è quasi sempre deducibile, identificare la
*strategia* di backup quasi mai. Sono due cose separate e vanno scritte separate.

**Problemi comuni** — vedi `reference/troubleshooting.md`, derivate dai componenti reali.

**Da completare** — tutti i blocchi `NON DEDUCIBILE` raccolti in fondo, con chi può chiuderli.

**Punti da verificare** — anomalie viste durante la lettura (secret versionati, servizi senza
healthcheck, lockfile mancante, script che puntano a host non definiti da nessuna parte).

**Documenti collegati** — link ai documenti per servizio.

---

## 2. Documento per servizio (`docs/NODE.md`, `docs/DATABASE.md`, …)

Uno per servizio che abbia configurazione propria. Struttura fissa:

1. **Architettura** — ruolo nello stack, se gira da solo o dipende da altri, chi dipende da lui.
   Cita il file da cui ricavi la dipendenza (`depends_on`, la variabile di connessione, l'import).
2. **Requisiti** — runtime, versione, risorse, configurazione di rete necessaria.
3. **Variabili d'ambiente** — tabella nel formato di `assets/tabella-variabili.md`, limitata alle
   variabili che *questo* servizio consuma. Attenzione a `env_file`: una variabile può finire in
   più container di quanti sembri.
4. **Comandi operativi** — avvio locale, avvio in produzione, come ci si collega, come si
   eseguono le operazioni ordinarie (migrazioni, seed, svuotamento cache).
5. **Deploy** — come viene aggiornato sul server. Se non deducibile, blocco esplicito.
6. **Debug rapido** — comandi diretti per capire se è vivo: `docker compose ps`, `docker compose
   logs -f <servizio>`, `pg_isready`, `redis-cli ping`, `curl` sull'endpoint di health. Solo
   quelli che hanno senso per *questo* servizio.

---

## Regole trasversali

- **Ogni valore ha un'origine.** Porte, host, percorsi e nomi si copiano dal file, non si
  ricordano. Se in tabella c'è una colonna origine, riempila con `file:riga`.
- **Il conflitto con la documentazione preesistente si dichiara.** Se il README attuale
  contraddice il codice, aggiungi una tabella `Correzioni alla documentazione precedente` con
  tre colonne: cosa diceva · cosa dice il codice · file che lo dimostra. Non correggere in
  silenzio: chi legge deve sapere che quella cosa che credeva vera non lo è.
- **I secret non si copiano mai**, nemmeno se sono versionati. Nella colonna Esempio va la
  forma (`postgres://user:pass@db:5432/app`). Un secret reale trovato nel repo finisce in
  "Punti da verificare".
- **Le sezioni si numerano** solo se il documento supera le due schermate.
