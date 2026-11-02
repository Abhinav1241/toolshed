(function () {
  var T = window.ToolshedTools;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- Meta tag builder ---------- */
  T.register('meta-tag-builder', function (root, k) {
    var title = k.text('Page title', { value: 'Toolshed – small free tools', maxLength: 120 });
    var desc = k.area('Description', { rows: 3, value: 'A workshop wall of small, free tools that run in your browser.' });
    var url = k.text('Canonical URL', { value: 'https://example.com/', inputMode: 'url' });
    var image = k.text('Share image URL (optional)', { value: '', inputMode: 'url' });
    var site = k.text('Site name (optional)', { value: 'Toolshed' });
    var twitter = k.check('Add Twitter card tags', true);
    var og = k.check('Add Open Graph tags', true);
    var robots = k.select('Search engines', [['', 'Default (index, follow)'], ['noindex, follow', 'Do not index'], ['noindex, nofollow', 'Do not index or follow']], '');
    var out = k.out('Paste into your <head>', { rows: 12 });
    var status = k.status();

    k.watch([title.input, desc.input, url.input, image.input, site.input, twitter.input, og.input, robots.input], function () {
      var L = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">'];
      var t = title.input.value.trim();
      var d = desc.input.value.trim().replace(/\s+/g, ' ');
      var u = url.input.value.trim();
      var im = image.input.value.trim();
      var sn = site.input.value.trim();
      if (t) L.push('<title>' + esc(t) + '</title>');
      if (d) L.push('<meta name="description" content="' + esc(d) + '">');
      if (robots.input.value) L.push('<meta name="robots" content="' + robots.input.value + '">');
      if (u) L.push('<link rel="canonical" href="' + esc(u) + '">');
      if (og.input.checked) {
        L.push('');
        L.push('<meta property="og:type" content="website">');
        if (t) L.push('<meta property="og:title" content="' + esc(t) + '">');
        if (d) L.push('<meta property="og:description" content="' + esc(d) + '">');
        if (u) L.push('<meta property="og:url" content="' + esc(u) + '">');
        if (im) L.push('<meta property="og:image" content="' + esc(im) + '">');
        if (sn) L.push('<meta property="og:site_name" content="' + esc(sn) + '">');
      }
      if (twitter.input.checked) {
        L.push('');
        L.push('<meta name="twitter:card" content="' + (im ? 'summary_large_image' : 'summary') + '">');
        if (t) L.push('<meta name="twitter:title" content="' + esc(t) + '">');
        if (d) L.push('<meta name="twitter:description" content="' + esc(d) + '">');
        if (im) L.push('<meta name="twitter:image" content="' + esc(im) + '">');
      }
      out.set(L.join('\n'));
      var notes = [];
      if (t.length > 60) notes.push('Title is ' + t.length + ' characters; search results usually cut it near 60.');
      if (d.length > 160) notes.push('Description is ' + d.length + ' characters; around 160 is the usual limit.');
      if (u && !/^https?:\/\//i.test(u)) notes.push('The URL should start with https://.');
      status.textContent = notes.join(' ') || 'Title ' + t.length + ' / 60, description ' + d.length + ' / 160 characters.';
    });
    root.appendChild(k.group('', title.el, desc.el, k.row(url.el, site.el), image.el, robots.el, k.row(og.el, twitter.el), status, out.el));
  });

  /* ---------- Slugify ---------- */
  T.register('slugify', function (root, k) {
    var input = k.area('Text', { rows: 4, value: 'Crème brûlée: 10 Tips for a Better Café!' });
    var sep = k.select('Separator', [['-', 'Dash ( - )'], ['_', 'Underscore ( _ )'], ['.', 'Dot ( . )'], ['', 'None']], '-');
    var lower = k.check('Lower case', true);
    var max = k.num('Max length (0 = no limit)', { min: 0, max: 500, step: 1, value: 0 });
    var perLine = k.check('One slug per line', true);
    var out = k.out('Slug', { rows: 4 });

    function slug(s) {
      var sp = sep.input.value;
      s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[æÆ]/g, 'ae').replace(/[øØ]/g, 'o').replace(/[đĐ]/g, 'd').replace(/[łŁ]/g, 'l');
      if (lower.input.checked) s = s.toLowerCase();
      s = s.replace(/&/g, ' and ').replace(/[^A-Za-z0-9]+/g, ' ').trim().replace(/ +/g, sp);
      var m = Math.floor(+max.input.value) || 0;
      if (m > 0 && s.length > m) {
        s = s.slice(0, m);
        if (sp) s = s.replace(new RegExp('\\' + sp + '+$'), '');
      }
      return s;
    }

    k.watch([input.input, sep.input, lower.input, max.input, perLine.input], function () {
      var v = input.input.value;
      out.set(perLine.input.checked ? v.split('\n').map(slug).join('\n') : slug(v.replace(/\n/g, ' ')));
    });
    root.appendChild(k.group('', input.el, k.row(sep.el, max.el), k.row(lower.el, perLine.el), out.el));
  });

  /* ---------- UTM builder ---------- */
  T.register('utm-builder', function (root, k) {
    var base = k.text('Website URL', { value: 'https://example.com/landing', inputMode: 'url' });
    var source = k.text('Source (required)', { value: 'newsletter', placeholder: 'google, newsletter' });
    var medium = k.text('Medium (required)', { value: 'email', placeholder: 'cpc, email, social' });
    var name = k.text('Campaign name (required)', { value: 'spring_launch' });
    var term = k.text('Term (optional)', { value: '' });
    var content = k.text('Content (optional)', { value: '' });
    var lowerIt = k.check('Lower-case the values', true);
    var out = k.out('Tagged URL', { rows: 4 });
    var status = k.status();

    k.watch([base.input, source.input, medium.input, name.input, term.input, content.input, lowerIt.input], function () {
      status.classList.remove('is-error');
      status.textContent = '';
      var raw = base.input.value.trim();
      if (!raw) { out.set(''); return; }
      var u;
      try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : 'https://' + raw); } catch (e) {
        out.set('');
        status.classList.add('is-error');
        status.textContent = 'That does not look like a URL.';
        return;
      }
      var pairs = [['utm_source', source], ['utm_medium', medium], ['utm_campaign', name], ['utm_term', term], ['utm_content', content]];
      var missing = [];
      pairs.forEach(function (p, i) {
        var v = p[1].input.value.trim();
        if (lowerIt.input.checked) v = v.toLowerCase();
        if (v) u.searchParams.set(p[0], v);
        else { u.searchParams.delete(p[0]); if (i < 3) missing.push(p[0]); }
      });
      out.set(u.toString());
      if (missing.length) status.textContent = 'Still needed: ' + missing.join(', ') + '.';
    });
    root.appendChild(k.group('', base.el, k.row(source.el, medium.el), name.el, k.row(term.el, content.el), lowerIt.el, status, out.el));
  });

  /* ---------- Open Graph preview ---------- */
  T.register('open-graph-preview', function (root, k) {
    var title = k.text('Title', { value: 'Toolshed – small free tools' });
    var desc = k.area('Description', { rows: 3, value: 'A workshop wall of small, free tools that run in your browser. No sign-up, no uploads.' });
    var url = k.text('URL', { value: 'https://abhinav1241.github.io/toolshed/', inputMode: 'url' });
    var image = k.text('Image URL (1200 × 630 works best)', { value: '', inputMode: 'url' });
    var status = k.status();

    var cardImg = k.h('div', { class: 'og-img' });
    var cardHost = k.h('div', { class: 'og-host' });
    var cardTitle = k.h('div', { class: 'og-title' });
    var cardDesc = k.h('div', { class: 'og-desc' });
    var card = k.h('div', { class: 'og-card' }, cardImg, k.h('div', { class: 'og-body' }, cardHost, cardTitle, cardDesc));
    var smallImg = k.h('div', { class: 'og-img' });
    var sTitle = k.h('div', { class: 'og-title' });
    var sDesc = k.h('div', { class: 'og-desc' });
    var sHost = k.h('div', { class: 'og-host' });
    var small = k.h('div', { class: 'og-card og-card-small' }, smallImg, k.h('div', { class: 'og-body' }, sHost, sTitle, sDesc));

    function clip(s, n) { return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }

    function setImg(el, src) {
      el.textContent = '';
      if (!src) { el.classList.add('is-empty'); el.appendChild(k.h('span', { text: 'No image' })); return; }
      el.classList.remove('is-empty');
      var img = k.h('img', { alt: '', referrerPolicy: 'no-referrer', src: src });
      img.addEventListener('error', function () {
        el.textContent = '';
        el.classList.add('is-empty');
        el.appendChild(k.h('span', { text: 'Image failed to load' }));
      });
      el.appendChild(img);
    }

    var lastImg = null;
    k.watch([title.input, desc.input, url.input, image.input], function () {
      var host = '';
      var u = url.input.value.trim();
      try { host = new URL(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, '').toUpperCase(); } catch (e) { host = ''; }
      var t = title.input.value.trim() || 'Untitled page';
      var d = desc.input.value.trim().replace(/\s+/g, ' ');
      cardHost.textContent = sHost.textContent = host;
      cardTitle.textContent = clip(t, 70);
      sTitle.textContent = clip(t, 60);
      cardDesc.textContent = clip(d, 160);
      sDesc.textContent = clip(d, 110);
      var im = image.input.value.trim();
      if (im !== lastImg) {
        lastImg = im;
        var safe = /^https?:\/\//i.test(im) ? im : '';
        setImg(cardImg, safe);
        setImg(smallImg, safe);
      }
      var notes = [];
      if (im && !/^https?:\/\//i.test(im)) notes.push('Image URL must start with http:// or https://.');
      if (t.length > 70) notes.push('Long titles get cut off.');
      if (!d) notes.push('Add a description; most sites show one.');
      status.textContent = notes.join(' ');
    });
    root.appendChild(k.group('', title.el, desc.el, k.row(url.el, image.el), status));
    root.appendChild(k.group('Large card (Facebook, LinkedIn, X)', card));
    root.appendChild(k.group('Compact card (chat apps)', small));
  });
})();
