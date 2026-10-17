'use strict';
// Kleiner Front-Matter-Parser für content/blog/*.md (keine YAML-Bibliothek).
// Format: Zeilen "key: value" zwischen zwei "---"-Zeilen; Listen kommasepariert.

function parseFrontMatter(src, file = '') {
  const text = String(src).replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/);
  if (!m) throw new Error(`${file}: Front-Matter (zwischen zwei "---"-Zeilen am Dateianfang) fehlt`);
  const data = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 1) throw new Error(`${file}: ungültige Front-Matter-Zeile "${line}" (erwartet "key: value")`);
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (/^(".*"|'.*')$/.test(val)) val = val.slice(1, -1);
    data[key] = val;
  }
  return { data, body: m[2] || '' };
}

const toBool = v => /^(true|ja|yes|1)$/i.test(String(v ?? '').trim());
const toList = v => String(v ?? '').split(',').map(s => s.trim()).filter(Boolean);

module.exports = { parseFrontMatter, toBool, toList };
