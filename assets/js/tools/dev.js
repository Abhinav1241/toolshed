(function () {
  var T = window.ToolshedTools;

  /* ---------- JSON formatter ---------- */
  T.register('json-formatter', function (root, k) {
    var src = k.area('JSON', { rows: 10, placeholder: '{"name":"Toolshed","tools":[1,2,3]}' });
    var indent = k.select('Indent', [['2', '2 spaces'], ['4', '4 spaces'], ['tab', 'Tab']], '2');
    var sort = k.check('Sort keys A to Z');
    var out = k.out('Result', { rows: 10 });
    var status = k.status();

    function sortDeep(v) {
      if (Array.isArray(v)) return v.map(sortDeep);
      if (v && typeof v === 'object') {
        var o = {};
        Object.keys(v).sort().forEach(function (key) { o[key] = sortDeep(v[key]); });
        return o;
      }
      return v;
    }

    function where(msg, text) {
      var m = /position (\d+)/.exec(msg);
      if (!m || /line \d+/i.test(msg)) return msg;
      var pos = +m[1];
      var before = text.slice(0, pos).split('\n');
      return msg + ' (line ' + before.length + ', column ' + (before[before.length - 1].length + 1) + ')';
    }

    function run(minify) {
      status.classList.remove('is-error');
      var text = src.input.value;
      if (!text.trim()) { out.set(''); status.textContent = ''; return; }
      try {
        var v = JSON.parse(text);
        if (sort.input.checked) v = sortDeep(v);
        var sp = minify ? 0 : indent.input.value === 'tab' ? '\t' : +indent.input.value;
        out.set(JSON.stringify(v, null, sp));
        status.textContent = 'Valid JSON · ' + out.get().length + ' characters';
      } catch (e) {
        out.set('');
        status.classList.add('is-error');
        status.textContent = where(e.message, text);
      }
    }

    root.appendChild(k.group('', src.el, k.row(indent.el, sort.el),
      k.h('div', { class: 'btn-row' }, k.btn('Format', function () { run(false); }), k.btn('Minify', function () { run(true); }, true)),
      status, out.el));
  });

  /* ---------- Regex tester ---------- */
  T.register('regex-tester', function (root, k) {
    var pat = k.text('Pattern (without slashes)', { value: '(\\w+)@(\\w+)\\.com' });
    var flags = ['g', 'i', 'm', 's', 'u'].map(function (f) {
      var names = { g: 'g global', i: 'i ignore case', m: 'm multiline', s: 's dot matches newline', u: 'u unicode' };
      return k.check(names[f], f === 'g' || f === 'i');
    });
    var letters = ['g', 'i', 'm', 's', 'u'];
    var src = k.area('Test text', { rows: 6, value: 'Mail ada@example.com or grace@navy.com today.' });
    var status = k.status();
    var view = k.h('pre', { class: 'rx', 'aria-label': 'Text with matches highlighted' });
    var list = k.h('ol', { class: 'rx-list' });
    var MAX = 500;

    function run() {
      status.classList.remove('is-error');
      view.textContent = '';
      list.textContent = '';
      var f = letters.filter(function (l, i) { return flags[i].input.checked; }).join('');
      var re;
      try {
        re = new RegExp(pat.input.value, f.indexOf('g') === -1 ? f + 'g' : f);
      } catch (e) {
        status.classList.add('is-error');
        status.textContent = e.message;
        view.textContent = src.input.value;
        return;
      }
      var text = src.input.value;
      var global = f.indexOf('g') !== -1;
      var last = 0;
      var count = 0;
      var m;
      while ((m = re.exec(text)) !== null && count < MAX) {
        count++;
        view.appendChild(document.createTextNode(text.slice(last, m.index)));
        view.appendChild(k.h('mark', { text: m[0] }));
        last = m.index + m[0].length;
        var item = k.h('li', {}, k.h('code', { text: JSON.stringify(m[0]) }), ' at ' + m.index);
        if (m.length > 1) {
          item.appendChild(k.h('ul', {}, m.slice(1).map(function (g, i) {
            return k.h('li', { text: 'Group ' + (i + 1) + ': ' + (g === undefined ? '(no match)' : JSON.stringify(g)) });
          })));
        }
        if (m.groups) {
          item.appendChild(k.h('ul', {}, Object.keys(m.groups).map(function (name) {
            return k.h('li', { text: name + ': ' + JSON.stringify(m.groups[name]) });
          })));
        }
        list.appendChild(item);
        if (m[0] === '') re.lastIndex++;
        if (!global) break;
      }
      view.appendChild(document.createTextNode(text.slice(last)));
      status.textContent = count ? count + (count === 1 ? ' match' : ' matches') + (count >= MAX ? ' (stopped at ' + MAX + ')' : '') : 'No matches';
    }

    var all = [pat.input, src.input].concat(flags.map(function (f) { return f.input; }));
    k.watch(all, run);
    root.appendChild(k.group('', pat.el, k.row.apply(null, flags.map(function (f) { return f.el; })), src.el));
    root.appendChild(k.group('Result', status, view, list));
  });

  /* ---------- Cron explainer ---------- */
  T.register('cron-explainer', function (root, k) {
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var ALIAS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
    var FIELDS = [
      { name: 'minute', min: 0, max: 59 },
      { name: 'hour', min: 0, max: 23 },
      { name: 'day of month', min: 1, max: 31 },
      { name: 'month', min: 1, max: 12, names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], offset: 1 },
      { name: 'day of week', min: 0, max: 7, names: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], offset: 0 }
    ];

    var src = k.text('Cron expression', { value: '*/15 9-17 * * 1-5', placeholder: 'minute hour day-of-month month day-of-week' });
    var status = k.status();
    var words = k.h('p', { class: 'big-result' });
    var next = k.h('ul', { class: 'notes' });

    function val(tok, f) {
      var s = tok.toLowerCase();
      if (f.names) {
        var i = f.names.indexOf(s.slice(0, 3));
        if (i !== -1 && /^[a-z]+$/.test(s)) return i + f.offset;
      }
      if (!/^\d+$/.test(s)) throw new Error('"' + tok + '" is not a valid ' + f.name + '.');
      var n = +s;
      if (n < f.min || n > f.max) throw new Error(f.name + ' must be between ' + f.min + ' and ' + f.max + '.');
      return n;
    }

    // Returns a Set of allowed numbers and the list of parts for description
    function parse(str, f) {
      var set = new Set();
      var parts = [];
      str = str.replace(/^\?$/, '*');
      str.split(',').forEach(function (part) {
        var m = /^(\*|[^/-]+(?:-[^/]+)?)(?:\/(\d+))?$/.exec(part);
        if (!m) throw new Error('"' + part + '" is not a valid ' + f.name + '.');
        var step = m[2] ? +m[2] : 1;
        if (step < 1) throw new Error('A step must be at least 1.');
        var lo;
        var hi;
        if (m[1] === '*') { lo = f.min; hi = f.name === 'day of week' ? 6 : f.max; }
        else if (m[1].indexOf('-') > 0) {
          var ab = m[1].split('-');
          lo = val(ab[0], f); hi = val(ab[1], f);
          if (lo > hi) throw new Error('"' + part + '" runs backwards.');
        } else {
          lo = val(m[1], f);
          hi = m[2] ? (f.name === 'day of week' ? 6 : f.max) : lo;
        }
        for (var n = lo; n <= hi; n += step) set.add(f.name === 'day of week' && n === 7 ? 0 : n);
        parts.push({ raw: part, star: m[1] === '*', step: m[2] ? step : 0, lo: lo, hi: hi, range: m[1].indexOf('-') > 0 });
      });
      return { set: set, parts: parts };
    }

    function label(n, f) {
      if (f.name === 'month') return MONTHS[n - 1];
      if (f.name === 'day of week') return DAYS[n % 7];
      return String(n);
    }

    function list(arr) {
      return arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
    }

    function phrase(p, f, unit) {
      if (p.star && !p.step) return null;
      if (p.star) return 'every ' + p.step + ' ' + unit + 's';
      if (p.range) return (p.step ? 'every ' + p.step + ' ' + unit + 's ' : '') + label(p.lo, f) + ' through ' + label(p.hi, f);
      if (p.step) return 'every ' + p.step + ' ' + unit + 's from ' + label(p.lo, f);
      return label(p.lo, f);
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function describe(parsed, raw) {
      var P = parsed;
      var mp = P[0].parts;
      var hp = P[1].parts;
      var single = function (x) { return x.length === 1 && !x[0].star && !x[0].range && !x[0].step; };
      var text;
      if (single(mp) && single(hp)) {
        text = 'At ' + pad(hp[0].lo) + ':' + pad(mp[0].lo);
      } else {
        var minute = mp.length === 1 && mp[0].star && !mp[0].step ? 'every minute'
          : mp.length === 1 && mp[0].star ? 'every ' + mp[0].step + ' minutes'
          : 'at minute ' + list(mp.map(function (p) { return phrase(p, FIELDS[0], 'minute'); }));
        text = minute[0].toUpperCase() + minute.slice(1);
        var hourAny = hp.length === 1 && hp[0].star && !hp[0].step;
        if (!hourAny) {
          var hourParts = hp.map(function (p) { return phrase(p, FIELDS[1], 'hour'); });
          if (hp.length === 1 && hp[0].star) text += ', ' + hourParts[0];
          else if (hp.length === 1 && hp[0].range && !hp[0].step) text += ', between hours ' + hp[0].lo + ' and ' + hp[0].hi;
          else text += ', past hour ' + list(hourParts);
        } else if (mp.length !== 1 || !mp[0].star) {
          text += mp.length === 1 && mp[0].step ? '' : ' of every hour';
        }
      }
      var dom = P[2].parts;
      var mon = P[3].parts;
      var dow = P[4].parts;
      var domAny = dom.length === 1 && dom[0].star && !dom[0].step;
      var monAny = mon.length === 1 && mon[0].star && !mon[0].step;
      var dowAny = dow.length === 1 && dow[0].star && !dow[0].step;
      if (!domAny) text += ', on day ' + list(dom.map(function (p) { return phrase(p, FIELDS[2], 'day'); })) + ' of the month';
      if (!dowAny) text += (domAny ? ', on ' : ' and on ') + list(dow.map(function (p) { return phrase(p, FIELDS[4], 'day'); }));
      if (!monAny) text += ', in ' + list(mon.map(function (p) { return phrase(p, FIELDS[3], 'month'); }));
      if (!domAny && !dowAny) text += ' (runs when either the day of month or the weekday matches)';
      return text + '.';
    }

    function nextRuns(P, count) {
      var d = new Date();
      d.setSeconds(0, 0);
      d.setMinutes(d.getMinutes() + 1);
      var domAny = P[2].parts.length === 1 && P[2].parts[0].star && !P[2].parts[0].step;
      var dowAny = P[4].parts.length === 1 && P[4].parts[0].star && !P[4].parts[0].step;
      var out = [];
      var guard = 0;
      while (out.length < count && guard++ < 200000) {
        if (!P[3].set.has(d.getMonth() + 1)) { d.setMonth(d.getMonth() + 1, 1); d.setHours(0, 0, 0, 0); continue; }
        var dm = P[2].set.has(d.getDate());
        var dw = P[4].set.has(d.getDay());
        var dayOk = domAny && dowAny ? true : domAny ? dw : dowAny ? dm : (dm || dw);
        if (!dayOk) { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); continue; }
        if (!P[1].set.has(d.getHours())) { d.setHours(d.getHours() + 1, 0, 0, 0); continue; }
        if (!P[0].set.has(d.getMinutes())) { d.setMinutes(d.getMinutes() + 1); continue; }
        out.push(new Date(d));
        d.setMinutes(d.getMinutes() + 1);
      }
      return out;
    }

    k.watch([src.input], function () {
      status.classList.remove('is-error');
      status.textContent = '';
      next.textContent = '';
      var raw = src.input.value.trim();
      raw = ALIAS[raw.toLowerCase()] || raw;
      if (!raw) { words.textContent = ''; return; }
      var toks = raw.split(/\s+/);
      try {
        if (toks.length !== 5) throw new Error('Use five fields: minute, hour, day of month, month, day of week.');
        var P = toks.map(function (t, i) { return parse(t, FIELDS[i]); });
        words.textContent = describe(P, raw);
        nextRuns(P, 5).forEach(function (d) {
          next.appendChild(k.h('li', { text: d.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }));
        });
        if (!next.children.length) status.textContent = 'This schedule has no run in the next few years (for example 31 February).';
      } catch (e) {
        words.textContent = '';
        status.classList.add('is-error');
        status.textContent = e.message;
      }
    });

    root.appendChild(k.group('', src.el,
      k.h('p', { class: 'hint', text: 'Fields: minute hour day-of-month month day-of-week. Also accepts @daily, @hourly, @weekly, @monthly and @yearly.' }),
      status, words));
    root.appendChild(k.group('Next five runs (your local time)', next));
  });

  /* ---------- JWT decoder ---------- */
  T.register('jwt-decoder', function (root, k) {
    var src = k.area('JWT', { rows: 5, placeholder: 'eyJhbGciOi…' });
    var header = k.out('Header', { rows: 5 });
    var payload = k.out('Payload', { rows: 8 });
    var sig = k.out('Signature (not checked)', { rows: 2 });
    var status = k.status();
    var times = k.h('ul', { class: 'notes' });

    function b64json(s) {
      s = s.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var bin = atob(s);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    }

    k.watch([src.input], function () {
      status.classList.remove('is-error');
      times.textContent = '';
      var t = src.input.value.trim();
      if (!t) { header.set(''); payload.set(''); sig.set(''); status.textContent = ''; return; }
      var p = t.replace(/^Bearer\s+/i, '').split('.');
      try {
        if (p.length !== 3) throw new Error('A JWT has three parts separated by dots.');
        var h = b64json(p[0]);
        var pl = b64json(p[1]);
        header.set(JSON.stringify(h, null, 2));
        payload.set(JSON.stringify(pl, null, 2));
        sig.set(p[2]);
        status.textContent = 'Decoded only. The signature is NOT verified, so do not trust this token because it decodes.';
        var now = Date.now() / 1000;
        [['iat', 'Issued at'], ['nbf', 'Not valid before'], ['exp', 'Expires']].forEach(function (c) {
          if (typeof pl[c[0]] === 'number') {
            var s = c[1] + ': ' + new Date(pl[c[0]] * 1000).toLocaleString();
            if (c[0] === 'exp') s += pl.exp < now ? ' (expired)' : ' (still valid)';
            times.appendChild(k.h('li', { text: s }));
          }
        });
      } catch (e) {
        header.set(''); payload.set(''); sig.set('');
        status.classList.add('is-error');
        status.textContent = e.message && e.message.indexOf('three parts') > -1 ? e.message : 'This does not look like a valid JWT.';
      }
    });

    root.appendChild(k.group('', src.el, status, times));
    root.appendChild(k.group('Decoded', header.el, payload.el, sig.el));
  });

  /* ---------- UUID generator ---------- */
  T.register('uuid-generator', function (root, k) {
    var count = k.num('How many', { min: 1, max: 200, step: 1, value: 5 });
    var upper = k.check('Uppercase');
    var plain = k.check('Remove hyphens');
    var out = k.out('UUIDs (version 4)', { rows: 8 });

    function uuid() {
      if (crypto.randomUUID) return crypto.randomUUID();
      var b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    }

    function gen() {
      var n = Math.min(Math.max(parseInt(count.input.value, 10) || 1, 1), 200);
      var lines = [];
      for (var i = 0; i < n; i++) {
        var u = uuid();
        if (plain.input.checked) u = u.replace(/-/g, '');
        lines.push(upper.input.checked ? u.toUpperCase() : u);
      }
      out.set(lines.join('\n'));
    }

    k.watch([count.input, upper.input, plain.input], gen);
    root.appendChild(k.group('', k.row(count.el, upper.el, plain.el), k.btn('Generate new ones', gen), out.el));
  });

  /* ---------- Markdown preview ---------- */
  T.register('markdown-preview', function (root, k) {
    var src = k.area('Markdown', {
      rows: 14,
      value: '# Hello\n\nWrite **bold**, *italic*, `code` and [links](https://example.com).\n\n- One\n- Two\n\n> A quote\n\n```\ncode block\n```\n'
    });
    var preview = k.h('div', { class: 'md', 'aria-label': 'Rendered preview' });
    var html = '';

    function esc(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function inline(s) {
      s = esc(s);
      var codes = [];
      s = s.replace(/`([^`]+)`/g, function (m, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
      s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) { return safeUrl(url) ? '<img alt="' + alt + '" src="' + url + '">' : m; });
      s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
        return safeUrl(url) ? '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + text + '</a>' : m;
      });
      s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, function (m, a, b) { return '<strong>' + (a || b) + '</strong>'; });
      s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|[^_\w])_([^_\s][^_]*)_/g, '$1<em>$2</em>');
      s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return '<code>' + codes[+i] + '</code>'; });
    }

    // Only http(s), mailto and relative or in-page links; the text is already escaped
    function safeUrl(u) {
      var plainUrl = u.replace(/&amp;/g, '&');
      return /^(https?:\/\/|mailto:|#|\/|\.\/|\.\.\/)/i.test(plainUrl) || !/^[a-z][a-z0-9+.-]*:/i.test(plainUrl);
    }

    function render(md) {
      var lines = md.replace(/\r\n?/g, '\n').split('\n');
      var out = [];
      var i = 0;
      while (i < lines.length) {
        var line = lines[i];
        var m;
        if (/^```/.test(line)) {
          var code = [];
          i++;
          while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
          i++;
          out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
        } else if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
          out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>');
          i++;
        } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
          out.push('<hr>');
          i++;
        } else if (/^>\s?/.test(line)) {
          var q = [];
          while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
          out.push('<blockquote>' + render(q.join('\n')) + '</blockquote>');
        } else if (/^\s*[-*+]\s+/.test(line)) {
          var ul = [];
          while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) ul.push('<li>' + inline(lines[i++].replace(/^\s*[-*+]\s+/, '')) + '</li>');
          out.push('<ul>' + ul.join('') + '</ul>');
        } else if (/^\s*\d+[.)]\s+/.test(line)) {
          var ol = [];
          while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) ol.push('<li>' + inline(lines[i++].replace(/^\s*\d+[.)]\s+/, '')) + '</li>');
          out.push('<ol>' + ol.join('') + '</ol>');
        } else if (!line.trim()) {
          i++;
        } else {
          var para = [];
          while (i < lines.length && lines[i].trim() && !/^(```|#{1,6}\s|>|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i])) para.push(lines[i++]);
          out.push('<p>' + para.map(inline).join('<br>') + '</p>');
        }
      }
      return out.join('\n');
    }

    var status = k.status();
    k.watch([src.input], function () {
      html = render(src.input.value);
      // html is built only from escaped text and filtered URLs
      preview.innerHTML = html;
      status.textContent = '';
    });

    var copyBtn = k.btn('Copy HTML', function () {
      k.copy(html).then(function () { status.textContent = 'HTML copied'; });
    }, true);

    root.appendChild(k.group('', src.el, k.h('div', { class: 'btn-row' }, copyBtn), status));
    root.appendChild(k.group('Preview', preview));
  });
})();
