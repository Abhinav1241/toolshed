(function () {
  var form = document.querySelector('[data-controls]');
  var input = document.querySelector('[data-file]');
  var drop = document.querySelector('[data-drop]');
  var list = document.querySelector('[data-results]');
  var statusEl = document.querySelector('[data-status]');
  var qualityOut = document.querySelector('[data-quality-out]');
  var fitRow = document.querySelector('[data-mode-fit]');
  var pctRow = document.querySelector('[data-mode-percent]');

  var items = [];
  var timer = null;
  var nextId = 1;

  var EXT = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' };

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  function settings() {
    var f = form.elements;
    return {
      mode: f.mode.value,
      maxW: parseInt(f.maxW.value, 10) || 0,
      maxH: parseInt(f.maxH.value, 10) || 0,
      noEnlarge: f.noEnlarge.checked,
      percent: parseFloat(f.percent.value) || 100,
      format: f.format.value,
      quality: parseInt(f.quality.value, 10) / 100
    };
  }

  function targetSize(w, h, s) {
    var scale = 1;
    if (s.mode === 'percent') {
      scale = s.percent / 100;
    } else {
      var sw = s.maxW ? s.maxW / w : Infinity;
      var sh = s.maxH ? s.maxH / h : Infinity;
      scale = Math.min(sw, sh);
      if (!isFinite(scale)) scale = 1;
      if (s.noEnlarge) scale = Math.min(scale, 1);
    }
    return {
      w: Math.max(1, Math.round(w * scale)),
      h: Math.max(1, Math.round(h * scale))
    };
  }

  function outType(file, s) {
    if (s.format !== 'same') return s.format;
    return EXT[file.type] ? file.type : 'image/png';
  }

  function baseName(name) {
    return name.replace(/\.[^.]+$/, '') || 'image';
  }

  function render() {
    list.textContent = '';
    items.forEach(function (it) {
      var li = document.createElement('li');
      li.className = 'result';

      var img = document.createElement('img');
      img.className = 'thumb';
      img.alt = '';
      if (it.url) img.src = it.url;
      else if (it.srcUrl) img.src = it.srcUrl;

      var body = document.createElement('div');
      var name = document.createElement('p');
      name.className = 'result-name';
      name.textContent = it.file.name;
      var meta = document.createElement('p');
      meta.className = 'result-meta';

      if (it.error) {
        meta.textContent = it.error;
      } else if (!it.blob) {
        meta.textContent = 'Working…';
      } else {
        var diff = Math.round((it.blob.size / it.file.size - 1) * 100);
        meta.appendChild(document.createTextNode(it.w + '×' + it.h + ' → '));
        var strong = document.createElement('strong');
        strong.textContent = it.outW + '×' + it.outH;
        meta.appendChild(strong);
        meta.appendChild(document.createElement('br'));
        meta.appendChild(document.createTextNode(fmtBytes(it.file.size) + ' → '));
        var size = document.createElement('strong');
        size.textContent = fmtBytes(it.blob.size);
        meta.appendChild(size);
        var pct = document.createElement('span');
        pct.className = diff > 0 ? 'bigger' : '';
        pct.textContent = ' (' + (diff > 0 ? '+' : '') + diff + '%)' + (diff > 0 ? ' larger than the original' : '');
        meta.appendChild(pct);
      }
      body.appendChild(name);
      body.appendChild(meta);

      var actions = document.createElement('div');
      actions.className = 'result-actions';
      if (it.blob && it.url) {
        var dl = document.createElement('a');
        dl.className = 'btn';
        dl.href = it.url;
        dl.download = baseName(it.file.name) + '-resized.' + EXT[it.type];
        dl.textContent = 'Download';
        actions.appendChild(dl);
      }
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'btn btn-ghost';
      rm.textContent = 'Remove';
      rm.setAttribute('aria-label', 'Remove ' + it.file.name);
      rm.addEventListener('click', function () {
        removeItem(it.id);
      });
      actions.appendChild(rm);

      li.appendChild(img);
      li.appendChild(body);
      li.appendChild(actions);
      list.appendChild(li);
    });
    updateStatus();
  }

  function updateStatus() {
    var done = items.filter(function (i) { return i.blob; });
    if (!items.length) {
      statusEl.textContent = 'No images yet';
      return;
    }
    var before = 0;
    var after = 0;
    done.forEach(function (i) {
      before += i.file.size;
      after += i.blob.size;
    });
    var failed = items.filter(function (i) { return i.error; }).length;
    var pending = items.length - done.length - failed;
    var word = function (n) { return n + (n === 1 ? ' image' : ' images'); };
    if (pending) {
      statusEl.textContent = word(items.length) + ' · working…';
    } else if (done.length) {
      statusEl.textContent = word(done.length) + ' · ' + fmtBytes(before) + ' → ' + fmtBytes(after) +
        (failed ? ' · ' + failed + ' could not be read' : '');
    } else {
      statusEl.textContent = failed + (failed === 1 ? ' file' : ' files') + ' could not be read';
    }
  }

  function toBlob(canvas, type, q) {
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, type, type === 'image/png' ? undefined : q);
    });
  }

  function process(it) {
    var s = settings();
    var token = ++it.token;
    var size = targetSize(it.w, it.h, s);
    var type = outType(it.file, s);
    var canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size.w, size.h);
    }
    ctx.drawImage(it.bitmap, 0, 0, size.w, size.h);
    return toBlob(canvas, type, s.quality).then(function (blob) {
      if (token !== it.token) return;
      if (!blob) {
        it.error = 'This browser could not encode that size or format.';
        return;
      }
      if (it.url) URL.revokeObjectURL(it.url);
      it.blob = blob;
      it.type = blob.type || type;
      it.outW = size.w;
      it.outH = size.h;
      it.url = URL.createObjectURL(blob);
      it.error = '';
    });
  }

  function processAll() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var jobs = items.filter(function (i) { return i.bitmap; }).map(process);
      syncControls();
      Promise.all(jobs).then(render);
    }, 150);
  }

  function removeItem(id) {
    items = items.filter(function (it) {
      if (it.id !== id) return true;
      if (it.url) URL.revokeObjectURL(it.url);
      if (it.srcUrl) URL.revokeObjectURL(it.srcUrl);
      if (it.bitmap && it.bitmap.close) it.bitmap.close();
      return false;
    });
    render();
  }

  function addFiles(files) {
    Array.prototype.forEach.call(files, function (file) {
      var it = { id: nextId++, file: file, token: 0, srcUrl: URL.createObjectURL(file) };
      items.push(it);
      createImageBitmap(file).then(function (bmp) {
        it.bitmap = bmp;
        it.w = bmp.width;
        it.h = bmp.height;
        processAll();
      }, function () {
        it.error = 'Could not read this file as an image.';
        render();
      });
    });
    render();
  }

  input.addEventListener('change', function () {
    addFiles(input.files);
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.classList.add('is-over');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      drop.classList.remove('is-over');
    });
  });
  drop.addEventListener('drop', function (e) {
    var files = Array.prototype.filter.call(e.dataTransfer.files, function (f) {
      return /^image\//.test(f.type);
    });
    if (files.length) addFiles(files);
  });

  function syncControls() {
    var s = settings();
    fitRow.hidden = s.mode !== 'fit';
    pctRow.hidden = s.mode !== 'percent';
    qualityOut.textContent = form.elements.quality.value;
    var png = outTypeForUi() === 'image/png';
    form.elements.quality.disabled = png;
  }

  // Quality is meaningless only when every output is PNG
  function outTypeForUi() {
    var s = settings();
    if (s.format !== 'same') return s.format;
    return items.length && items.every(function (i) { return outType(i.file, s) === 'image/png'; }) ? 'image/png' : '';
  }

  form.addEventListener('input', function () {
    syncControls();
    processAll();
  });

  syncControls();
})();
