/* Persistent HUD and hero (DESIGN_BRIEF section 8).
   One requestAnimationFrame loop drives everything here: scroll %, section index,
   hero fade-out and the wordmark tilt. It only runs while something is changing. */
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var phone = matchMedia('(max-width: 719px)');
  var fine = matchMedia('(pointer: fine)');

  /* ---------- The loop ---------- */
  var jobs = [];
  var queued = false;

  function frame() {
    queued = false;
    var again = false;
    for (var i = 0; i < jobs.length; i++) if (jobs[i]()) again = true;
    if (again) wake();
  }

  function wake() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  }

  window.ToolshedFx = { add: function (fn) { jobs.push(fn); wake(); }, wake: wake };
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);

  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  /* ---------- Crosshair: scroll % ---------- */
  var cross = document.querySelector('[data-crosshair]');
  var pctEl = document.querySelector('[data-scroll-pct]');
  var lastPct = -1;

  function scrollProgress() {
    var max = root.scrollHeight - window.innerHeight;
    return max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  }

  if (cross && pctEl) {
    window.ToolshedFx.add(function () {
      var p = scrollProgress();
      var pct = Math.round(p * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        cross.style.setProperty('--scroll', p.toFixed(3));
        pctEl.textContent = ('00' + pct).slice(-3) + '%';
      }
      return false;
    });
  }

  /* ---------- Section index (left edge) ---------- */
  var indexNav = document.querySelector('[data-hud-index]');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-section][id]'));
  var links = [];

  if (indexNav && sections.length) {
    sections.forEach(function (sec, i) {
      var a = document.createElement('a');
      a.href = '#' + sec.id;
      var n = document.createElement('span');
      n.textContent = ('0' + (i + 1)).slice(-2);
      var t = document.createElement('span');
      t.className = 't';
      t.textContent = sec.getAttribute('data-section');
      a.setAttribute('aria-label', sec.getAttribute('data-section'));
      a.appendChild(n);
      a.appendChild(t);
      indexNav.appendChild(a);
      links.push(a);
    });

    var active = -1;
    window.ToolshedFx.add(function () {
      var idx = 0;
      var atBottom = window.scrollY + window.innerHeight >= root.scrollHeight - 2;
      if (atBottom) idx = sections.length - 1;
      else {
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].getBoundingClientRect().top <= window.innerHeight * 0.4) idx = i;
        }
      }
      if (idx !== active) {
        if (active > -1) links[active].removeAttribute('aria-current');
        links[idx].setAttribute('aria-current', 'true');
        active = idx;
        // Sections that invert the page (the manifesto) need a readable index
        if (sections[idx].hasAttribute('data-invert')) indexNav.setAttribute('data-invert', '');
        else indexNav.removeAttribute('data-invert');
      }
      return false;
    });
  }

  /* ---------- Hero: scroll fade and pointer tilt ---------- */
  var hero = document.querySelector('.hero');
  var wordmark = document.querySelector('[data-wordmark]');
  var coord = document.querySelector('[data-coord]');
  var lastP = -1;
  var cur = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };

  function tiltOn() { return !reduce.matches && !phone.matches && fine.matches; }

  function fmt(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2); }

  if (hero) {
    window.ToolshedFx.add(function () {
      var p = clamp(window.scrollY / (hero.offsetHeight * 0.7), 0, 1);
      if (!reduce.matches && Math.abs(p - lastP) > 0.002) {
        lastP = p;
        hero.style.setProperty('--p', p.toFixed(3));
      }
      if (reduce.matches && lastP !== 0) {
        lastP = 0;
        hero.style.removeProperty('--p');
      }

      if (!wordmark) return false;
      var on = tiltOn();
      var tx = on ? target.x : 0;
      var ty = on ? target.y : 0;
      cur.x += (tx - cur.x) * 0.1;
      cur.y += (ty - cur.y) * 0.1;
      var moving = Math.abs(tx - cur.x) > 0.002 || Math.abs(ty - cur.y) > 0.002;
      if (!moving) { cur.x = tx; cur.y = ty; }
      if (on || moving) {
        wordmark.style.setProperty('--ry', (cur.x * 5.2).toFixed(2) + 'deg');
        wordmark.style.setProperty('--rx', (-cur.y * 5.2).toFixed(2) + 'deg');
      }
      if (coord) coord.innerHTML = 'X ' + fmt(cur.x) + ' &nbsp;Y ' + fmt(cur.y);
      return moving;
    });

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || !tiltOn()) return;
      target.x = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
      target.y = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
      window.ToolshedFx.wake();
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', function () {
      target.x = 0;
      target.y = 0;
      window.ToolshedFx.wake();
    });
  }

  /* ---------- Title break (beat 3): scroll progress for the letters ---------- */
  var tb = document.querySelector('[data-title-break]');
  var tbStage = tb && tb.querySelector('.tb-stage');
  var lastTp = -1;

  if (tb && tbStage) {
    window.ToolshedFx.add(function () {
      if (!tb.offsetParent) return false; // hidden (reduced motion or no JS)
      var run = tb.offsetHeight - window.innerHeight;
      var p = run > 0 ? clamp(-tb.getBoundingClientRect().top / run, 0, 1) : 0;
      if (Math.abs(p - lastTp) > 0.002) {
        lastTp = p;
        tbStage.style.setProperty('--tp', p.toFixed(3));
      }
      return false;
    });
  }

  /* ---------- Story sections (beats 5-9): [data-story] gets --sp, its pinned scroll progress 0..1 ---------- */
  var stories = Array.prototype.slice.call(document.querySelectorAll('[data-story]'));
  var prevSp = new Map();

  if (stories.length) {
    window.ToolshedFx.add(function () {
      var on = !reduce.matches && root.classList.contains('js');
      stories.forEach(function (el) {
        var run = el.offsetHeight - window.innerHeight;
        if (!on || !el.offsetParent || run <= 40) {
          if (prevSp.has(el)) { el.style.removeProperty('--sp'); prevSp.delete(el); }
          return;
        }
        var p = clamp(-el.getBoundingClientRect().top / run, 0, 1);
        var last = prevSp.get(el);
        if (last === undefined || Math.abs(p - last) > 0.002 || (p !== last && (p === 0 || p === 1))) {
          prevSp.set(el, p);
          el.style.setProperty('--sp', p.toFixed(3));
        }
      });
      return false;
    });
  }

  /* ---------- Recently added (from data) ---------- */
  var list = document.querySelector('[data-recent]');
  var data = window.TOOLSHED;
  if (list && data && data.recent) {
    var cats = {};
    data.categories.forEach(function (c) { cats[c.id] = c.name; });
    var byId = {};
    data.tools.forEach(function (t) { byId[t.id] = t; });
    var items = data.recent.map(function (id) { return byId[id]; }).filter(function (t) { return t && t.href; }).slice(0, 5);
    if (items.length) {
      list.textContent = '';
      items.forEach(function (t, i) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = t.href;
        var n = document.createElement('span');
        n.className = 'label n';
        n.textContent = ('0' + (i + 1)).slice(-2);
        var name = document.createElement('span');
        name.className = 'name';
        name.textContent = t.name;
        var cat = document.createElement('span');
        cat.className = 'label cat';
        cat.textContent = cats[t.category] || '';
        a.appendChild(n);
        a.appendChild(name);
        a.appendChild(cat);
        li.appendChild(a);
        list.appendChild(li);
      });
    }
  }

  reduce.addEventListener('change', wake);
  phone.addEventListener('change', wake);
})();
