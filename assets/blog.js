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
})();
