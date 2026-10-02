# Chiamate a un backend di Dido

Come un frontend parla con un backend di Dido, cioè lo starter e i progetti nati da lì. Endpoint e campi stanno nella spec OpenAPI del backend: qui c'è solo ciò che la spec non dice.

## URL e risposte

- Ogni URL è base + prefisso di versione + path relativo, mai scritto a mano. Un 404 JSON su una rotta che dovrebbe esistere è quasi sempre il prefisso mancante.
- Una risposta valida ha `status: "ok"`, e un 2xx senza body vale `{}`. Un 502 o un 504 del proxy può arrivare in HTML, quindi la lettura del JSON deve reggere un body che non è JSON.
- Le liste sono paginate dal server. La ricerca va nel parametro `q`, perché un filtro nel client vedrebbe solo la pagina corrente, e quando cambia la ricerca o un filtro si torna a pagina 1.
- Date in ISO 8601 UTC. Le email si normalizzano come fa il server (trim e minuscole), così i confronti nell'interfaccia non sbagliano.

## Errori

| Risposta | Cosa fa il client |
|---|---|
| `401` su una chiamata con il token | un refresh e un nuovo tentativo; se il refresh fallisce o il nuovo tentativo dà ancora 401, logout locale e login |
| `401` su login, OTP o refresh | mostra l'errore o chiude la sessione, senza riprovare |
| `400` | errore sul campo o avviso, mai refresh né logout |
| `403` | messaggio, nessun logout |
| `409` | messaggio; per un conflitto tra operazioni concorrenti, proponi di riprovare |

Un account disattivato riceve 401 anche sul refresh e torna al login. Se il messaggio è `Account non attivo`, mostra quello invece di un generico "sessione scaduta".

## Sessione

- Il backend ruota il refresh token a ogni uso, e di due refresh concorrenti ne vince uno solo: l'altro riceve 401 e slogga l'utente. Per questo il refresh è una funzione sola, usata dal client API e dal ripristino al caricamento della pagina. Chi arriva mentre un refresh è in corso aspetta la stessa promise:

  ```js
  // Dentro lo store di auth: una promise per istanza dello store, quindi in SSR una per richiesta
  let refreshing = null
  const refresh = () => (refreshing ??= doRefresh().finally(() => { refreshing = null }))
  ```

  Tra le tab il refresh si mette in fila con i Web Locks (`navigator.locks.request`), perché il cookie è condiviso e la seconda tab deve partire con il cookie già ruotato.
- L'access token sta solo in memoria, mai in `localStorage` o `sessionStorage`. Upload e download passano dalla stessa logica di token, refresh e nuovo tentativo.
- Dopo un ricaricamento della pagina: prima il refresh per l'access token, poi la chiamata del profilo (nello starter `GET /v1/auth/me`). Un errore sul profilo diverso da 401 non slogga.
- I ruoli per l'interfaccia vengono dal profilo, non dal JWT: il backend usa i ruoli attuali nel database.
- Il logout chiama l'endpoint di logout, che cancella il cookie dal server, poi azzera token e store.
- Finiti i tentativi OTP il codice è bruciato: l'interfaccia riporta al login per riceverne uno nuovo, non fa riprovare lo stesso codice.
