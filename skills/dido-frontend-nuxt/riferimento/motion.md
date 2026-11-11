# Motion, modali, scroll e foto

Da leggere prima di toccare qualcosa che si muove: un'animazione, una modale, un foglio o un cassetto, un carosello, una galleria, foto che compaiono, lo scroll. Con quale libreria si fa sta in `docs/conventions.md` del progetto. Vale anche quando una skill di terzi propone altro: di quelle fonti si prende solo cosa si muove, in che ordine e di quanto.

## Come si anima

- Una sola libreria per tutte le animazioni: entrate e uscite, modali, fogli e cassetti, tendine, schede, comparse allo scroll, sequenze e microinterazioni. Restano in CSS solo gli hover e le pressioni di bottoni e link. Niente seconda tecnica accanto (transition o keyframes CSS, animazioni del browser, librerie diverse), anche se una fonte la propone.
- Si anima a componenti. Un movimento che si ripete esiste una volta sola, in un composable o in un componente, e gli altri lo riusano. La modale è un componente unico, usato da fogli, cassetti e ricerca. La dissolvenza tra due contenuti è un wrapper unico, usato anche per un contenuto che compare al posto di un altro (schede, pannelli).
- Le animazioni di un componente nascono e si annullano con lui, ognuna nel suo scope: un componente non annulla mai le animazioni degli altri. Girano solo nel browser, dopo il montaggio.
- Strumenti temporanei (selettori di varianti, dati di prova, pagine di prototipo, marcatori di debug) non toccano i componenti del sito e si tolgono prima di chiudere.

## Easing e durate

- Una sola easing di sito e durate a token, definiti una volta nello stile e letti dal JS: mai numeri di easing o di durata scritti nel JS, né nei default, né negli scarti di una sequenza. Tra i passi di una sequenza vanno stagger, etichette o token.
- Lineare solo per il motion legato allo scroll e per i loop continui (marquee, loader).
- Un movimento che attraversa lo schermo (foglio, cassetto, pannello) dura in base alla corsa: un token di riferimento per una distanza (es. 1000px) con la radice della distanza, tra due durate a token.

## Aprire e chiudere

- Apertura e chiusura sono la stessa sequenza, avanti e indietro, anche quando la chiusura parte dalla tastiera (Esc): chi chiude a metà apertura torna indietro da dove è. Niente uscite separate, più brevi o con un'altra curva. Tutte le parti di un passaggio stanno nella stessa sequenza, mai metà in CSS e metà in JS.
- Un pannello, un cassetto o una modale si riapre sempre dall'inizio: scroll in cima e stato del giro prima azzerato (il modo più semplice è rimontarlo a ogni apertura).
- Il velo di una modale è un elemento nella stessa sequenza della superficie, perché il `::backdrop` non si anima. Un foglio o un cassetto scorre senza dissolvenza.
- Il `<dialog>` ha `overflow: clip`, non `hidden`: senza, mentre la superficie entra compare la sua scrollbar; con `hidden` il focus che `showModal()` mette nel contenuto fa scorrere il dialogo, e la superficie compare già al suo posto.
- La superficie di una modale animata ha `will-change: transform`, anche se un audit lo segnala: senza, al primo ridisegno testo e immagini sfarfallano.
- Un popover o una tendina nasce dal suo bottone (`transform-origin` verso di lui). Dopo il primo tooltip, i successivi compaiono senza ritardo finché il puntatore resta lì.

## Scroll

- Un solo sistema di scroll fluido, inizializzato una volta per l'app e collegato al motion legato allo scroll. Ogni contenitore che scorre da solo (foglio di una modale, cassetto, tendina, pannello dei filtri) ha lo stesso scorrimento della pagina, non solo `overflow-y: auto`, e non si muove con gli eventi di un'altra modale aperta sopra.
- Il pinning, anche dello scroll orizzontale finto, si fa con `position: sticky`, non in JS.
- Lo scroll comandato (un'ancora, "torna su") passa dal sistema di scroll del sito, che con reduced motion salta al punto: mai `window.scrollTo` scritto a mano.
- Un elemento che si trascina (foglio, carosello) si chiude o scorre in base alla velocità del gesto, con resistenza ai bordi, non con `scroll-snap`.

## Fluido a ogni fotogramma

Ogni animazione gira a tutti i fotogrammi dello schermo (60 o 120 al secondo): stare sopra i 50 non basta.

- Si muove e si ingrandisce solo con `transform` e `opacity`. L'altezza si anima solo dove il contenuto sotto deve spostarsi (una fisarmonica), su un blocco piccolo. `clip-path`, `filter`, tracciati SVG e variabili CSS solo su superfici piccole.
- I valori che non cambiano durante il movimento (prospettiva, punto d'origine) si fissano prima di partire, così la forma non salta nei primi fotogrammi.
- Il thread principale resta libero mentre si anima: il contenuto è montato e misurato prima di partire (prima le letture, poi le scritture), le immagini sono già caricate e niente di grande si ridisegna nello stesso momento.
- `will-change` solo sulle superfici che si muovono; più elementi uguali con uno stagger a token.
- Un'immagine fusa con il fondo (`mix-blend-mode`) non ha mai `opacity`, `filter` o `transform` animati, né lei né i suoi contenitori: il livello nuovo la fa lampeggiare con il suo fondo bianco. Per farla comparire si dissolve sopra di lei un velo del colore del fondo, animando solo il colore.

## Foto

Una foto non si vede mai mentre arriva, né dopo il testo che le sta accanto:

- il suo riquadro ha un segnaposto, il fondo che le foto hanno nel design; una foto che arriva dopo la pagina ci compare sopra in dissolvenza quando è scaricata e decodificata, con una direttiva unica del progetto. Non su una foto fusa con il fondo né su una che ha un movimento suo;
- quello che compare dopo un'azione o allo scroll aspetta le sue foto decodificate prima di muoversi, con un'attesa massima: il browser decodifica una foto nascosta solo quando compare;
- le foto che entrano nella cornice muovendosi (uno slider, un carosello che scorre da solo) si scaricano e si decodificano appena lui è in vista: lazy partirebbero a metà del passaggio;
- in una galleria le immagini stanno tutte nel riquadro, una sopra l'altra e solo la corrente visibile.

Mai lo zoom delle immagini all'hover: al massimo un overlay o il testo.

## Reduced motion

`prefers-reduced-motion` sempre rispettato: niente scale o translate animati, al massimo una dissolvenza. Si legge quando l'animazione parte, perché può cambiare mentre si naviga. Nel CSS un elemento non parte nascosto in attesa dell'animazione: lo nasconde il JS, così senza JavaScript si vede.

## Verifica

- Si rallenta l'animazione (la velocità globale della libreria a un decimo) e si guardano i fotogrammi uno per uno: tra due fotogrammi la forma non salta.
- Dove un'azione mostra delle foto (schede, pannelli, hover, slider), i fotogrammi veri dello schermo con la rete lenta e la CPU rallentata (4×): nessuna foto arriva dopo il resto o vuota. In locale le foto arrivano subito e il difetto non si vede.
