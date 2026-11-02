(function () {
  var root = document.documentElement;
  var KEY = 'toolshed-theme';

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function systemTheme() {
    return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function current() {
    return root.getAttribute('data-theme') || systemTheme();
  }

  // Apply before first paint (this script is loaded synchronously in <head>).
  var saved = stored();
  if (saved) root.setAttribute('data-theme', saved);

  function sync(btn) {
    var theme = current();
    btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;
    sync(btn);
    btn.addEventListener('click', function () {
      var next = current() === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
      sync(btn);
    });
    if (window.matchMedia) {
      matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
        if (!stored()) sync(btn);
      });
    }
  });
})();
