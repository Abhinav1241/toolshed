(function () {
  var data = window.TOOLSHED;
  var input = document.querySelector('[data-all-search]');
  var list = document.querySelector('[data-all-results]');
  var statusEl = document.querySelector('[data-all-status]');
  if (!data || !input) return;

  var LIMIT = 8;

  function catName(id) {
    return data.categories.filter(function (c) { return c.id === id; })[0].name;
  }

  function row(t) {
    var li = document.createElement('li');
    var label = document.createElement('span');
    label.className = 'label';
    label.textContent = catName(t.category) + (t.href ? '' : ' · soon');

    var el;
    if (t.href) {
      el = document.createElement('a');
      el.href = t.href;
    } else {
      el = document.createElement('button');
      el.type = 'button';
      el.addEventListener('click', function () {
        if (window.Toolshed && window.Toolshed.openCategory) window.Toolshed.openCategory(t.category);
      });
    }
    el.className = 'all-hit';
    var name = document.createElement('span');
    name.className = 'all-name';
    name.textContent = t.name;
    var desc = document.createElement('span');
    desc.className = 'all-desc';
    desc.textContent = t.desc;
    el.appendChild(name);
    el.appendChild(desc);
    el.appendChild(label);
    li.appendChild(el);
    return li;
  }

  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    list.textContent = '';
    if (!q) {
      statusEl.textContent = '';
      return;
    }
    var hits = data.tools.filter(function (t) {
      return (t.name + ' ' + t.desc + ' ' + t.tags.join(' ') + ' ' + catName(t.category)).toLowerCase().indexOf(q) !== -1;
    });
    // Built tools first
    hits.sort(function (a, b) { return (b.href ? 1 : 0) - (a.href ? 1 : 0); });
    hits.slice(0, LIMIT).forEach(function (t) { list.appendChild(row(t)); });
    statusEl.textContent = !hits.length
      ? 'No tools match'
      : hits.length + (hits.length === 1 ? ' tool' : ' tools') + (hits.length > LIMIT ? ' · showing ' + LIMIT : '');
  });
})();
