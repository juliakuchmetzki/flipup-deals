'use strict';
// Maschinenlesbare Blog-Ausgaben: Suchindex, RSS-Feed, Sitemap-Einträge.

const { SITE, AUTHOR, esc } = require('./blog-content');

const postUrl = p => `${SITE}/blog/${p.slug}.html`;

function searchIndex(posts) {
  return posts.map(p => ({
    title: p.title,
    description: p.description,
    category: p.category,
    categorySlug: p.categorySlug,
    tags: p.tags,
    slug: p.slug,
    date: p.date,
  }));
}

function feedXml(posts) {
  const rfc = iso => new Date(`${iso}T08:00:00Z`).toUTCString();
  const newest = posts.reduce((m, p) => ((p.updated || p.date) > m ? (p.updated || p.date) : m), '1970-01-01');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>FlipUp Deals Blog</title>
    <link>${SITE}/blog/</link>
    <description>Ratgeber, Spartipps und Hintergrundwissen rund um Elektronik-Deals und Online-Shopping.</description>
    <language>de-DE</language>
    <lastBuildDate>${rfc(newest)}</lastBuildDate>
    <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml" />
${posts.map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${postUrl(p)}</link>
      <guid isPermaLink="true">${postUrl(p)}</guid>
      <pubDate>${rfc(p.date)}</pubDate>
      <category>${esc(p.category)}</category>
      <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">${esc(AUTHOR)}</dc:creator>
      <description>${esc(p.description)}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`;
}

// Fügt /blog/ und alle Artikel in eine bestehende sitemap.xml ein (lastmod = updated oder date)
function addToSitemap(xml, posts) {
  const newest = posts.reduce((m, p) => ((p.updated || p.date) > m ? (p.updated || p.date) : m), '1970-01-01');
  const entry = (loc, lastmod, freq, prio) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>\n`;
  const add = entry(`${SITE}/blog/`, newest, 'weekly', '0.7') + posts.map(p => entry(postUrl(p), p.updated || p.date, 'monthly', '0.6')).join('');
  return xml.replace(/<\/urlset>\s*$/, add + '</urlset>\n');
}

module.exports = { postUrl, searchIndex, feedXml, addToSitemap };
