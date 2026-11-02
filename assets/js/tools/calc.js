(function () {
  var T = window.ToolshedTools;

  function n(input) {
    var v = parseFloat(input.value);
    return isNaN(v) ? NaN : v;
  }

  T.register('percentage-calculator', function (root, k) {
    // 1. What is X% of Y
    var a1 = k.num('Percent', { step: 'any', value: 15 });
    var b1 = k.num('Of this number', { step: 'any', value: 200 });
    var r1 = k.h('p', { class: 'big-result' });
    k.watch([a1.input, b1.input], function () {
      r1.textContent = k.fmt(n(a1.input) / 100 * n(b1.input), 4);
    });

    // 2. X is what percent of Y
    var a2 = k.num('This number', { step: 'any', value: 30 });
    var b2 = k.num('Is what percent of', { step: 'any', value: 200 });
    var r2 = k.h('p', { class: 'big-result' });
    k.watch([a2.input, b2.input], function () {
      var v = n(a2.input) / n(b2.input) * 100;
      r2.textContent = isFinite(v) ? k.fmt(v, 4) + '%' : '—';
    });

    // 3. Change from X to Y
    var a3 = k.num('From', { step: 'any', value: 80 });
    var b3 = k.num('To', { step: 'any', value: 100 });
    var r3 = k.h('p', { class: 'big-result' });
    k.watch([a3.input, b3.input], function () {
      var from = n(a3.input);
      var v = (n(b3.input) - from) / Math.abs(from) * 100;
      r3.textContent = isFinite(v) ? (v > 0 ? '+' : '') + k.fmt(v, 4) + '%' : '—';
    });

    root.appendChild(k.group('What is X% of Y?', k.row(a1.el, b1.el), r1));
    root.appendChild(k.group('X is what percent of Y?', k.row(a2.el, b2.el), r2));
    root.appendChild(k.group('Percent change', k.row(a3.el, b3.el), r3));
  });

  T.register('tip-splitter', function (root, k) {
    var bill = k.num('Bill', { min: 0, step: '0.01', value: 80 });
    var tip = k.range('Tip %', { min: 0, max: 40, value: 15 });
    var people = k.num('People', { min: 1, step: 1, value: 4 });
    var up = k.check('Round each share up to a whole number');
    var stats = k.stats(['Tip', 'Total', 'Each pays']);
    k.watch([bill.input, tip.input, people.input, up.input], function () {
      var b = n(bill.input);
      var p = Math.max(Math.floor(n(people.input)) || 1, 1);
      var t = b * n(tip.input) / 100;
      var each = (b + t) / p;
      if (up.input.checked) each = Math.ceil(each - 1e-9);
      stats.set({
        Tip: isNaN(b) ? '—' : k.fmt(t, 2),
        Total: isNaN(b) ? '—' : k.fmt(b + t, 2),
        'Each pays': isNaN(b) ? '—' : k.fmt(each, 2)
      });
    });
    root.appendChild(k.group('', k.row(bill.el, people.el), tip.el, up.el, stats.el));
  });

  T.register('loan-calculator', function (root, k) {
    var amount = k.num('Loan amount', { min: 0, step: 'any', value: 250000 });
    var rate = k.num('Yearly interest rate (%)', { min: 0, step: 'any', value: 6.5 });
    var years = k.num('Term (years)', { min: 0.1, step: 'any', value: 25 });
    var stats = k.stats(['Monthly payment', 'Total paid', 'Total interest']);
    k.watch([amount.input, rate.input, years.input], function () {
      var P = n(amount.input);
      var r = n(rate.input) / 100 / 12;
      var m = Math.round(n(years.input) * 12);
      if (!(P >= 0) || !(m > 0) || isNaN(r)) {
        stats.set({ 'Monthly payment': '—', 'Total paid': '—', 'Total interest': '—' });
        return;
      }
      var pay = r === 0 ? P / m : P * r / (1 - Math.pow(1 + r, -m));
      stats.set({
        'Monthly payment': k.fmt(pay, 2),
        'Total paid': k.fmt(pay * m, 2),
        'Total interest': k.fmt(pay * m - P, 2)
      });
    });
    root.appendChild(k.group('', k.row(amount.el, rate.el, years.el), stats.el,
      k.h('p', { class: 'hint', text: 'Standard fixed-rate repayment with monthly compounding. Fees, insurance and taxes are not included.' })));
  });

  T.register('bmi-calculator', function (root, k) {
    var units = k.select('Units', [['metric', 'Metric (cm, kg)'], ['imperial', 'Imperial (in, lb)']], 'metric');
    var h = k.num('Height (cm)', { min: 1, step: 'any', value: 170 });
    var w = k.num('Weight (kg)', { min: 1, step: 'any', value: 68 });
    var stats = k.stats(['BMI', 'Category']);
    var hLabel = h.el.querySelector('.label');
    var wLabel = w.el.querySelector('.label');
    function labels() {
      var metric = units.input.value === 'metric';
      hLabel.textContent = metric ? 'Height (cm)' : 'Height (in)';
      wLabel.textContent = metric ? 'Weight (kg)' : 'Weight (lb)';
    }
    units.input.addEventListener('change', labels);
    k.watch([units.input, h.input, w.input], function () {
      labels();
      var metric = units.input.value === 'metric';
      var m = n(h.input) / (metric ? 100 : 39.3701);
      var kg = n(w.input) / (metric ? 1 : 2.20462);
      var bmi = kg / (m * m);
      if (!isFinite(bmi) || bmi <= 0) {
        stats.set({ BMI: '—', Category: '—' });
        return;
      }
      stats.set({
        BMI: bmi.toFixed(1),
        Category: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy range' : bmi < 30 ? 'Overweight' : 'Obese'
      });
    });
    root.appendChild(k.group('', units.el, k.row(h.el, w.el), stats.el,
      k.h('p', { class: 'hint', text: 'BMI is a rough screening number for adults, not a diagnosis. It ignores muscle, age and build. Talk to a health professional about your own health.' })));
  });
})();
