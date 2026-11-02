(function () {
  var T = window.ToolshedTools;

  /* ---------- helpers ---------- */
  var cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  var cx = cv.getContext('2d', { willReadFrequently: true });

  // Parse any CSS colour the browser understands. Returns {r,g,b} (0-255) or null.
  function parse(s) {
    s = (s || '').trim();
    if (!s) return null;
    if (/^[0-9a-f]{3,8}$/i.test(s) && [3, 4, 6, 8].indexOf(s.length) !== -1) s = '#' + s;
    cx.fillStyle = '#000000';
    cx.fillStyle = s;
    var a = cx.fillStyle;
    cx.fillStyle = '#ffffff';
    cx.fillStyle = s;
    if (a !== cx.fillStyle) return null;
    cx.clearRect(0, 0, 1, 1);
    cx.fillRect(0, 0, 1, 1);
    var d = cx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  }

  function hex(c) {
    return '#' + [c.r, c.g, c.b].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join('');
  }

  function toHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.min(Math.max(s, 0), 100) / 100;
    l = Math.min(Math.max(l, 0), 100) / 100;
    var a = s * Math.min(l, 1 - l);
    function f(n) {
      var k = (n + h / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    }
    return { r: f(0), g: f(8), b: f(4) };
  }

  function toOklch(c) {
    function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    var r = lin(c.r), g = lin(c.g), b = lin(c.b);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    var C = Math.hypot(A, B);
    var h = C < 0.0001 ? 0 : Math.atan2(B, A) * 180 / Math.PI;
    return { l: L, c: C, h: h < 0 ? h + 360 : h };
  }

  function luminance(c) {
    function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  }

  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  function inkFor(c) {
    return contrast(c, { r: 20, g: 21, b: 23 }) >= contrast(c, { r: 255, g: 255, b: 255 }) ? '#141517' : '#ffffff';
  }

  function r1(n) { return Math.round(n * 10) / 10; }

  // Colour box: any CSS colour text plus a native picker, kept in sync
  function colourField(k, labelText, value) {
    var text = k.h('input', { type: 'text', value: value, autocomplete: 'off', spellcheck: false });
    var pick = k.h('input', { type: 'color', class: 'picker', 'aria-label': labelText + ' picker' });
    var el = k.h('div', { class: 'field colour-field' },
      k.h('label', { class: 'colour-label' }, k.h('span', { class: 'label', text: labelText }), text), pick);
    function sync() {
      var c = parse(text.value);
      if (c) pick.value = hex(c);
      text.setAttribute('aria-invalid', c ? 'false' : 'true');
    }
    text.addEventListener('input', sync);
    pick.addEventListener('input', function () {
      text.value = pick.value;
      text.dispatchEvent(new Event('input', { bubbles: true }));
    });
    sync();
    return {
      el: el,
      input: text,
      get: function () { return parse(text.value); },
      set: function (v) { text.value = v; sync(); text.dispatchEvent(new Event('input', { bubbles: true })); }
    };
  }

  /* ---------- Colour converter ---------- */
  T.register('colour-converter', function (root, k) {
    var c = colourField(k, 'Colour (hex, rgb(), hsl(), oklch() or a name)', '#ff6b2c');
    var swatch = k.h('div', { class: 'swatch-big', role: 'img' });
    var status = k.status();
    var outs = {
      HEX: k.out('HEX', { rows: 1 }),
      RGB: k.out('RGB', { rows: 1 }),
      HSL: k.out('HSL', { rows: 1 }),
      OKLCH: k.out('OKLCH', { rows: 1 })
    };
    k.watch([c.input], function () {
      var col = c.get();
      status.classList.remove('is-error');
      if (!col) {
        status.classList.add('is-error');
        status.textContent = c.input.value.trim() ? 'That is not a colour I can read.' : '';
        Object.keys(outs).forEach(function (n) { outs[n].set(''); });
        swatch.style.background = 'transparent';
        return;
      }
      status.textContent = '';
      var hsl = toHsl(col);
      var ok = toOklch(col);
      swatch.style.background = hex(col);
      swatch.setAttribute('aria-label', 'Colour preview ' + hex(col));
      outs.HEX.set(hex(col));
      outs.RGB.set('rgb(' + col.r + ', ' + col.g + ', ' + col.b + ')');
      outs.HSL.set('hsl(' + Math.round(hsl.h) + ', ' + Math.round(hsl.s) + '%, ' + Math.round(hsl.l) + '%)');
      outs.OKLCH.set('oklch(' + (Math.round(ok.l * 1000) / 1000) + ' ' + (Math.round(ok.c * 1000) / 1000) + ' ' + Math.round(ok.h) + ')');
    });
    root.appendChild(k.group('', c.el, status, swatch));
    root.appendChild(k.group('Same colour, other formats', k.row.apply(null, Object.keys(outs).map(function (n) { return outs[n].el; }))));
  });

  /* ---------- Contrast checker ---------- */
  T.register('contrast-checker', function (root, k) {
    var fg = colourField(k, 'Text colour', '#1c1b19');
    var bg = colourField(k, 'Background colour', '#eadfcb');
    var ratio = k.h('p', { class: 'big-result', role: 'status', 'aria-live': 'polite' });
    var table = k.h('ul', { class: 'checks' });
    var sample = k.h('div', { class: 'preview-box' },
      k.h('p', { class: 'sample-large', text: 'Large heading sample' }),
      k.h('p', { text: 'Body text sample. The quick brown fox jumps over the lazy dog.' }));
    var swap = k.btn('Swap colours', function () {
      var a = fg.input.value;
      fg.set(bg.input.value);
      bg.set(a);
    }, true);
    var TESTS = [
      ['Normal text, AA', 4.5], ['Normal text, AAA', 7],
      ['Large text, AA', 3], ['Large text, AAA', 4.5],
      ['Icons and borders, AA', 3]
    ];
    k.watch([fg.input, bg.input], function () {
      var a = fg.get();
      var b = bg.get();
      table.textContent = '';
      if (!a || !b) { ratio.textContent = 'Enter two valid colours'; return; }
      var r = contrast(a, b);
      ratio.textContent = (Math.floor(r * 100) / 100).toFixed(2) + ' : 1';
      TESTS.forEach(function (t) {
        var pass = r >= t[1];
        table.appendChild(k.h('li', { class: pass ? 'pass' : 'fail' }, k.h('span', { text: t[0] + ' (needs ' + t[1] + ')' }), k.h('strong', { text: pass ? 'Pass' : 'Fail' })));
      });
      sample.style.color = hex(a);
      sample.style.background = hex(b);
    });
    root.appendChild(k.group('', k.row(fg.el, bg.el), swap, ratio, table));
    root.appendChild(k.group('Preview', sample));
  });

  /* ---------- Palette maker ---------- */
  T.register('palette-maker', function (root, k) {
    var base = colourField(k, 'Base colour', '#ff6b2c');
    var scheme = k.select('Scheme', [
      ['complementary', 'Complementary'], ['analogous', 'Analogous'], ['triadic', 'Triadic'],
      ['tetradic', 'Tetradic'], ['split', 'Split-complementary'], ['mono', 'Monochromatic'], ['tints', 'Tints and shades']
    ], 'analogous');
    var row = k.h('div', { class: 'swatch-row' });
    var out = k.out('CSS variables', { rows: 6 });
    var status = k.status();

    function build(c) {
      var hsl = toHsl(c);
      switch (scheme.input.value) {
        case 'complementary': return [0, 180].map(function (d) { return fromHsl(hsl.h + d, hsl.s, hsl.l); });
        case 'analogous': return [-60, -30, 0, 30, 60].map(function (d) { return fromHsl(hsl.h + d, hsl.s, hsl.l); });
        case 'triadic': return [0, 120, 240].map(function (d) { return fromHsl(hsl.h + d, hsl.s, hsl.l); });
        case 'tetradic': return [0, 90, 180, 270].map(function (d) { return fromHsl(hsl.h + d, hsl.s, hsl.l); });
        case 'split': return [0, 150, 210].map(function (d) { return fromHsl(hsl.h + d, hsl.s, hsl.l); });
        case 'mono': return [15, 30, 45, 60, 75, 90].map(function (l) { return fromHsl(hsl.h, hsl.s, l); });
        default:
          return [0.8, 0.6, 0.4, 0.2].map(function (t) { return { r: c.r + (255 - c.r) * t, g: c.g + (255 - c.g) * t, b: c.b + (255 - c.b) * t }; })
            .concat([c])
            .concat([0.2, 0.4, 0.6, 0.8].map(function (t) { return { r: c.r * (1 - t), g: c.g * (1 - t), b: c.b * (1 - t) }; }));
      }
    }

    k.watch([base.input, scheme.input], function () {
      var c = base.get();
      row.textContent = '';
      status.classList.remove('is-error');
      if (!c) {
        status.classList.add('is-error');
        status.textContent = 'Enter a valid colour.';
        out.set('');
        return;
      }
      status.textContent = 'Click a swatch to copy its hex code.';
      var cols = build(c).map(function (x) { return { r: Math.round(x.r), g: Math.round(x.g), b: Math.round(x.b) }; });
      cols.forEach(function (x) {
        var h = hex(x);
        var b = k.h('button', {
          type: 'button', class: 'swatch', style: 'background:' + h + ';color:' + inkFor(x),
          'aria-label': 'Copy ' + h,
          onclick: function () { k.copy(h).then(function () { status.textContent = 'Copied ' + h; }); }
        }, h);
        row.appendChild(b);
      });
      out.set(':root {\n' + cols.map(function (x, i) { return '  --colour-' + (i + 1) + ': ' + hex(x) + ';'; }).join('\n') + '\n}');
    });

    root.appendChild(k.group('', k.row(base.el, scheme.el), status, row, out.el));
  });

  /* ---------- Gradient picker ---------- */
  T.register('gradient-picker', function (root, k) {
    var type = k.select('Type', [['linear', 'Linear'], ['radial', 'Radial'], ['conic', 'Conic']], 'linear');
    var angle = k.range('Angle (degrees)', { min: 0, max: 360, value: 90 });
    var preview = k.h('div', { class: 'gradient-preview', role: 'img', 'aria-label': 'Gradient preview' });
    var out = k.out('CSS', { rows: 2 });
    var stopsEl = k.h('div', { class: 'stops' });
    var stops = [{ colour: '#ff6b2c', pos: 0 }, { colour: '#2c6bff', pos: 100 }];
    var addBtn;

    function css() {
      var list = stops.slice().sort(function (a, b) { return a.pos - b.pos; })
        .map(function (s) { return s.colour + ' ' + s.pos + '%'; }).join(', ');
      var a = angle.input.value;
      return type.input.value === 'linear' ? 'linear-gradient(' + a + 'deg, ' + list + ')'
        : type.input.value === 'radial' ? 'radial-gradient(circle, ' + list + ')'
        : 'conic-gradient(from ' + a + 'deg, ' + list + ')';
    }

    function update() {
      var g = css();
      preview.style.background = g;
      out.set('background: ' + g + ';');
      angle.el.hidden = type.input.value === 'radial';
      addBtn.disabled = stops.length >= 6;
    }

    function renderStops() {
      stopsEl.textContent = '';
      stops.forEach(function (s, i) {
        var cf = colourField(k, 'Colour ' + (i + 1), s.colour);
        var pos = k.num('Position (%)', { min: 0, max: 100, step: 1, value: s.pos });
        cf.input.addEventListener('input', function () {
          var c = cf.get();
          if (c) { s.colour = hex(c); update(); }
        });
        pos.input.addEventListener('input', function () {
          var v = parseFloat(pos.input.value);
          if (!isNaN(v)) { s.pos = Math.min(Math.max(Math.round(v), 0), 100); update(); }
        });
        var rm = k.btn('Remove', function () { stops.splice(i, 1); renderStops(); update(); }, true);
        rm.setAttribute('aria-label', 'Remove colour ' + (i + 1));
        rm.disabled = stops.length <= 2;
        stopsEl.appendChild(k.h('div', { class: 'field-row stop' }, cf.el, pos.el, rm));
      });
    }

    addBtn = k.btn('Add a colour', function () {
      if (stops.length >= 6) return;
      stops.push({ colour: '#ffffff', pos: 50 });
      renderStops();
      update();
    }, true);

    [type.input, angle.input].forEach(function (i) { i.addEventListener('input', update); i.addEventListener('change', update); });
    renderStops();
    update();
    root.appendChild(k.group('', preview, k.row(type.el, angle.el)));
    root.appendChild(k.group('Colours', stopsEl, addBtn));
    root.appendChild(k.group('', out.el));
  });
})();
