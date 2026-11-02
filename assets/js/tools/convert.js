(function () {
  var T = window.ToolshedTools;

  T.register('unit-converter', function (root, k) {
    // factor = how many base units in one of this unit
    var KINDS = {
      Length: { base: 'm', units: { millimetre: 0.001, centimetre: 0.01, metre: 1, kilometre: 1000, inch: 0.0254, foot: 0.3048, yard: 0.9144, mile: 1609.344, 'nautical mile': 1852 } },
      Mass: { base: 'kg', units: { milligram: 1e-6, gram: 0.001, kilogram: 1, tonne: 1000, ounce: 0.028349523125, pound: 0.45359237, stone: 6.35029318 } },
      Volume: { base: 'L', units: { millilitre: 0.001, litre: 1, 'cubic metre': 1000, teaspoon: 0.00492892159375, tablespoon: 0.01478676478125, 'fluid ounce (US)': 0.0295735295625, cup: 0.2365882365, 'pint (US)': 0.473176473, 'gallon (US)': 3.785411784 } },
      Area: { base: 'm²', units: { 'square centimetre': 0.0001, 'square metre': 1, hectare: 10000, 'square kilometre': 1e6, 'square inch': 0.00064516, 'square foot': 0.09290304, acre: 4046.8564224, 'square mile': 2589988.110336 } },
      Speed: { base: 'm/s', units: { 'metre/second': 1, 'kilometre/hour': 1 / 3.6, 'mile/hour': 0.44704, knot: 0.514444444, 'foot/second': 0.3048 } },
      Time: { base: 's', units: { millisecond: 0.001, second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, year: 31557600 } },
      'Data size': { base: 'B', units: { bit: 0.125, byte: 1, kilobyte: 1000, megabyte: 1e6, gigabyte: 1e9, terabyte: 1e12, kibibyte: 1024, mebibyte: 1048576, gibibyte: 1073741824 } }
    };
    var kind = k.select('Quantity', Object.keys(KINDS), 'Length');
    var val = k.num('Value', { step: 'any', value: 1 });
    var from = k.select('From', ['x']);
    var to = k.select('To', ['x']);
    var out = k.h('p', { class: 'big-result' });
    var table = k.h('ul', { class: 'notes' });

    function fill() {
      var names = Object.keys(KINDS[kind.input.value].units);
      [from.input, to.input].forEach(function (sel, i) {
        sel.textContent = '';
        names.forEach(function (nm) { sel.appendChild(k.h('option', { value: nm, text: nm })); });
        sel.value = names[i === 0 ? Math.min(2, names.length - 1) : Math.min(3, names.length - 1)];
      });
    }
    function calc() {
      var u = KINDS[kind.input.value].units;
      var v = parseFloat(val.input.value);
      table.textContent = '';
      if (isNaN(v)) { out.textContent = '—'; return; }
      var base = v * u[from.input.value];
      var res = base / u[to.input.value];
      out.textContent = k.fmt(res, 8) + ' ' + to.input.value;
      Object.keys(u).forEach(function (nm) {
        if (nm !== from.input.value) table.appendChild(k.h('li', { text: k.fmt(base / u[nm], 8) + ' ' + nm }));
      });
    }
    kind.input.addEventListener('change', function () { fill(); calc(); });
    fill();
    k.watch([val.input, from.input, to.input], calc);
    root.appendChild(k.group('', kind.el, k.row(val.el, from.el, to.el), out));
    root.appendChild(k.group('Same value in every unit', table));
  });

  T.register('temperature-converter', function (root, k) {
    var c = k.num('Celsius (°C)', { step: 'any' });
    var f = k.num('Fahrenheit (°F)', { step: 'any' });
    var kel = k.num('Kelvin (K)', { step: 'any' });
    function round(x) { return String(Math.round(x * 1e6) / 1e6); }
    function setAll(celsius, skip) {
      if (skip !== c.input) c.input.value = round(celsius);
      if (skip !== f.input) f.input.value = round(celsius * 9 / 5 + 32);
      if (skip !== kel.input) kel.input.value = round(celsius + 273.15);
    }
    function clear(skip) {
      [c, f, kel].forEach(function (x) { if (x.input !== skip) x.input.value = ''; });
    }
    function bind(field, toC) {
      field.input.addEventListener('input', function () {
        var v = parseFloat(field.input.value);
        if (isNaN(v)) { clear(field.input); return; }
        setAll(toC(v), field.input);
      });
    }
    bind(c, function (v) { return v; });
    bind(f, function (v) { return (v - 32) * 5 / 9; });
    bind(kel, function (v) { return v - 273.15; });
    c.input.value = '20';
    setAll(20, c.input);
    root.appendChild(k.group('', k.row(c.el, f.el, kel.el),
      k.h('p', { class: 'hint', text: 'Type in any box and the others update.' })));
  });

  T.register('number-bases', function (root, k) {
    var DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
    var src = k.text('Number', { value: '255' });
    var base = k.select('Base of the number', [['2', 'Binary (2)'], ['8', 'Octal (8)'], ['10', 'Decimal (10)'], ['16', 'Hexadecimal (16)'], ['36', 'Base 36']], '10');
    var status = k.status();
    var stats = k.stats(['Binary', 'Octal', 'Decimal', 'Hexadecimal', 'Base 36']);
    function parse(s, b) {
      s = s.trim().toLowerCase().replace(/^0[xbo]/, '').replace(/[\s_,]/g, '');
      if (!s) return null;
      var neg = false;
      if (s[0] === '-') { neg = true; s = s.slice(1); }
      var v = 0n;
      var B = BigInt(b);
      for (var i = 0; i < s.length; i++) {
        var d = DIGITS.indexOf(s[i]);
        if (d < 0 || d >= b) throw new Error('"' + s[i] + '" is not a valid digit in base ' + b + '.');
        v = v * B + BigInt(d);
      }
      return neg ? -v : v;
    }
    k.watch([src.input, base.input], function () {
      status.classList.remove('is-error');
      status.textContent = '';
      var none = { Binary: '—', Octal: '—', Decimal: '—', Hexadecimal: '—', 'Base 36': '—' };
      try {
        var v = parse(src.input.value, parseInt(base.input.value, 10));
        if (v === null) { stats.set(none); return; }
        stats.set({ Binary: v.toString(2), Octal: v.toString(8), Decimal: v.toString(10), Hexadecimal: v.toString(16).toUpperCase(), 'Base 36': v.toString(36).toUpperCase() });
      } catch (e) {
        stats.set(none);
        status.classList.add('is-error');
        status.textContent = e.message;
      }
    });
    root.appendChild(k.group('', k.row(src.el, base.el), status, stats.el));
  });

  T.register('roman-numerals', function (root, k) {
    var PAIRS = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var num = k.num('Number (1 to 3999)', { min: 1, max: 3999, step: 1 });
    var rom = k.text('Roman numeral', { placeholder: 'e.g. MCMXCIV' });
    var status = k.status();
    function toRoman(n) {
      var s = '';
      PAIRS.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
      return s;
    }
    function fromRoman(s) {
      var i = 0;
      var total = 0;
      PAIRS.forEach(function (p) {
        while (s.slice(i, i + p[1].length) === p[1]) { total += p[0]; i += p[1].length; }
      });
      return i === s.length && toRoman(total) === s ? total : NaN;
    }
    num.input.addEventListener('input', function () {
      status.classList.remove('is-error');
      var v = parseInt(num.input.value, 10);
      if (isNaN(v)) { rom.input.value = ''; status.textContent = ''; return; }
      if (v < 1 || v > 3999) { rom.input.value = ''; status.classList.add('is-error'); status.textContent = 'Use a whole number from 1 to 3999.'; return; }
      rom.input.value = toRoman(v);
      status.textContent = '';
    });
    rom.input.addEventListener('input', function () {
      status.classList.remove('is-error');
      var s = rom.input.value.trim().toUpperCase();
      if (!s) { num.input.value = ''; status.textContent = ''; return; }
      var v = fromRoman(s);
      if (isNaN(v)) { num.input.value = ''; status.classList.add('is-error'); status.textContent = 'That is not a valid Roman numeral.'; return; }
      num.input.value = v;
      status.textContent = '';
    });
    num.input.value = '2024';
    rom.input.value = toRoman(2024);
    root.appendChild(k.group('', k.row(num.el, rom.el), status,
      k.h('p', { class: 'hint', text: 'Type in either box and the other updates.' })));
  });
})();
