#!/usr/bin/env node
'use strict';
// Prüft alle internen Links und Ressourcen (href/src) in dist/ auf existierende Dateien (und Anker)
// und listet externe Links auf. Aufruf: npm run build && npm run check
// Exit-Code 1, wenn interne Links ins Leere führen.

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(DIST)) { console.error('dist/ fehlt – zuerst "npm run build" ausführen.'); process.exit(2); }

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const files = walk(DIST);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const idCache = new Map();
const idsOf = file => {
  if (!idCache.has(file)) {
    const html = fs.readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
  }
  return idCache.get(file);
};

const resolve = (from, url) => {
  const clean = url.split('#')[0].split('?')[0];
  let target = clean.startsWith('/') ? path.join(DIST, clean) : path.resolve(path.dirname(from), clean || path.basename(from));
  if (!clean) target = from;
  if (target.endsWith(path.sep) || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, 'index.html');
  return target;
};

const errors = [];
const external = new Map();
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, m => (/\ssrc=/.test(m.split('>')[0]) ? m.split('>')[0] + '></script>' : ''))   // JS-Quelltext ignorieren, src behalten
    .replace(/<!--[\s\S]*?-->/g, '');
  const rel = path.relative(DIST, file);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const url = m[1].replace(/&amp;/g, '&');
    if (!url || /^(mailto:|tel:|data:|javascript:)/.test(url)) continue;
    if (/^https?:\/\//.test(url)) {
      if (!external.has(url)) external.set(url, new Set());
      external.get(url).add(rel);
      continue;
    }
    if (url.startsWith('//')) { errors.push(`${rel}: protokoll-relative URL ${url}`); continue; }
    checked++;
    const target = resolve(file, url);
    if (!fs.existsSync(target)) { errors.push(`${rel}: ${url} -> Datei fehlt (${path.relative(DIST, target)})`); continue; }
    const hash = url.includes('#') ? url.split('#')[1] : '';
    if (hash && !hash.startsWith('kategorie=') && target.endsWith('.html') && !idsOf(target).has(hash)) {
      errors.push(`${rel}: ${url} -> Anker "#${hash}" nicht gefunden`);
    }
  }
}

console.log(`Geprüft: ${htmlFiles.length} HTML-Dateien, ${checked} interne Links/Ressourcen.`);
if (errors.length) {
  console.log(`\nFEHLER (${errors.length}):`);
  errors.forEach(e => console.log('  - ' + e));
} else {
  console.log('Interne Links: alle in Ordnung.');
}
const byHost = new Map();
for (const [u, pages] of external) {
  const host = new URL(u).host;
  if (!byHost.has(host)) byHost.set(host, []);
  byHost.get(host).push([u, pages]);
}
console.log(`\nExterne Links: ${external.size} URLs auf ${byHost.size} Hosts`);
for (const [host, list] of [...byHost.entries()].sort()) {
  const fromBlog = list.filter(([, pages]) => [...pages].some(p => p.startsWith('blog')));
  console.log(`  ${host}: ${list.length}`);
  // Bilder aus den Deal-Karten nur zählen, alle anderen Links einzeln auflisten
  fromBlog.forEach(([u, pages]) => console.log(`      ${u}  (${[...pages].filter(p => p.startsWith('blog')).slice(0, 2).join(', ')}${pages.size > 2 ? ', …' : ''})`));
}
process.exit(errors.length ? 1 : 0);
