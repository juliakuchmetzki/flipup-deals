#!/usr/bin/env node
'use strict';
// Inhaltsprüfung für den Blog (Quelltexte und gebaute Seiten). Aufruf: npm run build && npm run check:blog

const fs = require('fs');
const path = require('path');
const { loadPosts, htmlToText, slugify } = require('./lib/blog-content');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'blog');
const posts = loadPosts(path.join(ROOT, 'content', 'blog'));
const problems = [];
const note = (p, msg) => problems.push(`${p.slug}: ${msg}`);

const slugs = new Set();
for (const p of posts) {
  if (slugs.has(p.slug)) note(p, 'slug doppelt');
  slugs.add(p.slug);
  if (p.slug !== slugify(p.slug)) note(p, 'slug nicht normalisiert');
  if (p.description.length < 150 || p.description.length > 160) note(p, `description hat ${p.description.length} Zeichen (150–160)`);
  if (p.coverTitle.length > 40) note(p, 'coverTitle > 40 Zeichen');
  if (p.coverSub.length > 30) note(p, 'coverSub > 30 Zeichen');
  if (p.words < 900 || p.words > 1400) note(p, `${p.words} Wörter (900–1400)`);
  if (/TODO verify/i.test(p.body)) note(p, 'enthält "TODO verify" (muss in docs/BLOG_REVIEW.md stehen)');
  if (new RegExp('ama' + 'zon', 'i').test(p.body)) note(p, 'enthält einen unzulässigen Shop-Namen');
  if (/^# /m.test(p.body)) note(p, 'H1 im Text');
  if (!/^## Quellen\s*$/m.test(p.body)) note(p, 'Abschnitt "## Quellen" fehlt');
  if (!/^## Häufig gestellte Fragen\s*$/m.test(p.body)) note(p, 'Abschnitt "## Häufig gestellte Fragen" fehlt');
  const internal = new Set([...p.body.matchAll(/\]\(\/blog\/([a-z0-9-]+)\.html\)/g)].map(m => m[1]));
  if (internal.size < 2) note(p, `nur ${internal.size} interne Blog-Links (min. 2)`);
  for (const s of internal) if (!posts.some(x => x.slug === s)) note(p, `interner Link auf unbekannten Artikel "${s}"`);
  if (/Affiliate|awin|awin1/i.test([...p.body.matchAll(/\]\((https?:[^)]+)\)/g)].map(m => m[1]).join(' '))) note(p, 'Affiliate-Link im Text');

  const file = path.join(DIST, `${p.slug}.html`);
  if (!fs.existsSync(file)) { note(p, 'dist-Seite fehlt (zuerst npm run build)'); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) note(p, `${h1} × <h1> auf der Seite (genau 1 erwartet)`);
  if (!html.includes(`<link rel="canonical" href="https://flipup-deals.de/blog/${p.slug}.html" />`)) note(p, 'canonical fehlt oder falsch');
  if (/\ssrc=["']https?:/.test(html)) note(p, 'externe src-Ressource auf Blogseite');

  // FAQPage-JSON-LD muss dem sichtbaren Text entsprechen
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const faq = ld.find(x => x['@type'] === 'FAQPage');
  const items = [...html.matchAll(/<details class="faq-item">\s*<summary>([\s\S]*?)<\/summary>\s*<div class="faq-answer">([\s\S]*?)<\/div>\s*<\/details>/g)];
  if (!faq) note(p, 'FAQPage-JSON-LD fehlt');
  else if (faq.mainEntity.length !== items.length) note(p, `FAQ: ${faq.mainEntity.length} im JSON-LD, ${items.length} sichtbar`);
  else faq.mainEntity.forEach((q, i) => {
    if (q.name !== htmlToText(items[i][1])) note(p, `FAQ ${i + 1}: Frage im JSON-LD weicht vom sichtbaren Text ab`);
    if (q.acceptedAnswer.text !== htmlToText(items[i][2])) note(p, `FAQ ${i + 1}: Antwort im JSON-LD weicht vom sichtbaren Text ab`);
  });
  if (!ld.some(x => x['@type'] === 'BlogPosting')) note(p, 'BlogPosting-JSON-LD fehlt');
  if (!ld.some(x => x['@type'] === 'BreadcrumbList')) note(p, 'BreadcrumbList-JSON-LD fehlt');
}

console.log(`${posts.length} Artikel geprüft.`);
for (const p of posts) console.log(`  ${p.date}  ${String(p.words).padStart(5)} Wörter  ${String(p.minutes).padStart(2)} Min.  ${p.slug}`);
if (problems.length) { console.log(`\nPROBLEME (${problems.length}):`); problems.forEach(x => console.log('  - ' + x)); process.exit(1); }
console.log('\nAlle Blog-Prüfungen bestanden.');
