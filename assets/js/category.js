(function () {
  var data = window.TOOLSHED;
  var view = document.querySelector('[data-category-view]');
  if (!data || !view) return;

  var titleEl = view.querySelector('[data-cv-title]');
  var countEl = view.querySelector('[data-cv-count]');
  var blurbEl = view.querySelector('[data-cv-blurb]');
  var search = view.querySelector('[data-cv-search]');
  var chipsEl = view.querySelector('[data-cv-chips]');
  var statusEl = view.querySelector('[data-cv-status]');
  var grid = view.querySelector('[data-cv-grid]');

  var current = [];
  var activeTag = '';

  function plural(n) {
    return n + (n === 1 ? ' tool' : ' tools');
  }

  function monogram(name) {
    return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2);
  }

  function card(tool) {
    var li = document.createElement('li');
    li.className = 'tool-card';

    var mono = document.createElement('span');
    mono.className = 'monogram';
    mono.setAttribute('aria-hidden', 'true');
    mono.textContent = monogram(tool.name);

    var body = document.createElement('div');
    body.className = 'tool-body';

    var h = document.createElement('h3');
    h.className = 'tool-name';
    if (tool.href) {
      var a = document.createElement('a');
      a.href = tool.href;
      a.textContent = tool.name;
      h.appendChild(a);
    } else {
      h.textContent = tool.name;
    }

    var p = document.createElement('p');
    p.className = 'tool-desc';
    p.textContent = tool.desc;

    var meta = document.createElement('p');
    meta.className = 'label tool-meta';
    meta.textContent = tool.href ? tool.tags.join(' · ') : 'Soon · ' + tool.tags.join(' · ');

    body.appendChild(h);
    body.appendChild(p);
    body.appendChild(meta);
    li.appendChild(mono);
    li.appendChild(body);
    return li;
  }

  function renderChips() {
    chipsEl.textContent = '';
    var seen = {};
    var tags = [];
    current.forEach(function (t) {
      t.tags.forEach(function (tag) {
        seen[tag] = (seen[tag] || 0) + 1;
      });
    });
    Object.keys(seen).forEach(function (tag) {
      if (seen[tag] > 1) tags.push(tag);
    });
    tags.sort();
    if (!tags.length) return;
    ['All'].concat(tags).forEach(function (tag) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = tag;
      var value = tag === 'All' ? '' : tag;
      b.setAttribute('aria-pressed', value === activeTag ? 'true' : 'false');
      b.addEventListener('click', function () {
        activeTag = value;
        Array.prototype.forEach.call(chipsEl.children, function (c) {
          c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
        });
        renderList();
      });
      chipsEl.appendChild(b);
    });
  }

  function renderList() {
    var q = search.value.trim().toLowerCase();
    var shown = current.filter(function (t) {
      if (activeTag && t.tags.indexOf(activeTag) === -1) return false;
      if (!q) return true;
      return (t.name + ' ' + t.desc + ' ' + t.tags.join(' ')).toLowerCase().indexOf(q) !== -1;
    });
    grid.textContent = '';
    shown.forEach(function (t) {
      grid.appendChild(card(t));
    });
    statusEl.textContent = shown.length ? plural(shown.length) : 'No tools match';
  }

  window.Toolshed = {
    renderCategory: function (id, hue) {
      var cat = data.categories.filter(function (c) { return c.id === id; })[0];
      if (!cat) return;
      current = data.tools.filter(function (t) { return t.category === id; });
      activeTag = '';
      search.value = '';
      view.style.setProperty('--hue', hue);
      titleEl.textContent = cat.name;
      countEl.textContent = plural(current.length);
      blurbEl.textContent = cat.blurb;
      renderChips();
      renderList();
      view.scrollTop = 0;
    }
  };

  search.addEventListener('input', renderList);
})();
