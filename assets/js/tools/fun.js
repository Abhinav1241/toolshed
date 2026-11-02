(function () {
  var T = window.ToolshedTools;

  T.register('dice-roller', function (root, k) {
    var count = k.num('Number of dice', { min: 1, max: 20, step: 1, value: 2 });
    var sides = k.select('Sides', ['4', '6', '8', '10', '12', '20', '100'], '6');
    var list = k.h('ul', { class: 'chips-out', 'aria-label': 'Dice results' });
    var total = k.h('p', { class: 'big-result', role: 'status', 'aria-live': 'polite' });
    function roll() {
      var c = Math.min(Math.max(parseInt(count.input.value, 10) || 1, 1), 20);
      var s = parseInt(sides.input.value, 10);
      list.textContent = '';
      var sum = 0;
      for (var i = 0; i < c; i++) {
        var v = k.rand(s) + 1;
        sum += v;
        list.appendChild(k.h('li', { text: String(v) }));
      }
      total.textContent = 'Total ' + sum;
    }
    root.appendChild(k.group('', k.row(count.el, sides.el), k.btn('Roll', roll), list, total));
    roll();
  });

  T.register('coin-flip', function (root, k) {
    var result = k.h('p', { class: 'big-result', role: 'status', 'aria-live': 'polite', text: 'Flip the coin' });
    var tally = k.stats(['Heads', 'Tails', 'Flips']);
    var h = 0;
    var t = 0;
    function flip() {
      var head = k.rand(2) === 0;
      if (head) h++; else t++;
      result.textContent = head ? 'Heads' : 'Tails';
      tally.set({ Heads: String(h), Tails: String(t), Flips: String(h + t) });
    }
    function reset() {
      h = 0; t = 0;
      result.textContent = 'Flip the coin';
      tally.set({ Heads: '0', Tails: '0', Flips: '0' });
    }
    root.appendChild(k.group('', result, k.h('div', { class: 'btn-row' }, k.btn('Flip', flip), k.btn('Reset tally', reset, true)), tally.el));
  });

  T.register('random-picker', function (root, k) {
    var src = k.area('Options (one per line)', { rows: 8, placeholder: 'Pizza\nTacos\nSushi' });
    var rm = k.check('Remove the winner from the list after picking');
    var result = k.h('p', { class: 'big-result', role: 'status', 'aria-live': 'polite' });
    function pick() {
      var items = src.input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!items.length) { result.textContent = 'Add some options first'; return; }
      var i = k.rand(items.length);
      result.textContent = items[i];
      if (rm.input.checked) {
        items.splice(i, 1);
        src.input.value = items.join('\n');
      }
    }
    root.appendChild(k.group('', src.el, rm.el, k.btn('Pick one', pick), result));
  });

  T.register('name-shuffler', function (root, k) {
    var src = k.area('Names (one per line)', { rows: 8, placeholder: 'Ada\nGrace\nLinus\nMargaret' });
    var teams = k.num('Number of teams', { min: 1, max: 20, step: 1, value: 2 });
    var grid = k.h('div', { class: 'teams' });
    var status = k.status();
    function shuffle() {
      var names = src.input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var n = Math.min(Math.max(parseInt(teams.input.value, 10) || 1, 1), 20);
      grid.textContent = '';
      if (!names.length) { status.textContent = 'Add some names first'; return; }
      n = Math.min(n, names.length);
      var buckets = [];
      for (var i = 0; i < n; i++) buckets.push([]);
      k.shuffle(names).forEach(function (nm, idx) { buckets[idx % n].push(nm); });
      buckets.forEach(function (b, i) {
        grid.appendChild(k.h('div', { class: 'team' }, k.h('h3', { text: 'Team ' + (i + 1) }),
          k.h('ul', {}, b.map(function (nm) { return k.h('li', { text: nm }); }))));
      });
      status.textContent = names.length + ' names in ' + n + (n === 1 ? ' team' : ' teams');
    }
    root.appendChild(k.group('', src.el, teams.el, k.btn('Shuffle into teams', shuffle), status, grid));
  });
})();
