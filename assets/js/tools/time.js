(function () {
  var T = window.ToolshedTools;

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  function localInputValue(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ---------- Timezone converter ---------- */
  T.register('timezone-converter', function (root, k) {
    var FALLBACK = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris',
      'Europe/Berlin', 'Europe/Moscow', 'Africa/Cairo', 'Africa/Lagos', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo',
      'Australia/Sydney', 'Pacific/Auckland'];
    var zones;
    try { zones = Intl.supportedValuesOf('timeZone'); } catch (e) { zones = FALLBACK; }
    if (zones.indexOf('UTC') === -1) zones = ['UTC'].concat(zones);
    var here = 'UTC';
    try { here = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { /* ignore */ }

    function offsetMinutes(zone, ms) {
      var p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
        .formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; });
      var asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      return (asUtc - Math.floor(ms / 1000) * 1000) / 60000;
    }

    function toInstant(value, zone) {
      var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
      if (!m) return NaN;
      var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      var off = offsetMinutes(zone, guess);
      var t = guess - off * 60000;
      var off2 = offsetMinutes(zone, t);
      return off2 === off ? t : guess - off2 * 60000;
    }

    function show(zone, ms) {
      var opts = { timeZone: zone, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'shortOffset' };
      try { return new Intl.DateTimeFormat(undefined, opts).format(new Date(ms)); } catch (e) {
        opts.timeZoneName = 'short';
        return new Intl.DateTimeFormat(undefined, opts).format(new Date(ms));
      }
    }

    var when = k.text('Date and time', { type: 'datetime-local', value: localInputValue(new Date()) });
    var from = k.select('In this time zone', zones, zones.indexOf(here) !== -1 ? here : 'UTC');
    var list = k.h('ul', { class: 'zone-list' });
    var addSel = k.select('Add a zone', zones, 'UTC');
    var targets = [here, 'UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'].filter(function (z, i, a) {
      return zones.indexOf(z) !== -1 && a.indexOf(z) === i;
    });
    var status = k.status();

    function render() {
      list.textContent = '';
      var t = toInstant(when.input.value, from.input.value);
      if (isNaN(t)) { status.textContent = 'Pick a date and time.'; return; }
      status.textContent = '';
      targets.forEach(function (z, i) {
        var rm = k.h('button', { type: 'button', class: 'btn btn-ghost', text: 'Remove', 'aria-label': 'Remove ' + z, onclick: function () { targets.splice(i, 1); render(); } });
        list.appendChild(k.h('li', {}, k.h('div', {}, k.h('strong', { text: z.replace(/_/g, ' ') }), k.h('div', { text: show(z, t) })), rm));
      });
    }

    k.watch([when.input, from.input], render);
    var add = k.btn('Add', function () {
      if (targets.indexOf(addSel.input.value) === -1) targets.push(addSel.input.value);
      render();
    }, true);
    root.appendChild(k.group('', k.row(when.el, from.el), status));
    root.appendChild(k.group('Same moment elsewhere', list, k.row(addSel.el, add)));
  });

  /* ---------- Date difference ---------- */
  T.register('date-difference', function (root, k) {
    var today = new Date();
    var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    var a = k.text('Start date', { type: 'date', value: iso(new Date(today.getFullYear(), 0, 1)) });
    var b = k.text('End date', { type: 'date', value: iso(today) });
    var inc = k.check('Count the end date too');
    var stats = k.stats(['Difference', 'Total days', 'Weeks', 'Business days (Mon–Fri)', 'Hours']);
    var status = k.status();

    function parse(v) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
      return m ? { y: +m[1], m: +m[2], d: +m[3], t: Date.UTC(+m[1], +m[2] - 1, +m[3]) } : null;
    }

    k.watch([a.input, b.input, inc.input], function () {
      var x = parse(a.input.value);
      var y = parse(b.input.value);
      if (!x || !y) { status.textContent = 'Pick two dates.'; return; }
      status.textContent = x.t > y.t ? 'The start is after the end, so the answer counts backwards.' : '';
      if (x.t > y.t) { var s = x; x = y; y = s; }
      // Whole months first (clamping 31 Jan + 1 month to the end of February), then leftover days
      var whole = (y.y - x.y) * 12 + (y.m - x.m) - (y.d < x.d ? 1 : 0);
      var anchorMonth = x.m - 1 + whole;
      var lastDay = new Date(Date.UTC(x.y, anchorMonth + 1, 0)).getUTCDate();
      var anchor = Date.UTC(x.y, anchorMonth, Math.min(x.d, lastDay));
      if (anchor > y.t) { whole--; anchorMonth--; anchor = Date.UTC(x.y, anchorMonth, Math.min(x.d, new Date(Date.UTC(x.y, anchorMonth + 1, 0)).getUTCDate())); }
      var years = Math.floor(whole / 12);
      var months = whole % 12;
      var days = Math.round((y.t - anchor) / 864e5);
      var total = Math.round((y.t - x.t) / 864e5) + (inc.input.checked ? 1 : 0);
      var biz = 0;
      var span = Math.round((y.t - x.t) / 864e5) + (inc.input.checked ? 1 : 0);
      for (var i = 0; i < span && i < 400000; i++) {
        var wd = new Date(x.t + i * 864e5).getUTCDay();
        if (wd !== 0 && wd !== 6) biz++;
      }
      var part = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
      stats.set({
        Difference: [years && part(years, 'year'), months && part(months, 'month'), part(days, 'day')].filter(Boolean).join(', '),
        'Total days': k.fmt(total, 0),
        Weeks: k.fmt(Math.floor(total / 7), 0) + (total % 7 ? ' and ' + part(total % 7, 'day') : ''),
        'Business days (Mon–Fri)': k.fmt(biz, 0),
        Hours: k.fmt(total * 24, 0)
      });
    });
    root.appendChild(k.group('', k.row(a.el, b.el), inc.el, status, stats.el));
  });

  /* ---------- Countdown timer ---------- */
  T.register('countdown-timer', function (root, k) {
    var mode = k.select('Count down', [['date', 'To a date and time'], ['timer', 'A timer (minutes and seconds)']], 'date');
    var soon = new Date(Date.now() + 7 * 864e5);
    soon.setHours(9, 0, 0, 0);
    var target = k.text('Target', { type: 'datetime-local', value: localInputValue(soon) });
    var mins = k.num('Minutes', { min: 0, max: 999, step: 1, value: 5 });
    var secs = k.num('Seconds', { min: 0, max: 59, step: 1, value: 0 });
    var display = k.h('p', { class: 'big-result timer-display', 'aria-hidden': 'true' });
    var label = k.h('p', { class: 'sr-only', role: 'timer' });
    var status = k.status();
    var dateRow = k.row(target.el);
    var timerRow = k.row(mins.el, secs.el);
    var startBtn = k.btn('Start', start);
    var resetBtn = k.btn('Reset', reset, true);
    var btns = k.h('div', { class: 'btn-row' }, startBtn, resetBtn);
    var tick = null;
    var endAt = 0;
    var remaining = 0;
    var running = false;

    function fmtDur(ms) {
      var s = Math.max(Math.ceil(ms / 1000), 0);
      var d = Math.floor(s / 86400);
      var h = Math.floor(s % 86400 / 3600);
      var m = Math.floor(s % 3600 / 60);
      return (d ? d + 'd ' : '') + pad(h) + ':' + pad(m) + ':' + pad(s % 60);
    }

    function paintDate() {
      var t = new Date(target.input.value).getTime();
      if (isNaN(t)) { display.textContent = '--:--:--'; status.textContent = 'Pick a date and time.'; return; }
      var diff = t - Date.now();
      display.textContent = diff >= 0 ? fmtDur(diff) : '00:00:00';
      status.textContent = diff >= 0 ? '' : 'That moment passed ' + fmtDur(-diff).replace(/^0+:?/, '') + ' ago.';
    }

    function paintTimer() {
      var left = running ? endAt - Date.now() : remaining;
      if (running && left <= 0) {
        running = false;
        remaining = 0;
        clearInterval(tick);
        display.textContent = '00:00:00';
        startBtn.textContent = 'Start';
        status.textContent = "Time's up!";
        k.beep();
        return;
      }
      display.textContent = fmtDur(running ? left : remaining);
    }

    function start() {
      if (mode.input.value !== 'timer') return;
      if (running) {
        remaining = endAt - Date.now();
        running = false;
        clearInterval(tick);
        startBtn.textContent = 'Resume';
        return;
      }
      if (!remaining) remaining = ((+mins.input.value || 0) * 60 + (+secs.input.value || 0)) * 1000;
      if (remaining <= 0) { status.textContent = 'Set some time first.'; return; }
      status.textContent = '';
      endAt = Date.now() + remaining;
      running = true;
      startBtn.textContent = 'Pause';
      clearInterval(tick);
      tick = setInterval(paintTimer, 200);
      paintTimer();
    }

    function reset() {
      running = false;
      remaining = 0;
      clearInterval(tick);
      startBtn.textContent = 'Start';
      status.textContent = '';
      setup();
    }

    function setup() {
      clearInterval(tick);
      var isDate = mode.input.value === 'date';
      dateRow.hidden = !isDate;
      timerRow.hidden = isDate;
      btns.hidden = isDate;
      if (isDate) {
        running = false;
        paintDate();
        tick = setInterval(paintDate, 1000);
      } else {
        remaining = ((+mins.input.value || 0) * 60 + (+secs.input.value || 0)) * 1000;
        display.textContent = fmtDur(remaining);
      }
    }

    [mode.input, target.input, mins.input, secs.input].forEach(function (i) {
      i.addEventListener('input', function () { if (!running) { remaining = 0; startBtn.textContent = 'Start'; setup(); } });
      i.addEventListener('change', function () { if (!running) { remaining = 0; startBtn.textContent = 'Start'; setup(); } });
    });
    root.appendChild(k.group('', mode.el, dateRow, timerRow, display, btns, status));
    setup();
  });

  /* ---------- Unix timestamp ---------- */
  T.register('unix-timestamp', function (root, k) {
    var ts = k.text('Timestamp (seconds or milliseconds)', { value: String(Math.floor(Date.now() / 1000)), inputMode: 'numeric' });
    var res = k.stats(['UTC', 'Your time zone', 'ISO 8601', 'Relative']);
    var status = k.status();
    var dt = k.text('Or pick a date and time', { type: 'datetime-local', value: localInputValue(new Date()) });
    var res2 = k.stats(['Seconds', 'Milliseconds']);

    function rel(ms) {
      var diff = Math.round((ms - Date.now()) / 1000);
      var abs = Math.abs(diff);
      if (abs < 2) return 'right now';
      var units = [['year', 31557600], ['month', 2629800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
      for (var i = 0; i < units.length; i++) {
        if (abs >= units[i][1] || i === units.length - 1) {
          var n = Math.round(abs / units[i][1]);
          var s = n + ' ' + units[i][0] + (n === 1 ? '' : 's');
          return diff >= 0 ? 'in ' + s : s + ' ago';
        }
      }
      return '';
    }

    k.watch([ts.input], function () {
      var v = ts.input.value.trim();
      status.classList.remove('is-error');
      status.textContent = '';
      if (!/^-?\d+(\.\d+)?$/.test(v)) {
        res.set({ UTC: '—', 'Your time zone': '—', 'ISO 8601': '—', Relative: '—' });
        if (v) { status.classList.add('is-error'); status.textContent = 'Enter a number.'; }
        return;
      }
      var n = parseFloat(v);
      var ms = Math.abs(n) >= 1e11 ? n : n * 1000;
      var d = new Date(ms);
      if (isNaN(d.getTime())) { status.classList.add('is-error'); status.textContent = 'That is outside the supported date range.'; return; }
      res.set({
        UTC: d.toUTCString(),
        'Your time zone': d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' }),
        'ISO 8601': d.toISOString(),
        Relative: rel(ms)
      });
      status.textContent = Math.abs(n) >= 1e11 ? 'Read as milliseconds.' : 'Read as seconds.';
    });

    k.watch([dt.input], function () {
      var d = new Date(dt.input.value);
      if (isNaN(d.getTime())) { res2.set({ Seconds: '—', Milliseconds: '—' }); return; }
      res2.set({ Seconds: String(Math.floor(d.getTime() / 1000)), Milliseconds: String(d.getTime()) });
    });

    var nowBtn = k.btn('Use the current time', function () {
      ts.input.value = String(Math.floor(Date.now() / 1000));
      ts.input.dispatchEvent(new Event('input', { bubbles: true }));
    }, true);
    root.appendChild(k.group('Timestamp to date', ts.el, nowBtn, status, res.el));
    root.appendChild(k.group('Date to timestamp', dt.el, res2.el));
  });
})();
