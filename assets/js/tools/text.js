(function () {
  var T = window.ToolshedTools;

  T.register('word-counter', function (root, k) {
    var src = k.area('Your text', { rows: 10, placeholder: 'Type or paste here' });
    var stats = k.stats(['Words', 'Characters', 'No spaces', 'Sentences', 'Paragraphs', 'Reading time', 'Speaking time']);
    function mins(words, wpm) {
      var m = words / wpm;
      return m < 1 ? Math.max(words ? 1 : 0, Math.round(m * 60)) + ' sec' : Math.round(m * 10) / 10 + ' min';
    }
    k.watch([src.input], function () {
      var t = src.input.value;
      var words = (t.trim().match(/\S+/g) || []).length;
      stats.set({
        Words: k.fmt(words, 0),
        Characters: k.fmt(t.length, 0),
        'No spaces': k.fmt(t.replace(/\s/g, '').length, 0),
        Sentences: k.fmt((t.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).filter(function (s) { return s.trim(); }).length, 0),
        Paragraphs: k.fmt(t.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length, 0),
        'Reading time': mins(words, 225),
        'Speaking time': mins(words, 150)
      });
    });
    root.appendChild(k.group('', src.el, stats.el));
  });

  T.register('case-converter', function (root, k) {
    var src = k.area('Your text', { rows: 6, placeholder: 'Type or paste here' });
    var out = k.out('Result', { rows: 6 });
    function words(s) {
      return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
    }
    var modes = [
      ['UPPER CASE', function (s) { return s.toUpperCase(); }],
      ['lower case', function (s) { return s.toLowerCase(); }],
      ['Title Case', function (s) { return s.toLowerCase().replace(/(^|[\s\-_(])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }],
      ['Sentence case', function (s) { return s.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }],
      ['camelCase', function (s) { return words(s).map(function (w, i) { w = w.toLowerCase(); return i ? w[0].toUpperCase() + w.slice(1) : w; }).join(''); }],
      ['PascalCase', function (s) { return words(s).map(function (w) { w = w.toLowerCase(); return w[0].toUpperCase() + w.slice(1); }).join(''); }],
      ['snake_case', function (s) { return words(s).join('_').toLowerCase(); }],
      ['kebab-case', function (s) { return words(s).join('-').toLowerCase(); }],
      ['CONSTANT_CASE', function (s) { return words(s).join('_').toUpperCase(); }]
    ];
    var row = k.h('div', { class: 'btn-row' }, modes.map(function (m) {
      return k.btn(m[0], function () { out.set(m[1](src.input.value)); }, true);
    }));
    root.appendChild(k.group('', src.el, row, out.el));
  });

  T.register('diff-checker', function (root, k) {
    var a = k.area('Original', { rows: 8, placeholder: 'Paste the first version' });
    var b = k.area('Changed', { rows: 8, placeholder: 'Paste the second version' });
    var ic = k.check('Ignore case');
    var iw = k.check('Ignore leading and trailing spaces');
    var status = k.status();
    var list = k.h('ul', { class: 'diff', 'aria-label': 'Differences' });

    function norm(s) {
      if (iw.input.checked) s = s.trim();
      if (ic.input.checked) s = s.toLowerCase();
      return s;
    }

    function diff() {
      var x = a.input.value.split('\n');
      var y = b.input.value.split('\n');
      list.textContent = '';
      if (x.length * y.length > 4000000) {
        status.textContent = 'Texts are too long to compare here (limit about 2,000 lines each).';
        return;
      }
      var nx = x.map(norm);
      var ny = y.map(norm);
      var n = x.length;
      var m = y.length;
      var t = [];
      for (var i = 0; i <= n; i++) t.push(new Uint32Array(m + 1));
      for (i = n - 1; i >= 0; i--) {
        for (var j = m - 1; j >= 0; j--) {
          t[i][j] = nx[i] === ny[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
        }
      }
      var added = 0;
      var removed = 0;
      i = 0;
      j = 0;
      function line(cls, sign, text) {
        list.appendChild(k.h('li', { class: cls }, sign + ' ' + text));
      }
      while (i < n || j < m) {
        if (i < n && j < m && nx[i] === ny[j]) {
          line('', ' ', x[i]);
          i++; j++;
        } else if (j < m && (i === n || t[i][j + 1] >= t[i + 1][j])) {
          line('add', '+', y[j]); added++; j++;
        } else {
          line('del', '-', x[i]); removed++; i++;
        }
      }
      status.textContent = added || removed
        ? added + ' added, ' + removed + ' removed'
        : (a.input.value || b.input.value ? 'The texts match' : '');
    }

    k.watch([a.input, b.input, ic.input, iw.input], diff);
    root.appendChild(k.group('', k.row(a.el, b.el), k.row(ic.el, iw.el), status, list));
  });

  T.register('lorem-ipsum-generator', function (root, k) {
    var WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' +
      'enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in ' +
      'reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa ' +
      'qui officia deserunt mollit anim id est laborum').split(' ');
    var count = k.num('Paragraphs', { min: 1, max: 50, value: 3 });
    var per = k.num('Sentences per paragraph', { min: 1, max: 20, value: 5 });
    var start = k.check('Start with "Lorem ipsum dolor sit amet"', true);
    var out = k.out('Generated text', { rows: 12 });

    function sentence(first) {
      var n = 6 + k.rand(10);
      var w = [];
      for (var i = 0; i < n; i++) w.push(WORDS[k.rand(WORDS.length)]);
      if (first) w = 'lorem ipsum dolor sit amet'.split(' ').concat(w.slice(0, Math.max(n - 5, 2)));
      var s = w.join(' ');
      return s[0].toUpperCase() + s.slice(1) + '.';
    }

    function gen() {
      var p = Math.min(Math.max(parseInt(count.input.value, 10) || 1, 1), 50);
      var s = Math.min(Math.max(parseInt(per.input.value, 10) || 1, 1), 20);
      var paras = [];
      for (var i = 0; i < p; i++) {
        var ss = [];
        for (var j = 0; j < s; j++) ss.push(sentence(start.input.checked && i === 0 && j === 0));
        paras.push(ss.join(' '));
      }
      out.set(paras.join('\n\n'));
    }

    root.appendChild(k.group('', k.row(count.el, per.el), start.el, k.btn('Generate again', gen), out.el));
    k.watch([count.input, per.input, start.input], gen);
  });

  T.register('duplicate-line-remover', function (root, k) {
    var src = k.area('Your lines', { rows: 10, placeholder: 'One item per line' });
    var ic = k.check('Ignore case');
    var tr = k.check('Trim spaces around lines', true);
    var em = k.check('Remove empty lines', true);
    var so = k.check('Sort A to Z');
    var out = k.out('Result', { rows: 10 });
    var status = k.status();
    k.watch([src.input, ic.input, tr.input, em.input, so.input], function () {
      var lines = src.input.value.split('\n');
      var seen = {};
      var kept = [];
      var dup = 0;
      lines.forEach(function (l) {
        if (tr.input.checked) l = l.trim();
        if (em.input.checked && !l.trim()) return;
        var key = ic.input.checked ? l.toLowerCase() : l;
        if (Object.prototype.hasOwnProperty.call(seen, key)) { dup++; return; }
        seen[key] = true;
        kept.push(l);
      });
      if (so.input.checked) kept.sort(function (a, b) { return a.localeCompare(b); });
      out.set(kept.join('\n'));
      status.textContent = src.input.value ? dup + (dup === 1 ? ' duplicate' : ' duplicates') + ' removed, ' + kept.length + ' lines left' : '';
    });
    root.appendChild(k.group('', src.el, k.row(ic.el, tr.el, em.el, so.el), status, out.el));
  });
})();
