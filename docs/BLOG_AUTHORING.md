# Blog: Artikel schreiben und veröffentlichen

Artikel liegen als Markdown-Dateien in `content/blog/<slug>.md`. `npm run build` erzeugt daraus
`dist/blog/index.html`, `dist/blog/<slug>.html`, `dist/blog/feed.xml`, `dist/blog/search-index.json`
und trägt die Seiten in `dist/sitemap.xml` ein. Der Blog-Build braucht die Deals-API nicht.

## Neuen Artikel anlegen

```sh
npm run new-post -- "Titel des Artikels"
```

legt `content/blog/<slug>.md` mit Vorlage an (Slug aus dem Titel: Kleinbuchstaben, Bindestriche, ä→ae, ö→oe, ü→ue, ß→ss).

## Front-Matter

Zwischen zwei `---`-Zeilen, je Zeile `key: value`. Listen sind kommasepariert, keine YAML-Syntax.

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `title` | ja | Titel (wird H1 und Teil des `<title>`) |
| `slug` | ja | URL-Teil, nur `a-z`, `0-9`, `-`; eindeutig |
| `description` | ja | 150–160 Zeichen, für Meta-Description, Karte und Einleitung |
| `category` | ja | z. B. `Spartipps`, `Kaufberatung`, `Verbraucherwissen`, `FlipUp` |
| `tags` | nein | kommasepariert, nur Text (keine Links) |
| `date` | ja | `YYYY-MM-DD`, nicht zurückdatieren |
| `updated` | nein | `YYYY-MM-DD`, erzeugt „Aktualisiert am …“ und `dateModified` |
| `featured` | nein | `true` = Aufmacher auf `/blog/` (der erste Artikel mit `true`, sonst der neueste) |
| `order` | nein | Sortierung bei gleichem Datum (kleiner = weiter oben) |
| `coverTitle` | ja | Text im Cover, max. 40 Zeichen, wird in Großbuchstaben gesetzt |
| `coverSub` | nein | zweite Zeile im Cover, max. 30 Zeichen |
| `legal` | nein | `true` blendet „Dieser Artikel ersetzt keine Rechtsberatung.“ ein |

## Text

- Im Text nur `##` und `###` (die H1 kommt aus `title`). Überschriften erhalten automatisch Anker-IDs.
- 4–7 inhaltliche `##`-Abschnitte, dazu **`## Häufig gestellte Fragen`** und **`## Quellen`** am Ende.
- Interne Links als `[Text](/blog/<slug>.html)`; externe Links nur auf offizielle Quellen. Externe Links erhalten automatisch `rel="noopener noreferrer"`. Keine Affiliate-Links in Artikeln.
- Callouts: Blockquote, der mit `**Tipp:**`, `**Wichtig:**` oder `**Hinweis:**` beginnt:

  ```md
  > **Tipp:** Text der Box.
  ```

- Tabellen (Markdown-Syntax) werden automatisch in einen horizontal scrollbaren Rahmen gesetzt.
- Rechenbeispiele nur mit ausdrücklich als „fiktiv“ gekennzeichneten Zahlen.

### FAQ-Abschnitt

Jede `###`-Überschrift unter `## Häufig gestellte Fragen` ist eine Frage, die Absätze darunter sind die Antwort.
Der Build rendert sie als aufklappbare `<details>` **und** als `FAQPage`-JSON-LD mit exakt demselben Text.

### Quellen-Abschnitt

`## Quellen` mit einer Liste von Links wird als eigener Block am Ende gerendert („Stand: <Datum>“).

## Prüfen und ansehen

```sh
npm run build        # erzeugt dist/
npm run check        # interne Links/Anker in dist/ prüfen, externe Links auflisten
npm run check:blog   # Wortzahl, description-Länge, Slugs, JSON-LD, Quellen, interne Links
npx serve dist       # lokale Vorschau, dann http://localhost:3000/blog/
```

Mit `BLOG_CONTENT_DIR=/anderer/pfad npm run build` kann ein anderer Artikelordner gebaut werden (z. B. für Tests).
