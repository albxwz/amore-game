// Уличный фонарь (горящий) - нарисован на canvas (перенесено из отдельного
// прототипа fonar.html). createLamp(LH) один раз рисует фонарь в офф-скрин
// canvas высотой LH, дальше lamp.draw/light только копируют готовую картинку -
// дёшево дергать каждый кадр для анимации мерцания и мошек.
window.Lamp = (function () {
  function createLamp(LH) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var LW = LH * .22, u = LH / 100, cx = LW / 2;
    var P = '#2c3634', HL = '#5d6b66', WARM = '#f3b56f';

    function off(w, h) {
      var o = document.createElement('canvas');
      o.width = Math.ceil(w * dpr); o.height = Math.ceil(h * dpr);
      var g = o.getContext('2d'); g.scale(dpr, dpr);
      return [o, g];
    }
    function dab(g, x, y, rx, ry, col, a) {
      if (a === undefined) a = 1;
      g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    }

    /* --- сам фонарь --- */
    var og = off(LW, LH), o = og[0], g = og[1];
    function poly(pts, col) {
      g.fillStyle = col; g.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var x = cx + pts[i][0] * u, y = pts[i][1] * u;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.fill();
    }
    poly([[-6, 100], [6, 100], [4.5, 92], [-4.5, 92]], P);               // основание
    poly([[-4.5, 92], [4.5, 92], [3, 86], [-3, 86]], P);
    dab(g, cx, 86 * u, 3.6 * u, 1.2 * u, P); dab(g, cx, 58 * u, 2.6 * u, 1 * u, P); dab(g, cx, 30 * u, 3 * u, 1.1 * u, P);
    poly([[-1.6, 86], [1.6, 86], [1.2, 24], [-1.2, 24]], P);             // столб
    g.fillStyle = HL; g.fillRect(cx - 1.4 * u, 30 * u, .6 * u, 54 * u); g.fillRect(cx - 5.2 * u, 93 * u, 1 * u, 6 * u);
    g.strokeStyle = P; g.lineWidth = .9 * u; g.lineCap = 'round';        // завитки
    [-1, 1].forEach(function (k) {
      g.beginPath(); g.moveTo(cx, 31 * u); g.quadraticCurveTo(cx + k * 6 * u, 30 * u, cx + k * 5 * u, 26 * u);
      g.arc(cx + k * 4 * u, 26 * u, 1 * u, 0, 7); g.stroke();
    });
    poly([[-4, 24], [4, 24], [3.2, 21], [-3.2, 21]], P);
    poly([[-6.5, 8], [6.5, 8], [4.5, 21], [-4.5, 21]], '#ffcf7d');       // стекло
    var lg = g.createLinearGradient(0, 8 * u, 0, 21 * u);
    lg.addColorStop(0, '#fff6d8'); lg.addColorStop(1, '#ffc46a');
    g.fillStyle = lg; g.beginPath();
    g.moveTo(cx - 5.4 * u, 9 * u); g.lineTo(cx + 5.4 * u, 9 * u); g.lineTo(cx + 3.7 * u, 20 * u); g.lineTo(cx - 3.7 * u, 20 * u); g.fill();
    dab(g, cx, 15 * u, 2 * u, 3 * u, '#ffffff', .85);                    // пламя
    g.strokeStyle = P; g.lineWidth = .8 * u; g.beginPath();
    g.moveTo(cx, 8 * u); g.lineTo(cx, 21 * u);
    g.moveTo(cx - 6.5 * u, 8 * u); g.lineTo(cx - 4.5 * u, 21 * u);
    g.moveTo(cx + 6.5 * u, 8 * u); g.lineTo(cx + 4.5 * u, 21 * u);
    g.stroke();
    poly([[-8, 8.5], [8, 8.5], [5, 5], [0, 2.5], [-5, 5]], P);           // крышка
    g.fillStyle = WARM; g.fillRect(cx - 7.5 * u, 8 * u, 15 * u, .7 * u);
    dab(g, cx, 1.6 * u, 1 * u, 1.6 * u, P);
    g.fillStyle = WARM; g.globalAlpha = .55; g.fillRect(cx + 1.2 * u, 24 * u, .5 * u, 60 * u); g.globalAlpha = 1; // тёплый блик

    /* --- свечение --- */
    var R = LH * .55;
    var gog = off(R * 2, R * 2), go = gog[0], gg = gog[1];
    var rg = gg.createRadialGradient(R, R, 0, R, R, R);
    rg.addColorStop(0, 'rgba(255,230,165,1)'); rg.addColorStop(.12, 'rgba(255,200,120,.75)');
    rg.addColorStop(.45, 'rgba(255,170,95,.28)'); rg.addColorStop(1, 'rgba(255,170,100,0)');
    gg.fillStyle = rg; gg.fillRect(0, 0, R * 2, R * 2);

    return {
      width: LW, height: LH, glowRadius: R,
      draw: function (ctx, x, by) {
        dab(ctx, x, by, LW * .9, LW * .18, 'rgba(30,30,20,.3)');        // тень
        ctx.drawImage(o, x - LW / 2, by - LH, LW, LH);
      },
      light: function (ctx, x, by, t, seed) {
        if (seed === undefined) seed = 0;
        var ly = by - LH * .85, f = .86 + .06 * Math.sin(t * 9 + seed) + .05 * Math.sin(t * 23 + seed * 3);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = f; ctx.drawImage(go, x - R, ly - R, R * 2, R * 2);                // ореол вокруг лампы
        ctx.globalAlpha = .45 * f; ctx.drawImage(go, x - R * .9, by - R * .22, R * 1.8, R * .44); // пятно света на земле
        ctx.restore();
        ctx.fillStyle = '#fff3cf';                                                          // мошки у лампы
        for (var m = 0; m < 3; m++) {
          var a = t * (2 + m * .7) + m * 2 + seed, rx = LH * (.07 + m * .025);
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * rx, ly + Math.sin(a * 1.3) * rx * .7, 1.1, 0, 7); ctx.fill();
        }
      }
    };
  }

  // Гирлянда между двумя фонарями - провисающая дуга с мерцающими
  // разноцветными лампочками. (x1,y1)/(x2,y2) - верхушки столбов фонарей.
  var GARLAND_COLORS = ['#ffe27a', '#ff9f7a', '#8fd3ff', '#ffb4d6', '#c9ffb0'];
  function drawGarland(ctx, x1, y1, x2, y2, t, seed) {
    if (seed === undefined) seed = 0;
    var midX = (x1 + x2) / 2, sag = Math.abs(x2 - x1) * .16;
    var midY = (y1 + y2) / 2 + sag;
    function qpt(tt) {
      var a = (1 - tt) * (1 - tt), b = 2 * (1 - tt) * tt, c = tt * tt;
      return [a * x1 + b * midX + c * x2, a * y1 + b * midY + c * y2];
    }
    ctx.strokeStyle = 'rgba(40,30,20,.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (var s = 0; s <= 20; s++) {
      var p = qpt(s / 20);
      if (s) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();

    var N = 9;
    for (var i = 1; i < N; i++) {
      var tt = i / N, pt = qpt(tt);
      var f = .7 + .3 * Math.sin(t * 4 + seed + i * 1.7);
      var col = GARLAND_COLORS[i % GARLAND_COLORS.length];
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = f;
      var rg = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], 7);
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(pt[0], pt[1], 7, 0, 7); ctx.fill();
      ctx.restore();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.6, 0, 7); ctx.fill();
    }
  }

  return { create: createLamp, drawGarland: drawGarland };
})();
