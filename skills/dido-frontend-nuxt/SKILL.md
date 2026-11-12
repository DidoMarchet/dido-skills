---
name: dido-frontend-nuxt
description: Usare ogni volta che si scrive, modifica, revisiona o crea codice di un frontend, sito o pannello, anche per un ritocco a un componente o a uno stile (pagine, componenti, stili e token, testi e lingue, configurazione, dati da CMS e API, terze parti, animazioni, accessibilità e SEO), e quando si avvia un sito nuovo da uno starter.
---

# Frontend

Il metodo dei frontend. **Skill richiesta:** dido-code-style, con i principi validi per ogni stack. Qui c'è solo ciò che è specifico del frontend, valido con qualunque framework.

Con quali strumenti il progetto applica queste regole (framework, sistema di stile, CMS, libreria di animazione) e cosa controlla il suo lint sta in `docs/conventions.md` del progetto: leggilo prima di scrivere codice. Le regole che il lint controlla qui non si ripetono. Se il progetto (le sue istruzioni o le sue doc, non il codice) dice una cosa diversa da questa skill, vale il progetto, e la differenza va nel report perché una delle due fonti è da correggere.

| Stai per toccare | Leggi |
|---|---|
| un'animazione, una modale, un foglio o un cassetto, un carosello, una galleria, foto che compaiono, lo scroll | `riferimento/motion.md` |
| chiamate a un backend con sessione: login, token, errori | `riferimento/chiamate-al-backend.md` |
| una skill che non è `dido-*` (design, animazione, CMS, framework) | `riferimento/skill-di-terzi.md` |

## Principi

- **Componi con il design system.** Margini, padding, gap e larghezze con le classi e i token che ci sono. Riusa tipografia, bottoni e card, niente spaziature su misura.
- **Token pragmatici.** I token sono variabili esposte come classi numerate, non un sistema formale di design token. Un valore usato una volta sola si scrive dov'è, sono token solo i valori ricorrenti.
- **Valori disciplinati.** Numeri pieni o multipli di 5, anche nelle misure di layout, e font a multipli di 2 o 4. Se c'è un design di riferimento, i valori vengono da lì e non si inventano, ma si arrotondano: un valore che non è un token della scala né un multiplo di 5 diventa il più vicino dei due (67 → 65, 17 → 16). Le regole di questa skill valgono sopra il layout: una differenza dal design dovuta a loro non è un errore.
- **Dal design.** Se c'è un design, prima di scrivere lo si legge (struttura, valori, l'immagine del pezzo giusto) e si misurano content box, gap e padding: niente a memoria.
- **Testi staccati dalle righe.** Un testo, un titolo o una CTA non stanno mai appoggiati a una riga visibile (righe della griglia di sfondo, divisori verticali): hanno un padding minimo dalla riga anche se il design li allinea lì, con un token applicato da una classe. Le immagini possono toccarla.
- **Degrada, non cadere.** Un dato o una config che manca produce uno stato gestito (fallback, messaggio, sezione assente), mai una pagina in errore. Fa eccezione il contenuto principale: se la sua fonte non risponde la pagina risponde 500, se il contenuto non c'è 404. Nel rendering lato server una proprietà letta su un oggetto che può mancare fa fallire tutta la pagina, quindi il valore di sicurezza va dove leggi (`config?.key ?? fallback`).

## Componenti

- Un componente è una cartella con il suo markup, il suo stile e i suoi asset, raggruppata per dominio (`article/`, `navigation/`). Il nome lo dà il percorso.
- I componenti agnostici e riusabili stanno in un'area loro (`widget/`): ricevono tutto da prop ed espongono slot. Un pattern ripetuto, come un carosello, esiste una volta sola lì. Un componente di una sezione specifica resta nella sua area.
- Stesso tipo di elemento, stesso comportamento in tutto il sito: caroselli, schede, sottolineature, hover, dissolvenze e cambi d'immagine si muovono uguali, con la stessa easing e lo stesso stato alla pressione. Il file di un componente contiene solo ciò che è suo: quello che si ripete sta una volta sola nel componente, composable, mixin o classe globale che lo fa.
- Un componente usa solo le classi del suo blocco e quelle del design system, e parla con gli altri con prop, eventi, slot o uno store, mai cercando il loro DOM.
- Gli effetti su DOM, scroll e animazioni stanno in un composable che espone stato e azioni, non markup. La logica pura sta nelle util, con i suoi test. Query e chiamate stanno in cartelle dedicate, mai dentro i componenti.
- Classi BEM: blocco `.component`, `__element`, `--modifier`. Le varianti si chiamano per sezione o brand, mai per colore (`--footer`, non `--dark`).
- Gli id solo quando servono (àncora, `aria-*`, JS). Il maiuscolo si fa con `text-transform`, mai scritto nel testo.
- Asset permanenti con nomi descrittivi per la SEO (`<company>-logo.svg`), i segnaposto in una cartella a parte. Le icone sono SVG usate come immagini, ricolorate con un secondo file o con `mask` e `currentcolor`: niente librerie di icone né SVG lunghi nel template.

