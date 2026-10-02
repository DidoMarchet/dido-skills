# Variabili d'ambiente

L'elenco delle variabili sta in `.env.example` e il documento rimanda lì: una tabella che lo
ricopia resta indietro alla prima variabile aggiunta o tolta. Se `.env.example` manca, la fonte
è il codice che legge le variabili: rimanda a quel file e segnala la mancanza in "Punti da
verificare".

## Nel documento

Una riga che rimanda a `.env.example`, poi solo ciò che i file non dicono: da dove arrivano i
valori di produzione e chi li gestisce. Quasi sempre è NON DEDUCIBILE. Dove si impostano le
variabili in ogni ambiente sta nella riga "Origine delle variabili" di Ambienti a confronto.

## In `.env.example`

Cosa fa una variabile, ricavato da come la usa il codice, va in un commento sopra di lei quando
il nome non basta. Chi aggiunge, rinomina o toglie la variabile trova il commento nello stesso
punto.

```
# Base dei link nelle email (conferma account, reset password)
FRONTEND_URL=https://example.com
```

## Da segnalare in "Punti da verificare"

- Una variabile dichiarata e mai letta, o letta e mai dichiarata. Chi la legge si verifica con
  una ricerca nel codice, non si deduce dal nome.
- Un `env_file` che porta segreti in servizi che non li usano: il file entra intero nel
  container.
