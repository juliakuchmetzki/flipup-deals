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
const { buildBlog } = require('./scripts/lib/blog-build');

const API_URL = process.env.DEALS_API_URL || 'https://api.flipup-deals.de/api/deals.json';
const TIMEOUT_MS = 10000;
const MAX_CARDS = 60;

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const STATIC_FILE = /\.(html|css|js|png|jpe?g|svg|webp|ico|xml|txt|woff2?)$/i;
const STATIC_EXCLUDE = ['build.js'];
const STATIC_DIRS = ['assets', 'fonts'];

// ---- SYNC-START: Dieser Block steht identisch in build.js und index.html (Markup synchron halten) ----
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = v => { try { const u = new URL(v); return (u.protocol === 'https:' || u.protocol === 'http:') ? String(v) : ''; } catch { return ''; } };

// Nur Shop-Deals mit gültiger Ziel-URL und Preis anzeigen
const isValidDeal = d => !!(d && d.shop && safeUrl(d.url) && typeof d.price === 'number' && isFinite(d.price));
const byNewest = (a, b) => (Date.parse(b.foundAt) - Date.parse(a.foundAt)) || 0;

const eur = new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'});

// Rabatt nur, wenn der alte Preis höher ist (und auf mind. 1 % gerundet)
const discountPct = d => (typeof d.oldPrice === 'number' && d.oldPrice > d.price) ? Math.round((1 - d.price / d.oldPrice) * 100) : 0;

const countText = n => n ? `${n} Deal${n !== 1 ? 's' : ''}` : '';

// Nur Kategorien mit mindestens einem Deal anzeigen ("Alle" steht fest im HTML)
const CATEGORIES = [['elektronik', 'Elektronik'], ['haushalt', 'Haushalt'], ['sport', 'Sport'], ['mode', 'Mode'], ['sonstiges', 'Sonstiges']];
const labelOf = k => (CATEGORIES.find(([key]) => key === k) || [k, String(k).charAt(0).toUpperCase() + String(k).slice(1)])[1];

const navHtml = (deals, current = 'all') => CATEGORIES
  .filter(([key]) => deals.some(d => d.kategorie === key))
  .map(([key, label]) => `<button class="chip" type="button" data-kat="${key}" aria-pressed="${key === current}">${label}</button>`)
  .join('');

const shopsHtml = shops => shops.length
  ? `Aktuell von: ${shops.map(escapeHtml).join(' · ')}`
  : '';

// Bild leer oder Platzhalter-Bild des Anbieters (noimage): Platzhalter-Kachel statt Fremdbild
const mediaHtml = d => {
  const image = safeUrl(d.image);
  return (!image || /noimage/i.test(image))
    ? `<div class="card-media card-media-empty" role="img" aria-label="Kein Bild verfügbar"></div>`
    : `<div class="card-media"><img src="${escapeHtml(image)}" alt="" width="400" height="300" loading="lazy" onerror="this.parentNode.classList.add('card-media-empty');this.remove()" /></div>`;
};

const dateText = ts => new Date(ts).toLocaleString('de-DE', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin'});

const cardHtml = d => {
  const pct = discountPct(d);
  const ts = Date.parse(d.foundAt);
  const meta = [d.shop, d.kategorie && labelOf(d.kategorie)].filter(Boolean).map(escapeHtml).join(' · ');
  return `
        <article class="card">
          ${mediaHtml(d)}
          <div class="card-body">
            <p class="card-meta">${meta}</p>
            <h3 class="card-title" title="${escapeHtml(d.title)}">${escapeHtml(d.title)}</h3>
            <div class="card-price-row">
              <span class="card-price">${escapeHtml(eur.format(d.price))}</span>
              ${pct >= 1 ? `<span class="card-old">${escapeHtml(eur.format(d.oldPrice))}</span><span class="badge">−${pct}&nbsp;%</span>` : ''}
            </div>
            ${isNaN(ts) ? '' : `<time class="card-found" datetime="${escapeHtml(d.foundAt)}">Gefunden am ${escapeHtml(dateText(ts))}</time>`}
            <a class="btn btn-block" href="${escapeHtml(safeUrl(d.url))}" target="_blank" rel="nofollow sponsored noopener">Zum Angebot</a>
          </div>
        </article>
      `;
};

const emptyHtml = hasDeals => hasDeals
  ? `<div class="empty-state"><strong>Keine Treffer</strong>Passe Suche oder Filter an.</div>`
  : `<div class="empty-state"><strong>Gerade sind keine Deals online</strong>Schau bald wieder vorbei.</div>`;
// ---- SYNC-ENDE ----

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
    if (entry.isFile() && STATIC_FILE.test(entry.name) && !STATIC_EXCLUDE.includes(entry.name)) {
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

// lastmod in dist/sitemap.xml auf das heutige Datum (Europe/Berlin) setzen
function updateSitemap() {
  const file = path.join(DIST, 'sitemap.xml');
  if (!fs.existsSync(file)) return;
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }); // YYYY-MM-DD
  const xml = fs.readFileSync(file, 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
  fs.writeFileSync(file, xml);
}

async function main() {
  copyStatic();
  updateSitemap();
  await buildBlog({ root: ROOT, dist: DIST });   // Blog hängt nicht von der API ab

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
  html = fillMarker(html, '<!--DEALS_NAV-->', navHtml(deals));
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