## Stile

- Una sola scala tipografica numerata (`.title-1…4`, `.text-1…3`), mai due nomenclature insieme. Colori a scala per famiglia (`$black-1`, `$grey-2`), non semantici.
- Classi, non mixin: i token diventano classi numerate, generate dalla scala. I mixin servono solo per gli helper responsive e per i comportamenti interattivi.
- Font e spazi grandi sempre fluidi tra mobile e desktop: i titoli della scala, i font da 40px in su, e margin, padding, gap, `top` e `bottom` da 80px in su. Il massimo viene dal design desktop, il minimo dallo stesso elemento nel design mobile; dove manca, circa la metà, arrotondato. Un valore che cambiava solo a un breakpoint diventa fluido tra i due. Restano fissi il testo corrente e gli spazi piccoli. La spaziatura negativa dei titoli va in `em`.
- Controlli e card scalano insieme dal mobile al desktop: pochi token fluidi condivisi (altezza e testo dei controlli, padding e titolo delle card, altezza della CTA), usati da tutti i componenti.
- Margini laterali mai fissi: il margine della pagina è un token fluido, e una colonna larga fissa nel design desktop si stringe sotto il desktop.
- Media query solo con l'helper dei breakpoint del progetto.
- Sul touch non c'è hover, neanche alla pressione. L'hover e il suo `:active` stanno tutti e due dentro la condizione "puntatore che fa hover", anche nei mixin; un hover fatto in JavaScript legge la stessa condizione o il `pointerType`. Su iPhone una cosa che compare al tocco trasforma il tocco in un hover, e il clic non parte.
- Ogni elemento cliccabile ha un hover, con la transizione del sito: mai un cambio istantaneo. I testi-azione ("Chiudi", "Filtra", i link) prendono tutti la stessa sottolineatura animata, e in hover il testo cambia di un tono; i bottoni a icona un tono più scuro o un fondo, quelli pieni un tono più scuro. Con il puntatore lo stesso stato vale alla pressione (`:active`), scritto insieme all'hover. Sul touch l'unico riscontro è la stretta dei pulsanti pieni (0,97, ferma con reduced motion). Di base: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` su link e pulsanti, testo dei pulsanti non selezionabile.
- Un testo-azione accanto a un titolo è un passo sotto il titolo e sta sulla sua linea di base. I titoli sulla stessa riga in colonne diverse condividono la linea di base.
- La conferma di un'azione fatta da un pulsante (link copiato) è un tooltip attaccato a quel pulsante, non un avviso lontano.
- Nel mobile una scelta tra card si fa in una lista verticale a tutta larghezza, non in una fila che scorre di lato.
- Uno sfondo a tutta pagina è una sezione con il contenitore della larghezza dentro.

## Testi e lingue

- Nessun testo scritto nei componenti: il brand viene dalla config, le label dai dizionari delle lingue, i contenuti dal CMS. Fanno eccezione le pagine di servizio per chi lavora al sito (una styleguide) e un pannello con una lingua sola.
- Mai condizioni sulla lingua nel template.
- Dizionari divisi per area: una cartella per lingua, un file per area. Le lingue sono specchi: una stringa nuova va in tutte, con la stessa chiave e nella stessa area. Il file unico si divide alla prima sezione, non dopo.
- Gli slug localizzati stanno nella config delle lingue. Ogni pagina è dichiarata lì anche quando lo slug è uguale nelle lingue, così entra nella sitemap; hreflang e canonical puntano allo slug giusto di ogni lingua.

## Configurazione

- La configurazione è divisa per area, e un'impostazione si cambia nella sua.
- Env e segreti arrivano dalla config di runtime, mai scritti nei componenti. Quello che finisce nel bundle client contiene solo valori pubblici per natura (es. un token CMS in sola lettura).
- `robots` e `noindex` dipendono dall'ambiente: si indicizza solo la produzione.

## Dati e terze parti

- Il CMS si legge da un composable solo, e le API da un altro: pagine e componenti non parlano mai con un client HTTP o del CMS. Il client lo importano solo quei composable e le sorgenti lato server.
- SEO, canonical e hreflang da un composable solo, chiamato dalla pagina.
- Una terza parte che serve a tutto il sito (analytics, error tracking, consenso) è un plugin. Una che serve a una pagina o a un componente (un form, un widget di prenotazione, un player) è un composable per l'effetto più un componente per il markup.
- La libreria di una terza parte la importa solo il suo plugin o il suo composable, che senza la sua config non fa niente. Così si toglie cancellando quei file, la dipendenza e il punto in cui si usa. Se deve ricevere qualcosa dal sito (gli errori per l'error tracking), si aggancia a un hook.
- Gli embed si vestono con il design system: niente CSS del servizio, le classi dei tuoi bottoni. Se il servizio rende in un `<iframe>` non si può vestire, quindi va verificato prima di prometterlo.
- Prima di dire cosa fa una terza parte, misura quali domini contatta e quali cookie scrive.
- Le sorgenti dinamiche lato server, come la sitemap, chiamano il servizio dal server, paginano dove il servizio lo chiede e non rompono il build quando falliscono. Un modello con pagina di dettaglio entra nella sitemap interrogando ogni lingua.
- Lo schema del CMS cambia solo con migration versionate, provate su un ambiente di prova: mai a mano.

## Motion, in breve

Una sola libreria per tutte le animazioni, a componenti, con easing e durate solo dai token. In CSS solo hover e pressione. Solo `transform` e `opacity`. Reduced motion sempre rispettato. Un solo sistema di scroll. Il resto, prima di toccare qualcosa che si muove, in `riferimento/motion.md`.

## Accessibilità e SEO

- Immagini decorative con `alt=""`, informative con un `alt` che le descrive. Nomi dei file pensati per la SEO, `loading="lazy"` e `decoding="async"` dove ha senso.
- Un solo `<h1>` per pagina, heading in ordine, markup semantico e landmark.
- Contrasto almeno WCAG AA (4,5:1, 3:1 per i testi grandi). Le combinazioni che non passano si segnalano, non si scelgono in silenzio.
- Focus visibile con `:focus-visible`, distinto da `:focus`.
- L'esito di un'azione asincrona si annuncia spostando il focus sul messaggio (`tabindex="-1"` e `.focus()`). Una live region funziona solo se era già nel DOM prima che il contenuto cambiasse.
- In `<noscript>` solo testo, con una sola interpolazione, e nessun `display` nel CSS: dei tag dentro danno un mismatch di idratazione.
- Immagini dimensionate per larghezza, mai con un'altezza fissa (`block-size: auto`, o un box con un `object-fit` scelto apposta).

## Verifica

Oltre a quanto chiede dido-code-style, in proporzione a cosa hai toccato:

- **sempre**: lint pulito sui file toccati; la pagina toccata risponde 200 con zero errori in console e nel log, compresi i mismatch di idratazione; i test di util e composable toccati (un componente li ha quando contiene della logica; motion e aspetto si verificano con gli screenshot);
- **un ritocco** (un colore, un margine, un testo): uno screenshot da mobile e uno da desktop della parte toccata;
- **un'interfaccia nuova o cambiata** (una sezione, un componente, un layout): ogni elemento confrontato con quelli simili del sito (stesso componente e stesso comportamento, compresi trascinamento, hover e pressione), e l'interfaccia guardata a 375, 768, 1024, 1440 e 1920 con le skill di design del progetto: il contenuto si legge, è bilanciato e si usa bene;
- **motion e foto**: le prove di `riferimento/motion.md`;
- **una terza parte**: domini e cookie misurati; se è nuova, la pagina risponde 200 anche senza la sua variabile d'ambiente.
