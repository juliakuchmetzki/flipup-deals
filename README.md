# FlipUp Deals

Statische Website für flipup-deals.de (HTML, CSS, Vanilla-JS), gehostet auf Vercel.
Die Deals kommen von `https://api.flipup-deals.de/api/deals.json`. Beim Build werden
die 60 neuesten Deals ins HTML von `index.html` vorgerendert (`build.js`), im Browser
aktualisiert JavaScript sie danach alle 60 Sekunden.

## Lokal testen

```sh
npm run build      # erzeugt dist/ (Node >= 18, keine Abhängigkeiten)
npx serve dist     # Vorschau unter http://localhost:3000
```

Mit nicht erreichbarer API bleibt der Build grün und die Platzhalter bleiben stehen:

```sh
DEALS_API_URL=http://127.0.0.1:9/x.json npm run build
```

## Deployment

Vercel führt `npm run build` aus und liefert `dist/` aus (siehe `vercel.json`).
Zum regelmäßigen Aktualisieren der vorgerenderten Deals siehe [docs/DEPLOY_HOOK.md](docs/DEPLOY_HOOK.md).
