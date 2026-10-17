# Design-Analyse und Designvorschlag

Stand: 2026-10-17. Quellen: `https://flipupde.de` (style.css?v=16, 853 Zeilen) und
`https://johanneskuchmetzki.de` (style.css?v=13, 762 Zeilen), direkt per curl gelesen.
`https://flipbase.xyz` war aus der Entwicklungsumgebung nicht erreichbar (Verbindung vom
Proxy zurückgesetzt); Inhalte zu FlipBase stammen deshalb nur von den beiden anderen Seiten.

## 1. Gemeinsame Basis beider Seiten

Beide Seiten teilen **dasselbe CSS-Gerüst** und unterscheiden sich fast nur in den Farb-Tokens.
Das ist der Kern der gemeinsamen Marke: gleiche Struktur, andere Akzentfarbe.

| Eigenschaft | Wert (beide Seiten) |
|---|---|
| Schriften | Inter (Fließtext, 400–700, variabel), Space Grotesk (h1–h3, Marke, Preise; 600/700, `letter-spacing: -0.01em`, `text-wrap: balance`), Caveat 700 (nur `.accent-script`, ein hervorgehobenes Wort in der h1, `font-size: 1.2em`, mit 3 px Unterstreichung in Akzentfarbe, 55 % Deckkraft) |
| Schriftdateien | selbst gehostet unter `assets/fonts/` (`inter-latin.woff2`, `space-grotesk-latin.woff2`, `caveat-700.woff2`), `font-display: swap` |
| Zeilenhöhe | `body` 1.6; Fließtext in Sektionen 0.92–1.08 rem |
| Container | `max-width` 1080 px (flipupde.de) bzw. 1120 px (johanneskuchmetzki.de), seitlich 28 px Padding |
| Sektionen | 80–88 px vertikal (mobil 56–64 px); zentriert mit `.section-divider` (44 × 2 px, Akzentfarbe) und `.section-label` (Versalien, 0.78–0.95 rem, `letter-spacing: 0.1em`, `--accent-ink`) |
| Hintergrund | `--bg` mit **sechs weichen radialen Verläufen** in der Akzentfarbe (Alpha 0.07–0.14) an den Rändern, dadurch warmer „Glow“ ohne Bilder |
| Radien | Pille (`999px`) für Buttons und Navigation, 14 px (FAQ, Streifen-Fotos), 16–24 px (Karten, Formular, Preis-Karte) |
| Schatten | ausschließlich weiche, lange Schatten: `0 16px 32px -20px`, `0 24px 48px -28px`, `0 30px 60px -24px` in Textfarbe (Alpha 0.2–0.35) |
| Rahmen | 1 px `--border`, Akzent nur als 2 px Linie (`.network-card` oben, `.section-divider`) bzw. 1 px Linie links an Erklärtexten |
| Navigation | `position: sticky`, anfangs transparent; ab 24 px Scroll (`.scrolled`, per kleinem Inline-Script) wird sie eine **schwebende Pille**: Weiß 75–78 %, `backdrop-filter: blur(10px)`, Schatten, 12 px Abstand zum Rand. Links 0.9 rem / 500, gedämpft, Hover `--accent-ink`. Mobil (≤ 600 px) werden die Links bei flipupde.de ausgeblendet |
| Buttons | Pille, `padding: 13px 26px`, 0.95 rem / 600, Hover `translateY(-1px)` + dunklere Farbe; Varianten `ghost` (1.5 px Rahmen), `block`, `light` |
| Footer | dunkel (`--text` als Hintergrund), 3-spaltig (`1.3fr 1fr 1fr`), Marke in Space Grotesk, Überschriften als Versalien (Alpha 0.4), Links Alpha 0.75, unten Trennlinie + Copyright/Adresse; mobil einspaltig |
| Animationen | `.reveal` (Einblenden + 28 px nach oben, 0.7 s `cubic-bezier(0.16,1,0.3,1)`, per `IntersectionObserver`), Nav-Übergang 0.25 s, Streifen-Marquee; **alles** mit `prefers-reduced-motion: reduce` abgeschaltet (nur bei Reveal und Marquee) |
| Dark/Light | nur Light: `color-scheme: light`, kein Dark Mode |
| Breakpoints | 860/900 px (Spalten → einspaltig, Footer einspaltig), 600 px (kleinere Abstände, Navigationslinks aus) |
| Details | FAQ als `<details>` mit „+/–“, Aufzählungspunkte als 7–8 px Kreise in Akzentfarbe, Timeline mit nummerierten Kreisen |

## 2. Farb-Tokens

