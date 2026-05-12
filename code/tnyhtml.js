/*!
 * tnyhtml.js – Micro UI Markup Language for LLM-generated Tailwind UIs
 *
 * Usage:
 *   <script src="tnyhtml.js"></script>
 *   <script type="text/plain" id="tnyhtml"> ... source ... </script>
 *   <body></body>
 *
 * Pipeline: tnyhtml source → Pug → HTML (via pug.min.js from plotdb CDN)
 */
(function () {
  'use strict';

  var dh = document.head;
  function dc(t) { return document.createElement(t); }
  function esc(s) {
    return String(s).replace(/[<>&"]/g, function (c) {
      return c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '&quot;';
    });
  }

  function showError(msg) {
    var target = document.body || document.documentElement;
    target.innerHTML =
      '<div style="font-family:monospace;color:#f87171;background:#111827;padding:24px;' +
      'border-radius:12px;max-width:680px;margin:40px auto;border:1px solid rgba(248,113,113,.2)">' +
      '<strong style="font-size:15px">tnyhtml error</strong>' +
      '<pre style="margin-top:12px;white-space:pre-wrap;font-size:13px;color:#fca5a5">' +
      esc(msg) + '</pre></div>';
  }

  // ── 1. Inject Tailwind CSS ──────────────────────────────────────────────────
  var tw = dc('script');
  tw.src = 'https://cdn.tailwindcss.com';
  dh.appendChild(tw);

  // ── 2. fs stub – pug.min.js calls require('fs') during init ────────────────
  if (typeof window.require !== 'function') {
    window.require = function (m) {
      if (m === 'fs') {
        return {
          readFile: function (p, o, cb) { (typeof o === 'function' ? o : cb)(new Error('no fs')); },
          readFileSync: function () { return ''; }
        };
      }
    };
  }

  // ── 3. Load pug.min.js, then compile & render ───────────────────────────────
  var pugSc = dc('script');
  pugSc.src = 'https://plotdb.github.io/pug-browser/assets/lib/pug/pug.min.js';
  pugSc.onerror = function () {
    document.addEventListener('DOMContentLoaded', function () {
      showError('Failed to load pug.min.js. Check your network connection.');
    });
  };
  pugSc.onload = function () {
    var pug = window.require('pug');
    if (!pug || typeof pug.render !== 'function') {
      document.addEventListener('DOMContentLoaded', function () {
        showError('pug.min.js loaded but pug.render is unavailable.');
      });
      return;
    }

    function render() {
      var srcEl = document.getElementById('tnyhtml');
      if (!srcEl) return;
      try {
        var pugSrc = compile(srcEl.textContent);
        document.body.innerHTML = pug.render(pugSrc, { filename: 'index.pug', basedir: '.' });
      } catch (e) {
        showError(e.message || String(e));
        throw e;
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  };
  dh.appendChild(pugSc);

  // ══════════════════════════════════════════════════════════════════════════════
  // tnyhtml → Pug compiler
  // ══════════════════════════════════════════════════════════════════════════════

  // Tag aliases  ────────────────────────────────────────────────────────────────
  var TAGS = {
    // Core
    d: 'div',   s: 'span',  p: 'p',   a: 'a',    b: 'button',  i: 'input',
    m: 'main',  n: 'nav',   q: 'section', f: 'form', l: 'label',
    u: 'ul',    li: 'li',
    // Form controls
    e: 'select', o: 'option', tx: 'textarea',
    // Table
    t: 'table', th: 'th', tr: 'tr', td: 'td', tk: 'thead', tb: 'tbody', tf: 'tfoot',
    // Headings & void
    h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4',
    img: 'img', br: 'br', hr: 'hr',
    // Semantic layout
    hd: 'header', ft: 'footer', as: 'aside', ar: 'article', fg: 'figure', fc: 'figcaption',
    // Text & code
    st: 'strong', em: 'em', sm: 'small', cd: 'code', pr: 'pre', bd: 'blockquote',
    // Description lists
    dl: 'dl', dt: 'dt', dd: 'dd',
    // SVG
    sv: 'svg', pt: 'path'
  };

  // Void (self-closing) elements  ───────────────────────────────────────────────
  var VOID = { input: 1, img: 1, br: 1, hr: 1, meta: 1, link: 1 };

  /**
   * Main compiler entry: tnyhtml source → Pug source string.
   */
  function compile(source) {
    var lines = source.split('\n');
    var macros = {};
    var out = [];

    // Pass 1 – collect $macro definitions
    for (var li = 0; li < lines.length; li++) {
      var mMatch = lines[li].trim().match(/^\$([a-zA-Z]\w*)=(.+)$/);
      if (mMatch) macros[mMatch[1]] = mMatch[2].trim();
    }

    // Pass 2 – emit Pug lines
    // loopStack entries: { indent: number, rowVar: string }
    var loopStack = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (!trimmed) { out.push(''); continue; }

      var indentStr = line.match(/^(\s*)/)[1];
      var indentLen = indentStr.length;

      // Unwind loops whose block has ended (current indent ≤ loop's indent)
      while (loopStack.length && indentLen <= loopStack[loopStack.length - 1].indent) {
        loopStack.pop();
      }

      var inLoop = loopStack.length > 0;
      var rowVar = inLoop ? loopStack[loopStack.length - 1].rowVar : null;

      // Skip macro definitions
      if (/^\$[a-zA-Z]\w*=/.test(trimmed)) continue;

      // Comments
      if (trimmed.slice(0, 2) === '//') { out.push(indentStr + trimmed); continue; }

      // Data block:  D name=field1|field2;field1|field2
      if (/^D [a-zA-Z]/.test(trimmed)) {
        var rest = trimmed.slice(2).trim();
        var eqIdx = rest.indexOf('=');
        var varName = rest.slice(0, eqIdx).trim();
        var rows = rest.slice(eqIdx + 1).trim().split(';').map(function (row) {
          return '[' + row.split('|').map(function (f) {
            return JSON.stringify(f.trim());
          }).join(',') + ']';
        });
        out.push(indentStr + '- var ' + varName + ' = [' + rows.join(',') + ']');
        continue;
      }

      // Loop:  *varName
      if (/^\*[a-zA-Z]\w*$/.test(trimmed)) {
        var rVar = '_r' + loopStack.length;
        loopStack.push({ indent: indentLen, rowVar: rVar });
        out.push(indentStr + 'each ' + rVar + ' in ' + trimmed.slice(1));
        continue;
      }

      // Node line
      out.push(indentStr + parseNode(trimmed, macros, inLoop, rowVar));
    }

    return out.join('\n');
  }

  /**
   * Parse one tnyhtml node line (no leading whitespace) → Pug fragment.
   *
   * Line structure:
   *   [tag][.class|.$macro|#id|=type|[k:v]]* [[@href] [?placeholder] | text]
   */
  function parseNode(content, macros, inLoop, rowVar) {
    var pos = 0;

    // ── Tag ──────────────────────────────────────────────────────────────────
    var tag = '';
    var explicit = content[0] === '@';
    if (explicit) pos++;

    while (pos < content.length && !/[.#=\[\s]/.test(content[pos])) {
      tag += content[pos++];
    }
    if (!tag) tag = 'div';
    if (!explicit) tag = TAGS[tag] || tag;

    // ── Tag-zone modifiers (no spaces) ───────────────────────────────────────
    // .class  .$macro  #id  =type  [attr:val]  [boolAttr]
    var classes = [];
    var attrs = {};   // value: string | true | { tpl: string }

    while (pos < content.length && content[pos] !== ' ' && content[pos] !== '\t') {
      var ch = content[pos];

      if (ch === '.') {
        pos++;
        var rc = readClass(content, pos);
        pos += rc.consumed;
        if (rc.value[0] === '$') {
          var mkey = rc.value.slice(1);
          if (macros[mkey]) {
            macros[mkey].split(/\s+/).filter(Boolean).forEach(function (c) { classes.push(c); });
          }
        } else if (rc.value) {
          classes.push(rc.value);
        }

      } else if (ch === '#') {
        pos++;
        var id = '';
        while (pos < content.length && !/[\s.=\[@]/.test(content[pos])) id += content[pos++];
        attrs['id'] = id;

      } else if (ch === '=') {
        pos++;
        var typeVal = '';
        while (pos < content.length && !/[\s.#\[]/.test(content[pos])) typeVal += content[pos++];
        attrs['type'] = typeVal;

      } else if (ch === '[') {
        pos++; // skip [
        var attrRaw = '';
        while (pos < content.length && content[pos] !== ']') attrRaw += content[pos++];
        if (content[pos] === ']') pos++;
        var colon = attrRaw.indexOf(':');
        if (colon !== -1) {
          attrs[attrRaw.slice(0, colon)] = attrRaw.slice(colon + 1);
        } else {
          attrs[attrRaw] = true; // boolean attribute
        }

      } else {
        break;
      }
    }

    // ── Text zone (everything after the first space) ─────────────────────────
    // @/href  followed by text    →  href attr + text
    // ?placeholder text           →  placeholder attr (consumes remainder)
    // "quoted text"               →  literal text (outer quotes stripped)
    // anything else               →  text content
    var text = '';

    if (pos < content.length && (content[pos] === ' ' || content[pos] === '\t')) {
      pos++;
      var zone = content.slice(pos);

      if (zone[0] === '@') {
        var spAt = zone.indexOf(' ', 1);
        if (spAt === -1) {
          attrs['href'] = zone.slice(1);
        } else {
          attrs['href'] = zone.slice(1, spAt);
          text = zone.slice(spAt + 1);
        }
      } else if (zone[0] === '?') {
        attrs['placeholder'] = zone.slice(1).trim();
      } else if (zone[0] === '"' && zone[zone.length - 1] === '"') {
        text = zone.slice(1, -1);
      } else {
        text = zone;
      }
    }

    // ── $N substitution inside loops ─────────────────────────────────────────
    // Matches $0, $1, $12 etc. but NOT $84.2k or $anything-with-letters
    var slotRe = /\$(\d+)(?![.\d\w])/g;

    if (inLoop && rowVar) {
      text = text.replace(slotRe, function (_, n) {
        return '#{' + rowVar + '[' + n + ']}';
      });

      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (typeof v === 'string' && /\$\d+/.test(v)) {
          attrs[k] = {
            tpl: v.replace(slotRe, function (_, n) {
              return '${' + rowVar + '[' + n + ']}';
            })
          };
        }
      });
    }

    // ── Build Pug attribute string ────────────────────────────────────────────
    var parts = [];
    if (classes.length) parts.push('class="' + classes.join(' ') + '"');

    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === true) {
        parts.push(k);
      } else if (v && typeof v === 'object' && v.tpl) {
        parts.push(k + '=`' + v.tpl + '`');
      } else {
        parts.push(k + '="' + String(v) + '"');
      }
    });

    var pugLine = tag;
    if (parts.length) pugLine += '(' + parts.join(', ') + ')';
    if (!VOID[tag] && text.trim()) pugLine += ' ' + text.trim();

    return pugLine;
  }

  /**
   * Read a Tailwind class token from `content` starting at `start`.
   *
   * Handles:
   *   Arbitrary values   w-[720px]  grid-cols-[repeat(3,minmax(0,1fr))]
   *   Decimal values     px-2.5     space-y-0.5   (dot followed by digit = part of class)
   *   Responsive/state   sm:flex    hover:bg-blue-500   md:hover:bg-blue-500/50
   *
   * Stops at: space, #, =, @, ( or a dot NOT followed by a digit.
   *
   * Returns { value: string, consumed: number }
   */
  function readClass(content, start) {
    var pos = start;
    var cls = '';

    while (pos < content.length) {
      var c = content[pos];

      if (c === '[') {
        // Arbitrary value block: read until matching ]
        while (pos < content.length && content[pos] !== ']') cls += content[pos++];
        if (pos < content.length) cls += content[pos++]; // include ]

      } else if (c === '.') {
        // Decimal dot (e.g. px-2.5): continue only if followed by a digit
        if (pos + 1 < content.length && /\d/.test(content[pos + 1])) {
          cls += content[pos++];
        } else {
          break; // class separator – stop
        }

      } else if (/[\s#=(@]/.test(c)) {
        break;

      } else {
        cls += content[pos++];
      }
    }

    return { value: cls, consumed: pos - start };
  }

  // Expose compile function globally (useful for debugging / testing)
  window.tnyToHtml = compile;

})();
