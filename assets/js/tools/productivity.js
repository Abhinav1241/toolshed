(function () {
  var T = window.ToolshedTools;

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function clock(ms) {
    var s = Math.max(Math.ceil(ms / 1000), 0);
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }

  /* ---------- Pomodoro timer ---------- */
  T.register('pomodoro-timer', function (root, k) {
    var saved = k.store.get('pomodoro', {});
    var focus = k.num('Focus (min)', { min: 1, max: 180, step: 1, value: saved.focus || 25 });
    var short = k.num('Short break (min)', { min: 1, max: 60, step: 1, value: saved.short || 5 });
    var long = k.num('Long break (min)', { min: 1, max: 90, step: 1, value: saved.long || 15 });
    var every = k.num('Long break after', { min: 2, max: 10, step: 1, value: saved.every || 4 });
    var phaseEl = k.h('p', { class: 'label pomo-phase' });
    var display = k.h('p', { class: 'big-result timer-display', 'aria-hidden': 'true' });
    var live = k.h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    var count = k.h('p', { class: 'label' });
    var startBtn = k.btn('Start', toggle);
    var skipBtn = k.btn('Skip', function () { next(false); }, true);
    var resetBtn = k.btn('Reset', reset, true);
    var phase = 'focus';
    var done = 0;
    var running = false;
    var endAt = 0;
    var left = 0;
    var tick = null;
    var baseTitle = document.title;

    function minutes(p) {
      var f = { focus: focus, short: short, long: long }[p];
      return Math.max(Math.floor(+f.input.value) || 1, 1);
    }
    function label() {
      return { focus: 'Focus', short: 'Short break', long: 'Long break' }[phase];
    }
    function paint() {
      var ms = running ? endAt - Date.now() : left;
      display.textContent = clock(ms);
      phaseEl.textContent = label() + (running || ms >= minutes(phase) * 60000 ? '' : ' (paused)');
      count.textContent = 'Focus sessions finished: ' + done;
      document.title = running ? clock(ms) + ' · ' + label() : baseTitle;
    }
    function load() {
      left = minutes(phase) * 60000;
      running = false;
      clearInterval(tick);
      startBtn.textContent = 'Start';
      paint();
    }
    function next(auto) {
      if (phase === 'focus') {
        if (auto) done++;
        phase = done > 0 && done % Math.max(Math.floor(+every.input.value) || 4, 1) === 0 && auto ? 'long' : 'short';
        if (!auto) phase = 'short';
      } else phase = 'focus';
      load();
      if (auto) { live.textContent = label() + ' time.'; start(); }
    }
    function start() {
      endAt = Date.now() + left;
      running = true;
      startBtn.textContent = 'Pause';
      clearInterval(tick);
      tick = setInterval(function () {
        if (endAt - Date.now() <= 0) { k.beep(); next(true); } else paint();
      }, 250);
      paint();
    }
    function toggle() {
      if (running) {
        left = endAt - Date.now();
        running = false;
        clearInterval(tick);
        startBtn.textContent = 'Resume';
        paint();
      } else start();
    }
    function reset() { phase = 'focus'; done = 0; load(); live.textContent = ''; }

    [focus, short, long, every].forEach(function (f) {
      f.input.addEventListener('change', function () {
        k.store.set('pomodoro', { focus: +focus.input.value, short: +short.input.value, long: +long.input.value, every: +every.input.value });
        if (!running) load();
      });
    });
    window.addEventListener('pagehide', function () { document.title = baseTitle; });

    root.appendChild(k.group('', phaseEl, display, live, k.h('div', { class: 'btn-row' }, startBtn, skipBtn, resetBtn), count));
    root.appendChild(k.group('Lengths', k.row(focus.el, short.el), k.row(long.el, every.el)));
    load();
  });

  /* ---------- Checklist ---------- */
  T.register('checklist', function (root, k) {
    var items = k.store.get('checklist', [{ text: 'Try the checklist', done: false }]);
    if (!Array.isArray(items)) items = [];
    var list = k.h('ul', { class: 'todo-list' });
    var input = k.text('New item', { placeholder: 'Write it, press Enter' });
    var summary = k.h('p', { class: 'label', role: 'status', 'aria-live': 'polite' });

    function save() { k.store.set('checklist', items); }

    function render(focusIndex) {
      list.textContent = '';
      items.forEach(function (it, i) {
        var cb = k.h('input', { type: 'checkbox', checked: !!it.done, 'aria-label': 'Done: ' + it.text });
        cb.addEventListener('change', function () { it.done = cb.checked; save(); render(); });
        var del = k.h('button', { type: 'button', class: 'btn btn-ghost', text: 'Delete', 'aria-label': 'Delete ' + it.text });
        del.addEventListener('click', function () { items.splice(i, 1); save(); render(Math.min(i, items.length - 1)); });
        var label = k.h('label', { class: 'todo-text' + (it.done ? ' is-done' : '') }, cb, k.h('span', { text: it.text }));
        list.appendChild(k.h('li', {}, label, del));
      });
      var d = items.filter(function (x) { return x.done; }).length;
      summary.textContent = items.length ? d + ' of ' + items.length + ' done' : 'Nothing here yet.';
      if (typeof focusIndex === 'number' && focusIndex >= 0) {
        var btns = list.querySelectorAll('.btn');
        if (btns[focusIndex]) btns[focusIndex].focus();
      } else if (focusIndex === -1) input.input.focus();
    }

    function add() {
      var v = input.input.value.trim();
      if (!v) return;
      items.push({ text: v.slice(0, 300), done: false });
      input.input.value = '';
      save();
      render();
      input.input.focus();
    }
    input.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });

    var addBtn = k.btn('Add', add);
    var clearDone = k.btn('Clear finished', function () { items = items.filter(function (x) { return !x.done; }); save(); render(); }, true);
    var clearAll = k.btn('Clear all', function () { if (!items.length || confirm('Remove every item?')) { items = []; save(); render(); } }, true);
    root.appendChild(k.group('', k.row(input.el, addBtn), summary, list, k.h('div', { class: 'btn-row' }, clearDone, clearAll)));
    root.appendChild(k.h('p', { class: 'label', text: 'Saved in this browser only.' }));
    render();
  });

  /* ---------- Notepad ---------- */
  T.register('notepad', function (root, k) {
    var area = k.area('Your notes', { rows: 14, value: k.store.get('notepad', '') });
    var info = k.h('p', { class: 'label', role: 'status', 'aria-live': 'polite' });
    var timer;
    function stats() {
      var v = area.input.value;
      var words = (v.trim().match(/\S+/g) || []).length;
      return words + ' words, ' + v.length + ' characters';
    }
    area.input.addEventListener('input', function () {
      info.textContent = stats();
      clearTimeout(timer);
      timer = setTimeout(function () {
        info.textContent = k.store.set('notepad', area.input.value) ? stats() + ' · saved' : stats() + ' · could not save (storage blocked)';
      }, 400);
    });
    var dl = k.btn('Download .txt', function () {
      k.download(new Blob([area.input.value], { type: 'text/plain;charset=utf-8' }), 'notes.txt');
    }, true);
    var cp = k.btn('Copy', function () { k.copy(area.input.value).then(function () { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy'; }, 1200); }); }, true);
    var clr = k.btn('Clear', function () {
      if (!area.input.value || confirm('Delete all notes?')) { area.input.value = ''; area.input.dispatchEvent(new Event('input')); area.input.focus(); }
    }, true);
    root.appendChild(k.group('', area.el, info, k.h('div', { class: 'btn-row' }, dl, cp, clr)));
    root.appendChild(k.h('p', { class: 'label', text: 'Autosaves in this browser only. Nothing is uploaded.' }));
    info.textContent = stats();
  });

  /* ---------- Stopwatch ---------- */
  T.register('stopwatch', function (root, k) {
    var display = k.h('p', { class: 'big-result timer-display', 'aria-hidden': 'true', text: '00:00.00' });
    var laps = k.h('ol', { class: 'lap-list', reversed: true });
    var elapsed = 0;
    var startedAt = 0;
    var running = false;
    var raf = 0;
    var lastLap = 0;
    var lapCount = 0;

    function fmt(ms) {
      var cs = Math.floor(ms / 10) % 100;
      var s = Math.floor(ms / 1000) % 60;
      var m = Math.floor(ms / 60000) % 60;
      var h = Math.floor(ms / 3600000);
      return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s) + '.' + pad(cs);
    }
    function now() { return running ? elapsed + (performance.now() - startedAt) : elapsed; }
    function loop() { display.textContent = fmt(now()); if (running) raf = requestAnimationFrame(loop); }

    var startBtn = k.btn('Start', function () {
      if (running) {
        elapsed = now();
        running = false;
        cancelAnimationFrame(raf);
        startBtn.textContent = 'Resume';
        lapBtn.disabled = true;
        loop();
      } else {
        startedAt = performance.now();
        running = true;
        startBtn.textContent = 'Stop';
        lapBtn.disabled = false;
        loop();
      }
    });
    var lapBtn = k.btn('Lap', function () {
      var t = now();
      lapCount++;
      var li = k.h('li', {}, k.h('span', { text: 'Lap ' + lapCount }), k.h('span', { text: '+' + fmt(t - lastLap) }), k.h('span', { text: fmt(t) }));
      laps.insertBefore(li, laps.firstChild);
      lastLap = t;
    }, true);
    lapBtn.disabled = true;
    var resetBtn = k.btn('Reset', function () {
      running = false;
      cancelAnimationFrame(raf);
      elapsed = 0;
      lastLap = 0;
      lapCount = 0;
      laps.textContent = '';
      startBtn.textContent = 'Start';
      lapBtn.disabled = true;
      loop();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); startBtn.click(); }
    });
    root.appendChild(k.group('', display, k.h('div', { class: 'btn-row' }, startBtn, lapBtn, resetBtn), k.h('p', { class: 'label', text: 'Tip: press Space to start and stop.' }), laps));
  });
})();
