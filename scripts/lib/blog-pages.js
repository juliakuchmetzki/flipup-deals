'use strict';
// HTML-Seiten des Blogs (Übersicht und Artikel). Header/Footer werden aus index.html übernommen,
// damit sie auf allen Seiten identisch bleiben.

const fs = require('fs');
const path = require('path');
const { SITE, AUTHOR, esc, formatDate } = require('./blog-content');

const CATEGORY_ORDER = ['Spartipps', 'Kaufberatung', 'Verbraucherwissen', 'FlipUp'];

// ---------- gemeinsame Bausteine ----------

function readChrome(root) {
  const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const header = src.match(/<header class="site-header"[\s\S]*?<\/header>/);
  const footer = src.match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
  if (!header || !footer) throw new Error('Blog: Header/Footer in index.html nicht gefunden');
  return { header: header[0], footer: footer[0] };
}

// aria-current auf den Menüpunkt zum aktuellen Bereich setzen
function headerFor(chrome, href) {
  let h = chrome.header.replace(/ aria-current="page"/g, '');
  if (href) h = h.replace(new RegExp(`(<a href="${href.replace(/[/]/g, '\\/')}")`), '$1 aria-current="page"');
  return h;
}

function pageHead({ title, description, urlPath, ogType = 'website', extraMeta = '', jsonLd = [] }) {
  const url = SITE + urlPath;
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${url}" />
  <meta name="theme-color" content="#fbf7f5" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon/favicon-16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/favicon-180.png" />
  <link rel="alternate" type="application/rss+xml" title="FlipUp Deals Blog" href="/blog/feed.xml" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="FlipUp Deals" />
  <meta property="og:locale" content="de_DE" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
${extraMeta}  <!-- TODO: eigenes Vorschaubild 1200x630 als og:image (bis dahin das Logo) -->
  <meta property="og:image" content="${SITE}/assets/favicon/favicon-512.png" />
  <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/assets/style.css" />
  <link rel="stylesheet" href="/assets/blog.css" />
  <script>document.documentElement.classList.add('js');</script>
${jsonLd.map(j => `  <script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>\n`).join('')}</head>`;
}

function pageShell({ head, header, footer, main }) {
  return `<!DOCTYPE html>
<html lang="de">
${head}
<body>

<a class="skip-link" href="#main">Zum Inhalt springen</a>

${header}

${main}

${footer}

<script src="/assets/site.js" defer></script>
<script src="/assets/blog.js" defer></script>
</body>
</html>
`;
}

const monogram = () => '<span class="monogram" aria-hidden="true">JK</span>';

// Cover-Komponente: reines CSS im Markenstil, auf Karten, Aufmacher und Artikel identisch (nur die Größe ändert sich)
function coverHtml(p) {
  return `<div class="cover cover--${esc(p.categorySlug)}" aria-hidden="true">
<span class="badge badge--cat cover-badge">${esc(p.category)}</span>
<span class="cover-title">${esc(p.coverTitle)}</span>${p.coverSub ? `\n<span class="cover-sub">${esc(p.coverSub)}</span>` : ''}
</div>`;
}

const metaLine = p => `<p class="post-meta">${monogram()}<span>${esc(AUTHOR)}</span><span class="sep" aria-hidden="true">·</span><time datetime="${p.date}">${formatDate(p.date)}</time><span class="sep" aria-hidden="true">·</span><span>${p.minutes} Min.</span></p>`;

function postCard(p, variant = '') {
  const cls = `post-card${variant ? ` post-card--${variant}` : ''}`;
  const search = [p.title, p.description, p.category, ...p.tags].join(' ').toLowerCase();
  return `<article class="${cls}" data-slug="${esc(p.slug)}" data-category="${esc(p.categorySlug)}" data-search="${esc(search)}">
<a class="post-card-link" href="/blog/${esc(p.slug)}.html">
${coverHtml(p)}
<div class="post-card-body">
<h3 class="post-card-title">${esc(p.title)}</h3>
<p class="post-card-desc">${esc(p.description)}</p>
${metaLine(p)}
</div>
</a>
</article>`;
}

function categoriesOf(posts) {
  const seen = [...new Map(posts.map(p => [p.categorySlug, p.category])).entries()].map(([slug, name]) => ({ slug, name }));
  const rank = n => { const i = CATEGORY_ORDER.indexOf(n); return i < 0 ? 99 : i; };
  return seen.sort((a, b) => rank(a.name) - rank(b.name));
}

// ---------- Übersichtsseite ----------

const ICON_SEARCH = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

function overviewPage(posts, chrome, lead) {
  const cats = categoriesOf(posts);
  const description = 'Ratgeber, Spartipps und Hintergrundwissen rund um Elektronik-Deals und Online-Shopping.';
  const head = pageHead({
    title: 'Blog – FlipUp Deals',
    description,
    urlPath: '/blog/',
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'FlipUp Deals Blog',
      description,
      url: `${SITE}/blog/`,
      publisher: { '@type': 'Organization', name: 'FlipUp Deals', url: `${SITE}/` },
      blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}.html`, datePublished: p.date })),
    }],
  });
  const main = `<main id="main" class="blog">

  <section class="blog-hero">
    <div class="container">
      <h1>Unser <span class="blog-hero-accent">Blog</span></h1>
      <p class="blog-hero-sub">${esc(description)}</p>
    </div>
  </section>

  <section class="container blog-lead" aria-label="Aktuelle Artikel">
    <div class="lead-grid">
${postCard(lead.lead, 'featured')}
      <div class="lead-side">
${lead.side.map(p => postCard(p, 'compact')).join('\n')}
      </div>
    </div>
  </section>

  <section class="container blog-list" aria-labelledby="alle-artikel">
    <h2 class="visually-hidden" id="alle-artikel">Alle Artikel</h2>
    <div class="blog-controls" id="blog-controls">
      <div class="filters" role="group" aria-label="Nach Kategorie filtern">
        <button class="chip" type="button" data-cat="" aria-pressed="true">Alle</button>${cats.map(c => `
        <button class="chip" type="button" data-cat="${esc(c.slug)}" aria-pressed="false">${esc(c.name)}</button>`).join('')}
      </div>
      <div class="search">
        ${ICON_SEARCH}
        <input type="search" id="blog-search" placeholder="Artikel suchen" aria-label="Artikel durchsuchen" autocomplete="off" />
      </div>
    </div>
    <p class="blog-count" id="blog-count" aria-live="polite">${posts.length} Artikel</p>
    <div class="post-grid" id="post-grid">
${posts.map(p => postCard(p)).join('\n')}
    </div>
    <p class="empty-state blog-empty" id="blog-empty" hidden><strong>Keine Artikel gefunden</strong>Passe Suche oder Kategorie an.</p>
  </section>

</main>`;
  return pageShell({ head, header: headerFor(chrome, '/blog/'), footer: chrome.footer, main });
}

module.exports = { readChrome, headerFor, pageHead, pageShell, coverHtml, metaLine, monogram, postCard, categoriesOf, overviewPage, CATEGORY_ORDER };