| Token | flipupde.de (Rot, „FlipUp“) | johanneskuchmetzki.de (Grün, „Person“) |
|---|---|---|
| `--bg` | `#fbf7f5` | `#f7f8f6` |
| `--bg-alt` | `#f6ebe6` | `#eef1ec` |
| `--surface` | `#ffffff` | `#ffffff` |
| `--text` | `#221512` | `#14171a` |
| `--text-muted` | `#6e5c56` | `#5c6259` |
| `--accent` | `#e3402a` | `#1f6f5c` |
| `--accent-ink` | `#b02c19` | `#14503f` |
| `--border` | `#ecdcd4` | `#dfe3da` |
| Fehlerfarbe | – | `#b3261e` |

Der Primärbutton ist bei flipupde.de **rot** (`--accent`), bei johanneskuchmetzki.de **dunkel** (`--text`, Hover `--accent-ink`).

### Kontrast (WCAG, selbst berechnet)

| Paarung | Verhältnis | AA normaler Text (4,5) |
|---|---|---|
| `--text` auf `--bg` (rot) | 16,7 | ok |
| `--text-muted` auf `--bg` / Weiß (rot) | 5,9 / 6,3 | ok |
| `--accent-ink` auf `--bg` (rot) | 6,1 | ok |
| Weiß auf `--accent-ink` (rot) | 6,5 | ok |
| **Weiß auf `--accent` `#e3402a`** | **4,2** | **knapp nicht ok** (nur für große/fette Schrift ≥ 18,7 px bzw. 24 px) |
| **`--accent` `#e3402a` als Textfarbe auf `--bg`** | **3,9** | **nicht ok** für normalen Text |
| Footer-Links Alpha 0,75 / Überschrift Alpha 0,4 auf `#221512` | ≈ 8,5 / ≈ 5,0 | ok |

Folge für das Redesign: roter Akzent nur für Flächen, Linien, Punkte und große Zahlen, **Text und Buttons mit Text verwenden `--accent-ink` oder `--text`**.

## 3. Weitere Beobachtungen

- Beide Seiten sind einzelne lange Seiten mit Ankernavigation; es gibt keine Karten-/Produktraster. Karten (`.network-card`, `.faq-item`, `.pricing-card`) sind bewusst flach und ruhig.
- Favicons: `favicon-16/32/180/512.png` unter `assets/favicon/`, `apple-touch-icon` 180 px. JSON-LD (`Organization` bzw. `Person`), `canonical`, `og:title/description/type/url` (kein `og:image`).
- Texte sind duzend, kurz, ohne Superlative. FlipUp-Seite nennt einen großen Marktplatz und Mitgliederzahlen (< 15): **beides wird auf flipup-deals.de nicht übernommen** (keine Erwähnung eines Marktplatzes, keine Zahlen).
- Auf flipupde.de steht „ein Projekt von Johannes Kuchmetzki“ (Brunnenstr. 28, 10119 Berlin). Das Impressum von flipup-deals.de nennt dagegen **Julia Kuchmetzki, Chausseestraße 35b**. Das bleibt unangetastet, wird aber im About-Text per TODO-Kommentar markiert (Betreiber-Abgleich mit neuem Impressum).
- Das Kontaktformular von johanneskuchmetzki.de ruft `api.web3forms.com` auf. Das wird **nicht** übernommen (keine neuen externen Requests).

## 4. Designvorschlag für flipup-deals.de

**Leitidee:** gleiche Marke wie flipupde.de (warmes Off-White, Rot, Space Grotesk/Inter, Pillen, weiche Schatten, dunkler Footer), aber die **Produktkarten sind der Inhalt**. Die Deal-Seite wird nicht erzählerisch, sondern ein ruhiger Katalog: kompakter Hero, direkt darunter Filter und Raster.

### Tokens (CSS-Variablen in `assets/style.css`)

```
--bg #fbf7f5   --bg-alt #f6ebe6   --surface #ffffff
--text #221512 --text-muted #6e5c56
--accent #e3402a (nur Flächen/Linien/Badges-Hintergrund)
--accent-ink #b02c19 (Text, Links, Rabatt, Hover)
--border #ecdcd4
--max-width 1200px   (Raster braucht mehr Breite als die 1080/1120 px der Markenseiten)
```

