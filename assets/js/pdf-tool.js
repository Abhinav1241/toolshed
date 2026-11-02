(function () {
  var input = document.querySelector('[data-file]');
  var drop = document.querySelector('[data-drop]');
  var statusEl = document.querySelector('[data-status]');
  var toolbar = document.querySelector('[data-toolbar]');
  var list = document.querySelector('[data-pages]');

  var sources = []; // { id, name, doc, hue }
  var pages = []; // { src, index, w, h, sel }
  var nextSrc = 1;
  var dragFrom = -1;
  var notes = [];

  if (!window.PDFLib) {
    statusEl.textContent = 'The PDF library could not be loaded. Check your connection and reload.';
    input.disabled = true;
    return;
  }

  var ICON = {
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>';
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function updateStatus() {
    toolbar.hidden = !pages.length;
    var sel = pages.filter(function (p) { return p.sel; }).length;
    var used = {};
    pages.forEach(function (p) { used[p.src] = true; });
    var text = !pages.length
      ? 'No pages yet'
      : plural(pages.length, 'page') + ' from ' + plural(Object.keys(used).length, 'file') + (sel ? ' · ' + sel + ' selected' : '');
    if (notes.length) text += ' · ' + notes.join(' · ');
    statusEl.textContent = text;
    var none = !sel;
    toolbar.querySelector('[data-act=remove]').disabled = none;
    toolbar.querySelector('[data-act=keep]').disabled = none;
  }

  function render() {
    list.textContent = '';
    pages.forEach(function (p, i) {
      var src = sources.filter(function (s) { return s.id === p.src; })[0];
      var li = document.createElement('li');
      li.className = 'page-tile' + (p.sel ? ' is-selected' : '');
      li.style.setProperty('--hue', src.hue);
      li.draggable = true;
      li.dataset.index = i;

      var top = document.createElement('div');
      top.className = 'page-top';
      var pick = document.createElement('label');
      pick.className = 'page-pick';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = p.sel;
      cb.setAttribute('aria-label', 'Select page ' + (i + 1) + ' (' + src.name + ', page ' + (p.index + 1) + ')');
      cb.addEventListener('change', function () {
        p.sel = cb.checked;
        li.classList.toggle('is-selected', p.sel);
        updateStatus();
      });
      pick.appendChild(cb);
      var num = document.createElement('span');
      num.className = 'page-num';
      num.textContent = i + 1;
      top.appendChild(pick);
      top.appendChild(num);

      var sheet = document.createElement('div');
      sheet.className = 'page-sheet';
      sheet.setAttribute('aria-hidden', 'true');
      sheet.textContent = Math.round(p.w) + ' × ' + Math.round(p.h) + ' pt';

      var from = document.createElement('p');
      from.className = 'page-from';
      from.textContent = src.name + ' · p. ' + (p.index + 1);

      var btns = document.createElement('div');
      btns.className = 'page-btns';
      btns.appendChild(button('left', 'Move page ' + (i + 1) + ' earlier', i === 0, function () { move(i, i - 1); }));
      btns.appendChild(button('right', 'Move page ' + (i + 1) + ' later', i === pages.length - 1, function () { move(i, i + 1); }));
      btns.appendChild(button('trash', 'Remove page ' + (i + 1), false, function () { pages.splice(i, 1); render(); }));

      li.appendChild(top);
      li.appendChild(sheet);
      li.appendChild(from);
      li.appendChild(btns);
      list.appendChild(li);
    });
    updateStatus();
  }

  function button(name, label, disabled, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn';
    b.setAttribute('aria-label', label);
    b.innerHTML = icon(name);
    b.disabled = disabled;
    b.addEventListener('click', function () {
      // After a re-render, keep keyboard focus on the same kind of control, following a moved tile
      var li = b.closest('.page-tile');
      var which = Array.prototype.indexOf.call(li.querySelectorAll('.icon-btn'), b);
      var idx = Array.prototype.indexOf.call(list.children, li);
      fn();
      var at = which === 0 ? idx - 1 : which === 1 ? idx + 1 : idx;
      var tile = list.children[Math.min(Math.max(at, 0), list.children.length - 1)];
      var target = tile && tile.querySelectorAll('.icon-btn')[which];
      if (target && !target.disabled) target.focus();
      else if (tile) tile.querySelector('input').focus();
    });
    return b;
  }

  function move(from, to) {
    if (to < 0 || to >= pages.length || from === to) return;
    var p = pages.splice(from, 1)[0];
    pages.splice(to, 0, p);
    render();
  }

  // Drag and drop reordering
  list.addEventListener('dragstart', function (e) {
    var li = e.target.closest('.page-tile');
    if (!li) return;
    dragFrom = +li.dataset.index;
    li.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragFrom));
  });
  list.addEventListener('dragover', function (e) {
    if (dragFrom < 0) return;
    e.preventDefault();
    var li = e.target.closest('.page-tile');
    Array.prototype.forEach.call(list.children, function (c) { c.classList.toggle('is-target', c === li); });
  });
  list.addEventListener('drop', function (e) {
    if (dragFrom < 0) return;
    e.preventDefault();
    e.stopPropagation();
    var li = e.target.closest('.page-tile');
    var to = li ? +li.dataset.index : -1;
    var from = dragFrom;
    dragFrom = -1;
    if (to >= 0) move(from, to);
    else render();
  });
  list.addEventListener('dragend', function () {
    dragFrom = -1;
    Array.prototype.forEach.call(list.children, function (c) { c.classList.remove('is-dragging', 'is-target'); });
  });

  // Adding files
  function addFile(file) {
    return file.arrayBuffer().then(function (buf) {
      return PDFLib.PDFDocument.load(buf).then(function (doc) {
        var id = nextSrc++;
        var hue = (30 + (id - 1) * 72) % 360;
        sources.push({ id: id, name: file.name, doc: doc, hue: hue });
        doc.getPages().forEach(function (pg, i) {
          var size = pg.getSize();
          pages.push({ src: id, index: i, w: size.width, h: size.height, sel: false });
        });
      });
    }).catch(function (err) {
      var encrypted = err && /encrypt/i.test(err.message || '');
      notes.push(file.name + (encrypted ? ' is password-protected' : ' could not be read'));
    });
  }

  function addFiles(files) {
    var pdfs = Array.prototype.filter.call(files, function (f) {
      return f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    });
    var skipped = files.length - pdfs.length;
    notes = skipped ? [plural(skipped, 'file') + ' skipped (not PDF)'] : [];
    statusEl.textContent = 'Reading ' + plural(pdfs.length, 'file') + '…';
    pdfs.reduce(function (chain, f) {
      return chain.then(function () { return addFile(f); });
    }, Promise.resolve()).then(render);
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
    addFiles(e.dataTransfer.files);
  });

  // Toolbar
  function download() {
    var out = null;
    var btn = toolbar.querySelector('[data-act=download]');
    btn.disabled = true;
    statusEl.textContent = 'Building PDF…';
    PDFLib.PDFDocument.create().then(function (doc) {
      out = doc;
      // copy runs of consecutive pages from one source in a single call
      var runs = [];
      pages.forEach(function (p) {
        var last = runs[runs.length - 1];
        if (last && last.src === p.src) last.idx.push(p.index);
        else runs.push({ src: p.src, idx: [p.index] });
      });
      return runs.reduce(function (chain, run) {
        return chain.then(function () {
          var src = sources.filter(function (s) { return s.id === run.src; })[0];
          return out.copyPages(src.doc, run.idx).then(function (copied) {
            copied.forEach(function (c) { out.addPage(c); });
          });
        });
      }, Promise.resolve());
    }).then(function () {
      return out.save();
    }).then(function (bytes) {
      var blob = new Blob([bytes], { type: 'application/pdf' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var used = {};
      pages.forEach(function (p) { used[p.src] = true; });
      var ids = Object.keys(used);
      var only = sources.filter(function (s) { return String(s.id) === ids[0]; })[0];
      a.download = ids.length === 1 ? only.name.replace(/\.pdf$/i, '') + '-edited.pdf' : 'merged.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      updateStatus();
      statusEl.textContent += ' · downloaded ' + plural(pages.length, 'page') + ', ' + (bytes.length / 1024).toFixed(0) + ' KB';
    }).catch(function () {
      statusEl.textContent = 'Could not build the PDF.';
    }).then(function () {
      btn.disabled = false;
    });
  }

  toolbar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act;
    if (act === 'all' || act === 'none') {
      pages.forEach(function (p) { p.sel = act === 'all'; });
      render();
    } else if (act === 'remove') {
      pages = pages.filter(function (p) { return !p.sel; });
      render();
    } else if (act === 'keep') {
      pages = pages.filter(function (p) { return p.sel; });
      pages.forEach(function (p) { p.sel = false; });
      render();
    } else if (act === 'clear') {
      pages = [];
      sources = [];
      notes = [];
      render();
    } else if (act === 'download' && pages.length) {
      download();
    }
  });

  render();
})();
