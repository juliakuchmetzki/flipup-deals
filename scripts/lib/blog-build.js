'use strict';
// Blog-Build: liest content/blog/*.md und schreibt dist/blog/* (unabhängig von der Deals-API).

const fs = require('fs');
const path = require('path');
const { loadPosts, pickLead, renderPost } = require('./blog-content');
const { readChrome, overviewPage, articlePage } = require('./blog-pages');
const { searchIndex, feedXml, addToSitemap } = require('./blog-output');

async function buildBlog({ root, dist }) {
  const dir = process.env.BLOG_CONTENT_DIR || path.join(root, 'content', 'blog');
  const posts = loadPosts(dir);
  if (!posts.length) {
    console.warn('[build] Blog: keine Artikel gefunden (content/blog/*.md) – Blog wird übersprungen.');
    return [];
  }
  for (const p of posts) for (const w of p.warnings) console.warn(`[build] WARNUNG ${p.file}: ${w}`);

  const out = path.join(dist, 'blog');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'search-index.json'), JSON.stringify(searchIndex(posts)));
  fs.writeFileSync(path.join(out, 'feed.xml'), feedXml(posts));

  const chrome = readChrome(root);
  fs.writeFileSync(path.join(out, 'index.html'), overviewPage(posts, chrome, pickLead(posts)));

  for (const p of posts) {
    const rendered = await renderPost(p);
    fs.writeFileSync(path.join(out, `${p.slug}.html`), articlePage(p, rendered, posts, chrome));
  }

  const sm = path.join(dist, 'sitemap.xml');
  if (fs.existsSync(sm)) fs.writeFileSync(sm, addToSitemap(fs.readFileSync(sm, 'utf8'), posts));

  console.log(`[build] Blog: ${posts.length} Artikel (index.html, Artikelseiten, search-index.json, feed.xml, Sitemap).`);
  return posts;
}

module.exports = { buildBlog };
