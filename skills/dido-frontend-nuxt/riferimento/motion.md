# Motion, modali, scroll e foto

Da leggere prima di toccare qualcosa che si muove: un'animazione, una modale, un foglio o un cassetto, un carosello, una galleria, foto che compaiono, lo scroll. Vale anche quando una skill di terzi (GSAP, animazione, design) propone altro: di quelle fonti si prende solo cosa si muove, in che ordine e di quanto.

## Come si anima

- Le animazioni si fanno con GSAP: entrate e uscite, modali, fogli e cassetti, tendine, schede, comparse allo scroll, sequenze e microinterazioni. Restano in CSS solo gli hover e le pressioni di bottoni e link. Niente transition o keyframes CSS, `@starting-style`, WAAPI, View Transitions, Framer Motion, motion.dev o molle, anche se una fonte li propone.
- Si anima a componenti. Un movimento che si ripete esiste una volta sola, in un composable (`useXMotion`) o in un widget, e i componenti lo riusano. La modale è un widget unico con entrata e uscita in GSAP, usato da fogli, cassetti e ricerca. La dissolvenza tra due contenuti è un wrapper unico: una `<Transition :css="false">` con gli hook in GSAP, usato anche per un contenuto che compare al posto di un altro (schede, pannelli con `v-show`).
- I plugin di GSAP si registrano solo in `plugins/gsap.client.js`, che imposta anche una volta sola `gsap.defaults` con l'easing del sito e la durata di base. Niente composable `useGSAP()` né caricamento pigro dai componenti.
- Le animazioni di un componente nascono dentro `gsap.context()`, con il suo elemento come scope, e si annullano con `revert()` quando si smonta: mai tutti i trigger con `ScrollTrigger.getAll()`. `gsap.matchMedia()` con lo scope del componente vale come contesto; le sue media query usano i breakpoint di `react`, esportati nel modulo SCSS del motion, mai scritti a mano. Girano solo nel client, da `onMounted` in poi.
- Strumenti temporanei (selettori di varianti, dati di prova, pagine `/prototypes`, GSDevTools, `markers`) non toccano componenti e composable del sito e si tolgono prima di chiudere.

## Easing e durate

- Una sola easing di sito e durate a token: `$ease-site`, `$speed-*`, `$stagger` in `vars/_timings.scss`. Il JS li legge con `useMotion()`, che li prende da un modulo SCSS.
- Nel JS non si scrive nessun numero di easing o di durata: né nelle `defaults` di una timeline, né in `quickTo`, né nello snap, né in `delay` o negli scarti della timeline (`"-=0.3"`): lì vanno `stagger`, etichette o token. `CustomEase` serve solo a dare a GSAP la easing del sito.
- Lineare solo per il motion legato allo scroll e per i loop continui (marquee, loader).
- Un movimento che attraversa lo schermo (foglio, cassetto, pannello) dura in base alla corsa: un token di riferimento (es. `$speed-medium` per 1000px) con la radice della distanza, tra due durate a token.

## Aprire e chiudere

- Apertura e chiusura sono la stessa timeline, con `play()` e `reverse()`, anche quando la chiusura parte dalla tastiera (Esc): chi chiude a metà apertura torna indietro da dove è. Niente uscite separate, più brevi o con ease-in. Tutte le parti di un passaggio stanno nella stessa timeline, mai metà in CSS e metà in GSAP.
- Un pannello, un cassetto o una modale si riapre sempre dall'inizio: scroll in cima e stato del giro prima azzerato (il modo più semplice è rimontarlo a ogni apertura con una `:key`).
- Il velo di una modale è un elemento nella stessa timeline della superficie, perché GSAP non anima il `::backdrop`. Un foglio o un cassetto scorre senza dissolvenza.
- Il `<dialog>` ha `overflow: clip`, non `hidden`: senza, mentre la superficie entra compare la sua scrollbar; con `hidden` il focus che `showModal()` mette nel contenuto fa scorrere il dialogo, e la superficie compare già al suo posto.
- La superficie di una modale animata ha `will-change: transform`, anche se un audit lo segnala: senza, al primo ridisegno testo e immagini sfarfallano.
- Un popover o una tendina nasce dal suo bottone (`transformOrigin` verso di lui). Dopo il primo tooltip, i successivi compaiono senza ritardo finché il puntatore resta lì.

## Scroll

