(function () {
  var section = document.querySelector('[data-ring-section]');
  if (!section) return;

  var ring = section.querySelector('[data-ring]');
  var items = Array.prototype.slice.call(ring.querySelectorAll('.panel-item'));
  var buttons = items.map(function (li) { return li.querySelector('.panel'); });
  var n = items.length;
  var indexEl = section.querySelector('[data-ring-current]');
  var main = document.getElementById('main');
  var header = document.querySelector('.site-header');
  var view = document.querySelector('[data-category-view]');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var GAP = 24;

  var pinLength = 1;
  var front = -1;
  var ticking = false;
  var snapTimer = null;
  var openButton = null;

  function ringOn() {
    return !reduce.matches;
  }

  var stage = section.querySelector('.ring-stage');
  var phone = matchMedia('(max-width: 719px)');
  var capEl = section.querySelector('[data-ring-caption]');
  var openBtn = section.querySelector('[data-ring-open]');

  // Beat 4: the camera sits in the middle of the cylinder, so the perspective
  // distance equals the radius (front panel at scale 1; a little wider on phones).
  function layout() {
    if (!ringOn()) return;
    var w = ring.offsetWidth;
    var radius = (w + GAP) / 2 / Math.tan(Math.PI / n);
    var persp = radius * (phone.matches ? 0.7 : 1);
    ring.style.setProperty('--radius', radius.toFixed(1) + 'px');
    stage.style.setProperty('--persp', persp.toFixed(1) + 'px');
    pinLength = Math.max(section.offsetHeight - window.innerHeight, 1);
  }

  // Wall segments: the gridded inside of the cylinder, one flat slice behind each panel
  items.forEach(function (li, i) {
    var seg = document.createElement('div');
    seg.className = 'wall-seg';
    seg.setAttribute('aria-hidden', 'true');
    seg.style.setProperty('--i', i);
    ring.appendChild(seg);
  });

  // Caption (bottom left) follows the front panel
  var cache = {};
  function captionFor(id) {
    if (cache[id]) return cache[id];
    var data = window.TOOLSHED;
    var tools = data ? data.tools.filter(function (t) { return t.category === id; }) : [];
    var counts = {};
    tools.forEach(function (t) { t.tags.forEach(function (g) { counts[g] = (counts[g] || 0) + 1; }); });
    var tags = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); }).slice(0, 3);
    return (cache[id] = { count: tools.length, tags: tags });
  }

  var capTimer = null;
  function updateCaption(i) {
    if (!capEl) return;
    var btn = buttons[i];
    var name = btn.querySelector('.panel-name').textContent;
    var info = captionFor(btn.dataset.category);
    var count = info.count || Number(btn.dataset.count) || 0;
    clearTimeout(capTimer);
    capEl.classList.add('is-swapping');
    capTimer = setTimeout(function () {
      capEl.querySelector('[data-cap-num]').textContent = '#' + String(i + 1).padStart(2, '0') + ' · ' + name.toUpperCase();
      capEl.querySelector('[data-cap-name]').textContent = name;
      capEl.querySelector('[data-cap-count]').textContent = count + (count === 1 ? ' tool' : ' tools');
      var ul = capEl.querySelector('[data-cap-tags]');
      ul.textContent = '';
      info.tags.forEach(function (g) {
        var li = document.createElement('li');
        li.textContent = g;
        ul.appendChild(li);
      });
      if (openBtn) openBtn.setAttribute('aria-label', 'Open ' + name + ', ' + count + ' tools');
      capEl.classList.remove('is-swapping');
    }, 90);
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      if (front >= 0) openCategory(front);
    });
  }

  function sectionTop() {
    return section.getBoundingClientRect().top + window.scrollY;
  }

  // Scroll position in panel units, 0..n
  function position() {
    var scrolled = Math.min(Math.max(window.scrollY - sectionTop(), 0), pinLength);
    return (scrolled / pinLength) * n;
  }

  function update() {
    ticking = false;
    if (!ringOn()) return;
    var pos = position();
    ring.style.setProperty('--angle', (-(pos / n) * 360).toFixed(3));

    for (var i = 0; i < n; i++) {
      var d = i - pos;
      d -= Math.round(d / n) * n;
      items[i].style.opacity = Math.max(0.3, 1 - Math.max(Math.abs(d) - 1, 0) * 0.25).toFixed(2);
    }

    var f = Math.round(pos) % n;
    if (f !== front) {
      if (front >= 0) items[front].classList.remove('is-front');
      items[f].classList.add('is-front');
      front = f;
      indexEl.textContent = String(f + 1).padStart(2, '0');
      updateCaption(f);
    }
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function goTo(k, smooth) {
    k = Math.min(Math.max(k, 0), n);
    window.scrollTo({
      top: sectionTop() + (k / n) * pinLength,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  // Nearest k (0..n) that puts panel i at the front
  function nearestK(i, pos) {
    return Math.abs(i - pos) <= Math.abs(i + n - pos) ? i : i + n;
  }

  function scheduleSnap() {
    clearTimeout(snapTimer);
    if (!ringOn() || !view.hidden) return;
    snapTimer = setTimeout(function () {
      var scrolled = window.scrollY - sectionTop();
      if (scrolled < 0 || scrolled > pinLength) return;
      var target = sectionTop() + (Math.round(position()) / n) * pinLength;
      if (Math.abs(target - window.scrollY) > 1) {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
    }, 150);
  }

  window.addEventListener('scroll', function () {
    requestUpdate();
    scheduleSnap();
  }, { passive: true });

  window.addEventListener('resize', function () {
    layout();
    requestUpdate();
  });

  phone.addEventListener('change', function () { layout(); requestUpdate(); });

  reduce.addEventListener('change', function () {
    ring.style.removeProperty('--angle');
    items.forEach(function (li) { li.style.opacity = ''; li.classList.remove('is-front'); });
    front = -1;
    layout();
    requestUpdate();
  });

  // Keyboard focus rotates that panel to the front
  buttons.forEach(function (btn, i) {
    btn.addEventListener('focus', function () {
      if (!ringOn() || !view.hidden || !btn.matches(':focus-visible')) return;
      goTo(nearestK(i, position()), true);
    });
    btn.addEventListener('click', function () {
      openCategory(i);
    });
  });

  ring.addEventListener('keydown', function (e) {
    if (!ringOn()) return;
    var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    var k = Math.min(Math.max(Math.round(position()) + dir, 0), n);
    goTo(k, true);
    buttons[k % n].focus({ preventScroll: true });
  });

  // Category view
  function fill(i) {
    window.Toolshed.renderCategory(buttons[i].dataset.category, items[i].style.getPropertyValue('--hue'));
  }

  function setOpen(isOpen) {
    view.hidden = !isOpen;
    main.inert = isOpen;
    var footer = document.querySelector('[data-footer]');
    if (footer) footer.inert = isOpen;
    header.inert = isOpen;
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
  }

  function withTransition(fn, done) {
    if (document.startViewTransition && !reduce.matches) {
      var t = document.startViewTransition(fn);
      t.ready.catch(function () {});
      t.finished.then(done, done);
    } else {
      fn();
      done();
    }
  }

  function openCategory(i) {
    openButton = buttons[i];
    clearTimeout(snapTimer);
    var panel = items[i];
    panel.style.viewTransitionName = 'category';
    withTransition(function () {
      panel.style.viewTransitionName = '';
      fill(i);
      setOpen(true);
      view.style.viewTransitionName = 'category';
    }, function () {
      view.style.viewTransitionName = '';
      view.querySelector('[data-category-close]').focus();
    });
  }

  function closeCategory() {
    if (view.hidden) return;
    var btn = openButton;
    var panel = btn && btn.closest('.panel-item');
    withTransition(function () {
      view.style.viewTransitionName = '';
      setOpen(false);
      if (panel) panel.style.viewTransitionName = 'category';
    }, function () {
      if (panel) panel.style.viewTransitionName = '';
      if (btn) btn.focus({ preventScroll: true });
    });
  }

  // Lets the footer search open a drawer by category id
  window.Toolshed.openCategory = function (id) {
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.category === id) return openCategory(i);
    }
  };

  view.querySelector('[data-category-close]').addEventListener('click', closeCategory);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCategory();
  });

  layout();
  update();
})();
