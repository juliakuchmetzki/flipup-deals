// Blog-Verhalten (ohne Abhängigkeiten). Ohne JavaScript bleibt alles lesbar:
// nur Filter/Suche der Übersicht, Inhaltsverzeichnis-Hervorhebung und "Link kopieren" brauchen JS.
(function () {
  'use strict';

  // ---------- Übersicht: Kategorie-Filter und Suche ----------
  var grid = document.getElementById('post-grid');
  if (grid) {
    var cards = [].slice.call(grid.querySelectorAll('.post-card'));
    var chips = [].slice.call(document.querySelectorAll('#blog-controls [data-cat]'));
    var input = document.getElementById('blog-search');
    var countEl = document.getElementById('blog-count');
    var emptyEl = document.getElementById('blog-empty');
    var state = { cat: '', q: '' };
    var haystack = null;        // slug -> Suchtext aus search-index.json
    var loading = false;
    var timer = null;

    var validCats = chips.map(function (c) { return c.getAttribute('data-cat'); });

    function catFromHash() {
      var m = /kategorie=([a-z0-9-]+)/.exec(window.location.hash);
      return m && validCats.indexOf(m[1]) > -1 ? m[1] : '';
    }

    function loadIndex(done) {
      if (haystack || loading) { done(); return; }
      loading = true;
      fetch('/blog/search-index.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (list) {
          haystack = {};
          list.forEach(function (p) {
            haystack[p.slug] = [p.title, p.description, p.category].concat(p.tags || []).join(' ').toLowerCase();
          });
        })
        .catch(function () { haystack = null; })
        .then(function () { loading = false; done(); });
    }

    function apply() {
      var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      var shown = 0;
      cards.forEach(function (card) {
        var text = (haystack && haystack[card.getAttribute('data-slug')]) || card.getAttribute('data-search') || '';
        var okCat = !state.cat || card.getAttribute('data-category') === state.cat;
        var okQ = terms.every(function (t) { return text.indexOf(t) > -1; });
        card.hidden = !(okCat && okQ);
        if (!card.hidden) shown++;
      });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === state.cat)); });
      countEl.textContent = shown + ' Artikel';
      emptyEl.hidden = shown > 0;
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.cat = chip.getAttribute('data-cat');
        if (window.history && history.replaceState) {
          history.replaceState(null, '', state.cat ? '#kategorie=' + state.cat : window.location.pathname + window.location.search);
        }
        apply();
      });
    });

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = input.value;
        loadIndex(apply);
      }, 200);
    });

    window.addEventListener('hashchange', function () { state.cat = catFromHash(); apply(); });

    state.cat = catFromHash();
    if (state.cat) apply();
  }
  // ---------- Artikel: Link kopieren ----------
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  [].slice.call(document.querySelectorAll('[data-copy-link]')).forEach(function (btn) {
    var label = btn.querySelector('[data-copy-label]');
    var status = btn.closest('.share').querySelector('.share-status');
    var original = label.textContent;
    var timer = null;

    function feedback(ok) {
      var msg = ok ? 'Link kopiert' : 'Kopieren nicht möglich';
      label.textContent = msg;
      if (status) status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(function () { label.textContent = original; if (status) status.textContent = ''; }, 2000);
    }

    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-copy-link');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { feedback(true); }, function () { feedback(fallbackCopy(url)); });
      } else {
        feedback(fallbackCopy(url));
      }
    });
  });

  // ---------- Artikel: Inhaltsverzeichnis hervorheben ----------
  var headings = [].slice.call(document.querySelectorAll('.post h2[id]'));
  var tocLinks = [].slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  if (headings.length && tocLinks.length && 'IntersectionObserver' in window) {
    var visible = {};
    var setActive = function (id) {
      tocLinks.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var first = headings.filter(function (h) { return visible[h.id]; })[0];
      if (first) setActive(first.id);
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    headings.forEach(function (h) { io.observe(h); });
  }
})();
