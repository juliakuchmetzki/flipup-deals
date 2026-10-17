# Deploy Hook: Deals aktuell halten

Die Startseite wird beim Build mit den aktuellen Deals vorgerendert (`build.js`).
Damit sich der Stand im HTML aktualisiert, muss Vercel regelmäßig neu bauen. Das
geht über einen Deploy Hook, den das Backend (oder ein Cron-Job) aufruft.

## 1. Hook anlegen

1. Vercel Dashboard öffnen → Projekt `flipup-deals` auswählen.
2. **Project Settings → Git → Deploy Hooks**.
3. Name vergeben (z. B. `deals-update`), Branch wählen (Produktions-Branch, z. B. `main`) und **Create Hook** klicken.
4. Die angezeigte URL kopieren.

## 2. Hook-URL als Geheimnis behandeln

Wer die URL kennt, kann beliebig viele Deployments auslösen. Deshalb:

- URL **nicht** ins Repository einchecken, nicht in Chats/Tickets posten.
- Nur als Umgebungsvariable oder Secret ablegen, z. B. `VERCEL_DEPLOY_HOOK_URL` im Backend bzw. auf dem Cron-Server.
- Bei Verdacht auf Leak den Hook in Vercel löschen und neu anlegen.

## 3. Aufruf

Nach jedem Deal-Update im Backend:

```sh
curl -X POST "$VERCEL_DEPLOY_HOOK_URL"
```

Oder per Cron, z. B. stündlich zur Minute 7:

```crontab
7 * * * * curl -fsS -X POST "$VERCEL_DEPLOY_HOOK_URL" > /dev/null
```

(`VERCEL_DEPLOY_HOOK_URL` muss in der Umgebung des Cron-Jobs gesetzt sein, z. B. am Anfang der Crontab: `VERCEL_DEPLOY_HOOK_URL=<HOOK-URL>`.)

## Hinweise

- Ein Build dauert nur wenige Sekunden. Zwischen zwei Builds aktualisiert das JavaScript auf der Seite die Deals weiterhin alle 60 Sekunden.
- Ist die API beim Build nicht erreichbar, schlägt der Build nicht fehl; die Seite lädt die Deals dann nur per JavaScript.
