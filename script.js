(function () {
  'use strict';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MENU = window.MENU || [];
  var $ = function (s) { return document.querySelector(s); };

  var WA_NUMBER = '201007475474';
  var STORE = 'elbasha_cart_v1';
  var REG = {};      /* key -> { name, size, price, label } */
  var ORDER = [];    /* keys بترتيب المنيو */
  var cart = {};     /* key -> qty */
  var qtyEls = {};   /* key -> [elements] */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function num(v) { return '<span class="num" data-v="' + v + '">' + v + '</span>'; }
  function parts(d) {
    return '<ul class="parts">' + d.split(' + ').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- registry & controls ---------- */
  function mkKey(secId, name, size) { return [secId, name, size || ''].join('|'); }
  function reg(k, name, size, price) {
    if (!REG[k]) ORDER.push(k);
    REG[k] = { name: name, size: size || '', price: price, label: size ? name + ' (' + size + ')' : name };
  }
  function addBtn(k) {
    return '<button type="button" class="btn-add" data-act="inc" data-key="' + esc(k) + '">أضف</button>';
  }
  function qtyBox(k) { return '<div class="qty" data-key="' + esc(k) + '">' + addBtn(k) + '</div>'; }
  function stepper(k, q) {
    var ek = esc(k);
    return '<div class="stepper"><button type="button" data-act="dec" data-key="' + ek + '" aria-label="إنقاص">−</button>' +
      '<span>' + q + '</span>' +
      '<button type="button" data-act="inc" data-key="' + ek + '" aria-label="زيادة">+</button></div>';
  }

  /* ---------- render ---------- */
  function card(sec, it, i) {
    var h = '<article class="card reveal' + (it.featured ? ' featured' : '') + '" style="--d:' + ((i % 3) * 80) + 'ms">';
    h += '<div><div class="name">' + esc(it.n) + '</div>';
    if (it.badge) h += '<span class="badge">' + esc(it.badge) + '</span>';
    h += '</div>';
    if (it.d) {
      if (it.dLabel) h += '<div class="desc-label">' + esc(it.dLabel) + '</div>';
      h += it.d.indexOf(' + ') > -1 ? parts(it.d) : '<p class="desc">' + esc(it.d) + '</p>';
    }
    h += '<div class="foot">';
    if (it.s) {
      h += '<div class="sizes" style="--n:' + it.s.length + '" data-n="' + it.s.length + '">';
      it.s.forEach(function (x) {
        var k = mkKey(sec.id, it.n, x[0]);
        reg(k, it.n, x[0], x[1]);
        h += '<div class="size"><span class="lbl">' + esc(x[0]) + '</span><span class="val">' + num(x[1]) +
          '<small>جنيه</small></span>' + qtyBox(k) + '</div>';
      });
      h += '</div>';
    } else {
      var k1 = mkKey(sec.id, it.n, '');
      reg(k1, it.n, '', it.p);
      h += '<div class="foot-row"><span class="val">' + num(it.p) + '<small>جنيه</small></span>' + qtyBox(k1) + '</div>';
    }
    return h + '</div></article>';
  }

  function rows(sec, items) {
    return '<ul class="rows reveal">' + items.map(function (it) {
      var k = mkKey(sec.id, it.n, '');
      reg(k, it.n, '', it.p);
      return '<li class="row"><span class="rn">' + esc(it.n) + '</span><span class="dots"></span><span class="val">' +
        num(it.p) + '<small>جنيه</small></span>' + qtyBox(k) + '</li>';
    }).join('') + '</ul>';
  }

  function render() {
    var main = $('#menu'), track = $('#navTrack'), html = '', nav = '';
    MENU.forEach(function (sec) {
      nav += '<a class="chip" href="#' + sec.id + '" data-id="' + sec.id + '">' + esc(sec.title) + '</a>';
      html += '<section class="sec" id="' + sec.id + '"><div class="sec-head reveal"><h2>' + esc(sec.title) + '</h2><span class="rule"></span>';
      if (sec.note) html += '<p class="note">' + esc(sec.note) + '</p>';
      html += '</div>';
      sec.groups.forEach(function (g) {
        html += '<div class="group">';
        if (g.title) html += '<h3 class="reveal">' + esc(g.title) + '</h3>';
        if (g.kind === 'rows') {
          html += rows(sec, g.items);
        } else {
          var n = g.items.length, two = (n <= 2 || n === 4) ? ' two' : '';
          html += '<div class="grid' + two + '">' + g.items.map(function (it, i) { return card(sec, it, i); }).join('') + '</div>';
        }
        html += '</div>';
      });
      html += '</section>';
    });
    main.innerHTML = html;
    track.innerHTML = nav;
    document.querySelectorAll('.qty').forEach(function (el) {
      var k = el.getAttribute('data-key');
      (qtyEls[k] = qtyEls[k] || []).push(el);
    });
  }

  /* ---------- cart state ---------- */
  function save() { try { localStorage.setItem(STORE, JSON.stringify(cart)); } catch (e) { /* ignore */ } }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(STORE) || '{}');
      Object.keys(o).forEach(function (k) {
        var q = parseInt(o[k], 10);
        if (REG[k] && q > 0) cart[k] = Math.min(99, q);
      });
    } catch (e) { /* ignore */ }
  }
  function totals() {
    var c = 0, t = 0;
    Object.keys(cart).forEach(function (k) { c += cart[k]; t += cart[k] * REG[k].price; });
    return { c: c, t: t };
  }

  function renderQty(k) {
    var q = cart[k] || 0;
    (qtyEls[k] || []).forEach(function (el) {
      el.innerHTML = q ? stepper(k, q) : addBtn(k);
      var host = el.closest('.card, .row');
      if (host) host.classList.toggle('sel', !!host.querySelector('.stepper'));
    });
  }

  var bar = $('#cartbar'), drawer = $('#drawer'), lastFocus = null;

  function bump() {
    bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump');
  }

  function renderLines() {
    var ul = $('#lines'), html = '';
    ORDER.forEach(function (k) {
      var q = cart[k]; if (!q) return;
      var r = REG[k], ek = esc(k);
      html += '<li class="line"><div class="l-top"><span class="l-name">' + esc(r.name) + '</span>' +
        (r.size ? '<span class="l-size">' + esc(r.size) + '</span>' : '') +
        '<button type="button" class="l-rm" data-act="rm" data-key="' + ek + '">حذف</button></div>' +
        '<div class="l-bot">' + stepper(k, q) + '<span class="l-total">' + (q * r.price) + '<small>جنيه</small></span></div></li>';
    });
    ul.innerHTML = html;
    var empty = !html;
    $('#emptyMsg').hidden = !empty;
    $('#orderForm').hidden = empty;
  }

  function refresh() {
    var tt = totals();
    $('#cbCount').textContent = tt.c;
    $('#cbTotal').textContent = tt.t;
    $('#dTotal').textContent = tt.t;
    bar.classList.toggle('show', tt.c > 0);
    document.body.classList.toggle('has-cart', tt.c > 0);
    $('#sendWa').disabled = !tt.c;
    renderLines();
  }

  function setQty(k, q) {
    if (!REG[k]) return;
    var prev = cart[k] || 0;
    q = Math.max(0, Math.min(99, q));
    if (q) cart[k] = q; else delete cart[k];
    save();
    renderQty(k);
    refresh();
    if (q > prev) bump();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b) return;
    var k = b.getAttribute('data-key'), act = b.getAttribute('data-act');
    if (act === 'inc') setQty(k, (cart[k] || 0) + 1);
    else if (act === 'dec') setQty(k, (cart[k] || 0) - 1);
    else if (act === 'rm') setQty(k, 0);
  });

  /* ---------- drawer ---------- */
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('noscroll');
    setTimeout(function () { $('#dClose').focus(); }, 60);
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('noscroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('#openCart').addEventListener('click', openDrawer);
  $('#dClose').addEventListener('click', closeDrawer);
  $('#dBackdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(
        drawer.querySelectorAll('button:not([disabled]), input, textarea'),
        function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function getType() {
    var r = document.querySelector('input[name="otype"]:checked');
    return r ? r.value : 'استلام من المطعم';
  }
  document.querySelectorAll('input[name="otype"]').forEach(function (r) {
    r.addEventListener('change', function () {
      var d = getType() === 'توصيل';
      $('#fAddr').hidden = !d;
      if (d) $('#fAddr').focus();
      $('#err').textContent = '';
    });
  });

  var clearArmed = false, clearTimer = 0;
  $('#clearCart').addEventListener('click', function () {
    var btn = this;
    if (!clearArmed) {
      clearArmed = true; btn.textContent = 'اضغط مرة أخرى للتأكيد';
      clearTimer = setTimeout(function () { clearArmed = false; btn.textContent = 'تفريغ الطلب'; }, 3000);
      return;
    }
    clearTimeout(clearTimer); clearArmed = false; btn.textContent = 'تفريغ الطلب';
    Object.keys(cart).forEach(function (k) { delete cart[k]; renderQty(k); });
    save(); refresh();
  });

  /* ---------- whatsapp message ---------- */
  function buildMsg() {
    var type = getType(), name = $('#fName').value.trim(), addr = $('#fAddr').value.trim(), note = $('#fNote').value.trim();
    var L = ['طلب جديد من منيو مشويات الباشا', ''];
    if (name) L.push('الاسم: ' + name);
    L.push('نوع الطلب: ' + type);
    if (type === 'توصيل') L.push('العنوان: ' + addr);
    L.push('', 'الأصناف:');
    var i = 0;
    ORDER.forEach(function (k) {
      var q = cart[k]; if (!q) return;
      i++;
      L.push(i + '- ' + REG[k].label + ' × ' + q + ' = ' + (q * REG[k].price) + ' جنيه');
    });
    L.push('', 'الإجمالي: ' + totals().t + ' جنيه');
    if (type === 'توصيل') L.push('(بدون رسوم التوصيل)');
    if (note) L.push('', 'ملاحظات: ' + note);
    return L.join('\n');
  }
  window.__buildMsg = buildMsg; /* للاختبار فقط */

  $('#sendWa').addEventListener('click', function () {
    if (!totals().c) return;
    var err = $('#err');
    if (getType() === 'توصيل' && !$('#fAddr').value.trim()) {
      err.textContent = 'من فضلك اكتب العنوان للتوصيل';
      $('#fAddr').focus();
      return;
    }
    err.textContent = '';
    var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(buildMsg());
    var a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  });

  /* ---------- reveal + price count-up ---------- */
  function countUp(el) {
    var to = +el.getAttribute('data-v');
    if (reduce || !to) return;
    var t0 = performance.now(), dur = 800;
    el.textContent = '0';
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(step); else el.textContent = to;
    })(t0);
  }
  function setupReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        en.target.querySelectorAll('.num').forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- active section in nav ---------- */
  function setupNav() {
    var chips = {}, lockUntil = 0, current = null;
    document.querySelectorAll('.chip').forEach(function (c) { chips[c.getAttribute('data-id')] = c; });

    function activate(id) {
      if (id === current) return;
      current = id;
      Object.keys(chips).forEach(function (k) {
        var on = k === id;
        chips[k].classList.toggle('active', on);
        if (on) chips[k].setAttribute('aria-current', 'true'); else chips[k].removeAttribute('aria-current');
      });
      if (chips[id]) chips[id].scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }

    document.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        lockUntil = Date.now() + 900;
        activate(c.getAttribute('data-id'));
      });
    });

    if (!('IntersectionObserver' in window)) return;
    var so = new IntersectionObserver(function (entries) {
      if (Date.now() < lockUntil) return;
      entries.forEach(function (en) { if (en.isIntersecting) activate(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.sec').forEach(function (s) { so.observe(s); });

    var hero = $('#top');
    if (hero) new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && Date.now() >= lockUntil) {
        current = null;
        Object.keys(chips).forEach(function (k) { chips[k].classList.remove('active'); chips[k].removeAttribute('aria-current'); });
      }
    }, { threshold: 0.6 }).observe(hero);
  }

  /* ---------- scroll progress ---------- */
  function setupProgress() {
    var pbar = $('#progress'), main = $('#menu'), ticking = false;
    function update() {
      var r = main.getBoundingClientRect(), total = r.height - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      pbar.style.transform = 'scaleX(' + p + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- sparks (light canvas particles) ---------- */
  function sparks(canvas, count) {
    if (!canvas || reduce || !canvas.getContext) return;
    var ctx = canvas.getContext('2d'), w = 0, h = 0, ps = [], raf = 0, visible = false;

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function make(init) {
      return {
        x: Math.random() * w, y: init ? Math.random() * h : h + 10,
        r: Math.random() * 1.5 + 0.5, vy: Math.random() * 0.55 + 0.25,
        ph: Math.random() * 6.28, life: init ? Math.random() * 200 : 0,
        max: 220 + Math.random() * 220, hue: 28 + Math.random() * 20
      };
    }
    function init() { size(); ps = []; for (var i = 0; i < count; i++) ps.push(make(true)); }
    function frame() {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.y -= p.vy; p.life++;
        p.x += Math.sin(p.ph + p.life * 0.02) * 0.3;
        if (p.life > p.max || p.y < -10) { ps[i] = make(false); continue; }
        var a = Math.sin(Math.PI * p.life / p.max) * 0.85;
        ctx.beginPath();
        ctx.fillStyle = 'hsla(' + p.hue + ',100%,60%,' + a.toFixed(3) + ')';
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    init();
    window.addEventListener('resize', function () { size(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var v = en[0].isIntersecting;
        if (v && !visible) { visible = true; raf = requestAnimationFrame(frame); }
        else if (!v) { visible = false; cancelAnimationFrame(raf); }
      }).observe(canvas);
    }
  }

  /* ---------- general whatsapp button ---------- */
  function setupWhatsApp() {
    var a = $('#waBtn');
    if (a) a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('مرحبا مشويات الباشا، أريد الحجز / الطلب');
  }

  /* ---------- go ---------- */
  render();
  load();
  Object.keys(cart).forEach(renderQty);
  refresh();
  setupReveal();
  setupNav();
  setupProgress();
  setupWhatsApp();
  var small = window.matchMedia && matchMedia('(max-width: 640px)').matches;
  sparks($('#sparks-hero'), small ? 20 : 36);
  sparks($('#sparks-foot'), small ? 12 : 22);
})();
