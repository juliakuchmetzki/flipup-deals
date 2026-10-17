# FlipUp Deals

Statische Website für flipup-deals.de (HTML, CSS, Vanilla-JS), gehostet auf Vercel.
Die Deals kommen von `https://api.flipup-deals.de/api/deals.json`. Beim Build werden
die 60 neuesten Deals ins HTML von `index.html` vorgerendert (`build.js`), im Browser
aktualisiert JavaScript sie danach alle 60 Sekunden.

## Lokal testen

```sh
npm run build      # erzeugt dist/ (Node >= 18; einzige Abhängigkeit: marked für den Blog)
npx serve dist     # Vorschau unter http://localhost:3000
npm run check      # interne Links und Anker in dist/ prüfen
npm run check:blog # Blog-Artikel prüfen (Länge, Meta, FAQ-JSON-LD, Quellen)
```

Mit nicht erreichbarer API bleibt der Build grün und die Platzhalter bleiben stehen:

```sh
DEALS_API_URL=http://127.0.0.1:9/x.json npm run build
```

## Blog

Artikel liegen als Markdown in `content/blog/`, der Build erzeugt daraus `dist/blog/`
(Übersicht, Artikelseiten, `feed.xml`, `search-index.json`, Sitemap-Einträge). Der Blog
braucht die Deals-API nicht. Neuen Artikel anlegen: `npm run new-post`. Anleitung:
`docs/BLOG_AUTHORING.md`, fachliche Prüfliste: `docs/BLOG_REVIEW.md`.

## Deployment

Vercel führt `npm run build` aus und liefert `dist/` aus (siehe `vercel.json`).
Zum regelmäßigen Aktualisieren der vorgerenderten Deals siehe [docs/DEPLOY_HOOK.md](docs/DEPLOY_HOOK.md).

## Design

Gemeinsames Stylesheet `assets/style.css` (Tokens, Komponenten, Druck-CSS) und `assets/site.js`
(Header-Pille, mobiles Menü); Schriften liegen lokal in `fonts/`. Konzept und Entscheidungen:
[docs/DESIGN.md](docs/DESIGN.md), Screenshots: `docs/screenshots/`.
Das Karten-Markup steht im SYNC-Block von `index.html` und `build.js` und muss identisch bleiben.
