(function () {
  var T = window.ToolshedTools;

  T.register('password-generator', function (root, k) {
    var len = k.range('Length', { min: 8, max: 64, value: 20 });
    var up = k.check('Uppercase A–Z', true);
    var lo = k.check('Lowercase a–z', true);
    var di = k.check('Digits 0–9', true);
    var sy = k.check('Symbols !@#$…', true);
    var amb = k.check('Avoid look-alikes (0 O o 1 l I)');
    var out = k.out('Password', { rows: 2 });
    var status = k.status();
    var SETS = {
      up: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lo: 'abcdefghijklmnopqrstuvwxyz',
      di: '0123456789',
      sy: '!@#$%^&*()-_=+[]{};:,.?/'
    };
    function gen() {
      var on = [];
      if (up.input.checked) on.push('up');
      if (lo.input.checked) on.push('lo');
      if (di.input.checked) on.push('di');
      if (sy.input.checked) on.push('sy');
      if (!on.length) {
        out.set('');
        status.textContent = 'Pick at least one character type.';
        return;
      }
      var sets = on.map(function (id) {
        var s = SETS[id];
        return amb.input.checked ? s.replace(/[0Oo1lI]/g, '') : s;
      });
      var pool = sets.join('');
      var n = parseInt(len.input.value, 10);
      // One from each chosen set first, so every type shows up, then fill and shuffle
      var chars = sets.map(function (s) { return s[k.rand(s.length)]; });
      while (chars.length < n) chars.push(pool[k.rand(pool.length)]);
      out.set(k.shuffle(chars).slice(0, n).join(''));
      status.textContent = 'About ' + Math.round(n * Math.log2(pool.length)) + ' bits of strength';
    }
    k.watch([len.input, up.input, lo.input, di.input, sy.input, amb.input], gen);
    root.appendChild(k.group('', len.el, k.row(up.el, lo.el, di.el, sy.el, amb.el), k.btn('Generate another', gen), out.el, status));
  });

  T.register('hash-generator', function (root, k) {
    var src = k.area('Your text', { rows: 6, placeholder: 'Type or paste here' });
    var ALGS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    var outs = ALGS.map(function (a) {
      var o = k.out(a, { rows: 2 });
      return { alg: a, o: o };
    });
    var upper = k.check('Uppercase hex');
    var token = 0;
    function hex(buf) {
      var s = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      return upper.input.checked ? s.toUpperCase() : s;
    }
    function run() {
      var t = ++token;
      var bytes = new TextEncoder().encode(src.input.value);
      outs.forEach(function (x) {
        crypto.subtle.digest(x.alg, bytes).then(function (d) { if (t === token) x.o.set(hex(d)); });
      });
    }
    k.watch([src.input, upper.input], run);
    root.appendChild(k.group('', src.el, upper.el, outs.map(function (x) { return x.o.el; })));
  });

  T.register('passphrase-maker', function (root, k) {
    var WORDS = ('able acid acorn actor agent alarm album alert alley amber angle ankle apple april arch arena armor arrow atlas attic aunt autumn ' +
      'avocado bacon badge baker balance bamboo banjo barn basil basket beach beacon beard bench berry bike birch bison blanket blossom bolt bone ' +
      'bottle boulder branch bread breeze brick bridge bronze brook brush bucket cabin cable cactus camel candle canoe canvas canyon carpet castle ' +
      'cedar chair chalk cherry chimney cider circle citrus clay cliff clock cloud clover coast cobalt cocoa comet copper coral cotton cradle crane ' +
      'creek crown crystal curtain daisy dancer delta desert diamond dolphin dragon drift drum eagle echo elbow ember engine falcon feather fern ferry ' +
      'field finch flame flint flute forest fossil fox garden garlic gate ginger glacier globe goose granite grape gravel harbor hammer harvest hazel ' +
      'hedge heron hill honey horizon island ivory jacket jade jasmine jungle kettle kite ladder lake lantern lava lemon lilac lime linen lizard lotus ' +
      'magnet maple marble meadow melon mint mirror moon moss mountain mulberry nectar needle nest nickel noodle oak oasis ocean olive onion orchid ' +
      'otter oyster paddle palm panda paper pearl pebble pepper pillow pine planet plum pocket pond poppy prairie pumpkin quartz quill rabbit radish ' +
      'raven reef ribbon river robin rocket saddle saffron sail salmon sand scarf shadow shell silver sketch slate spark spice spruce squirrel star ' +
      'stone storm summit swan tangerine teapot thistle thunder tiger timber tulip tunnel turtle valley velvet violet walnut wave willow window winter ' +
      'wolf yarn zebra zephyr').split(' ');
    var count = k.range('Words', { min: 3, max: 10, value: 5 });
    var sep = k.select('Separator', [['-', 'Hyphen -'], [' ', 'Space'], ['.', 'Dot .'], ['_', 'Underscore _'], ['', 'None']], '-');
    var cap = k.check('Capitalise each word');
    var num = k.check('Add a number at the end');
    var out = k.out('Passphrase', { rows: 2 });
    var status = k.status();
    function gen() {
      var n = parseInt(count.input.value, 10);
      var w = [];
      for (var i = 0; i < n; i++) {
        var x = WORDS[k.rand(WORDS.length)];
        w.push(cap.input.checked ? x[0].toUpperCase() + x.slice(1) : x);
      }
      var s = w.join(sep.input.value);
      var bits = n * Math.log2(WORDS.length);
      if (num.input.checked) { s += sep.input.value + k.rand(100); bits += Math.log2(100); }
      out.set(s);
      status.textContent = 'About ' + Math.round(bits) + ' bits of strength from a list of ' + WORDS.length + ' words';
    }
    k.watch([count.input, sep.input, cap.input, num.input], gen);
    root.appendChild(k.group('', count.el, k.row(sep.el, cap.el, num.el), k.btn('Generate another', gen), out.el, status));
  });

  T.register('password-strength', function (root, k) {
    var pw = k.text('Password to check', { type: 'password', placeholder: 'Nothing is stored or sent' });
    var show = k.check('Show password');
    var stats = k.stats(['Length', 'Strength', 'Entropy', 'Time to crack']);
    var notes = k.h('ul', { class: 'notes' });
    var COMMON = ['password', '123456', '12345678', 'qwerty', 'abc123', 'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon',
      'football', 'baseball', 'sunshine', 'master', 'login', 'princess', 'passw0rd', 'trustno1', '111111', '000000', 'qwertyuiop', 'changeme'];
    function pool(s) {
      var p = 0;
      if (/[a-z]/.test(s)) p += 26;
      if (/[A-Z]/.test(s)) p += 26;
      if (/[0-9]/.test(s)) p += 10;
      if (/[^A-Za-z0-9]/.test(s)) p += 32;
      return p;
    }
    function human(sec) {
      if (sec < 1) return 'instantly';
      var units = [['year', 31557600], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
      if (sec > 31557600 * 1.4e10) return 'longer than the age of the universe';
      for (var i = 0; i < units.length; i++) {
        if (sec >= units[i][1]) {
          var n = Math.round(sec / units[i][1]);
          return k.fmt(n, 0) + ' ' + units[i][0] + (n === 1 ? '' : 's');
        }
      }
      return 'instantly';
    }
    function check() {
      var s = pw.input.value;
      pw.input.type = show.input.checked ? 'text' : 'password';
      notes.textContent = '';
      if (!s) {
        stats.set({ Length: '0', Strength: '—', Entropy: '—', 'Time to crack': '—' });
        return;
      }
      var bits = s.length * Math.log2(Math.max(pool(s), 2));
      var warn = [];
      var lower = s.toLowerCase();
      if (COMMON.some(function (c) { return lower.indexOf(c) !== -1; })) { bits = Math.min(bits, 20); warn.push('Contains a very common password or phrase.'); }
      if (/^(.)\1+$/.test(s)) { bits = Math.min(bits, 8); warn.push('Is one character repeated.'); }
      else if (/(.)\1{2,}/.test(s)) { bits -= 6; warn.push('Has a character repeated three or more times.'); }
      if (/(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|zxcv)/i.test(s)) { bits -= 10; warn.push('Contains an easy keyboard or number sequence.'); }
      if (/^[A-Za-z]+\d{1,4}$/.test(s)) { bits = Math.min(bits - 6, 30); warn.push('A word followed by digits is one of the first patterns attackers try.'); }
      if (s.length < 12) warn.push('Shorter than 12 characters.');
      bits = Math.max(bits, 1);
      var label = bits < 28 ? 'Very weak' : bits < 36 ? 'Weak' : bits < 60 ? 'Fair' : bits < 80 ? 'Strong' : 'Very strong';
      // Offline attack at 10 billion guesses per second, average case is half the space
      var secs = Math.pow(2, bits) / 2 / 1e10;
      stats.set({ Length: String(s.length), Strength: label, Entropy: Math.round(bits) + ' bits', 'Time to crack': human(secs) });
      warn.forEach(function (w) { notes.appendChild(k.h('li', { text: w })); });
    }
    k.watch([pw.input, show.input], check);
    root.appendChild(k.group('', pw.el, show.el, stats.el, notes,
      k.h('p', { class: 'hint', text: 'A rough estimate that assumes an offline attacker making 10 billion guesses a second. It cannot know every pattern, so use a long random password from a manager.' })));
  });
})();
