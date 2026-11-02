(function () {
  var T = window.ToolshedTools;

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }

  /* ---------- Fractions ---------- */
  T.register('fractions', function (root, k) {
    var an = k.num('Numerator', { step: 1, value: 1 });
    var ad = k.num('Denominator', { step: 1, value: 2, min: 1 });
    var op = k.select('Operation', [['+', 'Add (+)'], ['-', 'Subtract (−)'], ['*', 'Multiply (×)'], ['/', 'Divide (÷)']], '+');
    var bn = k.num('Numerator', { step: 1, value: 1 });
    var bd = k.num('Denominator', { step: 1, value: 3, min: 1 });
    var stats = k.stats(['Result', 'Simplified', 'Mixed number', 'Decimal']);
    var status = k.status();

    function whole(v) { return /^-?\d+$/.test(String(v).trim()); }

    k.watch([an.input, ad.input, op.input, bn.input, bd.input], function () {
      status.classList.remove('is-error');
      status.textContent = '';
      var vals = [an, ad, bn, bd].map(function (f) { return f.input.value; });
      if (!vals.every(whole)) { status.textContent = 'Use whole numbers in all four boxes.'; stats.set({ Result: '—', Simplified: '—', 'Mixed number': '—', Decimal: '—' }); return; }
      var n1 = +vals[0], d1 = +vals[1], n2 = +vals[2], d2 = +vals[3];
      if (d1 === 0 || d2 === 0) { status.classList.add('is-error'); status.textContent = 'A denominator cannot be zero.'; return; }
      var n, d;
      switch (op.input.value) {
        case '+': n = n1 * d2 + n2 * d1; d = d1 * d2; break;
        case '-': n = n1 * d2 - n2 * d1; d = d1 * d2; break;
        case '*': n = n1 * n2; d = d1 * d2; break;
        default:
          if (n2 === 0) { status.classList.add('is-error'); status.textContent = 'You cannot divide by zero.'; return; }
          n = n1 * d2; d = d1 * n2;
      }
      if (d < 0) { n = -n; d = -d; }
      var g = gcd(n, d) || 1;
      var sn = n / g, sd = d / g;
      var mixed = sn;
      if (sd !== 1 && Math.abs(sn) > sd) {
        var w = Math.trunc(sn / sd);
        mixed = w + ' ' + Math.abs(sn % sd) + '/' + sd;
      } else if (sd !== 1) mixed = sn + '/' + sd;
      stats.set({
        Result: n + '/' + d,
        Simplified: sd === 1 ? String(sn) : sn + '/' + sd,
        'Mixed number': String(mixed),
        Decimal: k.fmt(n / d, 8)
      });
    });
    root.appendChild(k.group('First fraction', k.row(an.el, ad.el)));
    root.appendChild(k.group('', op.el));
    root.appendChild(k.group('Second fraction', k.row(bn.el, bd.el)));
    root.appendChild(k.group('Answer', status, stats.el));
  });

  /* ---------- Prime checker ---------- */
  T.register('prime-checker', function (root, k) {
    var LIMIT = 1e15;
    var n = k.text('A whole number', { value: '97', inputMode: 'numeric' });
    var stats = k.stats(['Is it prime?', 'Prime factors', 'Previous prime', 'Next prime']);
    var status = k.status();

    function isPrime(x) {
      if (x < 2) return false;
      if (x < 4) return true;
      if (x % 2 === 0 || x % 3 === 0) return false;
      for (var i = 5; i * i <= x; i += 6) if (x % i === 0 || x % (i + 2) === 0) return false;
      return true;
    }
    function factors(x) {
      var out = {};
      var order = [];
      function add(p) { if (!out[p]) { out[p] = 0; order.push(p); } out[p]++; }
      while (x % 2 === 0) { add(2); x /= 2; }
      for (var p = 3; p * p <= x; p += 2) while (x % p === 0) { add(p); x /= p; }
      if (x > 1) add(x);
      return order.map(function (p) { return out[p] > 1 ? p + '^' + out[p] : String(p); }).join(' × ');
    }

    k.watch([n.input], function () {
      status.classList.remove('is-error');
      status.textContent = '';
      var v = n.input.value.trim().replace(/[,_ ]/g, '');
      if (!/^\d+$/.test(v)) { stats.set({ 'Is it prime?': '—', 'Prime factors': '—', 'Previous prime': '—', 'Next prime': '—' }); if (v) { status.classList.add('is-error'); status.textContent = 'Enter a whole number, 0 or more.'; } return; }
      var x = Number(v);
      if (x > LIMIT) { status.classList.add('is-error'); status.textContent = 'Keep it at or under ' + k.fmt(LIMIT, 0) + ' so the check stays quick and exact.'; return; }
      var prime = isPrime(x);
      var prev = x - 1;
      while (prev >= 2 && !isPrime(prev)) prev--;
      var next = x + 1;
      while (!isPrime(next)) next++;
      stats.set({
        'Is it prime?': prime ? 'Yes' : (x < 2 ? 'No (primes start at 2)' : 'No'),
        'Prime factors': x < 2 ? '—' : (prime ? 'itself' : factors(x)),
        'Previous prime': prev >= 2 ? k.fmt(prev, 0) : 'none',
        'Next prime': k.fmt(next, 0)
      });
    });

    var upTo = k.num('List primes up to', { min: 2, max: 100000, step: 1, value: 100 });
    var list = k.out('Primes', { rows: 4 });
    k.watch([upTo.input], function () {
      var m = Math.min(Math.floor(+upTo.input.value) || 0, 100000);
      if (m < 2) { list.set(''); return; }
      var sieve = new Uint8Array(m + 1);
      var res = [];
      for (var i = 2; i <= m; i++) {
        if (!sieve[i]) { res.push(i); for (var j = i * i; j <= m; j += i) sieve[j] = 1; }
      }
      list.set(res.join(', ') + '\n\n' + res.length + ' primes');
    });
    root.appendChild(k.group('', n.el, status, stats.el));
    root.appendChild(k.group('Sieve of Eratosthenes', upTo.el, list.el));
  });

  /* ---------- Statistics ---------- */
  T.register('statistics', function (root, k) {
    var box = k.area('Numbers (separated by commas, spaces or new lines)', { value: '4, 8, 15, 16, 23, 42', rows: 4 });
    var stats = k.stats(['Count', 'Sum', 'Mean', 'Median', 'Mode', 'Min', 'Max', 'Range', 'Q1', 'Q3', 'Std dev (population)', 'Std dev (sample)', 'Variance (population)', 'Variance (sample)']);
    var status = k.status();

    function quantile(sorted, p) {
      var pos = (sorted.length - 1) * p;
      var lo = Math.floor(pos);
      var hi = Math.ceil(pos);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    }

    k.watch([box.input], function () {
      var tokens = box.input.value.split(/[\s,;]+/).filter(Boolean);
      var nums = tokens.map(Number);
      var bad = tokens.filter(function (t, i) { return isNaN(nums[i]); });
      status.classList.remove('is-error');
      status.textContent = '';
      stats.set({ Count: '0', Sum: '—', Mean: '—', Median: '—', Mode: '—', Min: '—', Max: '—', Range: '—', Q1: '—', Q3: '—',
        'Std dev (population)': '—', 'Std dev (sample)': '—', 'Variance (population)': '—', 'Variance (sample)': '—' });
      if (bad.length) { status.classList.add('is-error'); status.textContent = 'Not a number: ' + bad.slice(0, 3).join(', ') + (bad.length > 3 ? '…' : ''); return; }
      if (!nums.length) return;
      var s = nums.slice().sort(function (a, b) { return a - b; });
      var n = s.length;
      var sum = nums.reduce(function (a, b) { return a + b; }, 0);
      var mean = sum / n;
      var ss = nums.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0);
      var counts = {};
      var best = 0;
      nums.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; if (counts[x] > best) best = counts[x]; });
      var modes = best === 1 ? 'none (all different)' : Object.keys(counts).filter(function (x) { return counts[x] === best; }).map(Number).sort(function (a, b) { return a - b; }).join(', ');
      stats.set({
        Count: k.fmt(n, 0),
        Sum: k.fmt(sum, 6),
        Mean: k.fmt(mean, 6),
        Median: k.fmt(quantile(s, 0.5), 6),
        Mode: modes,
        Min: k.fmt(s[0], 6),
        Max: k.fmt(s[n - 1], 6),
        Range: k.fmt(s[n - 1] - s[0], 6),
        Q1: k.fmt(quantile(s, 0.25), 6),
        Q3: k.fmt(quantile(s, 0.75), 6),
        'Std dev (population)': k.fmt(Math.sqrt(ss / n), 6),
        'Std dev (sample)': n > 1 ? k.fmt(Math.sqrt(ss / (n - 1)), 6) : '—',
        'Variance (population)': k.fmt(ss / n, 6),
        'Variance (sample)': n > 1 ? k.fmt(ss / (n - 1), 6) : '—'
      });
      status.textContent = 'Quartiles use linear interpolation.';
    });
    root.appendChild(k.group('', box.el, status, stats.el));
  });

  /* ---------- Number to words ---------- */
  T.register('number-to-words', function (root, k) {
    var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    var SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion'];

    function below1000(n) {
      var parts = [];
      if (n >= 100) { parts.push(ONES[Math.floor(n / 100)] + ' hundred'); n %= 100; }
      if (n >= 20) { parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')); }
      else if (n > 0 || !parts.length) parts.push(ONES[n]);
      return parts.join(' ');
    }
    function words(big) {
      if (big === 0n) return 'zero';
      var groups = [];
      while (big > 0n) { groups.push(Number(big % 1000n)); big /= 1000n; }
      var out = [];
      for (var i = groups.length - 1; i >= 0; i--) {
        if (groups[i] === 0) continue;
        out.push(below1000(groups[i]) + (SCALES[i] ? ' ' + SCALES[i] : ''));
      }
      return out.join(' ');
    }
    function ordinal(w) {
      var irregular = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
      var m = /^(.*?)([a-z]+)$/.exec(w);
      if (!m) return w;
      var last = m[2];
      if (irregular[last]) last = irregular[last];
      else if (/y$/.test(last)) last = last.replace(/y$/, 'ieth');
      else last += 'th';
      return m[1] + last;
    }

    var n = k.text('Number', { value: '1234567.89', inputMode: 'decimal' });
    var cents = k.check('Say decimals as cents (cheque style)', false);
    var plain = k.out('In words', { rows: 3 });
    var ord = k.out('As an ordinal', { rows: 2 });
    var status = k.status();

    k.watch([n.input, cents.input], function () {
      status.classList.remove('is-error');
      status.textContent = '';
      plain.set('');
      ord.set('');
      var v = n.input.value.trim().replace(/[,_ ]/g, '');
      if (!v) return;
      var m = /^(-)?(\d+)(?:\.(\d+))?$/.exec(v);
      if (!m) { status.classList.add('is-error'); status.textContent = 'Enter a plain number such as 42, -7 or 3.14.'; return; }
      if (m[2].length > 36) { status.classList.add('is-error'); status.textContent = 'That is more than 36 digits, which is past "decillion".'; return; }
      var intPart = BigInt(m[2]);
      var text = words(intPart);
      var frac = m[3];
      if (frac) {
        if (cents.input.checked) {
          var c = (frac + '00').slice(0, 2);
          text += ' and ' + c + '/100';
          if (frac.length > 2) status.textContent = 'Only the first two decimal places are used.';
        } else {
          text += ' point ' + frac.split('').map(function (d) { return ONES[+d]; }).join(' ');
        }
      }
      if (m[1] && (intPart !== 0n || /[1-9]/.test(frac || ''))) text = 'minus ' + text;
      plain.set(text);
      ord.set(!frac && !m[1] ? ordinal(text) : '—');
      if (frac && !status.textContent) status.textContent = 'Ordinals are for whole numbers only.';
    });
    root.appendChild(k.group('', n.el, cents.el, status, plain.el, ord.el));
  });
})();
