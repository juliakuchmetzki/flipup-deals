#!/usr/bin/env node
'use strict';
// Legt eine Artikel-Vorlage an: npm run new-post -- "Titel des Artikels"

const fs = require('fs');
const path = require('path');
const { slugify } = require('./lib/blog-content');

const title = process.argv.slice(2).join(' ').trim();
if (!title) { console.error('Aufruf: npm run new-post -- "Titel des Artikels"'); process.exit(1); }

const slug = slugify(title);
const dir = path.join(__dirname, '..', 'content', 'blog');
const file = path.join(dir, `${slug}.md`);
if (fs.existsSync(file)) { console.error(`${path.relative(process.cwd(), file)} existiert bereits.`); process.exit(1); }

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, `---
title: ${title}
slug: ${slug}
description: Kurzbeschreibung für Karte und Suchmaschinen (150 bis 160 Zeichen).
category: Spartipps
tags: Stichwort eins, Stichwort zwei
date: ${today}
featured: false
order: 10
coverTitle: ${title.slice(0, 40).toUpperCase()}
coverSub:
legal: false
---
Einleitung in zwei bis vier Sätzen. Sie steht ohne Überschrift direkt unter dem Titel.

## Erster Abschnitt

Text. Interne Links so: [anderer Artikel](/blog/slug-des-artikels.html).

> **Tipp:** Hervorgehobener Hinweis.

## Zweiter Abschnitt

Text.

## Häufig gestellte Fragen

### Erste Frage?

Antwort in einem oder mehreren Absätzen.

### Zweite Frage?

Antwort.

## Quellen

- [Name der Quelle](https://www.gesetze-im-internet.de/)
`);
console.log(`Angelegt: ${path.relative(process.cwd(), file)}`);