- Lo scroll fluido è solo Lenis: `useLenis()` si inizializza una volta per l'app, nel layout o in `app.vue`, ed è già collegato a ScrollTrigger. Niente ScrollSmoother, `scrollerProxy`, ScrollToPlugin o un secondo smooth scroll.
- Ogni contenitore che scorre da solo (foglio di una modale, cassetto, menu a tendina, pannello dei filtri) ha un Lenis suo, nel ticker di GSAP, non solo `overflow-y: auto`. Il contenitore ha un figlio solo, perché Lenis ricalcola quanto si può scorrere quando cambia la misura del primo figlio. Lenis cerca `data-lenis-prevent` solo dentro il proprio contenitore, e gli eventi che arrivano da un'altra modale aperta sopra non lo devono muovere.
- Il motion che segue lo scroll usa ScrollTrigger agganciato a Lenis. Lo scrub è `true` con `ease: "none"`, mai un numero. Il pinning, anche dello scroll orizzontale finto, si fa con `position: sticky`.
- Lo scroll comandato (un'ancora, "torna su") passa dallo `scrollTo` di `useLenis()` (nei componenti `inject("scrollTo")`), che con reduced motion salta al punto: mai `window.scrollTo` scritto a mano.
- Un elemento che si trascina (foglio, carosello) si chiude o scorre in base alla velocità del gesto, con resistenza ai bordi: Draggable e InertiaPlugin, non `scroll-snap`.

## Fluido a ogni fotogramma

Ogni animazione gira a tutti i fotogrammi dello schermo (60 o 120 al secondo): stare sopra i 50 non basta.

- Si muove e si ingrandisce solo con `transform` e `opacity` (`x`, `y`, `scale`, `rotation`, `autoAlpha`). L'altezza si anima solo dove il contenuto sotto deve spostarsi (una fisarmonica), su un blocco piccolo. `clip-path`, `filter`, tracciati SVG e variabili CSS solo su superfici piccole. Su un elemento animato da GSAP non si scrive `style.transform` a mano.
- I valori che non cambiano durante il movimento (`transformPerspective`, `transformOrigin`) si fissano prima con `gsap.set`: dentro un `to()` GSAP li anima da zero.
- Il thread principale resta libero mentre si anima: il contenuto è montato e misurato prima di partire (prima le letture, poi le scritture), le immagini sono già caricate e Vue non ridisegna niente di grande nello stesso momento.
- `will-change` solo sulle superfici che si muovono, più elementi uguali con `stagger` a token, i valori che seguono il puntatore con `gsap.quickTo`.
- Un'immagine fusa con il fondo (`mix-blend-mode`) non ha mai `opacity`, `filter` o `transform` animati, né lei né i suoi contenitori: il livello nuovo la fa lampeggiare con il suo fondo bianco. Per farla comparire si dissolve sopra di lei un velo del colore del fondo, animando solo il colore.

## Foto

Una foto non si vede mai mentre arriva, né dopo il testo che le sta accanto:

- il suo riquadro ha un segnaposto, il fondo che le foto hanno nel Figma; una foto che arriva dopo la pagina ci compare sopra in dissolvenza quando è scaricata e decodificata, con una direttiva unica del progetto. Non su una foto fusa con il fondo né su una che ha un movimento suo;
- quello che compare dopo un'azione o allo scroll aspetta le sue foto decodificate prima di muoversi, con un'attesa massima: il browser decodifica una foto nascosta solo quando compare;
- le foto che entrano nella cornice muovendosi (uno slider, un carosello che scorre da solo) si scaricano e si decodificano appena lui è in vista: lazy partirebbero a metà del passaggio;
- in una galleria le immagini stanno tutte nel riquadro, una sopra l'altra e solo la corrente visibile, sempre con `NuxtImg`.

Mai lo zoom delle immagini all'hover: al massimo un overlay o il testo.

## Reduced motion

`prefers-reduced-motion` sempre rispettato: niente scale o translate animati, al massimo una dissolvenza. Si legge quando l'animazione parte, perché può cambiare mentre si naviga. Nel CSS un elemento non parte nascosto in attesa dell'animazione: lo nasconde GSAP, così senza JavaScript si vede.

## Verifica

- Si rallenta GSAP (`gsap.globalTimeline.timeScale(0.1)`) e si guardano i fotogrammi uno per uno: tra due fotogrammi la forma non salta. Non allungando le durate né con il pannello Animations di Chrome, che non vede GSAP.
- Dove un'azione mostra delle foto (schede, pannelli, hover, slider), i fotogrammi veri dello schermo con la rete lenta e la CPU rallentata (4×): nessuna foto arriva dopo il resto o vuota. In locale le foto arrivano subito e il difetto non si vede.
