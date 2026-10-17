'use strict';
// Blog-Inhalte: Artikel laden, Markdown rendern, FAQ / Quellen / Inhaltsverzeichnis ableiten.
// Reine Funktionen ohne Netzwerkzugriff; wird von build.js (Blog-Build) und scripts/check-*.js genutzt.

const fs = require('fs');
const path = require('path');
const { parseFrontMatter, toBool, toList } = require('./frontmatter');

const SITE = 'https://flipup-deals.de';
const AUTHOR = 'Johannes Kuchmetzki';
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const decodeEntities = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const htmlToText = h => decodeEntities(
  String(h).replace(/<\/(p|li|h[1-6]|div|tr|tbody|thead)>/g, ' ').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')
).replace(/\s+/g, ' ').trim();

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

const countWords = md => md.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;

let markedPromise;
const loadMarked = () => (markedPromise ||= import('marked').then(m => m.marked));

// ---------- Artikel laden ----------

function loadPosts(dir) {
  const posts = [];
  if (!fs.existsSync(dir)) return posts;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_')).sort();
  for (const file of files) {
    const { data, body } = parseFrontMatter(fs.readFileSync(path.join(dir, file), 'utf8'), file);
    for (const k of ['title', 'slug', 'description', 'category', 'date', 'coverTitle']) {
      if (!data[k]) throw new Error(`${file}: Pflichtfeld "${k}" fehlt`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) throw new Error(`${file}: slug "${data.slug}" ist ungültig (nur a-z, 0-9 und Bindestriche)`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error(`${file}: date muss YYYY-MM-DD sein`);
    if (data.updated && !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) throw new Error(`${file}: updated muss YYYY-MM-DD sein`);
    if (posts.some(p => p.slug === data.slug)) throw new Error(`${file}: slug "${data.slug}" ist doppelt vergeben`);

    const warnings = [];
    if (data.description.length < 150 || data.description.length > 160) warnings.push(`description hat ${data.description.length} Zeichen (soll 150–160)`);
    if (data.coverTitle.length > 40) warnings.push(`coverTitle hat ${data.coverTitle.length} Zeichen (max. 40)`);
    if (data.coverSub && data.coverSub.length > 30) warnings.push(`coverSub hat ${data.coverSub.length} Zeichen (max. 30)`);

    const words = countWords(body);
    posts.push({
      file,
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      categorySlug: slugify(data.category),
      tags: toList(data.tags),
      date: data.date,
      updated: data.updated || '',
      featured: toBool(data.featured),
      legal: toBool(data.legal),
      order: Number(data.order) || 0,
      coverTitle: data.coverTitle,
      coverSub: data.coverSub || '',
      dealKeywords: toList(data.dealKeywords),
      body,
      words,
      minutes: Math.max(1, Math.ceil(words / 200)),
      warnings,
    });
  }
  // neueste zuerst, bei gleichem Datum nach "order" aufsteigend
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.order - b.order));
  return posts;
}

// Aufmacher = erster Artikel mit featured: true, sonst der neueste; dann die nächsten zwei
function pickLead(posts) {
  const lead = posts.find(p => p.featured) || posts[0];
  const rest = posts.filter(p => p !== lead);
  return { lead, side: rest.slice(0, 2) };
}

// ---------- Markdown → HTML ----------

const CALLOUTS = { Tipp: 'tip', Wichtig: 'important', Hinweis: 'note' };

