// Закатный луг - лёгкий процедурный фон world-экрана (небо, холмы, трава,
// бабочки). Основано на "Закатный луг (1).html" - блики травы не хранятся
// в больших массивах, а считаются на лету по индексу (хэш-функция fr), так
// что луг бесконечный и рисуется только видимый диапазон - дешевле по CPU,
// чем более ранняя версия (которая тормозила запуск видео на старте этапов).
//
// Рисуется на двух canvas: back (небо/холмы/дальняя трава/бабочки/блики) и
// front (только ближняя трава) - персонаж и объекты лежат МЕЖДУ ними в
// разметке, поэтому передний слой травы рисуется поверх них и слегка
// закрывает их снизу. Камера (camX) управляется снаружи через setScroll(x)
// - world.js уже сам считает движение персонажа, здесь своей физики нет.
window.Meadow = (function () {
  function fr(i, k) { var v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); }
  function dab(g, x, y, rx, ry, col, a) {
    if (a === undefined) a = 1;
    g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  }

  var FL = ['#fff4e6', '#f28b74', '#f4cf45', '#d6aee8'];
  var LAYERS = [
    { p: 1, sp: .9, y0: .12, yr: .75, h0: .06, hr: .08, w: 4, cols: ['#6f9c40', '#5f8c38', '#86ae4c', '#7aa046'], fl: .05, push: 1 },
    { p: 1.35, sp: 1.9, y0: 1.03, yr: .06, h0: .13, hr: .16, w: 8.5, cols: ['#41702e', '#36622a', '#4d7f33'], fl: .03, push: 1 }
  ];

  function mount(backCanvas, frontCanvas, container) {
    var bctx = backCanvas.getContext('2d');
    var fctx = frontCanvas.getContext('2d');
    var slow = matchMedia('(prefers-reduced-motion: reduce)').matches ? .4 : 1;

    var W = 800, H = 450, dpr = 1, hz = 0, G = 0, gy = 0;
    var sky = null, grain = null, vig = null, ground = null, clouds = [];
    var cityBack = null, cityFront = null;
    var t = 0, camX = 0;

    function off(w, h) {
      var o = document.createElement('canvas');
      o.width = w * dpr | 0; o.height = h * dpr | 0;
      var g = o.getContext('2d'); g.scale(dpr, dpr);
      return [o, g];
    }

    function cloud(w, s) {
      var h = w * .45; var og = off(w, h); var o = og[0], g = og[1];
      var tone = ['#d9a7bf', '#f2c9bd', '#fff1df'];
      for (var k = 0; k < 3; k++) {
        for (var i = 0; i < 22; i++) {
          var a = fr(i, s) * Math.PI, d = Math.sqrt(fr(i, s + 1));
          var x = w / 2 + Math.cos(a) * w * .36 * d, y = h * .62 - Math.sin(a) * h * .38 * d;
          var r = h * (.15 + fr(i, s + 2) * .17) * [1, .85, .6][k];
          if (k === 2 && y > h * .55 && x < w * .55) continue;
          dab(g, x + r * [0, .1, .3][k], y + r * [.25, 0, -.25][k], r * 1.1, r * .9, tone[k], .92);
        }
      }
      var og2 = off(w, h); var o2 = og2[0], g2 = og2[1];
      g2.filter = 'blur(' + (h * .015) + 'px)'; g2.drawImage(o, 0, 0, w, h);
      g2.filter = 'none'; g2.globalAlpha = .4; g2.drawImage(o, 0, 0, w, h);
      return o2;
    }

    function build() {
      var r = container.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      backCanvas.width = frontCanvas.width = W * dpr | 0;
      backCanvas.height = frontCanvas.height = H * dpr | 0;
      hz = H * .74; G = H - hz; gy = hz + G * .6;

      var og = off(W, hz + 12); var o = og[0], g = og[1];
      var lg = g.createLinearGradient(0, 0, 0, hz);
      [[0, '#6f84c6'], [.3, '#9d97cf'], [.55, '#d8a3bb'], [.75, '#f1b99c'], [.9, '#fbd29a'], [1, '#fde3ad']].forEach(function (s) { lg.addColorStop(s[0], s[1]); });
      g.fillStyle = lg; g.fillRect(0, 0, W, hz + 12);
      for (var i = 0; i < 140; i++) dab(g, fr(i, 1) * W, fr(i, 2) * hz, 20 + fr(i, 3) * 80, 2 + fr(i, 4) * 4, i % 3 ? '#fff4e8' : '#b39ad0', .07);
      var sx = W * .72, sy = hz * .88, sr = Math.min(W, H) * .05;
      var rg = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 7);
      rg.addColorStop(0, 'rgba(255,236,190,.85)'); rg.addColorStop(.25, 'rgba(255,214,160,.4)'); rg.addColorStop(1, 'rgba(255,200,150,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, hz + 12);
      dab(g, sx, sy, sr, sr, '#fff3d2'); dab(g, sx - sr * .2, sy - sr * .2, sr * .6, sr * .6, '#fffbea', .8);
      sky = o;

      clouds = [[.1, .12, .26], [.45, .06, .17], [.72, .2, .22], [.3, .3, .13]].map(function (cl, i2) {
        var w = W * cl[2] + 60;
        return { o: cloud(w, i2 * 7 + 3), x: cl[0] * W, y: cl[1] * hz, w: w, sp: 4 + i2 * 2 };
      });

      var ng_ = off(96, 96); var n = ng_[0], ng = ng_[1];
      var id = ng.getImageData(0, 0, n.width, n.height);
      for (var j = 0; j < id.data.length; j += 4) { id.data[j] = id.data[j + 1] = id.data[j + 2] = Math.random() * 255; id.data[j + 3] = 255; }
      ng.putImageData(id, 0, 0);
      grain = bctx.createPattern(n, 'repeat');

      vig = bctx.createRadialGradient(W * .6, H * .5, Math.min(W, H) * .3, W * .5, H * .5, Math.max(W, H) * .8);
      vig.addColorStop(0, 'rgba(60,30,40,0)'); vig.addColorStop(1, 'rgba(60,30,40,.3)');

      ground = bctx.createLinearGradient(0, hz, 0, H);
      ground.addColorStop(0, '#a3c065'); ground.addColorStop(.4, '#7ea24b'); ground.addColorStop(1, '#3f6a2c');

      // Силуэт города у горизонта - между небом и землёй (земля рисуется
      // поверх и закрывает низ зданий, как и дальние холмы).
      cityBack = window.City.create(hz * .3 * .75, W, '#c9b3d6', false, 21);
      cityFront = window.City.create(hz * .3, W, '#9c86b8', true, 5);
    }

    var rt = null;
    new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(build, 120); }).observe(container);
    build();

    var gust = function (x) { var gp = (t * W * .16) % (W * 1.8) - W * .4; return Math.exp(-Math.pow((x - gp) / (W * .13), 2)); };
    var sway = function (x, h, i) { return h * (.1 + .08 * Math.sin(t * 1.4 + (x + camX) * .012 + fr(i, 5) * 6) + .03 * Math.sin(t * 3.2 + x * .05) + gust(x) * .3); };

    function hill(g, p, base, amp, f, col, rim, trees) {
      var o = camX * p;
      var y = function (x) { return base - amp * (.5 + .5 * Math.sin((x + o) * f)) - amp * .25 * Math.sin((x + o) * f * 2.7); };
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (var x = 0; x <= W + 10; x += 10) g.lineTo(x, y(x));
      g.lineTo(W + 10, H); g.fill();
      g.strokeStyle = rim; g.lineWidth = 2; g.beginPath();
      for (var x2 = 0; x2 <= W + 10; x2 += 10) x2 ? g.lineTo(x2, y(x2) + 1) : g.moveTo(x2, y(x2) + 1);
      g.stroke();
      if (trees) {
        for (var k = Math.floor(o / 170) - 1; k < (o + W) / 170 + 1; k++) {
          if (fr(k, 9) > .45) continue;
          var tx = k * 170 + fr(k, 8) * 170 - o, ty = y(tx) + 2, s = H * .012 * (1 + fr(k, 7));
          g.fillStyle = '#5a4a3e'; g.fillRect(tx - 1, ty - s * 1.4, 2, s * 1.4);
          dab(g, tx, ty - s * 2, s * 1.3, s * 1.1, '#6b8650');
          dab(g, tx + s * .4, ty - s * 2.4, s * .8, s * .7, '#b5b86a');
        }
      }
    }

    function layer(g, l, part) {
      var o = camX * l.p, i0 = Math.floor(o / l.sp) - 4, i1 = i0 + Math.ceil(W / l.sp) + 8, n = l.cols.length;
      if (l.line) {
        g.lineWidth = l.w;
        for (var ci = 0; ci < n; ci++) {
          g.strokeStyle = l.cols[ci]; g.beginPath();
          for (var i = i0; i < i1; i++) {
            if ((fr(i, 3) * n | 0) !== ci) continue;
            var x = i * l.sp + fr(i, 1) * l.sp - o, y = hz + G * (l.y0 + l.yr * fr(i, 2)), h = G * (l.h0 + l.hr * fr(i, 4)), s = sway(x, h, i);
            g.moveTo(x, y); g.quadraticCurveTo(x + s * .3, y - h * .5, x + s, y - h);
          }
          g.stroke();
        }
        return;
      }
      for (var j = i0; j < i1; j++) {
        var yy = hz + G * (l.y0 + l.yr * fr(j, 2));
        if (part !== undefined && (yy >= gy) !== part) continue;
        var xx = j * l.sp + fr(j, 1) * l.sp - o, hh = G * (l.h0 + l.hr * fr(j, 4)) * (.75 + (yy - hz) / G * .4), ss = sway(xx, hh, j);
        var w = l.w * (.6 + fr(j, 6) * .8) / 2, tx = xx + ss, ty = yy - hh + Math.abs(ss) * .2, cx = xx + ss * .3, cy = yy - hh * .55;
        g.fillStyle = l.cols[fr(j, 3) * n | 0]; g.beginPath();
        g.moveTo(xx - w, yy); g.quadraticCurveTo(cx - w * .6, cy, tx, ty); g.quadraticCurveTo(cx + w * .6, cy, xx + w, yy); g.fill();
        if (fr(j, 7) < l.fl) {
          var rr = l.w * .7;
          dab(g, tx, ty, rr, rr * .8, FL[fr(j, 8) * 4 | 0]);
          dab(g, tx, ty, rr * .35, rr * .35, '#e8a43a');
        }
      }
    }

    var FLY = [['#f6b6c8', '#fde3ea'], ['#fff3e2', '#f6d36a'], ['#d6aee8', '#f3e2fb']];
    function flies(g) {
      var span = W + 200, u = G * .035;
      for (var i = 0; i < 3; i++) {
        var bx = i * W * .37 + t * G * .25 * (i % 2 ? 1 : .7) + Math.sin(t * .5 + i) * G * .4;
        var x = ((bx - camX) % span + span) % span - 100;
        var y = hz + G * (.15 + .15 * i) + Math.sin(t * 2.1 + i * 2) * G * .08 - Math.abs(Math.sin(t * .9 + i)) * G * .1;
        var o = Math.abs(Math.sin(t * 13 + i));
        g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2 + i) * .2);
        [-1, 1].forEach(function (k) {
          dab(g, k * u * o, -u * .4, u * 1.1 * o + .5, u * .9, FLY[i][0]);
          dab(g, k * u * .7 * o, u * .5, u * .7 * o + .4, u * .55, FLY[i][1]);
        });
        dab(g, 0, 0, u * .18, u * .8, '#4b3a3a');
        g.restore();
      }
    }

    function drawBack() {
      var g = bctx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.drawImage(sky, 0, 0, W, hz + 12);
      clouds.forEach(function (k) {
        var span = W + k.w * 1.2, x = ((k.x + t * k.sp - camX * .05) % span + span) % span - k.w * .6;
        g.drawImage(k.o, x - k.w / 2, k.y, k.w, k.w * .45);
      });
      hill(g, .12, hz - 1, hz * .07, .004, '#b6a6cb', '#f6cdc2');
      if (cityBack) cityBack.draw(g, hz + 2, W, camX, .05);
      if (cityFront) cityFront.draw(g, hz + 2, W, camX, .09);
      hill(g, .3, hz + 2, hz * .035, .006, '#8ea76a', '#ecd38a', 1);
      g.fillStyle = ground; g.fillRect(0, hz + 1, W, G);
      flies(g);
      g.fillStyle = '#fff1b8';
      for (var i = 0; i < 18; i++) {
        var y = H - ((t * (8 + fr(i, 2) * 10) + fr(i, 3) * H) % (H * .6));
        var x = ((fr(i, 1) * W + t * 6 - camX * .6) % W + W) % W;
        g.globalAlpha = .25 + .6 * Math.max(0, Math.sin(t * 1.8 + i));
        g.beginPath(); g.arc(x, y, 1.2, 0, 7); g.fill();
      }
      g.globalAlpha = .07; g.globalCompositeOperation = 'overlay'; g.fillStyle = grain; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.fillStyle = vig; g.fillRect(0, 0, W, H);
    }

    function drawFront() {
      var g = fctx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      layer(g, LAYERS[0], true);
      layer(g, LAYERS[1]);
    }

    // Рисование запущено только пока виден world-экран - иначе эта тяжёлая
    // процедурная отрисовка (градиенты/шум на каждый кадр) крутится вхолостую
    // фоном всё время игры (квиз, пазл, карточки...), впустую нагружая CPU.
    var running = false;
    var last = performance.now();
    function loop(now) {
      if (!running) return;
      var dt = Math.min(.05, (now - last) / 1000) * slow;
      last = now; t += dt;
      if (sky) { drawBack(); drawFront(); }
      requestAnimationFrame(loop);
    }

    return {
      setScroll: function (v) { camX = v; },
      start: function () {
        if (running) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(loop);
      },
      stop: function () { running = false; }
    };
  }

  return { mount: mount };
})();
