(function () {
  var T = window.ToolshedTools;

  /* ---------- CSV helpers ---------- */
  function detectDelimiter(text) {
    var first = text.split('\n')[0] || '';
    var best = ',';
    var bestN = -1;
    [',', ';', '\t', '|'].forEach(function (d) {
      var n = first.split(d).length - 1;
      if (n > bestN) { bestN = n; best = d; }
    });
    return best;
  }

  function parseCSV(text, delim) {
    var rows = [];
    var row = [];
    var field = '';
    var inQ = false;
    text = text.replace(/\r\n?/g, '\n');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
        } else field += c;
      } else if (c === '"' && field === '') {
        inQ = true;
      } else if (c === delim) {
        row.push(field); field = '';
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (inQ) throw new Error('A quoted value is never closed.');
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return !(r.length === 1 && r[0] === ''); });
  }

  function toCSV(rows, delim) {
    return rows.map(function (r) {
      return r.map(function (v) {
        v = v === null || v === undefined ? '' : String(v);
        return v.indexOf(delim) !== -1 || /["\n\r]/.test(v) || /^\s|\s$/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(delim);
    }).join('\n');
  }

  function coerce(v) {
    if (v === '') return v;
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    if (/^null$/i.test(v)) return null;
    if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(v) && isFinite(+v)) return +v;
    return v;
  }

  var DELIMS = [['auto', 'Detect automatically'], [',', 'Comma ,'], [';', 'Semicolon ;'], ['\t', 'Tab'], ['|', 'Pipe |']];

  /* ---------- CSV to JSON ---------- */
  T.register('csv-to-json', function (root, k) {
    var src = k.area('CSV', { rows: 9, value: 'name,age,city\nAda,36,London\n"Hopper, Grace",85,New York' });
    var delim = k.select('Separator', DELIMS, 'auto');
    var head = k.check('First row is the header', true);
    var types = k.check('Turn numbers and true/false into real values', true);
    var out = k.out('JSON', { rows: 10 });
    var status = k.status();
    k.watch([src.input, delim.input, head.input, types.input], function () {
      status.classList.remove('is-error');
      var text = src.input.value;
      if (!text.trim()) { out.set(''); status.textContent = ''; return; }
      try {
        var d = delim.input.value === 'auto' ? detectDelimiter(text) : delim.input.value;
        var rows = parseCSV(text, d);
        var conv = function (v) { return types.input.checked ? coerce(v) : v; };
        var result;
        if (head.input.checked) {
          var keys = rows[0].map(function (h, i) { return h.trim() || 'column' + (i + 1); });
          result = rows.slice(1).map(function (r) {
            var o = {};
            keys.forEach(function (key, i) { o[key] = i < r.length ? conv(r[i]) : ''; });
            return o;
          });
        } else {
          result = rows.map(function (r) { return r.map(conv); });
        }
        out.set(JSON.stringify(result, null, 2));
        status.textContent = result.length + (result.length === 1 ? ' record' : ' records');
      } catch (e) {
        out.set('');
        status.classList.add('is-error');
        status.textContent = e.message;
      }
    });
    root.appendChild(k.group('', src.el, k.row(delim.el, head.el, types.el), status, out.el));
  });

  /* ---------- JSON to CSV ---------- */
  T.register('json-to-csv', function (root, k) {
    var src = k.area('JSON (an array of objects or arrays)', { rows: 9, value: '[{"name":"Ada","age":36},{"name":"Grace","age":85,"city":"New York"}]' });
    var delim = k.select('Separator', DELIMS.slice(1), ',');
    var out = k.out('CSV', { rows: 10 });
    var status = k.status();
    k.watch([src.input, delim.input], function () {
      status.classList.remove('is-error');
      var text = src.input.value;
      if (!text.trim()) { out.set(''); status.textContent = ''; return; }
      try {
        var data = JSON.parse(text);
        if (!Array.isArray(data)) data = [data];
        var cell = function (v) { return v !== null && typeof v === 'object' ? JSON.stringify(v) : v; };
        var rows;
        if (data.length && data.every(function (x) { return Array.isArray(x); })) {
          rows = data.map(function (r) { return r.map(cell); });
        } else {
          var keys = [];
          data.forEach(function (o) {
            if (o === null || typeof o !== 'object') throw new Error('Each item should be an object or an array.');
            Object.keys(o).forEach(function (key) { if (keys.indexOf(key) === -1) keys.push(key); });
          });
          rows = [keys].concat(data.map(function (o) { return keys.map(function (key) { return cell(o[key]); }); }));
        }
        out.set(toCSV(rows, delim.input.value));
        status.textContent = (rows.length - (data.length && !data.every(Array.isArray) ? 1 : 0)) + ' rows';
      } catch (e) {
        out.set('');
        status.classList.add('is-error');
        status.textContent = e instanceof SyntaxError ? 'That is not valid JSON: ' + e.message : e.message;
      }
    });
    root.appendChild(k.group('', src.el, delim.el, status, out.el));
  });

  /* ---------- YAML <-> JSON (common subset) ---------- */
  function yamlParse(text) {
    var raw = text.replace(/\r\n?/g, '\n').split('\n');
    var lines = [];
    raw.forEach(function (l, i) {
      if (/^\s*(#.*)?$/.test(l) || /^---\s*$/.test(l) || /^\.\.\.\s*$/.test(l)) return;
      if (/^\t/.test(l)) throw new Error('Line ' + (i + 1) + ': use spaces, not tabs, to indent.');
      lines.push({ n: i + 1, indent: l.match(/^ */)[0].length, text: l.replace(/^ +/, ''), raw: l });
    });
    var pos = 0;

    function stripComment(s) {
      var q = null;
      for (var i = 0; i < s.length; i++) {
        var c = s[i];
        if (q) { if (c === q && s[i - 1] !== '\\') q = null; }
        else if (c === '"' || c === "'") q = c;
        else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).replace(/\s+$/, '');
      }
      return s;
    }

    function scalar(s, n) {
      s = s.trim();
      if (s === '' || s === '~' || /^null$/i.test(s)) return null;
      if (/^true$/i.test(s)) return true;
      if (/^false$/i.test(s)) return false;
      if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return +s;
      if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
      if (s[0] === '"') {
        try { return JSON.parse(s); } catch (e) { throw new Error('Line ' + n + ': a double-quoted string is not closed properly.'); }
      }
      if (s[0] === "'") {
        if (s[s.length - 1] !== "'" || s.length < 2) throw new Error('Line ' + n + ': a quoted string is not closed.');
        return s.slice(1, -1).replace(/''/g, "'");
      }
      if (s[0] === '[' || s[0] === '{') return flow(s, n);
      if (/^[&*!]/.test(s)) throw new Error('Line ' + n + ': anchors, aliases and tags are not supported here.');
      return s;
    }

    function flow(s, n) {
      var i = 0;
      function ws() { while (i < s.length && /\s/.test(s[i])) i++; }
      function value() {
        ws();
        if (s[i] === '[') {
          i++;
          var arr = [];
          ws();
          if (s[i] === ']') { i++; return arr; }
          for (;;) {
            arr.push(value());
            ws();
            if (s[i] === ',') { i++; ws(); if (s[i] === ']') { i++; return arr; } continue; }
            if (s[i] === ']') { i++; return arr; }
            throw new Error('Line ' + n + ': a [ list ] is not closed.');
          }
        }
        if (s[i] === '{') {
          i++;
          var obj = {};
          ws();
          if (s[i] === '}') { i++; return obj; }
          for (;;) {
            ws();
            var key = token(':');
            ws();
            if (s[i] !== ':') throw new Error('Line ' + n + ': expected ":" inside { }.');
            i++;
            obj[String(scalar(key, n))] = value();
            ws();
            if (s[i] === ',') { i++; continue; }
            if (s[i] === '}') { i++; return obj; }
            throw new Error('Line ' + n + ': a { map } is not closed.');
          }
        }
        return scalar(token(',]}'), n);
      }
      function token(stops) {
        ws();
        var start = i;
        if (s[i] === '"' || s[i] === "'") {
          var q = s[i++];
          while (i < s.length && !(s[i] === q && s[i - 1] !== '\\')) i++;
          i++;
          return s.slice(start, i);
        }
        while (i < s.length && stops.indexOf(s[i]) === -1) i++;
        return s.slice(start, i).trim();
      }
      var v = value();
      ws();
      if (i < s.length) throw new Error('Line ' + n + ': unexpected text after the closing bracket.');
      return v;
    }

    function block(indent) {
      var line = lines[pos];
      if (!line || line.indent < indent) return null;
      indent = line.indent;
      if (/^-(\s|$)/.test(line.text)) return seq(indent);
      if (keyOf(line.text)) return map(indent);
      pos++;
      return scalar(stripComment(line.text), line.n);
    }

    function keyOf(t) {
      var m = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s#:'"\[\]{},&*!|>-][^#]*?|-[^\s][^#:]*?)\s*:(\s+(.*))?$/.exec(t);
      return m ? { key: m[1], rest: m[3] === undefined ? '' : m[3] } : null;
    }

    function seq(indent) {
      var arr = [];
      while (pos < lines.length && lines[pos].indent === indent && /^-(\s|$)/.test(lines[pos].text)) {
        var line = lines[pos];
        var rest = line.text.replace(/^-\s*/, '');
        if (!rest) {
          pos++;
          arr.push(block(indent + 1));
        } else if (/^-(\s|$)/.test(rest)) {
          // "- - item": a list inside a list item
          var inside = indent + (line.text.length - rest.length);
          lines[pos] = { n: line.n, indent: inside, text: rest, raw: line.raw };
          arr.push(seq(inside));
        } else if (keyOf(rest) && !/^["'\[{]/.test(rest)) {
          // "- key: value" starts a map whose later keys line up under the first
          var inner = indent + (line.text.length - rest.length);
          lines[pos] = { n: line.n, indent: inner, text: rest, raw: line.raw };
          arr.push(map(inner));
        } else {
          pos++;
          arr.push(blockScalar(rest, indent, line.n));
        }
      }
      return arr;
    }

    function blockScalar(rest, indent, n) {
      var r = stripComment(rest);
      if (/^[|>][+-]?$/.test(r)) {
        var collected = [];
        var base = null;
        while (pos < lines.length && lines[pos].indent > indent) {
          if (base === null) base = lines[pos].indent;
          collected.push(' '.repeat(Math.max(lines[pos].indent - base, 0)) + lines[pos].text);
          pos++;
        }
        var folded = r[0] === '>';
        var s = folded ? collected.join(' ') : collected.join('\n');
        return r.indexOf('-') === -1 ? s + '\n' : s;
      }
      return scalar(r, n);
    }

    function map(indent) {
      var obj = {};
      while (pos < lines.length && lines[pos].indent === indent) {
        var line = lines[pos];
        var kv = keyOf(line.text);
        if (!kv) throw new Error('Line ' + line.n + ': expected "key: value".');
        pos++;
        var key = String(scalar(kv.key, line.n));
        var rest = stripComment(kv.rest);
        if (rest === '') {
          var nextLine = lines[pos];
          if (nextLine && (nextLine.indent > indent || (nextLine.indent === indent && /^-(\s|$)/.test(nextLine.text)))) {
            obj[key] = block(nextLine.indent);
          } else obj[key] = null;
        } else {
          obj[key] = blockScalar(rest, indent, line.n);
        }
      }
      if (pos < lines.length && lines[pos].indent > indent) throw new Error('Line ' + lines[pos].n + ': unexpected indentation.');
      return obj;
    }

    if (!lines.length) return null;
    var result = block(lines[0].indent);
    if (pos < lines.length) throw new Error('Line ' + lines[pos].n + ': could not understand this line.');
    return result;
  }

  function yamlStringify(v, level) {
    level = level || 0;
    var pad = '  '.repeat(level);
    function str(s) {
      if (s === '' || /^(true|false|null|yes|no|on|off|~)$/i.test(s) || /^[-+]?(\d|\.\d)/.test(s) ||
          /^[\s]|[\s]$|^[-?:,\[\]{}#&*!|>'"%@`]|: |\s#|\n/.test(s)) return JSON.stringify(s);
      return s;
    }
    function scalarOut(x) { return x === null ? 'null' : typeof x === 'string' ? str(x) : String(x); }
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      return v.map(function (x) {
        if (x !== null && typeof x === 'object' && (Array.isArray(x) ? x.length : Object.keys(x).length)) {
          var inner = yamlStringify(x, level + 1).split('\n');
          inner[0] = inner[0].replace(/^\s+/, '');
          return pad + '- ' + inner.join('\n');
        }
        return pad + '- ' + (x !== null && typeof x === 'object' ? (Array.isArray(x) ? '[]' : '{}') : scalarOut(x));
      }).join('\n');
    }
    if (v !== null && typeof v === 'object') {
      var keys = Object.keys(v);
      if (!keys.length) return '{}';
      return keys.map(function (key) {
        var x = v[key];
        var k = str(key);
        if (x !== null && typeof x === 'object' && (Array.isArray(x) ? x.length : Object.keys(x).length)) {
          return pad + k + ':\n' + yamlStringify(x, level + 1);
        }
        return pad + k + ': ' + (x !== null && typeof x === 'object' ? (Array.isArray(x) ? '[]' : '{}') : scalarOut(x));
      }).join('\n');
    }
    return pad + scalarOut(v);
  }

  T.register('yaml-to-json', function (root, k) {
    var src = k.area('Input', { rows: 10, value: 'name: Toolshed\nversion: 1.0\ntags:\n  - fast\n  - free\nauthor:\n  name: Ada\n  active: true' });
    var out = k.out('Result', { rows: 10 });
    var status = k.status();
    function run(toJson) {
      status.classList.remove('is-error');
      status.textContent = '';
      var text = src.input.value;
      if (!text.trim()) { out.set(''); return; }
      try {
        if (toJson) out.set(JSON.stringify(yamlParse(text), null, 2));
        else out.set(yamlStringify(JSON.parse(text)));
      } catch (e) {
        out.set('');
        status.classList.add('is-error');
        status.textContent = e instanceof SyntaxError ? 'That is not valid JSON: ' + e.message : e.message;
      }
    }
    root.appendChild(k.group('', src.el,
      k.h('div', { class: 'btn-row' }, k.btn('YAML to JSON', function () { run(true); }), k.btn('JSON to YAML', function () { run(false); }, true)),
      status, out.el,
      k.h('p', { class: 'hint', text: 'Handles the common parts of YAML: maps, lists, quoted text, [inline] lists, { inline } maps, | and > blocks and comments. Anchors, aliases and tags are not supported.' })));
  });

  /* ---------- Table sorter ---------- */
  T.register('table-sorter', function (root, k) {
    var src = k.area('Rows (paste from a spreadsheet or CSV)', { rows: 8, value: 'Name\tScore\tJoined\nAda\t92\t2021-03-04\nGrace\t100\t2019-11-30\nLinus\t88\t2022-01-15' });
    var head = k.check('First row is a header', true);
    var col = k.select('Sort by column', [['0', 'Column 1']], '0');
    var kind = k.select('Compare as', [['auto', 'Auto'], ['text', 'Text'], ['number', 'Number'], ['date', 'Date']], 'auto');
    var dir = k.select('Order', [['asc', 'Smallest first (A to Z)'], ['desc', 'Largest first (Z to A)']], 'asc');
    var out = k.out('Sorted rows', { rows: 8 });
    var table = k.h('div', { class: 'table-wrap' });
    var status = k.status();

    function cmpFactory(type, rows, c) {
      var vals = rows.map(function (r) { return (r[c] || '').trim(); }).filter(Boolean);
      if (type === 'auto') {
        if (vals.length && vals.every(function (v) { return v !== '' && isFinite(+v.replace(/,/g, '')); })) type = 'number';
        else if (vals.length && vals.every(function (v) { return !isNaN(Date.parse(v)) && /\d{4}|\d{1,2}[/.-]\d{1,2}/.test(v); })) type = 'date';
        else type = 'text';
      }
      var key = type === 'number' ? function (v) { return parseFloat(v.replace(/,/g, '')); }
        : type === 'date' ? function (v) { return Date.parse(v); }
        : function (v) { return v.toLowerCase(); };
      return function (a, b) {
        var x = (a[c] || '').trim();
        var y = (b[c] || '').trim();
        if (!x && !y) return 0;
        if (!x) return 1;
        if (!y) return -1;
        var kx = key(x);
        var ky = key(y);
        if (type === 'text') return kx.localeCompare(ky, undefined, { numeric: true });
        if (isNaN(kx) && isNaN(ky)) return 0;
        if (isNaN(kx)) return 1;
        if (isNaN(ky)) return -1;
        return kx - ky;
      };
    }

    function refreshColumns(rows) {
      var n = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
      var keep = col.input.value;
      col.input.textContent = '';
      for (var i = 0; i < n; i++) {
        var name = head.input.checked && rows[0][i] ? rows[0][i] : 'Column ' + (i + 1);
        col.input.appendChild(k.h('option', { value: String(i), text: name }));
      }
      col.input.value = +keep < n ? keep : '0';
    }

    function run() {
      status.classList.remove('is-error');
      table.textContent = '';
      var text = src.input.value;
      if (!text.trim()) { out.set(''); status.textContent = ''; return; }
      try {
        var d = detectDelimiter(text);
        var rows = parseCSV(text, d);
        refreshColumns(rows);
        var header = head.input.checked ? rows[0] : null;
        var body = header ? rows.slice(1) : rows.slice();
        var c = +col.input.value;
        var cmp = cmpFactory(kind.input.value, body, c);
        body.sort(function (a, b) { return dir.input.value === 'asc' ? cmp(a, b) : cmp(b, a); });
        out.set(toCSV((header ? [header] : []).concat(body), d));
        var t = k.h('table', { class: 'data-table' });
        if (header) t.appendChild(k.h('thead', {}, k.h('tr', {}, header.map(function (x) { return k.h('th', { scope: 'col', text: x }); }))));
        t.appendChild(k.h('tbody', {}, body.map(function (r) { return k.h('tr', {}, r.map(function (x) { return k.h('td', { text: x }); })); })));
        table.appendChild(t);
        status.textContent = body.length + (body.length === 1 ? ' row' : ' rows') + ' sorted';
      } catch (e) {
        out.set('');
        status.classList.add('is-error');
        status.textContent = e.message;
      }
    }

    k.watch([src.input, head.input, col.input, kind.input, dir.input], run);
    root.appendChild(k.group('', src.el, head.el, k.row(col.el, kind.el, dir.el), status, table));
    root.appendChild(k.group('', out.el));
  });
})();
