# Checklist QA sito web — voci complete

**Legenda modalità:** `[A]` automatica (leggibile dall'HTML/risorse pubbliche) · `[B]` richiede
browser interattivo · `[M]` manuale/umana (credenziali, denaro, giudizio, strumenti esterni).

**Severità di default:** BLOCCANTE · ALTA · MEDIA · BASSA — da tarare sul contesto.

**Tag di applicabilità:** `#tutti` · `#lancio` (pre-lancio o migrazione) · `#ecom` · `#login`
· `#multi` (multilingua) · `#blog` · `#form`.

---

## 1. GO — Go-live, ambiente e migrazione `#lancio`

Sezione da eseguire **per prima** in caso di lancio o migrazione: qui stanno gli errori che
annullano tutto il resto del lavoro.

**`GO-01` robots.txt di produzione** — `[A]` `BLOCCANTE` `#lancio`
`Come:` GET /robots.txt sull'ambiente live. · `OK se:` nessun `Disallow: /` ereditato dallo staging e nessun blocco su asset CSS/JS necessari al rendering.

**`GO-02` Meta robots residui** — `[A]` `BLOCCANTE` `#lancio`
`Come:` cerca `noindex` nell'HTML delle pagine campione e nell'header `X-Robots-Tag`. · `OK se:` presente solo dove voluto (aree private, filtri, thank-you page).

**`GO-03` Staging non indicizzabile** — `[A]` `ALTA` `#lancio`
`Come:` verifica che l'ambiente di staging sia protetto (auth HTTP, IP allowlist) e in noindex. · `OK se:` non raggiungibile pubblicamente e non presente nei motori.

**`GO-04` Mappa dei redirect 301** — `[M]` `BLOCCANTE` `#lancio`
`Come:` incrocia la lista degli URL vecchi (crawl del sito precedente, Search Console, sitemap storica) con le destinazioni nuove. · `OK se:` ogni vecchio URL con traffico o backlink risponde 301 verso l'equivalente semantico, non alla home.

**`GO-05` Catene e loop di redirect** — `[M]` `ALTA` `#lancio`
`Come:` crawl con follow dei redirect. · `OK se:` massimo un salto, nessun loop, nessun 302 dove serve 301.

**`GO-06` DNS e propagazione** — `[M]` `BLOCCANTE` `#lancio`
`Come:` record A/AAAA/CNAME, TTL abbassato prima dello switch. · `OK se:` puntano all'ambiente corretto e risolvono da più aree geografiche.

**`GO-07` Scadenza dominio e rinnovo** — `[M]` `ALTA` `#tutti`
`Come:` WHOIS + accesso al registrar. · `OK se:` scadenza > 6 mesi, rinnovo automatico attivo, contatti di proprietà intestati al cliente (non all'agenzia).

**`GO-08` Certificato SSL** — `[M]` `BLOCCANTE` `#tutti`
`Come:` controllo emittente, validità, catena, copertura di tutti i sottodomini usati. · `OK se:` valido, catena completa, rinnovo automatico configurato.

**`GO-09` Redirect HTTP → HTTPS e canonicalizzazione host** — `[M]` `ALTA` `#tutti`
`Come:` prova http://, https://, con e senza www. · `OK se:` tutte le varianti convergono con 301 su un'unica versione.

**`GO-10` Coerenza trailing slash** — `[A]` `MEDIA` `#tutti`
`Come:` confronta URL interni e canonical. · `OK se:` una sola convenzione, l'altra redirige 301.

**`GO-11` Piano di rollback** — `[M]` `ALTA` `#lancio`
`Come:` chiedi come si torna indietro. · `OK se:` esiste backup pre-lancio verificato, finestra di rollback definita e responsabile individuato.

**`GO-12` Ambienti separati** — `[M]` `MEDIA` `#lancio`
`Come:` verifica che dev/staging/prod non condividano database, chiavi API o account di pagamento. · `OK se:` separati, con credenziali distinte.

**`GO-13` Dati e contenuti di prova** — `[A]` `ALTA` `#lancio`
`Come:` cerca "lorem ipsum", "test", email fittizie, prodotti demo, utenti di prova. · `OK se:` nessun residuo in produzione.

**`GO-14` Modalità debug disattivata** — `[A]` `ALTA` `#lancio`
`Come:` provoca un errore, controlla la risposta. · `OK se:` nessuno stack trace, path di sistema o versione del framework esposti.

---

## 2. TEC — Tecnica e front-end

**`TEC-01` HTML semantico** — `[A]` `MEDIA` `#tutti`
`Come:` ispeziona la struttura delle pagine campione. · `OK se:` uso corretto di `header`, `nav`, `main`, `article`, `section`, `footer`; un solo `main` per pagina.

**`TEC-02` Gerarchia dei titoli** — `[A]` `MEDIA` `#tutti`
`Come:` estrai H1-H6 in ordine. · `OK se:` un solo H1 significativo per pagina, nessun livello saltato, titoli usati per struttura e non per estetica.

**`TEC-03` Validità HTML** — `[A]` `BASSA` `#tutti`
`Come:` validatore W3C sulle pagine campione. · `OK se:` nessun errore bloccante (tag non chiusi, ID duplicati, annidamenti illegali).

**`TEC-04` Lingua dichiarata** — `[A]` `MEDIA` `#tutti`
`Come:` attributo `lang` su `<html>`. · `OK se:` presente e corretto per ogni versione linguistica.

**`TEC-05` Design responsive** — `[B]` `ALTA` `#tutti`
`Come:` prova a 360, 768, 1024, 1440, 1920 px e in orizzontale. · `OK se:` nessun overflow orizzontale, nessun contenuto tagliato, tap target ≥ 24×24 px con spaziatura adeguata.

**`TEC-06` Compatibilità cross-browser** — `[M]` `MEDIA` `#tutti`
`Come:` Chrome, Safari (desktop e iOS), Firefox, Edge. · `OK se:` layout e funzioni equivalenti; Safari/iOS è quello che rompe più spesso.

**`TEC-07` Errori in console** — `[B]` `ALTA` `#tutti`
`Come:` apri la console su ogni template. · `OK se:` nessun errore JS, nessuna risorsa 404, nessun mixed content.

**`TEC-08` Degradazione senza JS** — `[A]` `MEDIA` `#tutti`
`Come:` confronta HTML sorgente e DOM renderizzato. · `OK se:` contenuti e navigazione principali presenti nel sorgente; il JS migliora, non abilita.

**`TEC-09` Formati immagine moderni** — `[A]` `MEDIA` `#tutti`
`Come:` controlla estensioni e `<picture>`/`srcset`. · `OK se:` WebP o AVIF con fallback, immagini servite alla dimensione giusta per il viewport.

**`TEC-10` Dimensioni immagini dichiarate** — `[A]` `ALTA` `#tutti`
`Come:` attributi `width`/`height` o `aspect-ratio`. · `OK se:` presenti su tutte le immagini, per evitare layout shift.

**`TEC-11` Lazy loading** — `[A]` `MEDIA` `#tutti`
`Come:` attributo `loading="lazy"` su immagini e iframe sotto la piega. · `OK se:` applicato sotto la piega ed **escluso** dall'immagine LCP (che va semmai in `fetchpriority="high"`).

**`TEC-12` Bundling e minificazione** — `[A]` `MEDIA` `#tutti`
`Come:` ispeziona gli asset serviti. · `OK se:` CSS/JS minificati, code splitting attivo, niente librerie intere caricate per una funzione sola.

**`TEC-13` Font ottimizzati** — `[A]` `MEDIA` `#tutti`
`Come:` controlla formato, `font-display`, preload, subset. · `OK se:` woff2, `font-display: swap`, font critici in preload, self-hosted quando possibile (anche per privacy).

**`TEC-14` Favicon e icone** — `[A]` `BASSA` `#tutti`
`Come:` favicon multi-formato, apple-touch-icon, manifest se PWA. · `OK se:` presenti e senza 404.

**`TEC-15` Console e log puliti in produzione** — `[A]` `BASSA` `#tutti`
`Come:` cerca `console.log` residui e commenti con informazioni interne. · `OK se:` rimossi.

**`TEC-16` Dipendenze aggiornate** — `[M]` `ALTA` `#tutti`
`Come:` `npm audit`, `composer audit`, versioni di CMS e plugin. · `OK se:` nessuna vulnerabilità nota di gravità alta o critica, nessun componente EOL.

---

## 3. PRF — Performance

**`PRF-01` Core Web Vitals — LCP** — `[M]` `ALTA` `#tutti`
`Come:` PageSpeed Insights o CrUX sui template principali. · `OK se:` LCP ≤ 2,5 s al 75° percentile su mobile.

**`PRF-02` Core Web Vitals — INP** — `[M]` `ALTA` `#tutti`
`Come:` idem. **INP ha sostituito FID come Core Web Vital da marzo 2024**: se una checklist parla ancora di FID, è da aggiornare. · `OK se:` INP ≤ 200 ms.

**`PRF-03` Core Web Vitals — CLS** — `[M]` `ALTA` `#tutti`
`Come:` idem, controllando anche i cambi di layout tardivi (banner, font, pubblicità). · `OK se:` CLS ≤ 0,1.

**`PRF-04` Dati di campo vs laboratorio** — `[M]` `MEDIA` `#tutti`
`Come:` confronta CrUX (campo) e Lighthouse (laboratorio). · `OK se:` non c'è divergenza forte; se c'è, indaga rete reale e dispositivi degli utenti.

**`PRF-05` Peso della pagina** — `[A]` `MEDIA` `#tutti`
`Come:` somma il peso trasferito per template. · `OK se:` ragionevole per il tipo di pagina; segnala i singoli asset sopra 500 KB.

**`PRF-06` Header di cache** — `[M]` `ALTA` `#tutti`
`Come:` ispeziona `Cache-Control`, `ETag`, `Expires`. · `OK se:` asset statici con hash e cache lunga immutabile, HTML con policy coerente.

**`PRF-07` Compressione** — `[M]` `ALTA` `#tutti`
`Come:` `Content-Encoding`. · `OK se:` Brotli o gzip attivi su tutte le risorse testuali.

**`PRF-08` CDN** — `[M]` `MEDIA` `#tutti`
`Come:` verifica header e distribuzione geografica. · `OK se:` asset statici serviti da CDN, hit ratio sano.

**`PRF-09` Configurazione server** — `[M]` `MEDIA` `#tutti`
`Come:` HTTP/2 o 3, keep-alive, timeout, versione runtime, worker/pool. · `OK se:` HTTP/2+ attivo, runtime in versione supportata, risorse dimensionate sul traffico atteso.

**`PRF-10` Query di database** — `[M]` `ALTA` `#ecom` `#login`
`Come:` profilazione, slow query log. · `OK se:` nessuna query lenta ricorrente, nessun N+1 sulle pagine di listing, indici presenti.

**`PRF-11` Script di terze parti** — `[A]` `ALTA` `#tutti`
`Come:` conta e pesa i tag esterni (analytics, chat, pixel, A/B test). · `OK se:` ognuno è giustificato, caricato in modo asincrono/differito, e nessuno blocca il rendering.

**`PRF-12` Test di carico** — `[M]` `MEDIA` `#ecom`
`Come:` k6, Locust o simili sui picchi previsti. · `OK se:` regge il traffico atteso di picco (saldi, campagne) con degrado accettabile.

---

## 4. ACC — Accessibilità

> **Contesto normativo:** dal 28 giugno 2025 lo European Accessibility Act si applica anche a
> e-commerce e servizi digitali al consumatore sopra la soglia di microimpresa. Il riferimento
> tecnico è WCAG 2.1/2.2 livello AA. Gli strumenti automatici rilevano circa un terzo dei
> problemi: servono anche test manuali. Non dichiarare mai conformità — riporta rilievi.

**`ACC-01` Scansione automatica** — `[M]` `ALTA` `#tutti`
`Come:` axe DevTools, Lighthouse o WAVE su tutti i template. · `OK se:` nessuna violazione critica o seria; falsi positivi documentati.

**`ACC-02` Navigazione da tastiera** — `[B]` `ALTA` `#tutti`
`Come:` percorri l'intero sito con solo Tab, Shift+Tab, Invio, Esc. · `OK se:` tutto raggiungibile e attivabile, ordine logico, nessuna trappola del focus.

**`ACC-03` Focus visibile** — `[A]` `ALTA` `#tutti`
`Come:` verifica che non ci sia `outline: none` senza sostituto. · `OK se:` indicatore di focus sempre visibile e con contrasto sufficiente.

**`ACC-04` Skip link** — `[A]` `MEDIA` `#tutti`
`Come:` primo elemento focusabile. · `OK se:` presente un salto al contenuto principale, visibile al focus.

**`ACC-05` Testi alternativi** — `[A]` `ALTA` `#tutti`
`Come:` estrai tutti gli `alt`. · `OK se:` descrittivi per immagini informative, `alt=""` per quelle decorative, mai il nome del file.

**`ACC-06` Contrasto colore** — `[M]` `ALTA` `#tutti`
`Come:` misura testo, bottoni, stati, testo su immagine. · `OK se:` ≥ 4,5:1 per testo normale, ≥ 3:1 per testo grande e componenti UI.

**`ACC-07` Colore non unico veicolo** — `[B]` `MEDIA` `#tutti`
`Come:` controlla errori di form, link nel testo, grafici. · `OK se:` l'informazione è veicolata anche da testo, icona o pattern.

**`ACC-08` Etichette dei form** — `[A]` `ALTA` `#form`
`Come:` ogni campo ha `<label>` associata o `aria-label`. · `OK se:` sì; il solo placeholder non è un'etichetta.

**`ACC-09` Errori di form accessibili** — `[B]` `ALTA` `#form`
`Come:` invia un form errato con screen reader attivo. · `OK se:` errore annunciato, associato al campo, con indicazione di come correggere.

**`ACC-10` ARIA usato correttamente** — `[A]` `MEDIA` `#tutti`
`Come:` cerca ruoli e attributi ARIA. · `OK se:` usati solo dove serve e coerenti; un elemento nativo corretto è meglio di ARIA su un `div`.

**`ACC-11` Componenti interattivi** — `[B]` `ALTA` `#tutti`
`Come:` prova menu, accordion, tab, modali, carousel da tastiera e screen reader. · `OK se:` focus gestito, Esc chiude, stato annunciato, nessun contenuto in movimento non fermabile.

**`ACC-12` Test con screen reader** — `[M]` `ALTA` `#tutti`
`Come:` NVDA o VoiceOver sui percorsi chiave (navigazione, form, checkout). · `OK se:` i percorsi si completano senza vista.

**`ACC-13` Zoom e ridimensionamento testo** — `[B]` `MEDIA` `#tutti`
`Come:` zoom al 200% e testo ingrandito. · `OK se:` nessuna perdita di contenuto o funzione, nessuno scroll orizzontale.

**`ACC-14` Sottotitoli e trascrizioni** — `[M]` `ALTA` `#tutti`
`Come:` controlla i contenuti video/audio. · `OK se:` sottotitoli sui video parlati, trascrizione per l'audio, nessun autoplay con suono.

**`ACC-15` Movimento e animazioni** — `[A]` `MEDIA` `#tutti`
`Come:` verifica il supporto di `prefers-reduced-motion`. · `OK se:` le animazioni si riducono o disattivano su richiesta del sistema.

**`ACC-16` Dichiarazione di accessibilità** — `[A]` `ALTA` `#ecom`
`Come:` cerca la pagina dedicata. · `OK se:` presente, aggiornata, con canale di feedback per segnalare barriere.

---

## 5. SEO — SEO tecnica

**`SEO-01` Indicizzabilità delle pagine chiave** — `[A]` `BLOCCANTE` `#tutti`
`Come:` meta robots, X-Robots-Tag, robots.txt sulle pagine strategiche. · `OK se:` indicizzabili e crawlabili.

**`SEO-02` robots.txt corretto** — `[A]` `ALTA` `#tutti`
`Come:` GET /robots.txt. · `OK se:` sintassi valida, blocca solo ciò che va bloccato, non blocca CSS/JS, dichiara la sitemap.

**`SEO-03` Sitemap XML** — `[A]` `ALTA` `#tutti`
`Come:` recupera la sitemap e confronta con le pagine reali. · `OK se:` risponde 200, aggiornata, contiene solo URL canonici che rispondono 200 e sono indicizzabili, niente redirect o noindex al suo interno.

**`SEO-04` Sitemap inviata ai motori** — `[M]` `MEDIA` `#tutti`
`Come:` Search Console e Bing Webmaster Tools. · `OK se:` inviata, letta senza errori.

**`SEO-05` Canonical** — `[A]` `ALTA` `#tutti`
`Come:` estrai `rel=canonical` da ogni template. · `OK se:` presente, assoluto, autoreferenziale dove corretto, coerente con la versione indicizzabile.

**`SEO-06` Contenuti duplicati** — `[M]` `ALTA` `#tutti`
`Come:` crawl con confronto di title, description e corpo; attenzione a parametri, filtri, paginazione, versioni stampa. · `OK se:` nessun duplicato non gestito.

**`SEO-07` Paginazione** — `[A]` `MEDIA` `#blog` `#ecom`
`Come:` controlla URL, canonical e link tra pagine. · `OK se:` ogni pagina è raggiungibile con un link crawlabile e ha canonical autoreferenziale.

**`SEO-08` Struttura URL** — `[A]` `MEDIA` `#tutti`
`Come:` esamina gli URL dei vari template. · `OK se:` leggibili, minuscoli, con trattini, senza parametri superflui, stabili nel tempo.

**`SEO-09` Link interrotti** — `[M]` `ALTA` `#tutti`
`Come:` crawl completo (Screaming Frog o simili) su link interni ed esterni. · `OK se:` nessun 404 o 500 in link interni; esterni rotti da correggere.

**`SEO-10` Pagina 404** — `[A]` `ALTA` `#tutti`
`Come:` richiedi un URL inesistente. · `OK se:` **restituisce davvero status 404** (non 200 "soft"), è utile e offre ricerca e link di rientro.

**`SEO-11` Profondità di crawl e link orfani** — `[M]` `MEDIA` `#tutti`
`Come:` crawl + confronto con sitemap. · `OK se:` pagine importanti a ≤ 3 clic dalla home, nessuna pagina orfana.

**`SEO-12` hreflang** — `[A]` `ALTA` `#multi`
`Come:` estrai i tag da ogni versione linguistica. · `OK se:` reciproci, autoreferenziali, con codici validi, `x-default` presente, e **slug tradotti anche sulle pagine dinamiche**.

**`SEO-13` Coerenza lingua/contenuto** — `[A]` `MEDIA` `#multi`
`Come:` confronta `lang`, hreflang e lingua reale del testo. · `OK se:` coincidono; nessuna pagina "tradotta" ancora in lingua originale.

**`SEO-14` Dati strutturati JSON-LD** — `[A]` `ALTA` `#tutti`
`Come:` estrai e valida gli script JSON-LD (Rich Results Test, validator schema.org). · `OK se:` validi, del tipo giusto per il template, **coerenti con ciò che è visibile in pagina** (niente recensioni o prezzi dichiarati e non mostrati).

**`SEO-15` Open Graph e Twitter Card** — `[A]` `MEDIA` `#tutti`
`Come:` controlla i meta di condivisione e l'anteprima. · `OK se:` title, description e immagine presenti, immagine della dimensione corretta e raggiungibile.

**`SEO-16` Indicizzazione monitorata** — `[M]` `ALTA` `#tutti`
`Come:` rapporto Pagine in Search Console. · `OK se:` le pagine chiave sono indicizzate; motivi di esclusione compresi e giustificati.

**`SEO-17` Backlink** — `[M]` `MEDIA` `#tutti`
`Come:` Semrush, Ahrefs o simili. · `OK se:` profilo sano; in caso di migrazione i backlink puntano a URL che redirigono correttamente.

**`SEO-18` Audit SEO tecnico completo** — `[M]` `ALTA` `#tutti`
`Come:` crawl con Screaming Frog + Semrush/Ahrefs come controprova. · `OK se:` nessun errore critico aperto; allega l'export al report.

**`SEO-19` Mobile-first** — `[M]` `ALTA` `#tutti`
`Come:` confronta contenuto e link della versione mobile con quella desktop. · `OK se:` parità di contenuti, dati strutturati e metadati (l'indicizzazione è mobile-first).

**`SEO-20` AMP** — `[A]` `BASSA` `#blog`
`Come:` verifica se esistono pagine AMP. · `OK se:` **di norma non servono**: dal 2021 non sono più requisito per le Top Stories. Se presenti e non manutenute, valuta la dismissione con redirect.

---

## 6. ONP — SEO on-page e contenuti indicizzabili

**`ONP-01` Title tag** — `[A]` `ALTA` `#tutti`
`Come:` estrai i title di tutte le pagine campione. · `OK se:` unici, pertinenti, ~50-60 caratteri, keyword principale in apertura, nessuno mancante o duplicato.

**`ONP-02` Meta description** — `[A]` `MEDIA` `#tutti`
`Come:` idem. · `OK se:` uniche, ~140-160 caratteri, scritte per il clic. Non sono un fattore di ranking diretto ma incidono sul CTR.

**`ONP-03` Meta keywords** — `[A]` `BASSA` `#tutti`
`Come:` cerca il tag. · `OK se:` **assente**: è ignorato dai motori da anni. Se una checklist lo richiede, va aggiornata.

**`ONP-04` H1 coerente** — `[A]` `MEDIA` `#tutti`
`Come:` confronta H1 e title. · `OK se:` coerenti ma non identici, uno per pagina.

**`ONP-05` Qualità e originalità dei contenuti** — `[M]` `ALTA` `#tutti`
`Come:` leggi le pagine chiave; controlla thin content e testi duplicati da altri siti. · `OK se:` contenuto originale, utile, che risponde all'intento di ricerca.

**`ONP-06` Copertura dell'intento di ricerca** — `[M]` `MEDIA` `#tutti`
`Come:` confronta le pagine con la SERP per le query target. · `OK se:` formato e profondità sono in linea con ciò che i motori premiano per quelle query.

**`ONP-07` Cannibalizzazione** — `[M]` `MEDIA` `#tutti`
`Come:` incrocia query e pagine in Search Console. · `OK se:` una sola pagina compete per ciascuna query principale.

**`ONP-08` Link interni ragionati** — `[A]` `MEDIA` `#tutti`
`Come:` verifica quantità e anchor dei link contestuali. · `OK se:` le pagine strategiche ricevono link interni, con anchor descrittive e non generiche.

**`ONP-09` Nomi file e alt delle immagini** — `[A]` `BASSA` `#tutti`
`Come:` controlla nomi e attributi. · `OK se:` descrittivi, senza keyword stuffing.

**`ONP-10` Aggiornamento contenuti datati** — `[M]` `MEDIA` `#blog`
`Come:` individua pagine vecchie con traffico calante. · `OK se:` esiste un piano di aggiornamento o dismissione.

---

## 7. GEO — Visibilità nei motori e assistenti AI

**`GEO-01` File llms.txt** — `[A]` `MEDIA` `#tutti`
`Come:` GET /llms.txt. · `OK se:` presente, accessibile, aggiornato, con struttura e link corretti. Nota: è una convenzione emergente, non uno standard supportato ufficialmente da tutti i provider — utile ma non risolutivo.

**`GEO-02` Policy crawler AI** — `[A]` `ALTA` `#tutti`
`Come:` controlla in robots.txt le direttive per GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider, Applebot-Extended. · `OK se:` la scelta (consentire o bloccare) è **deliberata e condivisa col cliente**, non ereditata per caso, e coerente tra i bot.

**`GEO-03` Contenuto nell'HTML renderizzato** — `[A]` `ALTA` `#tutti`
`Come:` confronta sorgente e DOM. · `OK se:` testo principale, prezzi e dati chiave presenti già nel sorgente: molti crawler AI non eseguono JavaScript.

**`GEO-04` Dati strutturati completi** — `[A]` `MEDIA` `#tutti`
`Come:` verifica Organization, WebSite, Product, FAQ, Article, BreadcrumbList dove pertinenti. · `OK se:` presenti e coerenti; aiutano l'estrazione automatica dei fatti.

**`GEO-05` Fatti citabili ed espliciti** — `[M]` `MEDIA` `#tutti`
`Come:` leggi le pagine chiave. · `OK se:` dati, definizioni e risposte sono in frasi autonome e verificabili, non solo in immagini o PDF.

**`GEO-06` Entità coerenti** — `[A]` `MEDIA` `#tutti`
`Come:` confronta nome azienda, indirizzo, contatti su sito, schema, profili esterni. · `OK se:` coerenti ovunque (nome, sede, P.IVA, contatti).

**`GEO-07` Accessibilità dei contenuti nei PDF** — `[A]` `BASSA` `#tutti`
`Come:` controlla se informazioni chiave vivono solo in PDF. · `OK se:` esiste anche una versione HTML.

**`GEO-08` Monitoraggio citazioni AI** — `[M]` `BASSA` `#tutti`
`Come:` interroga gli assistenti sulle query di brand e di categoria. · `OK se:` il brand compare e le informazioni riportate sono corrette; annota gli errori da correggere alla fonte.

---

## 8. NAV — Navigazione e interfaccia

**`NAV-01` Navigazione principale** — `[B]` `ALTA` `#tutti`
`Come:` clicca ogni voce, incluse le tendine. · `OK se:` tutti i link funzionano, portano dove promettono, i menu si aprono anche da tastiera e su touch.

**`NAV-02` Footer** — `[B]` `MEDIA` `#tutti`
`Come:` clicca ogni link. · `OK se:` collegamenti a pagine secondarie (chi siamo, contatti, legali) presenti e funzionanti.

**`NAV-03` Breadcrumb** — `[A]` `MEDIA` `#ecom` `#blog`
`Come:` confronta con la struttura del sito. · `OK se:` riflette la gerarchia reale, ha markup BreadcrumbList, link funzionanti.

**`NAV-04` Link interni nel contenuto** — `[B]` `MEDIA` `#tutti`
`Come:` naviga seguendo i link. · `OK se:` portano alla pagina corretta, nessun link vuoto o `#`.

**`NAV-05` Paginazione funzionante** — `[B]` `MEDIA` `#blog` `#ecom`
`Come:` naviga avanti e indietro, prova l'ultima pagina. · `OK se:` coerente, senza pagine vuote o duplicate.

**`NAV-06` Ricerca interna** — `[B]` `ALTA` `#tutti`
`Come:` prova termini esistenti, inesistenti, con refusi, accenti, maiuscole. · `OK se:` risultati pertinenti, gestione dello zero-risultati con suggerimenti.

**`NAV-07` Pagina 404 utile** — `[B]` `MEDIA` `#tutti`
`Come:` visita un URL inesistente. · `OK se:` mantiene layout e menu, spiega, offre ricerca e link utili.

**`NAV-08` Contenuti multimediali** — `[B]` `MEDIA` `#tutti`
`Come:` riproduci video, gallerie, slider. · `OK se:` caricano, sono controllabili, non partono con audio automatico.

**`NAV-09` Modali e pop-up** — `[B]` `MEDIA` `#tutti`
`Come:` apri e chiudi ogni overlay. · `OK se:` si chiudono con X, Esc e clic esterno; non si ripresentano ossessivamente; non coprono contenuti su mobile.

**`NAV-10` Call to action** — `[M]` `MEDIA` `#tutti`
`Come:` guarda ogni template. · `OK se:` la CTA principale è identificabile, sopra la piega dove serve, con copy che dice cosa succede.

**`NAV-11` Condivisione social** — `[B]` `BASSA` `#blog`
`Come:` prova ogni pulsante. · `OK se:` condivide l'URL corretto con anteprima corretta.

**`NAV-12` Commenti** — `[B]` `BASSA` `#blog`
`Come:` pubblica un commento di prova. · `OK se:` invio, moderazione e antispam funzionano.

**`NAV-13` Feed RSS** — `[A]` `BASSA` `#blog`
`Come:` recupera il feed. · `OK se:` valido, aggiornato, con contenuti corretti.

**`NAV-14` Testimonianze e recensioni** — `[B]` `BASSA` `#tutti`
`Come:` controlla la sezione. · `OK se:` visibili, leggibili, attribuite, e se marcate con schema **corrispondono a recensioni reali**.

**`NAV-15` Stati di caricamento ed errore** — `[B]` `MEDIA` `#tutti`
`Come:` simula rete lenta e fallimenti. · `OK se:` esistono stati di attesa e messaggi d'errore comprensibili, non schermate bianche.

---

## 9. FRM — Form e conversione

**`FRM-01` Invio del form** — `[B]` `BLOCCANTE` `#form`
`Come:` compila e invia ogni form del sito. · `OK se:` arriva a destinazione (verifica la casella reale, non solo il messaggio a schermo).

**`FRM-02` Destinatari corretti** — `[M]` `ALTA` `#form`
`Come:` controlla la configurazione. · `OK se:` nessun indirizzo dello sviluppatore o di test rimasto; alias aziendali corretti.

**`FRM-03` Validazione dei campi** — `[B]` `ALTA` `#form`
`Come:` invia vuoto, con email non valida, con caratteri speciali, con testo lunghissimo. · `OK se:` errori chiari, campo per campo, dati non persi al reinvio.

**`FRM-04` Campi obbligatori sensati** — `[M]` `MEDIA` `#form`
`Come:` valuta il rapporto tra campi richiesti e valore per l'utente. · `OK se:` si chiede solo il necessario.

**`FRM-05` Protezione antispam** — `[B]` `ALTA` `#form`
`Come:` verifica captcha, honeypot o rate limit. · `OK se:` presente e non ostile all'utente; il captcha invisibile è preferibile.

**`FRM-06` Conferma all'utente** — `[B]` `ALTA` `#form`
`Come:` completa un invio. · `OK se:` messaggio o pagina di conferma chiara, ed eventuale email di cortesia.

**`FRM-07` Consenso privacy nel form** — `[A]` `BLOCCANTE` `#form`
`Come:` controlla i checkbox. · `OK se:` informativa linkata, **casella non pre-selezionata**, finalità separate (contatto ≠ marketing), consenso registrato con data.

**`FRM-08` Tracciamento delle conversioni** — `[B]` `ALTA` `#form`
`Come:` invia un form con il debug analytics attivo. · `OK se:` l'evento di conversione si attiva una volta sola e con i parametri giusti.

**`FRM-09` Accessibilità del form** — `[B]` `ALTA` `#form`
`Come:` vedi ACC-08 e ACC-09. · `OK se:` compilabile da tastiera e con screen reader.

**`FRM-10` Comportamento su mobile** — `[B]` `MEDIA` `#form`
`Come:` compila da smartphone. · `OK se:` tastiera corretta per tipo di campo (`type="email"`, `tel`), autocomplete attivo, nessun campo coperto dalla tastiera.

---

## 10. ACT — Account utente `#login`

**`ACT-01` Registrazione** — `[B]` `ALTA` `#login`
`Come:` crea un account nuovo. · `OK se:` processo completo, validazioni corrette, email di conferma con link funzionante e non scaduto.

**`ACT-02` Login** — `[B]` `BLOCCANTE` `#login`
`Come:` accedi con credenziali giuste e sbagliate. · `OK se:` funziona; messaggi d'errore non rivelano se l'email esiste.

**`ACT-03` Recupero password** — `[B]` `ALTA` `#login`
`Come:` avvia il "password dimenticata". · `OK se:` email ricevuta, link a scadenza, nuova password impostabile, sessioni precedenti gestite.

**`ACT-04` Logout e sessioni** — `[B]` `ALTA` `#login`
`Come:` esci e prova il tasto indietro; controlla la scadenza sessione. · `OK se:` logout effettivo, cookie di sessione `HttpOnly`, `Secure`, `SameSite`.

**`ACT-05` Pannello utente** — `[B]` `MEDIA` `#login`
`Come:` modifica dati, indirizzi, password. · `OK se:` le modifiche si salvano e si riflettono ovunque.

**`ACT-06` Storico ordini** — `[B]` `MEDIA` `#ecom`
`Come:` consulta gli ordini passati. · `OK se:` completi, con dettagli e documenti scaricabili.

**`ACT-07` Wishlist e preferiti** — `[B]` `BASSA` `#ecom`
`Come:` aggiungi, rimuovi, verifica la persistenza. · `OK se:` funziona da loggato e coerente tra dispositivi.

**`ACT-08` Cancellazione account e dati** — `[B]` `ALTA` `#login`
`Come:` cerca la funzione. · `OK se:` esiste un modo per cancellare l'account ed esportare i dati (diritti GDPR), o almeno un canale dichiarato.

**`ACT-09` Isolamento dei dati** — `[M]` `BLOCCANTE` `#login`
`Come:` con due account, prova ad accedere a risorse dell'altro cambiando ID nell'URL. · `OK se:` nessun accesso a dati altrui (IDOR).

---

## 11. ECM — E-commerce `#ecom`

**`ECM-01` Schede prodotto** — `[B]` `ALTA` `#ecom`
`Come:` controlla un campione. · `OK se:` prezzo, disponibilità, descrizione, immagini, varianti e spese di spedizione corretti e coerenti col gestionale.

**`ECM-02` Varianti** — `[B]` `ALTA` `#ecom`
`Come:` cambia taglia, colore, quantità. · `OK se:` prezzo, immagini, SKU e disponibilità si aggiornano correttamente.

**`ECM-03` Ricerca prodotti** — `[B]` `ALTA` `#ecom`
`Come:` cerca per nome, codice, sinonimo, con refuso. · `OK se:` risultati pertinenti e veloci.

**`ECM-04` Filtri e ordinamenti** — `[B]` `ALTA` `#ecom`
`Come:` combina più filtri, poi rimuovili. · `OK se:` risultati corretti, conteggi giusti, stato riflesso nell'URL, nessuna combinazione che rompe la pagina.

**`ECM-05` Raccomandazioni** — `[B]` `BASSA` `#ecom`
`Come:` controlla correlati e "chi ha visto anche". · `OK se:` pertinenti e non esauriti.

**`ECM-06` Carrello** — `[B]` `BLOCCANTE` `#ecom`
`Come:` aggiungi, modifica quantità, rimuovi, ricarica, torna dopo ore. · `OK se:` totali sempre corretti, carrello persistente, nessun prodotto fantasma.

**`ECM-07` Codici sconto** — `[B]` `ALTA` `#ecom`
`Come:` prova codice valido, scaduto, non applicabile, cumulato. · `OK se:` regole rispettate, messaggi chiari, totale ricalcolato.

**`ECM-08` Gestione stock** — `[B]` `ALTA` `#ecom`
`Come:` prova un prodotto esaurito e uno con ultime unità. · `OK se:` disponibilità corretta, acquisto bloccato o gestito, notifiche di riassortimento se previste.

**`ECM-09` Spedizioni** — `[B]` `ALTA` `#ecom`
`Come:` prova destinazioni diverse, soglie di gratuità, corrieri e tempi. · `OK se:` costi corretti per zona e peso, tempi dichiarati coerenti.

**`ECM-10` Calcolo imposte** — `[M]` `ALTA` `#ecom`
`Come:` verifica IVA per paese, prezzi ivati/non ivati, vendite UE ed extra-UE. · `OK se:` aliquote corrette e coerenti con il regime fiscale del cliente.

**`ECM-11` Checkout completo** — `[B]` `BLOCCANTE` `#ecom`
`Come:` completa un ordine reale end-to-end, anche come ospite e da mobile. · `OK se:` nessun passaggio bloccato, campi indirizzo validati, totale finale corretto.

**`ECM-12` Gateway di pagamento** — `[M]` `BLOCCANTE` `#ecom`
`Come:` testa ogni metodo attivo (carta, PayPal, Klarna, bonifico, contrassegno), incluse **carte rifiutate e 3-D Secure**. · `OK se:` ogni esito è gestito, in ambiente di produzione con credenziali live (non sandbox).

**`ECM-13` Ordine registrato correttamente** — `[M]` `BLOCCANTE` `#ecom`
`Come:` dopo l'ordine di prova, controlla backoffice, gestionale e magazzino. · `OK se:` ordine presente, stock scalato, dati fiscali corretti.

**`ECM-14` Conferma d'ordine** — `[B]` `BLOCCANTE` `#ecom`
`Come:` verifica pagina e email di conferma. · `OK se:` entrambe presenti, con numero d'ordine, riepilogo e importi corretti.

**`ECM-15` Stati e tracciamento ordine** — `[M]` `ALTA` `#ecom`
`Come:` fai avanzare un ordine di prova. · `OK se:` ogni cambio di stato genera la notifica giusta e il tracking è consultabile.

**`ECM-16` Recensioni prodotto** — `[B]` `MEDIA` `#ecom`
`Come:` lascia una recensione. · `OK se:` pubblicazione, moderazione e — se dichiarate come verificate — meccanismo di verifica effettivo (obbligo Omnibus).

**`ECM-17` Resi e rimborsi** — `[M]` `ALTA` `#ecom`
`Come:` leggi le istruzioni e prova il flusso se esiste. · `OK se:` procedura chiara, modulo di recesso disponibile, tempi e costi dichiarati.

**`ECM-18` Assistenza clienti** — `[B]` `MEDIA` `#ecom`
`Come:` prova chat, email, telefono, orari dichiarati. · `OK se:` i canali dichiarati rispondono davvero.

**`ECM-19` Feed prodotti** — `[M]` `MEDIA` `#ecom`
`Come:` controlla Merchant Center e feed social. · `OK se:` senza errori bloccanti, prezzi e disponibilità allineati al sito.

**`ECM-20` Abbandono carrello** — `[M]` `BASSA` `#ecom`
`Come:` lascia un carrello pieno. · `OK se:` l'eventuale sequenza di recupero parte, con contenuto corretto e consenso presente.

---

## 12. EML — Email transazionali e deliverability

**`EML-01` SPF** — `[M]` `ALTA` `#tutti`
`Come:` interroga il record TXT del dominio. · `OK se:` presente, include tutti i mittenti reali, entro il limite di 10 lookup.

**`EML-02` DKIM** — `[M]` `ALTA` `#tutti`
`Come:` controlla il selettore e la firma sulle email ricevute. · `OK se:` firma valida per ogni sistema che invia (sito, CRM, newsletter, gestionale).

**`EML-03` DMARC** — `[M]` `ALTA` `#tutti`
`Come:` record `_dmarc`. · `OK se:` presente con policy almeno `p=none` e indirizzo per i report, con piano di passaggio a `quarantine`/`reject`. **Senza questi tre, le transazionali finiscono in spam: è la prima causa in assoluto.**

**`EML-04` Configurazione SMTP** — `[M]` `ALTA` `#tutti`
`Come:` verifica servizio di invio, autenticazione, limiti. · `OK se:` invio via servizio affidabile (non `mail()` dal server condiviso), credenziali non nel codice versionato.

**`EML-05` Reputazione IP e dominio** — `[M]` `MEDIA` `#tutti`
`Come:` controlla le principali blacklist e i report DMARC. · `OK se:` pulito.

**`EML-06` Mittente e reply-to** — `[A]` `MEDIA` `#tutti`
`Come:` guarda le email ricevute. · `OK se:` mittente riconoscibile del dominio del cliente, reply-to a una casella presidiata, niente `noreply@` dove serve rispondere.

**`EML-07` Conferma registrazione** — `[B]` `ALTA` `#login`
`Come:` registrati. · `OK se:` email ricevuta rapidamente, link di conferma funzionante e a scadenza.

**`EML-08` Recupero password** — `[B]` `ALTA` `#login`
`Come:` vedi ACT-03. · `OK se:` email ricevuta con link valido e monouso.

**`EML-09` Conferma ordine e pagamento** — `[B]` `BLOCCANTE` `#ecom`
`Come:` ordine di prova. · `OK se:` email con dettagli, importi, dati fiscali ed eventuale ricevuta.

**`EML-10` Notifiche di stato e spedizione** — `[M]` `ALTA` `#ecom`
`Come:` fai avanzare l'ordine. · `OK se:` ogni transizione notifica, con link di tracciamento funzionante.

**`EML-11` Newsletter: iscrizione e conferma** — `[B]` `ALTA` `#tutti`
`Come:` iscriviti. · `OK se:` double opt-in, email di conferma, contatto registrato nella lista giusta.

**`EML-12` Automazioni** — `[M]` `MEDIA` `#tutti`
`Come:` controlla benvenuto, wishlist, carrello, richiesta recensione. · `OK se:` partono con i trigger e i tempi previsti, senza duplicati.

**`EML-13` Email promozionali** — `[M]` `MEDIA` `#tutti`
`Come:` invia un test. · `OK se:` link corretti con UTM, immagini raggiungibili, versione testo presente.

**`EML-14` Rendering cross-client** — `[M]` `MEDIA` `#tutti`
`Come:` test su Gmail (web e app), Outlook, Apple Mail, mobile; strumenti tipo Litmus o Email on Acid. · `OK se:` leggibili ovunque, responsive, con dark mode gestita.

**`EML-15` Unsubscribe** — `[B]` `BLOCCANTE` `#tutti`
`Come:` clicca il link in una email commerciale. · `OK se:` funziona in un clic, ha effetto immediato, ed è presente l'header `List-Unsubscribe`.

**`EML-16` Footer email** — `[A]` `ALTA` `#tutti`
`Come:` leggi il piè di pagina. · `OK se:` ragione sociale, sede, P.IVA, link a privacy policy, motivo per cui si riceve l'email.

**`EML-17` Tempi di invio** — `[M]` `BASSA` `#tutti`
`Come:` controlla scheduling e fusi orari. · `OK se:` niente promozionali notturni; le transazionali partono immediatamente.

**`EML-18` Contenuto e dati dinamici** — `[B]` `ALTA` `#tutti`
`Come:` controlla i segnaposto. · `OK se:` nessun `{{nome}}` non sostituito, nessun link a staging o localhost.

---

## 13. LEG — Privacy, consenso e adempimenti legali

> Qui si concentrano i rilievi più frequentemente contestati in Italia. Tu rilevi indizi e
> segnali cosa manca: **la valutazione di conformità spetta a un legale**, e va scritto.

**`LEG-01` Cookie banner presente** — `[A]` `BLOCCANTE` `#tutti`
`Come:` visita il sito da sessione pulita. · `OK se:` compare prima di qualsiasi tracciamento non tecnico.

**`LEG-02` Blocco preventivo effettivo** — `[B]` `BLOCCANTE` `#tutti`
`Come:` apri gli strumenti di rete **prima** di interagire col banner e guarda cookie e chiamate. · `OK se:` nessun cookie di profilazione né chiamata ad analytics/pixel prima del consenso. È il rilievo più comune e il più caro.

**`LEG-03` Rifiuto facile quanto l'accettazione** — `[B]` `ALTA` `#tutti`
`Come:` guarda il primo livello del banner. · `OK se:` "Rifiuta tutti" presente al primo livello, con pari evidenza rispetto ad "Accetta".

**`LEG-04` Granularità e nessun consenso preimpostato** — `[B]` `ALTA` `#tutti`
`Come:` apri le preferenze. · `OK se:` categorie separate, tutte disattivate salvo le tecniche, nessun legittimo interesse abusato per la profilazione.

**`LEG-05` Revoca del consenso** — `[B]` `ALTA` `#tutti`
`Come:` cerca il modo di cambiare idea dopo. · `OK se:` link o widget sempre accessibile, e la revoca ha effetto reale sui cookie.

**`LEG-06` Cookie policy** — `[A]` `ALTA` `#tutti`
`Come:` leggila. · `OK se:` elenca cookie reali, finalità, durata, terze parti, ed è allineata a ciò che il sito installa davvero.

**`LEG-07` Privacy policy** — `[A]` `ALTA` `#tutti`
`Come:` leggila. · `OK se:` titolare identificato con dati di contatto, finalità e basi giuridiche, destinatari, trasferimenti extra-UE, conservazione, diritti dell'interessato, eventuale DPO.

**`LEG-08` Consent Mode e tracciamento condizionato** — `[B]` `ALTA` `#tutti`
`Come:` verifica in GTM/GA4 il comportamento prima e dopo il consenso (Consent Mode v2 è requisito Google dal 2024 per le funzioni di advertising in SEE). · `OK se:` i segnali di consenso sono trasmessi correttamente e il tracciamento si adatta.

**`LEG-09` Registro dei consensi** — `[M]` `MEDIA` `#tutti`
`Come:` chiedi come sono conservate le prove. · `OK se:` esiste registrazione con data, versione dell'informativa e scelte effettuate.

**`LEG-10` Dati societari nel footer** — `[A]` `ALTA` `#tutti`
`Come:` leggi il footer e la pagina contatti. · `OK se:` ragione sociale, sede, P.IVA, REA e capitale sociale dove dovuto, PEC se applicabile.

**`LEG-11` Termini e condizioni** — `[A]` `ALTA` `#ecom`
`Come:` cerca la pagina. · `OK se:` presenti, accessibili prima dell'acquisto, con accettazione esplicita al checkout.

**`LEG-12` Diritto di recesso** — `[A]` `ALTA` `#ecom`
`Come:` cerca l'informativa. · `OK se:` 14 giorni indicati chiaramente, modulo di recesso disponibile, eccezioni dichiarate.

**`LEG-13` Garanzia legale di conformità** — `[A]` `MEDIA` `#ecom`
`Come:` cerca il riferimento. · `OK se:` garanzia legale (2 anni per i consumatori) esplicitata e distinta da eventuali garanzie commerciali.

**`LEG-14` Prezzo più basso degli ultimi 30 giorni** — `[B]` `ALTA` `#ecom`
`Come:` guarda un prodotto scontato. · `OK se:` accanto allo sconto è indicato il prezzo più basso applicato nei 30 giorni precedenti (direttiva Omnibus).

**`LEG-15` Trasparenza su recensioni e ranking** — `[A]` `MEDIA` `#ecom`
`Come:` controlla se si dichiarano recensioni "verificate" e come sono ordinati i risultati. · `OK se:` è spiegato come si verificano le recensioni e quali sono i parametri principali di ranking; contenuti sponsorizzati segnalati.

**`LEG-16` Riepilogo pre-acquisto e "ordine con obbligo di pagare"** — `[B]` `ALTA` `#ecom`
`Come:` arriva all'ultimo passo del checkout. · `OK se:` riepilogo completo di costi prima della conferma e pulsante che dichiara l'obbligo di pagamento.

**`LEG-17` Risoluzione delle controversie** — `[A]` `BASSA` `#ecom`
`Come:` cerca il riferimento ODR/ADR. · `OK se:` presente dove dovuto.

**`LEG-18` Trasferimenti extra-UE e fornitori** — `[M]` `MEDIA` `#tutti`
`Come:` elenca i servizi terzi usati (hosting, analytics, font, CDN, chat, pixel). · `OK se:` mappati nell'informativa, con base per il trasferimento; font e librerie self-hosted quando possibile.

**`LEG-19` Nomine dei responsabili** — `[M]` `MEDIA` `#tutti`
`Come:` chiedi se esistono gli accordi ex art. 28 con hosting, agenzia, fornitori. · `OK se:` esistono e sono firmati.

**`LEG-20` Minori e contenuti sensibili** — `[M]` `BASSA` `#tutti`
`Come:` valuta il pubblico del servizio. · `OK se:` se il servizio si rivolge o è accessibile a minori, esistono verifiche d'età e informative adeguate.

---

## 14. SEC — Sicurezza

**`SEC-01` HTTPS ovunque** — `[A]` `BLOCCANTE` `#tutti`
`Come:` cerca risorse in http:// nelle pagine. · `OK se:` nessun mixed content, tutto il sito in HTTPS.

**`SEC-02` HSTS** — `[M]` `ALTA` `#tutti`
`Come:` header `Strict-Transport-Security`. · `OK se:` presente con max-age adeguato; valuta `includeSubDomains`.

**`SEC-03` Content Security Policy** — `[M]` `MEDIA` `#tutti`
`Come:` header `Content-Security-Policy`. · `OK se:` presente e restrittiva; in mancanza, almeno una CSP in report-only come primo passo.

**`SEC-04` Altri header di sicurezza** — `[M]` `MEDIA` `#tutti`
`Come:` `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, `Permissions-Policy`. · `OK se:` presenti e sensati (securityheaders.com dà un quadro rapido).

**`SEC-05` Cookie sicuri** — `[B]` `ALTA` `#login`
`Come:` ispeziona i cookie di sessione. · `OK se:` `Secure`, `HttpOnly`, `SameSite` appropriato.

**`SEC-06` Autenticazione a due fattori sugli accessi privilegiati** — `[M]` `ALTA` `#tutti`
`Come:` chiedi come accedono admin, hosting, DNS, registrar, gestore email. · `OK se:` 2FA attiva ovunque possibile.

**`SEC-07` Gestione utenze amministrative** — `[M]` `ALTA` `#tutti`
`Come:` elenca gli account admin. · `OK se:` nessun account di ex fornitori o collaboratori, nessuna utenza condivisa, privilegi minimi, `admin`/`administrator` rinominato.

**`SEC-08` Protezione da forza bruta** — `[B]` `ALTA` `#login`
`Come:` prova più login errati consecutivi. · `OK se:` rate limit, blocco temporaneo o captcha.

**`SEC-09` Pannello di amministrazione** — `[A]` `MEDIA` `#tutti`
`Come:` prova gli URL standard di login del CMS. · `OK se:` protetto (URL non standard, IP allowlist, auth aggiuntiva) e comunque non indicizzato.

**`SEC-10` File e directory esposti** — `[A]` `ALTA` `#tutti`
`Come:` prova `/.git/`, `/.env`, `/backup`, `/phpinfo.php`, listing di directory. · `OK se:` tutto 403 o 404.

**`SEC-11` Segreti nel codice** — `[M]` `BLOCCANTE` `#tutti`
`Come:` cerca chiavi API, password, token nel repository e nel JS servito al browser. · `OK se:` nessun segreto esposto; le chiavi lato client sono solo quelle pubbliche e con restrizioni di dominio.

**`SEC-12` Validazione degli input** — `[M]` `ALTA` `#form`
`Come:` prova payload tipici (XSS, SQL injection) sui campi pubblici, con autorizzazione del cliente. · `OK se:` input sanitizzati, output correttamente codificato.

**`SEC-13` Upload di file** — `[B]` `ALTA` `#form`
`Come:` prova a caricare tipi non previsti e file grandi. · `OK se:` estensioni e MIME validati, dimensione limitata, file non eseguibili e serviti da percorso separato.

**`SEC-14` Vulnerabilità note delle dipendenze** — `[M]` `ALTA` `#tutti`
`Come:` scanner (npm audit, Snyk, WPScan, patch level del CMS). · `OK se:` nessuna CVE critica aperta, processo di aggiornamento definito.

**`SEC-15` WAF e protezione DDoS** — `[M]` `MEDIA` `#tutti`
`Come:` verifica se c'è Cloudflare o equivalente e le regole attive. · `OK se:` protezione proporzionata al rischio, con bot management se serve.

**`SEC-16` Backup** — `[M]` `BLOCCANTE` `#tutti`
`Come:` chiedi frequenza, ritenzione, posizione, cifratura. · `OK se:` automatici, off-site, cifrati, con più punti di ripristino.

**`SEC-17` Test di ripristino** — `[M]` `ALTA` `#tutti`
`Come:` chiedi quando è stato provato l'ultimo restore. · `OK se:` **provato davvero almeno una volta**. Un backup mai ripristinato non è un backup: è una speranza.

**`SEC-18` Registro accessi e audit** — `[M]` `MEDIA` `#login`
`Come:` verifica se le azioni amministrative sono tracciate. · `OK se:` log presenti e conservati.

**`SEC-19` Piano di risposta agli incidenti** — `[M]` `MEDIA` `#tutti`
`Come:` chiedi chi si attiva in caso di violazione. · `OK se:` referenti noti e consapevolezza dell'obbligo di notifica entro 72 ore in caso di data breach.

---

## 15. ANL — Analytics, tracciamento e marketing

**`ANL-01` Analytics installato una volta sola** — `[A]` `ALTA` `#tutti`
`Come:` cerca duplicazioni del tag GA4 nel sorgente e in GTM. · `OK se:` una sola implementazione, su tutte le pagine.

**`ANL-02` Tag manager configurato** — `[B]` `MEDIA` `#tutti`
`Come:` controlla contenitore, versioni pubblicate, tag orfani. · `OK se:` ordinato, con naming coerente e nessun tag di test attivo.

**`ANL-03` Eventi e conversioni** — `[B]` `ALTA` `#tutti`
`Come:` percorri i flussi chiave con il debug attivo. · `OK se:` eventi principali (form, contatti, download, acquisto) tracciati una sola volta, con parametri corretti.

**`ANL-04` Tracciamento e-commerce** — `[B]` `ALTA` `#ecom`
`Come:` completa un ordine con il debug. · `OK se:` il funnel completo (view_item, add_to_cart, begin_checkout, purchase) è coerente e i ricavi corrispondono al gestionale.

**`ANL-05` Traffico interno escluso** — `[M]` `MEDIA` `#tutti`
`Come:` controlla i filtri. · `OK se:` IP di agenzia e cliente esclusi, ambienti di test separati.

**`ANL-06` Tracciamento rispettoso del consenso** — `[B]` `BLOCCANTE` `#tutti`
`Come:` vedi LEG-02 e LEG-08. · `OK se:` nessun dato raccolto prima del consenso, e Consent Mode configurato.

**`ANL-07` Dati personali fuori da analytics** — `[B]` `ALTA` `#tutti`
`Come:` cerca email o nomi negli URL o nei parametri inviati. · `OK se:` nessun dato personale trasmesso.

**`ANL-08` Search Console e Bing** — `[M]` `ALTA` `#tutti`
`Come:` verifica proprietà e collegamento a GA4. · `OK se:` verificate (meglio a livello di dominio), collegate, con accessi intestati al cliente.

**`ANL-09` Pixel e retargeting** — `[B]` `MEDIA` `#tutti`
`Come:` controlla Meta, LinkedIn, TikTok, Google Ads. · `OK se:` attivi solo dopo consenso, senza eventi duplicati, con eventuale API di conversione configurata.

**`ANL-10` Convenzione UTM** — `[M]` `MEDIA` `#tutti`
`Come:` chiedi la convenzione usata nelle campagne. · `OK se:` esiste, è documentata, minuscola e coerente.

**`ANL-11` Integrazione CRM e marketing automation** — `[M]` `MEDIA` `#tutti`
`Come:` invia un lead di prova. · `OK se:` arriva nel CRM con sorgente e campi corretti, senza duplicati.

**`ANL-12` Integrazione social** — `[A]` `BASSA` `#tutti`
`Come:` controlla link ai profili e widget. · `OK se:` profili attivi e corretti, widget che non pesano né tracciano senza consenso.

**`ANL-13` Proprietà degli account** — `[M]` `ALTA` `#tutti`
`Come:` controlla chi è proprietario di GA4, GTM, Ads, Business Profile, dominio. · `OK se:` il cliente è **proprietario**, l'agenzia ha accesso delegato. È il problema che emerge sempre troppo tardi.

**`ANL-14` Dashboard e report** — `[M]` `BASSA` `#tutti`
`Come:` verifica se esiste una reportistica ricorrente. · `OK se:` definita, con KPI concordati.

---

## 16. CNT — Contenuti editoriali

**`CNT-01` Ortografia e grammatica** — `[M]` `MEDIA` `#tutti`
`Come:` revisione con strumento + lettura umana. · `OK se:` nessun refuso nelle pagine chiave, in particolare in titoli, menu e CTA.

**`CNT-02` Tono di voce** — `[M]` `MEDIA` `#tutti`
`Come:` leggi trasversalmente. · `OK se:` coerente col brand e col pubblico, senza sbalzi tra pagine scritte da persone diverse.

**`CNT-03` Informazioni obsolete** — `[M]` `ALTA` `#tutti`
`Come:` cerca anni, prezzi, orari, riferimenti a eventi passati, membri del team usciti. · `OK se:` tutto attuale.

**`CNT-04` Dati di contatto corretti** — `[A]` `ALTA` `#tutti`
`Come:` telefono, email, indirizzo, mappa, orari. · `OK se:` corretti, cliccabili su mobile, coerenti con Google Business Profile.

**`CNT-05` Qualità e diritti delle immagini** — `[M]` `ALTA` `#tutti`
`Come:` controlla risoluzione, pertinenza e **licenze**. · `OK se:` nitide, coerenti, con diritti d'uso documentati; nessuna immagine presa dal web senza licenza.

**`CNT-06` Video** — `[B]` `MEDIA` `#tutti`
`Come:` riproduci ogni video. · `OK se:` funzionanti, con poster, senza autoplay audio, e caricati in modo da non pesare sul first load.

**`CNT-07` Link esterni** — `[A]` `BASSA` `#tutti`
`Come:` controlla destinazione e attributi. · `OK se:` pertinenti, attivi, con `rel="noopener"` se aprono in nuova scheda, e apertura in nuova scheda dichiarata.

**`CNT-08` Leggibilità e tipografia** — `[M]` `MEDIA` `#tutti`
`Come:` leggi da mobile. · `OK se:` corpo ≥ 16px, righe non troppo lunghe, interlinea adeguata, paragrafi brevi.

**`CNT-09` Traduzioni** — `[M]` `ALTA` `#multi`
`Come:` fai controllare da un madrelingua le pagine chiave. · `OK se:` naturali e complete; nessun testo rimasto nella lingua originale, valute e formati data localizzati.

**`CNT-10` Coerenza terminologica** — `[M]` `BASSA` `#tutti`
`Come:` verifica come sono chiamati prodotti, servizi e sezioni. · `OK se:` lo stesso concetto ha sempre lo stesso nome.

---

## 17. MON — Monitoraggio ed esercizio

**`MON-01` Monitoraggio uptime** — `[M]` `ALTA` `#tutti`
`Come:` UptimeRobot, Pingdom o equivalente. · `OK se:` attivo su home e su una pagina critica (es. checkout), con avvisi a persone reali.

**`MON-02` Monitoraggio errori applicativi** — `[M]` `MEDIA` `#tutti`
`Come:` Sentry o simili. · `OK se:` configurato, con alert su errori nuovi o in aumento.

**`MON-03` Analisi dei log** — `[M]` `MEDIA` `#tutti`
`Come:` esamina i log server. · `OK se:` accessibili, ruotati, senza errori ricorrenti o attività anomale ignorate.

**`MON-04` Monitoraggio SEO continuativo** — `[M]` `MEDIA` `#tutti`
`Come:` alert su Search Console e rank tracking. · `OK se:` cali di indicizzazione o di traffico vengono notati in giorni, non in mesi.

**`MON-05` Monitoraggio performance nel tempo** — `[M]` `MEDIA` `#tutti`
`Come:` Core Web Vitals ricorrenti. · `OK se:` misurati periodicamente, non solo al lancio.

**`MON-06` Scadenze** — `[M]` `ALTA` `#tutti`
`Come:` censisci dominio, SSL, licenze, plugin premium, contratti hosting. · `OK se:` esiste un elenco con date e responsabile del rinnovo.

**`MON-07` Piano di aggiornamento** — `[M]` `ALTA` `#tutti`
`Come:` chiedi chi aggiorna CMS, plugin e librerie e ogni quanto. · `OK se:` cadenza definita, aggiornamenti provati prima su staging.

**`MON-08` Backup verificati periodicamente** — `[M]` `ALTA` `#tutti`
`Come:` vedi SEC-16 e SEC-17. · `OK se:` controllo periodico calendarizzato.

**`MON-09` Ottimizzazione database** — `[M]` `BASSA` `#tutti`
`Come:` dimensione, tabelle gonfie, revisioni, transient, log. · `OK se:` manutenzione periodica prevista.

**`MON-10` Controllo contenuti ricorrente** — `[M]` `BASSA` `#tutti`
`Come:` pianifica un crawl periodico. · `OK se:` link rotti e contenuti scaduti individuati con regolarità.

**`MON-11` Monitoraggio sicurezza** — `[M]` `ALTA` `#tutti`
`Come:` scansioni malware, integrità file, alert. · `OK se:` attivi, con avvisi che raggiungono qualcuno che può intervenire.

**`MON-12` Costi e consumi** — `[M]` `BASSA` `#tutti`
`Come:` traffico, storage, chiamate API, banda CDN. · `OK se:` monitorati, senza sorprese in bolletta.

---

## 18. HND — Consegna e chiusura progetto `#lancio`

**`HND-01` Credenziali consegnate** — `[M]` `ALTA` `#lancio`
`Come:` elenca tutti gli accessi. · `OK se:` consegnati al cliente in modo sicuro (password manager, non email), con proprietà a suo nome.

**`HND-02` Documentazione tecnica** — `[M]` `MEDIA` `#lancio`
`Come:` verifica cosa esiste. · `OK se:` stack, ambienti, procedura di deploy, dipendenze, contatti dei fornitori sono scritti da qualche parte.

**`HND-03` Manuale d'uso del CMS** — `[M]` `MEDIA` `#lancio`
`Come:` chiedi al cliente se sa fare le operazioni ordinarie. · `OK se:` esiste una guida e una sessione di formazione è avvenuta.

**`HND-04` Codice consegnato** — `[M]` `MEDIA` `#lancio`
`Come:` repository e diritti. · `OK se:` accessibile al cliente, con licenza e proprietà chiarite in contratto.

**`HND-05` Contratto di manutenzione** — `[M]` `MEDIA` `#lancio`
`Come:` chiedi cosa succede dopo il lancio. · `OK se:` ambito, tempi di risposta e responsabilità (aggiornamenti, backup, sicurezza) sono definiti per iscritto.

**`HND-06` Verifica post-lancio programmata** — `[M]` `ALTA` `#lancio`
`Come:` fissa un controllo a 24-48 ore e a 7-30 giorni. · `OK se:` calendarizzato, con focus su indicizzazione, errori 404 in arrivo, conversioni e performance reali.

---

## Riepilogo per il report

| Sezione | Voci | Prevalentemente |
|---|---|---|
| GO — Go-live e migrazione | 14 | manuale/strumenti |
| TEC — Tecnica e front-end | 16 | automatica |
| PRF — Performance | 12 | strumenti esterni |
| ACC — Accessibilità | 16 | mista |
| SEO — SEO tecnica | 20 | automatica |
| ONP — On-page | 10 | mista |
| GEO — AI search | 8 | automatica |
| NAV — Navigazione | 15 | browser |
| FRM — Form | 10 | browser |
| ACT — Account | 9 | browser |
| ECM — E-commerce | 20 | browser/manuale |
| EML — Email | 18 | manuale |
| LEG — Privacy e legale | 20 | mista |
| SEC — Sicurezza | 19 | manuale |
| ANL — Analytics | 14 | browser |
| CNT — Contenuti | 10 | manuale |
| MON — Monitoraggio | 12 | manuale |
| HND — Consegna | 6 | manuale |
