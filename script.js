(function () {
  'use strict';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MENU = window.MENU || [];
  var $ = function (s) { return document.querySelector(s); };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function num(v) { return '<span class="num" data-v="' + v + '">' + v + '</span>'; }
  function parts(d) {
    return '<ul class="parts">' + d.split(' + ').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- render ---------- */
  function card(it, i) {
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
      h += '<div class="sizes" style="--n:' + it.s.length + '">';
      it.s.forEach(function (x) {
        h += '<div class="size"><span class="lbl">' + esc(x[0]) + '</span><span class="val">' + num(x[1]) + '<small>جنيه</small></span></div>';
      });
      h += '</div>';
    } else {
      h += '<span class="val">' + num(it.p) + '<small>جنيه</small></span>';
    }
    return h + '</div></article>';
  }

  function rows(items) {
    return '<ul class="rows reveal">' + items.map(function (it) {
      return '<li class="row"><span class="rn">' + esc(it.n) + '</span><span class="dots"></span><span class="val">' +
        num(it.p) + '<small>جنيه</small></span></li>';
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
          html += rows(g.items);
        } else {
          var n = g.items.length, two = (n <= 2 || n === 4) ? ' two' : '';
          html += '<div class="grid' + two + '">' + g.items.map(card).join('') + '</div>';
        }
        html += '</div>';
      });
      html += '</section>';
    });
    main.innerHTML = html;
    track.innerHTML = nav;
  }

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

    /* leave the menu: clear highlight */
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
    var bar = $('#progress'), main = $('#menu'), ticking = false;
    function update() {
      var r = main.getBoundingClientRect(), total = r.height - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
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

  /* ---------- whatsapp prefilled message ---------- */
  function setupWhatsApp() {
    var a = $('#waBtn');
    if (a) a.href = 'https://wa.me/201007475474?text=' + encodeURIComponent('مرحبا مشويات الباشا، أريد الحجز / الطلب');
  }

  /* ---------- go ---------- */
  render();
  setupReveal();
  setupNav();
  setupProgress();
  setupWhatsApp();
  var small = window.matchMedia && matchMedia('(max-width: 640px)').matches;
  sparks($('#sparks-hero'), small ? 20 : 36);
  sparks($('#sparks-foot'), small ? 12 : 22);
})();
