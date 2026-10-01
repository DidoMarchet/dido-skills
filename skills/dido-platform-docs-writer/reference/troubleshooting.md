# Troubleshooting — repertorio per tecnologia rilevata

**Regola d'ingresso: una voce entra nel documento solo se il componente che la causa compare
fra i file letti nella discovery.** Niente sezione TLS se nessun file emette certificati,
niente sezione DNS se nessun file nomina un dominio, niente crash loop da variabili se non
esiste un `.env.example`. Questo file è un repertorio da cui pescare, mai un indice da riempire.

Formato di ogni voce nel documento finale:

```markdown
### {Titolo breve del problema}

- **Sintomo:** cosa vede o cosa fallisce.
- **Cause probabili:** dedotte dallo stack reale, non generiche.
- **Come verificare:** comandi di diagnosi, copiabili.
- **Soluzione:** azione concreta e diretta.
```

---

## Se il repo contiene un orchestratore di container

- Container in crash loop subito dopo l'avvio → variabile obbligatoria assente, permessi del
  volume, comando di avvio che punta a un file inesistente. Verifica: `docker compose ps`,
  `docker compose logs --tail=50 <servizio>`, `docker compose config`.
- Il servizio parte prima della sua dipendenza → manca `depends_on` con `condition:
  service_healthy`, o l'healthcheck non è definito. Si vede in `compose.yaml`.
- Comportamento diverso fra la macchina di sviluppo e il server → un file di override viene
  applicato dove non dovrebbe. Verifica con `docker compose config` e con `docker compose -f
  compose.yaml config`, e confronta l'output.
- Modifiche al codice che non si vedono → build cachata o volume di sviluppo non montato.
- Dati persi al riavvio → servizio senza volume nominato. Si legge direttamente nel compose.

## Se il repo contiene un reverse proxy o configurazione di routing

- Errore di redirect ciclico → doppia terminazione TLS (CDN e proxy entrambi attivi), o
  applicazione che forza HTTPS dietro un proxy che già lo fa.
- Certificati non emessi o non rinnovati → dominio non ancora propagato al momento della
  richiesta, rate limit dell'autorità di certificazione, porta 80 non raggiungibile.
- 502 o 504 dal proxy → il servizio a monte non ascolta sulla porta attesa, o non è nella
  stessa rete del proxy. Verifica la porta dichiarata nel compose contro quella nella config
  del proxy.
- Header persi a valle (IP reale, protocollo) → mancano gli header di forwarding.

## Se il repo contiene CI/CD

- Il deploy va a buon fine ma il codice sul server è vecchio → il job costruisce ma non
  riavvia, o riavvia senza ricostruire.
- Errore di autenticazione durante il clone o il push dal server → chiave non presente o non
  autorizzata per quell'utente.
- Il job passa in locale e fallisce in CI → variabili presenti solo sulla macchina di
  sviluppo, o versione di runtime diversa fra `Dockerfile` e workflow.
- Build impossibile per lockfile mancante → i comandi di installazione deterministici
  (`npm ci` e simili) richiedono il lockfile: se non è versionato, la build fallisce sempre.

## Se il repo contiene un database

- Connessione rifiutata dall'applicazione ma il container è su → l'app usa `localhost` invece
  del nome del servizio nella rete interna.
- Autenticazione fallita al primo avvio dopo un cambio di password → il volume dati
  preesistente conserva le credenziali vecchie: le variabili si applicano solo
  all'inizializzazione.
- Migrazioni che si applicano due volte o mai → nessun controllo di stato, o comando lanciato
  da un servizio che parte in più repliche.
- Prestazioni che degradano nel tempo → assenza di indici, query lente ricorrenti. Segnala
  solo se il repo contiene qualcosa che lo dimostri (schema, log di slow query).

## Se il repo prevede accesso al server

- Permesso negato con chiave pubblica → chiave non presente per quell'utente, permessi del
  file sbagliati, utente diverso da quello atteso.
- Comandi che funzionano manualmente e falliscono da automazione → shell non interattiva,
  `PATH` diverso, variabili d'ambiente non caricate.
- Spazio disco esaurito da immagini e volumi orfani → nessuna pulizia periodica prevista.

---

## Manutenzione di questo repertorio

Se documenti uno stack che questo file non copre, scrivi comunque le voci — dedotte dai file di
quel repository — e segnalale in coda al documento prodotto sotto **"Proposte di aggiornamento
del repertorio"**, invece di aggiungerle qui in silenzio.
