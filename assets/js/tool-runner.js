/* Tiny UI kit and registry for small tools. Tools live in assets/js/tools/*.js */
(function () {
  var registry = {};

  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k.indexOf('aria-') === 0 || k.indexOf('data-') === 0 || k === 'role') el.setAttribute(k, v);
      else if (k in el) el[k] = v;
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
    else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }

  function field(labelText, control, cls) {
    return h('label', { class: 'field' + (cls ? ' ' + cls : '') }, h('span', { class: 'label', text: labelText }), control);
  }

  var kit = {
    h: h,

    row: function () {
      return h('div', { class: 'field-row' }, Array.prototype.slice.call(arguments));
    },

    group: function (title) {
      var kids = Array.prototype.slice.call(arguments, 1);
      return h('fieldset', { class: 'kit-group' }, title ? h('legend', { class: 'label', text: title }) : null, kids);
    },

    text: function (labelText, props) {
      var input = h('input', Object.assign({ type: 'text', autocomplete: 'off', spellcheck: false }, props || {}));
      return { el: field(labelText, input), input: input };
    },

    num: function (labelText, props) {
      var input = h('input', Object.assign({ type: 'number', inputMode: 'decimal' }, props || {}));
      return { el: field(labelText, input), input: input };
    },

    area: function (labelText, props) {
      var input = h('textarea', Object.assign({ rows: 6, spellcheck: false }, props || {}));
      return { el: field(labelText, input, 'field-full'), input: input };
    },

    select: function (labelText, options, value) {
      var input = h('select', {}, options.map(function (o) {
        var pair = Array.isArray(o) ? o : [o, o];
        return h('option', { value: pair[0], text: pair[1] });
      }));
      if (value !== undefined) input.value = value;
      return { el: field(labelText, input), input: input };
    },

    check: function (labelText, checked) {
      var input = h('input', { type: 'checkbox', checked: !!checked });
      return { el: h('label', { class: 'check' }, input, labelText), input: input };
    },

    range: function (labelText, props) {
      var input = h('input', Object.assign({ type: 'range' }, props || {}));
      var out = h('output', { text: input.value });
      input.addEventListener('input', function () { out.textContent = input.value; });
      var wrap = h('label', { class: 'field field-wide' }, h('span', { class: 'label' }, labelText + ': ', out), input);
      return { el: wrap, input: input };
    },

    btn: function (text, fn, ghost) {
      return h('button', { type: 'button', class: 'btn' + (ghost ? ' btn-ghost' : ''), onclick: fn, text: text });
    },

    status: function () {
      return h('p', { class: 'label kit-status', role: 'status', 'aria-live': 'polite' });
    },

    // Read-only result box with a Copy button
    out: function (labelText, props) {
      var area = h('textarea', Object.assign({ rows: 6, readOnly: true, spellcheck: false }, props || {}));
      var copy = h('button', { type: 'button', class: 'btn btn-ghost', text: 'Copy' });
      var timer;
      copy.addEventListener('click', function () {
        kit.copy(area.value).then(function () {
          copy.textContent = 'Copied';
          clearTimeout(timer);
          timer = setTimeout(function () { copy.textContent = 'Copy'; }, 1200);
        });
      });
      var el = h('div', { class: 'out-box' }, field(labelText, area, 'field-full'), copy);
      return {
        el: el,
        input: area,
        set: function (s) { area.value = s; },
        get: function () { return area.value; }
      };
    },

    // Grid of label/value tiles
    stats: function (labels) {
      var vals = {};
      var el = h('dl', { class: 'stat-grid' }, labels.map(function (l) {
        var dd = h('dd', { text: '0' });
        vals[l] = dd;
        return h('div', { class: 'stat' }, h('dt', { class: 'label', text: l }), dd);
      }));
      return {
        el: el,
        set: function (map) {
          Object.keys(map).forEach(function (k) { if (vals[k]) vals[k].textContent = map[k]; });
        }
      };
    },

    copy: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
      }
      return fallbackCopy(text);
    },

    // Run fn now and whenever any of the inputs change
    watch: function (inputs, fn) {
      inputs.forEach(function (i) {
        i.addEventListener('input', fn);
        i.addEventListener('change', fn);
      });
      fn();
    },

    // Uniform random integer in [0, n) without modulo bias
    rand: function (n) {
      var max = 0x100000000;
      var limit = max - (max % n);
      var buf = new Uint32Array(1);
      do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % n;
    },

    shuffle: function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = kit.rand(i + 1);
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },

    fmt: function (n, digits) {
      if (!isFinite(n)) return '—';
      return n.toLocaleString(undefined, { maximumFractionDigits: digits === undefined ? 2 : digits });
    }
  };

  function fallbackCopy(text) {
    var ta = h('textarea', { value: text, style: 'position:fixed;opacity:0' });
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
    return Promise.resolve();
  }

  window.ToolshedTools = {
    kit: kit,
    register: function (id, fn) { registry[id] = fn; },
    get: function (id) { return registry[id]; },
    ids: function () { return Object.keys(registry); }
  };
})();
