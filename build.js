// Build-Zeit-Rendering für flipup-deals.de
//
// Holt die aktuellen Deals von der API, schreibt Zähler, Shop-Leiste und die
// neuesten Deal-Karten ins HTML von index.html und legt alle statischen
// Dateien in dist/ ab (Vercel: buildCommand "npm run build", outputDirectory "dist").
//
// Ist die API nicht erreichbar oder liefert sie keine Deals, wird nur eine
// Warnung ausgegeben: Die Platzhalter bleiben unverändert und der Build
// schlägt NICHT fehl (die Seite lädt die Deals dann wie bisher per JavaScript).

const fs = require('fs');
const path = require('path');

const API_URL = process.env.DEALS_API_URL || 'https://api.flipup-deals.de/api/deals.json';
const TIMEOUT_MS = 10000;
const MAX_CARDS = 60;

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const STATIC_FILE = /\.(html|png|jpe?g|svg|webp|ico|xml|txt|woff2?)$/i;
const STATIC_DIRS = ['fonts'];

const PLACEHOLDER = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect width=%22200%22 height=%22200%22 fill=%22%23f5f5f5%22/></svg>';

// Markup synchron halten: Die Funktionen escapeHtml, safeUrl, isValidDeal, byNewest,
// eur, countText, shopsHtml und cardHtml existieren identisch im <script> von index.html.
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = v => { try { const u = new URL(v); return (u.protocol === 'https:' || u.protocol === 'http:') ? String(v) : ''; } catch { return ''; } };

// Nur Shop-Deals mit gültiger Ziel-URL und Preis anzeigen
const isValidDeal = d => !!(d && d.shop && safeUrl(d.url) && typeof d.price === 'number' && isFinite(d.price));
const byNewest = (a, b) => (Date.parse(b.foundAt) - Date.parse(a.foundAt)) || 0;

const eur = new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'});

const countText = n => `${n} Deal${n !== 1 ? 's' : ''}`;

const shopsHtml = shops => shops.length
  ? `<span>Deals von:</span>` + shops.map(s => `<span>🛒 ${escapeHtml(s)}</span>`).join('')
  : '';

const cardHtml = d => {
  const pct = d.oldPrice ? Math.round((1 - d.price/d.oldPrice) * 100) : null;
  const ts = Date.parse(d.foundAt);
  // Im Browser gilt die lokale Zeitzone der Besucher:innen, beim Build Europe/Berlin.
  const date = isNaN(ts) ? '–' : new Date(ts).toLocaleString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
  const image = safeUrl(d.image);
  return `
        <div class="card">
          <img class="card-img" src="${image ? escapeHtml(image) : PLACEHOLDER}" alt="${escapeHtml(d.title)}" loading="lazy"
            onerror="this.src='${PLACEHOLDER}'" />
          <div class="card-body">
            <div class="card-market">🛒 ${escapeHtml(d.shop)}${d.kategorie ? ` · ${escapeHtml(d.kategorie.charAt(0).toUpperCase() + d.kategorie.slice(1))}` : ''}</div>
            <div class="card-title">${escapeHtml(d.title)}</div>
            <div class="card-price-row">
              <div>
                <div class="card-price">${escapeHtml(eur.format(d.price))}</div>
                ${d.oldPrice ? `<div class="card-old">${escapeHtml(eur.format(d.oldPrice))}</div>` : ''}
              </div>
              ${pct ? `<div class="card-discount">-${pct}%</div>` : ''}
            </div>
            <div class="card-found">· Gefunden am: ${escapeHtml(date)}</div>
            <a class="card-btn" href="${escapeHtml(safeUrl(d.url))}" target="_blank" rel="nofollow sponsored">
              Zum Angebot 🛒
            </a>
          </div>
        </div>
      `;
};

async function fetchDeals() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API_URL, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Antwort ist keine Liste');
    return data.filter(isValidDeal).sort(byNewest);
  } finally {
    clearTimeout(timer);
  }
}

function copyStatic() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && STATIC_FILE.test(entry.name)) {
      fs.copyFileSync(path.join(ROOT, entry.name), path.join(DIST, entry.name));
    } else if (entry.isDirectory() && STATIC_DIRS.includes(entry.name)) {
      fs.cpSync(path.join(ROOT, entry.name), path.join(DIST, entry.name), { recursive: true });
    }
  }
}

function fillMarker(html, marker, value) {
  if (!html.includes(marker)) {
    console.warn(`[build] WARNUNG: Marker ${marker} in index.html nicht gefunden.`);
    return html;
  }
  return html.split(marker).join(value);
}

async function main() {
  copyStatic();

  let deals = [];
  try {
    deals = await fetchDeals();
    if (!deals.length) console.warn('[build] WARNUNG: API lieferte keine gültigen Deals – Platzhalter bleiben unverändert.');
  } catch (err) {
    console.warn(`[build] WARNUNG: Deals konnten nicht geladen werden (${err.message || err}) – Platzhalter bleiben unverändert.`);
  }
  if (!deals.length) return;

  const file = path.join(DIST, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const shops = [...new Set(deals.map(d => d.shop))];
  html = fillMarker(html, '<!--DEALS_COUNT-->', countText(deals.length));
  html = fillMarker(html, '<!--DEALS_SHOPS-->', shopsHtml(shops));
  html = fillMarker(html, '<!--DEALS_GRID-->', deals.slice(0, MAX_CARDS).map(cardHtml).join(''));
  fs.writeFileSync(file, html);
  console.log(`[build] ${deals.length} Deals geladen, ${Math.min(deals.length, MAX_CARDS)} Karten in dist/index.html vorgerendert.`);
}

// Fehler beim Kopieren/Schreiben der Dateien sind echte Build-Fehler (nur die API ist optional)
main().catch(err => {
  console.error(`[build] FEHLER: ${err.stack || err}`);
  process.exit(1);
});
