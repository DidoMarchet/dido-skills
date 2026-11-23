// Le righe "board:" di board.mjs, comuni alle due board (GitHub e Infinity).

// Un'uscita anticipata porta la riga da scrivere; il processo poi finisce da solo, con 0.
// Niente process.exit: su macOS stdout verso una pipe è asincrono e la riga andrebbe persa.
export class BoardExit extends Error {}

export const finish = (text) => {
  throw new BoardExit(text)
}

export const notUpdated = (reason) => finish(`non aggiornata: ${reason}`)

export const say = (text) => process.stdout.write(`board: ${text}\n`)

export const sameName = (first, second) => first.trim().toLowerCase() === second.trim().toLowerCase()

// Le prove accorciano l'attesa con DIDO_BOARD_TIMEOUT_MS.
export const timeoutMs = Number(process.env.DIDO_BOARD_TIMEOUT_MS) || 20000
