(function () {
  var T = window.ToolshedTools;

  // Shared shape: input box, encode/decode buttons, result box, error status
  function codec(root, k, opts) {
    var src = k.area(opts.label || 'Your text', { rows: 7, placeholder: opts.placeholder || 'Type or paste here' });
    var out = k.out('Result', { rows: 7 });
    var status = k.status();
    var extra = (opts.extra || []).map(function (e) { return e.el; });
    function run(fn) {
      status.classList.remove('is-error');
      status.textContent = '';
      try {
        out.set(fn(src.input.value));
      } catch (e) {
        out.set('');
        status.classList.add('is-error');
        status.textContent = e.message || 'That could not be converted.';
      }
    }
    var buttons = k.h('div', { class: 'btn-row' },
      k.btn(opts.encodeLabel || 'Encode', function () { run(opts.encode); }),
      k.btn(opts.decodeLabel || 'Decode', function () { run(opts.decode); }, true));
    root.appendChild(k.group('', src.el, extra, buttons, status, out.el));
  }

  T.register('base64', function (root, k) {
    var urlsafe = k.check('URL-safe alphabet (- and _ instead of + and /)');
    function toB64(s) {
      var bytes = new TextEncoder().encode(s);
      var bin = '';
      bytes.forEach(function (b) { bin += String.fromCharCode(b); });
      var out = btoa(bin);
      return urlsafe.input.checked ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out;
    }
    function fromB64(s) {
      s = s.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var bin;
      try { bin = atob(s); } catch (e) { throw new Error('This is not valid Base64.'); }
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
    codec(root, k, { encode: toB64, decode: function (s) {
      try { return fromB64(s); } catch (e) {
        throw new Error(e.message.indexOf('Base64') > -1 ? e.message : 'The decoded bytes are not valid text.');
      }
    }, extra: [{ el: urlsafe.el }] });
  });

  T.register('url-encode-decode', function (root, k) {
    var full = k.check('Treat as a full URL (keep : / ? & = # characters)');
    codec(root, k, {
      placeholder: 'https://example.com/search?q=hello world',
      encode: function (s) { return full.input.checked ? encodeURI(s) : encodeURIComponent(s); },
      decode: function (s) {
        try { return full.input.checked ? decodeURI(s) : decodeURIComponent(s); } catch (e) { throw new Error('This has a broken % sequence.'); }
      },
      extra: [{ el: full.el }]
    });
  });

  T.register('html-entities', function (root, k) {
    codec(root, k, {
      placeholder: '<p class="a">Fish & chips</p>',
      encodeLabel: 'Escape',
      decodeLabel: 'Unescape',
      encode: function (s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      },
      decode: function (s) {
        // DOMParser builds an inert document: nothing in the text is run
        return new DOMParser().parseFromString(s, 'text/html').documentElement.textContent;
      }
    });
  });

  T.register('morse-code', function (root, k) {
    var MAP = {
      A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
      M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
      Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...',
      8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.',
      '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-',
      '"': '.-..-.', '@': '.--.-.'
    };
    var REV = {};
    Object.keys(MAP).forEach(function (c) { REV[MAP[c]] = c; });
    codec(root, k, {
      placeholder: 'SOS  or  ... --- ...',
      encodeLabel: 'Text to Morse',
      decodeLabel: 'Morse to text',
      encode: function (s) {
        return s.toUpperCase().split(/\s+/).filter(Boolean).map(function (w) {
          return w.split('').map(function (c) { return MAP[c] || '?'; }).join(' ');
        }).join(' / ');
      },
      decode: function (s) {
        return s.trim().split(/\s*\/\s*|\s{3,}/).map(function (w) {
          return w.split(/\s+/).filter(Boolean).map(function (c) { return REV[c] || '?'; }).join('');
        }).join(' ');
      }
    });
  });
})();
