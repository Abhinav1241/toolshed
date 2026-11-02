/* Beat 1: the peg-hole loader. Runs once per session, never under reduced motion.
   The animation itself is CSS (hud.css); this only switches it on and releases the page. */
(function () {
  var root = document.documentElement;
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (location.hash || window.scrollY > 50) return;
    if (sessionStorage.getItem('toolshed-loaded')) return;
    sessionStorage.setItem('toolshed-loaded', '1');
  } catch (e) { /* storage blocked: play it anyway */ }
  root.classList.add('loading', 'loader-ran');
  setTimeout(function () { root.classList.remove('loading'); }, 950);
})();
