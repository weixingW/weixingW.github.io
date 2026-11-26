/* Weixing Wang — site script. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme ---------- */
  function setTheme(t, persist) {
    root.setAttribute('data-theme', t);
    if (persist) { try { localStorage.setItem('theme', t); } catch (e) {} }
    document.dispatchEvent(new CustomEvent('themechange'));
  }
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var onScheme = function (e) {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) {}
    if (!saved) setTheme(e.matches ? 'dark' : 'light', false);
  };
  if (mq.addEventListener) mq.addEventListener('change', onScheme);

  /* ---------- Berlin clock ---------- */
  var clock = document.getElementById('clock');
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 15000);
  }

  /* ---------- Email (assembled at runtime to deter simple scrapers) ---------- */
  document.querySelectorAll('.js-email').forEach(function (a) {
    var addr = a.getAttribute('data-u') + '@' + a.getAttribute('data-d');
    a.setAttribute('href', 'mailto:' + addr);
    var t = a.querySelector('[data-email-text]');
    if (t) t.textContent = addr;
  });

  /* ---------- Publication filters ---------- */
  var chips = document.querySelectorAll('[data-filter]');
  var pubs = document.querySelectorAll('.pub');
  var count = document.getElementById('pub-count');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      var n = 0;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      pubs.forEach(function (p) {
        var tags = (p.getAttribute('data-tags') || '').split(/\s+/);
        var show = f === 'all' || tags.indexOf(f) !== -1;
        p.hidden = !show;
        if (show) n++;
      });
      if (count) count.textContent = (n < 10 ? '0' : '') + n;
    });
  });

  /* ---------- Scroll reveal + active nav ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    reveals.forEach(function (el) { ro.observe(el); });

    var navLinks = document.querySelectorAll('.bar-nav a');
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = byId[e.target.id];
        if (!link) return;
        if (e.isIntersecting) {
          navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        } else if (link.getAttribute('aria-current')) {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) so.observe(s);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ==========================================================================
     Token portrait
     The photo is quantised into a COLS×ROWS grid of discrete "tokens" drawn
     from a K-level codebook. Random tokens briefly hallucinate (accent flash);
     the cursor acts as a latent-editing lens that restores 4× detail.
     ========================================================================== */
  var fig = document.querySelector('.token-fig');
  var canvas = document.getElementById('tokens');
  var srcImg = fig && fig.querySelector('img');
  if (!fig || !canvas || !srcImg || !canvas.getContext) return;

  if (srcImg.complete && srcImg.naturalWidth) initTokens();
  else srcImg.addEventListener('load', initTokens, { once: true });

  function initTokens() {
    var COLS = 36, ROWS = 39, SUB = 4, K = 8, HK = 16, N = COLS * ROWS;
    var ZOOM = 1.15, FOCUS_X = 0.52, FOCUS_Y = 0.47, SHARPEN = 1.5, GAMMA = 1.35;
    var W = COLS * SUB, H = ROWS * SUB;

    // --- sample the image -------------------------------------------------
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    var octx = off.getContext('2d', { willReadFrequently: true });
    // crop to the grid's aspect ratio, zoomed slightly toward the face
    var iw = srcImg.naturalWidth, ih = srcImg.naturalHeight, ta = COLS / ROWS;
    var sw = iw / ZOOM, sh = sw / ta;
    if (sh > ih) { sh = ih; sw = sh * ta; }
    var sx = Math.max(0, Math.min(iw - sw, iw * FOCUS_X - sw / 2));
    var sy = Math.max(0, Math.min(ih - sh, ih * FOCUS_Y - sh / 2));
    octx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, W, H);

    var px;
    try { px = octx.getImageData(0, 0, W, H).data; }
    catch (e) { return; } // e.g. opened via file:// — keep the plain <img>

    var hiL = new Float32Array(W * H);
    for (var i = 0; i < W * H; i++) {
      hiL[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
    }
    // unsharp mask: boosts local contrast so facial features survive quantisation
    var blur = boxBlur(boxBlur(hiL, W, H, 3), W, H, 3);
    for (i = 0; i < W * H; i++) hiL[i] = hiL[i] + SHARPEN * (hiL[i] - blur[i]);
    var loL = new Float32Array(N);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var s = 0;
        for (var y = 0; y < SUB; y++) for (var x = 0; x < SUB; x++) s += hiL[(r * SUB + y) * W + c * SUB + x];
        loL[r * COLS + c] = s / (SUB * SUB);
      }
    }
    // contrast stretch on token luminance percentiles
    var sorted = Array.prototype.slice.call(loL).sort(function (a, b) { return a - b; });
    var pLo = sorted[Math.floor(N * 0.02)], pHi = sorted[Math.floor(N * 0.985)];
    var span = (pHi - pLo) || 1;
    var norm = function (v) { v = (v - pLo) / span; return v < 0 ? 0 : v > 1 ? 1 : Math.pow(v, GAMMA); };

    var code = new Uint8Array(N);
    for (i = 0; i < N; i++) code[i] = Math.round(norm(loL[i]) * (K - 1));
    var hiCode = new Uint8Array(W * H);
    for (i = 0; i < W * H; i++) hiCode[i] = Math.round(norm(hiL[i]) * (HK - 1));

    // --- palette (reads CSS custom properties, so it follows the theme) ----
    var pal = [], palStr = [], hiStr = [], accent = [42, 59, 255], accentStr = '', bgStr = '';
    function hex(v) {
      v = v.trim().replace('#', '');
      if (v.length === 3) v = v.replace(/./g, '$&$&');
      var n = parseInt(v, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function css(a) { return 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')'; }
    function luma(a) { return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
    function readColors() {
      var cs = getComputedStyle(root);
      var bg = hex(cs.getPropertyValue('--bg')), ink = hex(cs.getPropertyValue('--ink'));
      accent = hex(cs.getPropertyValue('--accent'));
      accentStr = css(accent);
      bgStr = css(bg);
      var dark = luma(bg) < luma(ink) ? bg : ink, light = dark === bg ? ink : bg;
      var lo = 0.05, hi = 0.93;
      pal = []; palStr = []; hiStr = [];
      for (var k = 0; k < K; k++) { pal[k] = mix(dark, light, lo + (hi - lo) * k / (K - 1)); palStr[k] = css(pal[k]); }
      for (k = 0; k < HK; k++) hiStr[k] = css(mix(dark, light, lo + (hi - lo) * k / (HK - 1)));
    }
    readColors();

    // --- canvas sizing ------------------------------------------------------
    var ctx = canvas.getContext('2d');
    var dpr = 1, Wc = 0, Hc = 0, cw = 0, ch = 0, xs = [], ys = [];
    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      Wc = Math.round(rect.width * dpr);
      Hc = Math.round(rect.width * (ROWS / COLS) * dpr);
      canvas.width = Wc; canvas.height = Hc;
      cw = Wc / COLS; ch = Hc / ROWS;
      for (var c = 0; c <= COLS; c++) xs[c] = Math.round(c * cw);
      for (var r = 0; r <= ROWS; r++) ys[r] = Math.round(r * ch);
      requestDraw();
    }

    // --- state --------------------------------------------------------------
    var fid = new Float32Array(N);      // lens fidelity per token, 0..1
    var hall = new Float32Array(N);     // hallucination intensity, 0..1
    var hallCode = new Uint8Array(N);
    var pointer = null, pointerTimer = 0;
    var revealed = reduceMotion ? N : 0;
    var t0 = 0, last = 0, spawnAcc = 0;
    var REVEAL_MS = 1600, LENS_R = 5.2, LIFE = 1.5, RATE = 5;
    var readout = document.getElementById('readout');

    function spawn() {
      var j = (Math.random() * N) | 0;
      var patch = Math.random() < 0.3 ? 2 : 1;
      for (var dy = 0; dy < patch; dy++) {
        for (var dx = 0; dx < patch; dx++) {
          var cc = (j % COLS) + dx, rr = ((j / COLS) | 0) + dy;
          if (cc >= COLS || rr >= ROWS) continue;
          var k = rr * COLS + cc;
          if (fid[k] > 0.05) continue;
          hall[k] = 1;
          hallCode[k] = (code[k] + 2 + ((Math.random() * (K - 3)) | 0)) % K;
        }
      }
    }

    function step(now) {
      var dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      var active = false;

      if (revealed < N) {
        var t = Math.max(0, Math.min(1, (now - t0) / REVEAL_MS));
        revealed = Math.min(N, Math.floor((1 - Math.pow(1 - t, 2.2)) * N));
        active = true;
      } else if (!reduceMotion) {
        spawnAcc += dt * RATE;
        while (spawnAcc >= 1) { spawnAcc -= 1; spawn(); }
        active = true;
      }

      var ease = Math.min(1, dt * 9);
      for (var i = 0; i < N; i++) {
        var target = 0;
        if (pointer) {
          var dx = (i % COLS) + 0.5 - pointer.x, dy = ((i / COLS) | 0) + 0.5 - pointer.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          target = Math.max(0, Math.min(1, (LENS_R - d) / 1.4));
        }
        var f = fid[i] + (target - fid[i]) * ease;
        if (f < 0.002) f = 0;
        if (Math.abs(f - fid[i]) > 1e-4 || f !== target) active = true;
        fid[i] = f;

        if (hall[i] > 0) {
          hall[i] = Math.max(0, hall[i] - dt / LIFE - f * dt * 10); // the lens corrects hallucinations
          active = true;
        }
      }
      return active;
    }

    function draw() {
      ctx.clearRect(0, 0, Wc, Hc);
      var gap = Math.max(1, Math.round(cw * 0.1));
      var showDigits = cw / dpr >= 11;
      if (showDigits) {
        ctx.font = '500 ' + Math.round(ch * 0.5) + 'px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
      }
      for (var i = 0; i < revealed; i++) {
        var c = i % COLS, r = (i / COLS) | 0;
        var x0 = xs[c], y0 = ys[r], x1 = xs[c + 1], y1 = ys[r + 1];
        var f = fid[i], h = hall[i];

        if (f < 0.999) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = h > 0 ? css(mix(pal[code[i]], accent, Math.min(1, h * 1.4))) : palStr[code[i]];
          ctx.fillRect(x0, y0, x1 - x0 - gap, y1 - y0 - gap);
          if (h > 0.45 && showDigits) {
            ctx.fillStyle = bgStr;
            ctx.globalAlpha = Math.min(1, (h - 0.45) * 3);
            ctx.fillText(String(hallCode[i]), (x0 + x1 - gap) / 2, (y0 + y1 - gap) / 2 + 1);
          }
        }
        if (f > 0) {
          ctx.globalAlpha = f;
          for (var sy2 = 0; sy2 < SUB; sy2++) {
            var py0 = y0 + Math.round((y1 - y0) * sy2 / SUB), py1 = y0 + Math.round((y1 - y0) * (sy2 + 1) / SUB);
            var rowBase = (r * SUB + sy2) * W + c * SUB;
            for (var sx2 = 0; sx2 < SUB; sx2++) {
              var px0 = x0 + Math.round((x1 - x0) * sx2 / SUB), px1 = x0 + Math.round((x1 - x0) * (sx2 + 1) / SUB);
              ctx.fillStyle = hiStr[hiCode[rowBase + sx2]];
              ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
            }
          }
        }
      }
      ctx.globalAlpha = 1;
      if (revealed < N) {
        var fc = revealed % COLS, fr = (revealed / COLS) | 0;
        ctx.fillStyle = accentStr;
        ctx.fillRect(xs[fc], ys[fr], xs[fc + 1] - xs[fc] - gap, ys[fr + 1] - ys[fr] - gap);
        if (readout) readout.textContent = 'Decoding ' + pad4(revealed) + ' / ' + pad4(N);
      } else if (readout && !pointer && readout.textContent.indexOf('Decoding') === 0) {
        readout.textContent = '';
      }
    }

    function boxBlur(src, w, h, rad) {
      var tmp = new Float32Array(w * h), out = new Float32Array(w * h), x, y, k, s, n;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        s = 0; n = 0;
        for (k = -rad; k <= rad; k++) { var xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; n++; } }
        tmp[y * w + x] = s / n;
      }
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        s = 0; n = 0;
        for (k = -rad; k <= rad; k++) { var yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
        out[y * w + x] = s / n;
      }
      return out;
    }

    function pad4(n) { return ('000' + n).slice(-4); }

    // --- loop ---------------------------------------------------------------
    var raf = 0, visible = true;
    function loop(now) {
      raf = 0;
      var active = step(now);
      draw();
      if (active && visible && !document.hidden) raf = requestAnimationFrame(loop);
    }
    function requestDraw() {
      if (!raf && Wc) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }

    // --- pointer: latent-editing lens --------------------------------------
    function setPointer(e) {
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width * COLS;
      var y = (e.clientY - rect.top) / rect.height * ROWS;
      pointer = { x: x, y: y };
      var c = Math.max(0, Math.min(COLS - 1, x | 0)), r = Math.max(0, Math.min(ROWS - 1, y | 0));
      if (readout && revealed >= N) {
        readout.textContent = 'Token r' + (r < 10 ? '0' : '') + r + ' c' + (c < 10 ? '0' : '') + c + ' · k=' + code[r * COLS + c] + ' · restored ×' + SUB;
      }
      requestDraw();
    }
    function clearPointer() {
      pointer = null;
      if (readout && revealed >= N) readout.textContent = '';
      requestDraw();
    }
    canvas.addEventListener('pointermove', setPointer);
    canvas.addEventListener('pointerdown', function (e) {
      setPointer(e);
      clearTimeout(pointerTimer);
    });
    canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') clearPointer(); });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      canvas.addEventListener(type, function (e) {
        if (e.pointerType !== 'mouse') {
          clearTimeout(pointerTimer);
          pointerTimer = setTimeout(clearPointer, 1400);
        }
      });
    });

    // --- lifecycle ------------------------------------------------------------
    document.addEventListener('themechange', function () { readColors(); requestDraw(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) requestDraw(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) requestDraw();
      }).observe(canvas);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);

    // start decoding once the hero headline has settled in
    t0 = performance.now() + (reduceMotion ? 0 : 350);
    fig.classList.add('is-live');
    resize();
  }
})();
