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

// Karten-Zeile: Monogramm · Datum · Lesezeit (der Autorenname steht nur für Screenreader im Text)
const metaLine = p => `<p class="post-meta">${monogram()}<span class="visually-hidden">Von ${esc(AUTHOR)}, </span><time datetime="${p.date}">${formatDate(p.date)}</time><span class="sep" aria-hidden="true">·</span><span>${p.minutes} Min.</span></p>`;

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


// ---------- Artikelseite ----------

const ICON_SHARE = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';
const ICON_LINK = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.4"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.33-1.33"/></svg>';

function shareHtml(p, variant) {
  const url = `${SITE}/blog/${p.slug}.html`;
  const enc = encodeURIComponent;
  const x = `https://twitter.com/intent/tweet?url=${enc(url)}&amp;text=${enc(p.title)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
  return `<div class="share share--${variant}">
<p class="share-title" id="share-title-${variant}">Teilen</p>
<ul class="share-list" aria-labelledby="share-title-${variant}">
<li><a class="share-link" href="${x}" target="_blank" rel="noopener noreferrer">${ICON_SHARE}<span>Auf X teilen</span></a></li>
<li><a class="share-link" href="${li}" target="_blank" rel="noopener noreferrer">${ICON_SHARE}<span>Auf LinkedIn teilen</span></a></li>
<li class="js-only"><button class="share-link" type="button" data-copy-link="${url}">${ICON_LINK}<span data-copy-label>Link kopieren</span></button></li>
</ul>
<p class="share-status visually-hidden" role="status" aria-live="polite"></p>
</div>`;
}

const tocList = toc => `<ol>\n${toc.map(t => `<li><a href="#${esc(t.id)}">${esc(t.text)}</a></li>`).join('\n')}\n</ol>`;

function relatedPosts(post, all) {
  const others = all.filter(p => p.slug !== post.slug);
  return [...others.filter(p => p.categorySlug === post.categorySlug), ...others.filter(p => p.categorySlug !== post.categorySlug)].slice(0, 3);
}

function articlePage(post, r, all, chrome) {
  const url = `${SITE}/blog/${post.slug}.html`;
  const modified = post.updated || post.date;
  const title = `${post.title} – FlipUp Deals Blog`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: modified,
      inLanguage: 'de-DE',
      author: { '@type': 'Person', name: AUTHOR },
      publisher: { '@type': 'Organization', name: 'FlipUp Deals', url: `${SITE}/` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      articleSection: post.category,
      keywords: post.tags.join(', '),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE}/blog/` },
        { '@type': 'ListItem', position: 2, name: post.title, item: url },
      ],
    },
  ];
  if (r.faq) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: r.faq.items.map(it => ({ '@type': 'Question', name: it.question, acceptedAnswer: { '@type': 'Answer', text: it.answerText } })),
    });
  }
  const extraMeta = `  <meta property="article:published_time" content="${post.date}" />
  <meta property="article:modified_time" content="${modified}" />
  <meta property="article:section" content="${esc(post.category)}" />
  <meta property="article:author" content="${esc(AUTHOR)}" />
`;
  const head = pageHead({ title, description: post.description, urlPath: `/blog/${post.slug}.html`, ogType: 'article', extraMeta, jsonLd });
  const related = relatedPosts(post, all);

  const main = `<main id="main" class="post-page">
  <div class="container">

    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="/blog/">Blog</a></li>
        <li aria-current="page">${esc(post.title)}</li>
      </ol>
    </nav>

    <div class="post-layout">

      <article class="post">
        <header class="post-header">
          <p class="post-category"><a class="chip chip--link" href="/blog/#kategorie=${esc(post.categorySlug)}">${esc(post.category)}</a></p>
          <h1 class="post-title">${esc(post.title)}</h1>
          <p class="post-lede">${esc(post.description)}</p>
          <p class="post-meta post-meta--article">${monogram()}<span>${esc(AUTHOR)}</span><span class="sep" aria-hidden="true">·</span><time datetime="${post.date}">${formatDate(post.date)}</time><span class="sep" aria-hidden="true">·</span><span>${post.minutes} Min. Lesezeit</span>${post.updated ? `<span class="sep" aria-hidden="true">·</span><span>Aktualisiert am <time datetime="${post.updated}">${formatDate(post.updated)}</time></span>` : ''}</p>
        </header>

        <div class="post-cover">
${coverHtml(post)}
        </div>

        <details class="toc toc--inline">
          <summary>Inhalt</summary>
${tocList(r.toc)}
        </details>

        <div class="prose post-body">
${r.bodyHtml}
        </div>

${post.legal ? '        <p class="legal-note">Dieser Artikel ersetzt keine Rechtsberatung.</p>\n' : ''}${r.faqHtml ? '        ' + r.faqHtml.split('\n').join('\n        ') + '\n' : ''}${r.sourcesHtml ? '        ' + r.sourcesHtml.split('\n').join('\n        ') + '\n' : ''}
        <footer class="post-footer">
          <ul class="tags" aria-label="Kategorie und Tags">
            <li><a class="chip chip--link" href="/blog/#kategorie=${esc(post.categorySlug)}">${esc(post.category)}</a></li>${post.tags.map(t => `
            <li><span class="chip chip--static">${esc(t)}</span></li>`).join('')}
          </ul>
${shareHtml(post, 'below')}
        </footer>
      </article>

      <aside class="post-aside" aria-label="Teilen und Inhalt">
        <div class="post-aside-inner">
${shareHtml(post, 'aside')}
          <nav class="toc toc--aside" aria-label="Inhaltsverzeichnis">
            <p class="toc-title">Inhalt</p>
${tocList(r.toc)}
          </nav>
        </div>
      </aside>

    </div>

    <aside class="related" aria-labelledby="weitere-artikel">
      <h2 id="weitere-artikel">Weitere Artikel</h2>
      <div class="post-grid post-grid--related">
${related.map(p => postCard(p)).join('\n')}
      </div>
    </aside>

    <aside class="post-cta" aria-labelledby="cta-titel">
      <h2 id="cta-titel">Aktuelle Deals ansehen</h2>
      <p>Auf FlipUp Deals findest du täglich aktualisierte Angebote aus Online-Shops. Die Links dort sind Affiliate-Links (Werbung).</p>
      <p><a class="btn" href="/#deals">Aktuelle Deals ansehen</a></p>
      <p class="post-cta-note"><a href="/about.html">Wie sich FlipUp Deals finanziert</a></p>
    </aside>

  </div>
</main>`;
  return pageShell({ head, header: headerFor(chrome, '/blog/'), footer: chrome.footer, main });
}

module.exports = { articlePage, shareHtml, readChrome, headerFor, pageHead, pageShell, coverHtml, metaLine, monogram, postCard, categoriesOf, overviewPage, CATEGORY_ORDER };
