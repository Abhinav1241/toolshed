(function () {
  var T = window.ToolshedTools;
  var PDF_LIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }
  function baseName(name) { return (name || 'image').replace(/\.[^.]+$/, '') || 'image'; }
  var EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

  function toBlob(canvas, type, q) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('The browser could not encode this image.')); }, type, q);
    });
  }

  // Decodes with EXIF rotation applied where the browser supports it
  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return viaImg(file); });
    }
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read ' + file.name + ' as an image.')); };
      img.src = url;
    });
  }
  function dims(src) { return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height }; }

  function picker(k, label, opts, onFiles) {
    var input = k.h('input', { type: 'file', accept: opts.accept || 'image/*', multiple: !!opts.multiple });
    var el = k.h('label', { class: 'field field-full' }, k.h('span', { class: 'label', text: label }), input);
    function deliver(list) {
      var files = Array.prototype.slice.call(list).filter(function (f) { return /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(f.name); });
      if (files.length) onFiles(opts.multiple ? files : files.slice(0, 1));
    }
    input.addEventListener('change', function () { deliver(input.files); });
    el.addEventListener('dragover', function (e) { e.preventDefault(); });
    el.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer) deliver(e.dataTransfer.files); });
    return { el: el, input: input };
  }

  /* ---------- Crop & rotate ---------- */
  T.register('crop-rotate', function (root, k) {
    var work = null;
    var name = 'image';
    var status = k.status();
    var view = k.h('canvas', { class: 'crop-view', 'aria-label': 'Image preview with crop area' });
    var ratio = k.select('Crop shape', [['free', 'Free'], ['1', 'Square (1:1)'], ['1.3333', '4:3'], ['1.5', '3:2'], ['1.7778', '16:9'], ['0.5625', '9:16']], 'free');
    var cx = k.num('Left', { min: 0, step: 1, value: 0 });
    var cy = k.num('Top', { min: 0, step: 1, value: 0 });
    var cw = k.num('Width', { min: 1, step: 1, value: 0 });
    var ch = k.num('Height', { min: 1, step: 1, value: 0 });
    var fmt = k.select('Save as', [['image/png', 'PNG'], ['image/jpeg', 'JPEG'], ['image/webp', 'WebP']], 'image/png');
    var tools = k.h('div', { class: 'btn-row' });
    var info = k.h('p', { class: 'label', role: 'status', 'aria-live': 'polite' });
    var panel = k.h('div', { hidden: true });

    function clamp() {
      var W = work.width, H = work.height;
      var w = Math.min(Math.max(Math.round(+cw.input.value) || 1, 1), W);
      var h = Math.min(Math.max(Math.round(+ch.input.value) || 1, 1), H);
      var x = Math.min(Math.max(Math.round(+cx.input.value) || 0, 0), W - w);
      var y = Math.min(Math.max(Math.round(+cy.input.value) || 0, 0), H - h);
      return { x: x, y: y, w: w, h: h };
    }
    function setRect(r) { cx.input.value = r.x; cy.input.value = r.y; cw.input.value = r.w; ch.input.value = r.h; }

    function paint() {
      if (!work) return;
      var r = clamp();
      var s = Math.min(1, 900 / Math.max(work.width, work.height));
      view.width = Math.max(1, Math.round(work.width * s));
      view.height = Math.max(1, Math.round(work.height * s));
      var c = view.getContext('2d');
      c.drawImage(work, 0, 0, view.width, view.height);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillRect(0, 0, view.width, view.height);
      c.drawImage(work, r.x, r.y, r.w, r.h, r.x * s, r.y * s, r.w * s, r.h * s);
      c.strokeStyle = '#ff6b2c';
      c.lineWidth = 2;
      c.strokeRect(r.x * s + 1, r.y * s + 1, Math.max(r.w * s - 2, 1), Math.max(r.h * s - 2, 1));
      info.textContent = 'Image ' + work.width + ' × ' + work.height + ' px. Crop ' + r.w + ' × ' + r.h + ' px.';
    }

    function applyRatio() {
      if (!work) return;
      var q = ratio.input.value;
      if (q === 'free') { paint(); return; }
      var rt = parseFloat(q);
      var w = work.width, h = Math.round(w / rt);
      if (h > work.height) { h = work.height; w = Math.round(h * rt); }
      setRect({ x: Math.round((work.width - w) / 2), y: Math.round((work.height - h) / 2), w: w, h: h });
      paint();
    }

    function reset() { setRect({ x: 0, y: 0, w: work.width, h: work.height }); ratio.input.value = 'free'; paint(); }

    function transform(kind) {
      if (!work) return;
      var W = work.width, H = work.height;
      var out = document.createElement('canvas');
      var c;
      if (kind === 'left' || kind === 'right') {
        out.width = H; out.height = W;
        c = out.getContext('2d');
        c.translate(H / 2, W / 2);
        c.rotate((kind === 'right' ? 1 : -1) * Math.PI / 2);
        c.drawImage(work, -W / 2, -H / 2);
      } else {
        out.width = W; out.height = H;
        c = out.getContext('2d');
        if (kind === 'flipx') { c.translate(W, 0); c.scale(-1, 1); } else { c.translate(0, H); c.scale(1, -1); }
        c.drawImage(work, 0, 0);
      }
      work = out;
      reset();
    }

    [['Rotate left', 'left'], ['Rotate right', 'right'], ['Flip horizontal', 'flipx'], ['Flip vertical', 'flipy']].forEach(function (p) {
      tools.appendChild(k.btn(p[0], function () { transform(p[1]); }, true));
    });
    tools.appendChild(k.btn('Reset', function () { if (work) { load(file0); } }, true));

    var file0 = null;
    function load(f) {
      file0 = f;
      name = baseName(f.name);
      status.classList.remove('is-error');
      status.textContent = 'Reading…';
      loadBitmap(f).then(function (bmp) {
        var d = dims(bmp);
        work = document.createElement('canvas');
        work.width = d.w; work.height = d.h;
        work.getContext('2d').drawImage(bmp, 0, 0);
        if (bmp.close) bmp.close();
        panel.hidden = false;
        status.textContent = '';
        reset();
      }).catch(function (e) { status.classList.add('is-error'); status.textContent = e.message; });
    }

    k.watch([cx.input, cy.input], function () { if (work) paint(); });
    cw.input.addEventListener('input', function () {
      if (!work) return;
      var rt = parseFloat(ratio.input.value);
      if (rt) { var h = Math.round((+cw.input.value || 1) / rt); if (h <= work.height) ch.input.value = h; }
      paint();
    });
    ch.input.addEventListener('input', function () {
      if (!work) return;
      var rt = parseFloat(ratio.input.value);
      if (rt) { var w = Math.round((+ch.input.value || 1) * rt); if (w <= work.width) cw.input.value = w; }
      paint();
    });
    ratio.input.addEventListener('change', applyRatio);

    var save = k.btn('Download cropped image', function () {
      var r = clamp();
      var out = document.createElement('canvas');
      out.width = r.w; out.height = r.h;
      var c = out.getContext('2d');
      if (fmt.input.value === 'image/jpeg') { c.fillStyle = '#fff'; c.fillRect(0, 0, r.w, r.h); }
      c.drawImage(work, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      toBlob(out, fmt.input.value, 0.92).then(function (b) { k.download(b, name + '-cropped.' + EXT[b.type || fmt.input.value]); })
        .catch(function (e) { status.classList.add('is-error'); status.textContent = e.message; });
    });

    var pk = picker(k, 'Choose an image', {}, function (files) { load(files[0]); });
    panel.appendChild(k.group('Rotate and flip', tools));
    panel.appendChild(k.group('Crop', ratio.el, k.row(cx.el, cy.el, cw.el, ch.el), k.h('p', { class: 'label', text: 'Numbers are in pixels, measured from the top-left corner.' })));
    panel.appendChild(k.group('', info, view, k.row(fmt.el, save)));
    root.appendChild(k.group('', pk.el, status));
    root.appendChild(panel);
  });

  /* ---------- Format converter ---------- */
  T.register('format-converter', function (root, k) {
    var fmt = k.select('Convert to', [['image/png', 'PNG'], ['image/jpeg', 'JPEG'], ['image/webp', 'WebP']], 'image/webp');
    var quality = k.range('Quality (JPEG and WebP)', { min: 10, max: 100, value: 85 });
    var list = k.h('ul', { class: 'file-results' });
    var status = k.status();
    var files = [];
    var urls = [];

    function run() {
      urls.forEach(URL.revokeObjectURL, URL);
      urls = [];
      list.textContent = '';
      status.classList.remove('is-error');
      status.textContent = '';
      var type = fmt.input.value;
      files.forEach(function (f) {
        var li = k.h('li', {}, k.h('span', { class: 'file-name', text: f.name }), k.h('span', { class: 'label', text: 'Converting…' }));
        list.appendChild(li);
        loadBitmap(f).then(function (bmp) {
          var d = dims(bmp);
          var cv = document.createElement('canvas');
          cv.width = d.w; cv.height = d.h;
          var c = cv.getContext('2d');
          if (type === 'image/jpeg') { c.fillStyle = '#fff'; c.fillRect(0, 0, d.w, d.h); }
          c.drawImage(bmp, 0, 0);
          if (bmp.close) bmp.close();
          return toBlob(cv, type, +quality.input.value / 100);
        }).then(function (blob) {
          var ok = blob.type === type;
          var url = URL.createObjectURL(blob);
          urls.push(url);
          var ext = EXT[blob.type] || 'png';
          li.textContent = '';
          li.appendChild(k.h('span', { class: 'file-name', text: baseName(f.name) + '.' + ext }));
          li.appendChild(k.h('span', { class: 'label', text: fmtBytes(f.size) + ' → ' + fmtBytes(blob.size) + (ok ? '' : ' (this browser saved it as ' + ext.toUpperCase() + ' instead)') }));
          li.appendChild(k.h('a', { class: 'btn btn-ghost', href: url, download: baseName(f.name) + '.' + ext, text: 'Download' }));
        }).catch(function (e) {
          li.textContent = '';
          li.appendChild(k.h('span', { class: 'file-name', text: f.name }));
          li.appendChild(k.h('span', { class: 'label is-error', text: e.message }));
        });
      });
    }

    var pk = picker(k, 'Choose images (several at once is fine)', { multiple: true }, function (picked) { files = picked; run(); });
    [fmt.input, quality.input].forEach(function (i) { i.addEventListener('change', function () { if (files.length) run(); }); });
    root.appendChild(k.group('', pk.el, k.row(fmt.el, quality.el), status, list));
    root.appendChild(k.h('p', { class: 'label', text: 'Transparent areas turn white when saving as JPEG. Animated GIFs keep only the first frame.' }));
  });

  /* ---------- EXIF viewer ---------- */
  function readExif(buf) {
    var v = new DataView(buf);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
    var pos = 2;
    while (pos + 4 < v.byteLength) {
      if (v.getUint8(pos) !== 0xFF) break;
      var marker = v.getUint8(pos + 1);
      var len = v.getUint16(pos + 2);
      if (marker === 0xE1 && v.getUint32(pos + 4) === 0x45786966) return parseTiff(v, pos + 10);
      if (marker === 0xDA) break;
      pos += 2 + len;
    }
    return null;
  }

  function parseTiff(v, base) {
    var little = v.getUint16(base) === 0x4949;
    var u16 = function (o) { return v.getUint16(o, little); };
    var u32 = function (o) { return v.getUint32(o, little); };
    var SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

    function value(entry) {
      var type = u16(entry + 2), count = u32(entry + 4);
      var size = (SIZE[type] || 1) * count;
      var off = size > 4 ? base + u32(entry + 8) : entry + 8;
      if (off + size > v.byteLength) return null;
      var i, out = [];
      if (type === 2) {
        var s = '';
        for (i = 0; i < count; i++) { var ch = v.getUint8(off + i); if (!ch) break; s += String.fromCharCode(ch); }
        return s.trim();
      }
      for (i = 0; i < count; i++) {
        if (type === 3) out.push(u16(off + i * 2));
        else if (type === 4) out.push(u32(off + i * 4));
        else if (type === 1 || type === 7) out.push(v.getUint8(off + i));
        else if (type === 9) out.push(v.getInt32(off + i * 4, little));
        else if (type === 5) { var d = u32(off + i * 8 + 4); out.push(d ? u32(off + i * 8) / d : 0); }
        else if (type === 10) { var d2 = v.getInt32(off + i * 8 + 4, little); out.push(d2 ? v.getInt32(off + i * 8, little) / d2 : 0); }
      }
      return count === 1 ? out[0] : out;
    }

    function ifd(offset) {
      var res = {};
      var at = base + offset;
      if (at + 2 > v.byteLength) return res;
      var n = u16(at);
      for (var i = 0; i < n; i++) {
        var e = at + 2 + i * 12;
        if (e + 12 > v.byteLength) break;
        res[u16(e)] = value(e);
      }
      return res;
    }

    var main = ifd(u32(base + 4));
    var exif = main[0x8769] ? ifd(main[0x8769]) : {};
    var gps = main[0x8825] ? ifd(main[0x8825]) : {};
    return { main: main, exif: exif, gps: gps };
  }

  T.register('exif-viewer', function (root, k) {
    var status = k.status();
    var table = k.h('dl', { class: 'exif-list' });
    var warn = k.h('p', { class: 'kit-status is-error', role: 'alert' });
    var strip = k.btn('Download a copy without metadata', function () {}, true);
    var thumb = k.h('img', { class: 'exif-thumb', alt: 'Preview of the chosen image', hidden: true });
    var cur = null;
    var thumbUrl = null;

    function dms(arr, ref) {
      if (!Array.isArray(arr) || arr.length < 3) return null;
      var d = arr[0] + arr[1] / 60 + arr[2] / 3600;
      return (ref === 'S' || ref === 'W') ? -d : d;
    }
    var ORIENT = { 1: 'Normal', 2: 'Mirrored', 3: 'Rotated 180°', 4: 'Flipped vertically', 5: 'Mirrored, rotated 90° clockwise', 6: 'Rotated 90° clockwise', 7: 'Mirrored, rotated 90° counter-clockwise', 8: 'Rotated 90° counter-clockwise' };

    function add(label, val) {
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) return;
      table.appendChild(k.h('div', { class: 'stat' }, k.h('dt', { class: 'label', text: label }), k.h('dd', { text: String(val) })));
    }

    function show(f, buf, size) {
      table.textContent = '';
      warn.textContent = '';
      var ex = f.type === 'image/jpeg' || /\.jpe?g$/i.test(f.name) ? readExif(buf) : null;
      add('File', f.name);
      add('Size', fmtBytes(f.size));
      add('Type', f.type || 'unknown');
      add('Dimensions', size.w + ' × ' + size.h + ' px');
      if (!ex || !Object.keys(ex.main).length) {
        status.textContent = f.type === 'image/jpeg' ? 'No EXIF data found in this JPEG.' : 'EXIF data is mostly found in JPEG photos. Other formats show only the basics.';
        return;
      }
      status.textContent = 'EXIF data found.';
      var m = ex.main, e = ex.exif, g = ex.gps;
      add('Camera', [m[0x010F], m[0x0110]].filter(Boolean).join(' '));
      add('Lens', e[0xA434]);
      add('Taken', e[0x9003] || m[0x0132]);
      add('Exposure', e[0x829A] ? (e[0x829A] >= 1 ? e[0x829A] + ' s' : '1/' + Math.round(1 / e[0x829A]) + ' s') : null);
      add('Aperture', e[0x829D] ? 'f/' + (Math.round(e[0x829D] * 10) / 10) : null);
      add('ISO', Array.isArray(e[0x8827]) ? e[0x8827][0] : e[0x8827]);
      add('Focal length', e[0x920A] ? Math.round(e[0x920A] * 10) / 10 + ' mm' : null);
      add('Focal length (35 mm)', e[0xA405] ? e[0xA405] + ' mm' : null);
      add('Orientation', ORIENT[m[0x0112]]);
      add('Software', m[0x0131]);
      var lat = dms(g[2], g[1]);
      var lon = dms(g[4], g[3]);
      if (lat !== null && lon !== null) {
        add('GPS position', lat.toFixed(6) + ', ' + lon.toFixed(6));
        warn.textContent = 'This photo contains the location where it was taken. Download a copy without metadata before sharing it publicly.';
      }
      if (typeof g[6] === 'number') add('Altitude', Math.round(g[6]) + ' m');
    }

    function load(f) {
      cur = f;
      status.classList.remove('is-error');
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
      thumbUrl = URL.createObjectURL(f);
      thumb.src = thumbUrl;
      thumb.hidden = false;
      var buffer = f.slice(0, 262144).arrayBuffer();
      Promise.all([buffer, loadBitmap(f)]).then(function (r) {
        var d = dims(r[1]);
        if (r[1].close) r[1].close();
        strip.hidden = false;
        show(f, r[0], d);
      }).catch(function (e) { status.classList.add('is-error'); status.textContent = e.message; });
    }

    strip.hidden = true;
    strip.addEventListener('click', function () {
      if (!cur) return;
      loadBitmap(cur).then(function (bmp) {
        var d = dims(bmp);
        var cv = document.createElement('canvas');
        cv.width = d.w; cv.height = d.h;
        cv.getContext('2d').drawImage(bmp, 0, 0);
        var type = cur.type === 'image/png' || cur.type === 'image/webp' ? cur.type : 'image/jpeg';
        return toBlob(cv, type, 0.95);
      }).then(function (b) { k.download(b, baseName(cur.name) + '-clean.' + (EXT[b.type] || 'png')); })
        .catch(function (e) { status.classList.add('is-error'); status.textContent = e.message; });
    });

    var pk = picker(k, 'Choose a photo', {}, function (files) { load(files[0]); });
    root.appendChild(k.group('', pk.el, status, warn, thumb, table, strip));
    root.appendChild(k.h('p', { class: 'label', text: 'Read in your browser. The photo is not uploaded.' }));
  });

  /* ---------- Image to Base64 ---------- */
  T.register('image-to-base64', function (root, k) {
    var status = k.status();
    var preview = k.h('img', { class: 'exif-thumb', alt: 'Preview of the chosen image', hidden: true });
    var uri = k.out('Data URI', { rows: 5 });
    var raw = k.out('Base64 only', { rows: 3 });
    var html = k.out('HTML <img> tag', { rows: 3 });
    var css = k.out('CSS background', { rows: 3 });
    var results = k.h('div', { hidden: true }, uri.el, raw.el, html.el, css.el);

    function load(f) {
      status.classList.remove('is-error');
      status.textContent = 'Reading…';
      var r = new FileReader();
      r.onerror = function () { status.classList.add('is-error'); status.textContent = 'Could not read that file.'; };
      r.onload = function () {
        var data = String(r.result);
        var b64 = data.slice(data.indexOf(',') + 1);
        uri.set(data);
        raw.set(b64);
        html.set('<img src="' + data + '" alt="">');
        css.set('background-image: url("' + data + '");');
        preview.src = data;
        preview.hidden = false;
        results.hidden = false;
        var bigger = Math.round((b64.length / f.size - 1) * 100);
        status.textContent = f.name + ': ' + fmtBytes(f.size) + ' becomes ' + fmtBytes(data.length) + ' of text (about ' + bigger + '% larger).' +
          (f.size > 100 * 1024 ? ' Large images are usually better served as files.' : '');
      };
      r.readAsDataURL(f);
    }
    var pk = picker(k, 'Choose an image', {}, function (files) { load(files[0]); });
    root.appendChild(k.group('', pk.el, status, preview, results));
  });

  /* ---------- Favicon maker ---------- */
  function buildIco(pngs) {
    var head = 6 + pngs.length * 16;
    var total = head;
    pngs.forEach(function (p) { total += p.bytes.length; });
    var buf = new ArrayBuffer(total);
    var v = new DataView(buf);
    var u8 = new Uint8Array(buf);
    v.setUint16(0, 0, true); v.setUint16(2, 1, true); v.setUint16(4, pngs.length, true);
    var off = head;
    pngs.forEach(function (p, i) {
      var e = 6 + i * 16;
      v.setUint8(e, p.size >= 256 ? 0 : p.size);
      v.setUint8(e + 1, p.size >= 256 ? 0 : p.size);
      v.setUint16(e + 4, 1, true);
      v.setUint16(e + 6, 32, true);
      v.setUint32(e + 8, p.bytes.length, true);
      v.setUint32(e + 12, off, true);
      u8.set(p.bytes, off);
      off += p.bytes.length;
    });
    return new Blob([buf], { type: 'image/x-icon' });
  }

  T.register('favicon-maker', function (root, k) {
    var source = null;
    var status = k.status();
    var mode = k.select('Start from', [['image', 'An image'], ['text', 'A letter or emoji']], 'image');
    var text = k.text('Letter or emoji', { value: 'T', maxLength: 4 });
    var bg = k.text('Background colour', { type: 'color', value: '#ff6b2c' });
    var fg = k.text('Letter colour', { type: 'color', value: '#141517' });
    var round = k.range('Corner rounding (%)', { min: 0, max: 50, value: 20 });
    var pad = k.range('Padding (%)', { min: 0, max: 30, value: 0 });
    var grid = k.h('div', { class: 'fav-grid' });
    var textRow = k.row(text.el, bg.el, fg.el);
    var pickWrap = k.h('div');
    var out = k.h('div', { hidden: true });
    var snippet = k.out('Paste into your <head>', { rows: 5 });
    var SIZES = [16, 32, 48, 180, 192, 512];
    var blobs = {};

    function render(size) {
      var cv = document.createElement('canvas');
      cv.width = cv.height = size;
      var c = cv.getContext('2d');
      var r = size * (+round.input.value / 100);
      c.beginPath();
      if (c.roundRect) c.roundRect(0, 0, size, size, r); else c.rect(0, 0, size, size);
      c.clip();
      var p = size * (+pad.input.value / 100);
      if (mode.input.value === 'text') {
        c.fillStyle = bg.input.value;
        c.fillRect(0, 0, size, size);
        var t = (text.input.value || ' ').trim() || ' ';
        c.fillStyle = fg.input.value;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = '800 ' + Math.round((size - 2 * p) * 0.72) + 'px "Bricolage Grotesque", system-ui, sans-serif';
        c.fillText(t, size / 2, size / 2 + size * 0.04);
      } else if (source) {
        var d = dims(source);
        var side = Math.min(d.w, d.h);
        c.drawImage(source, (d.w - side) / 2, (d.h - side) / 2, side, side, p, p, size - 2 * p, size - 2 * p);
      }
      return cv;
    }

    var gen = 0;
    function build() {
      var my = ++gen;
      if (mode.input.value === 'image' && !source) { out.hidden = true; return; }
      out.hidden = false;
      grid.textContent = '';
      blobs = {};
      Promise.all(SIZES.map(function (s) {
        return toBlob(render(s), 'image/png').then(function (b) { return b.arrayBuffer().then(function (ab) { return { size: s, blob: b, bytes: new Uint8Array(ab) }; }); });
      })).then(function (res) {
        if (my !== gen) return;
        res.forEach(function (r) {
          blobs[r.size] = r;
          var url = URL.createObjectURL(r.blob);
          var name = r.size === 180 ? 'apple-touch-icon.png' : 'favicon-' + r.size + '.png';
          var img = k.h('img', { src: url, alt: '', width: Math.min(r.size, 64), height: Math.min(r.size, 64) });
          grid.appendChild(k.h('div', { class: 'fav-item' }, img, k.h('span', { class: 'label', text: r.size + ' × ' + r.size }),
            k.h('a', { class: 'btn btn-ghost', href: url, download: name, text: 'PNG' })));
        });
        snippet.set(
          '<link rel="icon" href="/favicon.ico" sizes="48x48">\n' +
          '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">\n' +
          '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">\n' +
          '<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
      }).catch(function (e) { status.classList.add('is-error'); status.textContent = e.message; });
    }

    var icoBtn = k.btn('Download favicon.ico (16, 32, 48)', function () {
      if (!blobs[16]) return;
      k.download(buildIco([blobs[16], blobs[32], blobs[48]]), 'favicon.ico');
    });

    var pk = picker(k, 'Choose a square-ish image', {}, function (files) {
      status.classList.remove('is-error');
      loadBitmap(files[0]).then(function (b) { source = b; status.textContent = ''; build(); })
        .catch(function (e) { status.classList.add('is-error'); status.textContent = e.message; });
    });
    pickWrap.appendChild(pk.el);

    function swap() {
      var isText = mode.input.value === 'text';
      textRow.hidden = !isText;
      pickWrap.hidden = isText;
      build();
    }
    [mode.input, text.input, bg.input, fg.input, round.input, pad.input].forEach(function (i) {
      i.addEventListener('input', swap);
      i.addEventListener('change', swap);
    });

    out.appendChild(k.group('Your icons', grid, icoBtn));
    out.appendChild(snippet.el);
    root.appendChild(k.group('', mode.el, pickWrap, textRow, k.row(round.el, pad.el), status));
    root.appendChild(out);
    root.appendChild(k.h('p', { class: 'label', text: 'Non-square images are cropped to a square from the centre.' }));
    textRow.hidden = true;
  });

  /* ---------- Images to PDF ---------- */
  T.register('images-to-pdf', function (root, k) {
    var items = [];
    var list = k.h('ol', { class: 'file-results' });
    var size = k.select('Page size', [['fit', 'Same as each image'], ['a4', 'A4'], ['letter', 'US Letter']], 'a4');
    var margin = k.num('Margin (pt)', { min: 0, max: 200, step: 1, value: 24 });
    var status = k.status();
    var make = k.btn('Create PDF', build);

    function render() {
      list.textContent = '';
      items.forEach(function (it, i) {
        var up = k.h('button', { type: 'button', class: 'btn btn-ghost', text: 'Up', 'aria-label': 'Move ' + it.file.name + ' up', disabled: i === 0 });
        var down = k.h('button', { type: 'button', class: 'btn btn-ghost', text: 'Down', 'aria-label': 'Move ' + it.file.name + ' down', disabled: i === items.length - 1 });
        var rm = k.h('button', { type: 'button', class: 'btn btn-ghost', text: 'Remove', 'aria-label': 'Remove ' + it.file.name });
        up.addEventListener('click', function () { items.splice(i - 1, 0, items.splice(i, 1)[0]); render(); });
        down.addEventListener('click', function () { items.splice(i + 1, 0, items.splice(i, 1)[0]); render(); });
        rm.addEventListener('click', function () { URL.revokeObjectURL(it.url); items.splice(i, 1); render(); });
        list.appendChild(k.h('li', {}, k.h('img', { class: 'file-thumb', src: it.url, alt: '' }), k.h('span', { class: 'file-name', text: it.file.name }),
          k.h('span', { class: 'label', text: fmtBytes(it.file.size) }), up, down, rm));
      });
      make.disabled = !items.length;
      status.textContent = items.length ? items.length + ' image' + (items.length === 1 ? '' : 's') + ' = ' + items.length + ' page' + (items.length === 1 ? '' : 's') + '.' : '';
    }

    function build() {
      status.classList.remove('is-error');
      status.textContent = 'Building the PDF…';
      make.disabled = true;
      k.loadScript(PDF_LIB).then(function () {
        var doc = PDFLib.PDFDocument;
        return doc.create().then(function (pdf) {
          var m = Math.max(+margin.input.value || 0, 0);
          var chain = Promise.resolve();
          items.forEach(function (it) {
            chain = chain.then(function () {
              return loadBitmap(it.file).then(function (bmp) {
                var d = dims(bmp);
                var cv = document.createElement('canvas');
                cv.width = d.w; cv.height = d.h;
                var c = cv.getContext('2d');
                var jpeg = it.file.type === 'image/jpeg';
                if (jpeg) { c.fillStyle = '#fff'; c.fillRect(0, 0, d.w, d.h); }
                c.drawImage(bmp, 0, 0);
                if (bmp.close) bmp.close();
                return toBlob(cv, jpeg ? 'image/jpeg' : 'image/png', 0.92).then(function (b) { return b.arrayBuffer(); }).then(function (ab) {
                  return (jpeg ? pdf.embedJpg(ab) : pdf.embedPng(ab)).then(function (img) { return { img: img, w: d.w, h: d.h }; });
                });
              }).then(function (r) {
                var pw, ph;
                if (size.input.value === 'fit') { pw = r.w * 0.75 + m * 2; ph = r.h * 0.75 + m * 2; }
                else {
                  var base = size.input.value === 'a4' ? [595.28, 841.89] : [612, 792];
                  var land = r.w > r.h;
                  pw = land ? base[1] : base[0];
                  ph = land ? base[0] : base[1];
                }
                var page = pdf.addPage([pw, ph]);
                var aw = Math.max(pw - m * 2, 1), ah = Math.max(ph - m * 2, 1);
                var s = size.input.value === 'fit' ? 0.75 : Math.min(aw / r.w, ah / r.h);
                var w = r.w * s, h = r.h * s;
                page.drawImage(r.img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
              });
            });
          });
          return chain.then(function () { return pdf.save(); });
        });
      }).then(function (bytes) {
        k.download(new Blob([bytes], { type: 'application/pdf' }), 'images.pdf');
        status.textContent = 'Done: images.pdf (' + fmtBytes(bytes.length) + ').';
      }).catch(function (e) {
        status.classList.add('is-error');
        status.textContent = 'Could not create the PDF: ' + e.message;
      }).then(function () { make.disabled = !items.length; });
    }

    var pk = picker(k, 'Add images (JPEG, PNG, WebP, GIF…)', { multiple: true }, function (files) {
      files.forEach(function (f) { items.push({ file: f, url: URL.createObjectURL(f) }); });
      pk.input.value = '';
      render();
    });
    root.appendChild(k.group('', pk.el, list, k.row(size.el, margin.el), k.h('div', { class: 'btn-row' }, make), status));
    root.appendChild(k.h('p', { class: 'label', text: 'Pages follow the list order. Everything happens in your browser; the PDF library loads from a CDN the first time.' }));
    render();
  });
})();