- Neu gegenüber heute: das bisherige Dunkelrot `#9d0208` auf Grau `#f5f5f5` weicht dem FlipUp-Rot auf warmem Off-White. Logo (rot auf dunkel) passt dazu.
- Schriften: **Inter** liegt bereits lokal vor. **Space Grotesk** (22 KB) und **Caveat 700** (106 KB, optional, nur für ein Wort im Hero) würden lokal ins Repo (`fonts/`) kopiert, direkt aus den eigenen Assets von flipupde.de; zur Laufzeit gibt es keine fremden Requests.
- Hintergrund: derselbe Radial-Glow, aber nur drei Verläufe (oben links, oben rechts, unten), damit das Raster ruhig bleibt.

### Komponenten

| Komponente | Umsetzung |
|---|---|
| Header | Sticky, wie bei den Markenseiten: transparent, ab Scroll schwebende Pille mit Blur. Logo + „FlipUp Deals“, Links *Deals*, *Über uns*, *FlipUp ↗*. Mobil: Menü-Button, aufklappbare Liste ohne Framework (`<button aria-expanded>` + Klasse) |
| Hero | Kompakt (≈ 48 px oben statt 96 px), links ausgerichtet oder zentriert wie flipupde.de; H1 in Space Grotesk mit einem Wort in Caveat-Akzent. Darunter drei Vertrauenspunkte als kleine Zeile mit Rot-Punkten (nur belegbar: automatisch aktualisiert · Preis/Verfügbarkeit beim Shop prüfen · Werbung/Affiliate-Links) |
| Shop-Leiste / Filter | Reine Text-Chips: Pille, 1 px `--border`, Weiß; aktiver Filter dunkel (`--text` auf `--bg`) wie der Primärbutton von johanneskuchmetzki.de. Horizontal scrollbar auf Mobil |
| Deal-Karte | Weiß, Radius 16 px, 1 px Rahmen, weicher Schatten, Hover `translateY(-2px)`. Bild im 4:3-Feld (`object-fit: contain`, weißer Grund), darunter Meta (Shop · Kategorie, 12 px Versalien gedämpft), Titel 2 Zeilen, Preis groß in Space Grotesk 700, Altpreis durchgestrichen, Rabatt-Badge (`--accent-ink` auf Rot-Tint `#fbe4df`), Zeitstempel, Button |
| Button „Zum Angebot“ | Pille, dunkel (`--text`), Hover `--accent-ink`. Bewusst **nicht** rot gefüllt, weil Weiß auf `#e3402a` nur 4,2:1 erreicht |
| Hinweis-Banner | Warmes Beige (`--bg-alt`) mit 1 px Rahmen statt grellem Gelb, Text `--accent-ink`; zusätzlich Zeile „Werbung: Die Links zu den Deals sind Affiliate-Links.“ direkt über dem Raster |
| Raster | `repeat(auto-fill, minmax(260px, 1fr))`, Lücke 20 px; ≈ 1 Spalte < 480 px, 2 Spalten ab 480 px, 3 ab 768 px, 4 ab 1100 px (feste Breakpoints, nicht nur auto-fill) |
| „Aus demselben Umfeld“ | Das flache `.network-card`-Muster (2 px Akzentlinie oben, Titel, ein Satz, Link-Zeile) für flipupde.de, johanneskuchmetzki.de und flipbase.xyz; ohne Logos |
| Footer | Dunkel `#221512`, vier Spalten (Marke · Rechtliches · Projekte · Kontakt), unten Copyright. Mobil einspaltig |
| Rechtsseiten | Heller Textbereich im Stil `.legal-content` von johanneskuchmetzki.de (max. 760 px), erweitert um Tabellen, Anker, Druck-CSS |
| Bewegung | Nur Hover-Übergänge und Nav-Pille. Kein Reveal-on-Scroll für Karten (würde das Vorrendern/Flackern-Konzept stören), alles unter `prefers-reduced-motion` ruhiggestellt |
| Modus | Nur Light, `color-scheme: light` (wie beide Referenzseiten) |

### Was bewusst anders ist als auf den Markenseiten

1. Container 1200 px statt 1080/1120 px (vier Karten pro Zeile).
2. Kein Reveal-on-Scroll und keine Marquee: das Raster wird vorgerendert und darf nicht „einfliegen“.
3. Roter Akzent nie als Textfarbe, sondern `--accent-ink`, wegen Kontrast.
4. Keine Fotos/Kollagen/Pricing-Karte/FAQ.

### Entscheidungen (bestätigt)

1. **Caveat-Akzentwort** im Hero: ja, ein Wort („Deals“), ein Schriftschnitt, selbst gehostet, `font-display: swap`.
2. **Primärbutton „Zum Angebot“ dunkel**, Hover `#b02c19`.
3. Kein Dark Mode (wie die Referenzseiten).