async function renderPost(post) {
  const marked = await loadMarked();
  const tokens = marked.lexer(post.body);
  const usedIds = new Set();
  const uniqueId = base => {
    let id = base || 'abschnitt', n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };
  const inline = md => marked.parseInline(md);
  const headingHtml = (tok, forcedId) => {
    const text = htmlToText(inline(tok.text));
    const id = forcedId || uniqueId(slugify(text));
    if (forcedId) usedIds.add(forcedId);
    const tag = `h${tok.depth}`;
    return { id, text, html: `<${tag} id="${id}">${inline(tok.text)}<a class="anchor" href="#${id}" aria-label="Link zu diesem Abschnitt: ${esc(text)}">#</a></${tag}>` };
  };

  const decorateLinks = html => html.replace(/<a href="(https?:\/\/[^"]+)"(?![^>]*\brel=)/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');

  function renderTokens(list) {
    return list.map(tok => {
      if (tok.type === 'space') return '';
      if (tok.type === 'heading') {
        if (tok.depth < 2) throw new Error(`${post.file}: Überschrift der Ebene 1 im Text (H1 kommt nur aus title)`);
        if (tok.depth > 3) throw new Error(`${post.file}: nur ## und ### erlaubt`);
        return headingHtml(tok).html;
      }
      let html = marked.parser(Object.assign([tok], { links: tokens.links }));
      if (tok.type === 'blockquote') {
        const m = html.match(/^<blockquote>\n<p><strong>(Tipp|Wichtig|Hinweis):<\/strong>\s*/);
        if (m) {
          html = html
            .replace(m[0], `<div class="callout callout--${CALLOUTS[m[1]]}" role="note">\n<p class="callout-title">${m[1]}</p>\n<p>`)
            .replace(/<\/blockquote>\s*$/, '</div>\n');
        }
      }
      if (tok.type === 'table') html = `<div class="table-wrap">${html}</div>`;
      return decorateLinks(html);
    }).join('\n');
  }

  // Abschnitte an ##-Überschriften teilen
  const sections = [];
  let intro = [], cur = null;
  for (const tok of tokens) {
    if (tok.type === 'heading' && tok.depth === 2) {
      cur = { heading: tok, tokens: [] };
      sections.push(cur);
    } else if (cur) cur.tokens.push(tok);
    else intro.push(tok);
  }

  const toc = [];
  const parts = [];       // Haupttext
  let faq = null, sources = null;

  parts.push(renderTokens(intro));

  for (const sec of sections) {
    const text = htmlToText(inline(sec.heading.text));
    const key = slugify(text);
    if (key === 'haeufig-gestellte-fragen') {
      const id = uniqueId(key); toc.push({ text, id });
      const items = [];
      let q = null;
      for (const tok of sec.tokens) {
        if (tok.type === 'heading' && tok.depth === 3) { q = { question: htmlToText(inline(tok.text)), questionHtml: inline(tok.text), tokens: [] }; items.push(q); }
        else if (q) q.tokens.push(tok);
      }
      for (const it of items) { it.answerHtml = renderTokens(it.tokens); it.answerText = htmlToText(it.answerHtml); }
      faq = { id, title: text, items };
      continue;
    }
    if (key === 'quellen') {
      const id = uniqueId(key); toc.push({ text, id });
      sources = { id, title: text, html: renderTokens(sec.tokens) };
      continue;
    }
    const h = headingHtml(sec.heading); toc.push({ text: h.text, id: h.id });
    parts.push(h.html + '\n' + renderTokens(sec.tokens));
  }

  const faqHtml = faq && faq.items.length ? `<section class="faq" aria-labelledby="${faq.id}">
<h2 id="${faq.id}">${esc(faq.title)}<a class="anchor" href="#${faq.id}" aria-label="Link zu diesem Abschnitt: ${esc(faq.title)}">#</a></h2>
<div class="faq-list">
${faq.items.map(it => `<details class="faq-item">
<summary>${esc(it.question)}</summary>
<div class="faq-answer">
${it.answerHtml}
</div>
</details>`).join('\n')}
</div>
</section>` : '';

  const sourcesHtml = sources ? `<section class="sources" aria-labelledby="${sources.id}">
<h2 id="${sources.id}">${esc(sources.title)}<a class="anchor" href="#${sources.id}" aria-label="Link zu diesem Abschnitt: ${esc(sources.title)}">#</a></h2>
<p class="sources-date">Stand: ${formatDate(post.updated || post.date)}</p>
${sources.html}
</section>` : '';

  return { bodyHtml: parts.join('\n'), faq: faq && faq.items.length ? faq : null, faqHtml, sourcesHtml, toc };
}

module.exports = { SITE, AUTHOR, esc, slugify, htmlToText, formatDate, loadPosts, pickLead, renderPost, countWords };
