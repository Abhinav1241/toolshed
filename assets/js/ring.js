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

  function layout() {
    if (!ringOn()) return;
    var w = ring.offsetWidth;
    var radius = (w + GAP) / 2 / Math.tan(Math.PI / n);
    ring.style.setProperty('--radius', radius.toFixed(1) + 'px');
    pinLength = Math.max(section.offsetHeight - window.innerHeight, 1);
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
      items[i].style.opacity = Math.max(0.2, 1 - Math.abs(d) * 0.3).toFixed(2);
    }

    var f = Math.round(pos) % n;
    if (f !== front) {
      if (front >= 0) items[front].classList.remove('is-front');
      items[f].classList.add('is-front');
      front = f;
      indexEl.textContent = String(f + 1).padStart(2, '0');
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
    var btn = buttons[i];
    view.style.setProperty('--hue', items[i].style.getPropertyValue('--hue'));
    view.querySelector('[data-cv-title]').textContent = btn.querySelector('.panel-name').textContent;
    view.querySelector('[data-cv-count]').textContent = btn.dataset.count + ' tools';
    view.querySelector('[data-cv-samples]').textContent = btn.querySelector('.panel-samples').textContent;
  }

  function setOpen(isOpen) {
    view.hidden = !isOpen;
    main.inert = isOpen;
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

  view.querySelector('[data-category-close]').addEventListener('click', closeCategory);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCategory();
  });

  layout();
  update();
})();
