// Қала + су фоны (city-water.html прототипінен көшірілген, бірақ Meadow-мен
// бірге жұмыс істеу үшін параметрленген - өз canvas/W/H/camX/t ұстамайды,
// бәрін meadow.js береді). window.CityWater.createCity(...) бір рет шақырылып
// (resize кезінде қайта), ал drawCity/drawWindows/drawWater/drawReflection
// әр кадрда шақырылады.
window.CityWater = (function () {
  function fr(i, k) { var v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); }
  function md(x, m) { return ((x % m) + m) % m; }
  function off(w, h, dpr) {
    var o = document.createElement('canvas');
    o.width = Math.max(1, w * dpr | 0); o.height = Math.max(1, h * dpr | 0);
    var g = o.getContext('2d'); g.scale(dpr, dpr);
    return [o, g];
  }

  var WIN_COLS_DEFAULT = ['#b45cff', '#d08cff', '#8a4dff', '#e6b8ff', '#a64bff'];

  // o: {seed,height,shade,lit,glass,haze,glint,lights,win,parallax,windowColors}
  function createCity(W, hz, o, dpr) {
    if (!dpr) dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var cols = o.windowColors || WIN_COLS_DEFAULT;
    var wins = [], s = o.seed, TW = Math.round(Math.max(W, 700) * 1.6), CH = hz * o.height;
    var r = off(TW, CH + 2, dpr), cn = r[0], g = r[1];

    function tower(x, w, h, tp, i) {
      var y = CH - h, lw = w * .4;
      g.fillStyle = o.shade;
      if (tp < .14) { g.beginPath(); g.moveTo(x + w * .18, y + 1); g.lineTo(x + w * .5, y - w * .95); g.lineTo(x + w * .82, y + 1); g.fill(); g.fillRect(x + w * .5 - .7, y - w * 1.7, 1.4, w * .8); }
      else if (tp < .3) { g.fillRect(x + w * .1, y - h * .06, w * .8, h * .06 + 1); g.fillRect(x + w * .28, y - h * .11, w * .44, h * .05 + 1); g.fillRect(x + w * .48, y - h * .16, 1.4, h * .05); }
      else if (tp < .42) { g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + w, y - w * .55); g.lineTo(x + w, y + 1); g.fill(); }
      else if (tp < .5) { g.beginPath(); g.ellipse(x + w / 2, y + 1, w / 2, w * .38, 0, Math.PI, 0); g.fill(); }
      g.fillRect(x, y, w, h + 2);
      g.fillStyle = o.lit; g.fillRect(x + w - lw, y, lw, h + 2);
      if (tp < .42 && tp >= .3) { g.beginPath(); g.moveTo(x + w - lw, y - w * .55 * (1 - lw / w) + 1); g.lineTo(x + w, y - w * .55); g.lineTo(x + w, y + 1); g.lineTo(x + w - lw, y + 1); g.fill(); }
      var n = Math.max(2, Math.round(w / (CH * .02))); g.fillStyle = o.glass; g.globalAlpha = .32;
      for (var k = 1; k < n; k++) g.fillRect(x + k * w / n, y, Math.max(.6, w * .014), h);
      g.globalAlpha = .16; for (var fy = y + CH * .018; fy < CH; fy += CH * .021) g.fillRect(x, fy, w, Math.max(.6, CH * .004)); g.globalAlpha = 1;
      if (o.glint) {
        var k2 = .25 + fr(i, s + 9) * .5, lg = g.createLinearGradient(0, y, 0, CH);
        lg.addColorStop(0, 'rgba(255,230,180,0)'); lg.addColorStop(k2, 'rgba(255,222,160,.6)'); lg.addColorStop(Math.min(1, k2 + .3), 'rgba(255,200,160,0)');
        g.fillStyle = lg; g.fillRect(x + w - lw, y, lw, h);
      }
      if (o.lights) {
        var st = Math.max(3, w * o.win);
        for (var wy = y + st * 1.2; wy < CH - st * .8; wy += st * 1.35) for (var wx = x + st * .45; wx < x + w - st * .6; wx += st) {
          if (fr(wx * .37 + wy * 1.3, s + 5) < o.lights) {
            var ci = (fr(wx, wy + s) * cols.length) | 0, r2 = fr(wy * .7, wx + s);
            g.globalAlpha = .55; g.fillStyle = cols[ci]; g.fillRect(wx, wy, st * .6, st * .7); g.globalAlpha = 1;
            wins.push({ x: wx + st * .3, y: wy + st * .35, w: st * .6, h: st * .7, ci: ci, sp: .6 + fr(wx, wy) * 1.8, ph: fr(wy, wx + 3) * 6.283,
              type: r2 < .62 ? 0 : r2 < .9 ? 1 : 2, fade: 1 - .65 * Math.max(0, Math.min(1, (wy / CH - .45) / .55)) });
          }
        }
      }
    }

    for (var x = 0, i = 0; x < TW; i++) {
      var tall = fr(i, s + 6) < .12 ? 1.35 : 1, w = CH * (.06 + fr(i, s) * .09) * (tall > 1 ? 1.15 : 1), tp = fr(i, s + 3),
          h = Math.min(CH * .98, CH * (.25 + fr(i, s + 1) * .55) * tall);
      tower(x, w, h, tp, i); if (x + w > TW) tower(x - TW, w, h, tp, i);
      x += w * (.65 + fr(i, s + 2) * .6) + (fr(i, s + 4) < .16 ? w * 1.8 : 0);
    }
    var hg = g.createLinearGradient(0, CH * .35, 0, CH); hg.addColorStop(0, 'rgba(255,200,200,0)'); hg.addColorStop(1, o.haze);
    g.fillStyle = hg; g.fillRect(0, 0, TW, CH + 2);

    return { c: cn, w: TW, h: CH, p: o.parallax, wins: wins, cols: cols };
  }

  function drawCity(ctx, k, y0, camX, screenW) {
    var o = md(camX * k.p, k.w);
    for (var x = -o; x < screenW; x += k.w) ctx.drawImage(k.c, x, y0 - k.h, k.w, k.h + 2);
  }

  function drawCityReflection(ctx, k, y0, camX, screenW, alpha, squash) {
    if (alpha === undefined) alpha = .22; if (squash === undefined) squash = .35;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, y0); ctx.scale(1, -squash);
    var o = md(camX * k.p, k.w);
    for (var x = -o; x < screenW; x += k.w) ctx.drawImage(k.c, x, -k.h, k.w, k.h);
    ctx.restore();
  }

  var glowCache = {};
  function getGlow(cols) {
    var key = cols.join('|');
    if (glowCache[key]) return glowCache[key];
    var arr = cols.map(function (col) {
      var o = document.createElement('canvas'); o.width = o.height = 64;
      var g = o.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, col); rg.addColorStop(.25, col + 'cc'); rg.addColorStop(1, col + '00');
      g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return o;
    });
    glowCache[key] = arr; return arr;
  }
  function winLevel(wn, t) {
    t *= .6; // жылдамдықты 40%-ға баяулату
    var s = Math.sin(t * wn.sp * 2 + wn.ph);
    if (wn.type === 0) return Math.pow(Math.max(0, s), 6);
    if (wn.type === 1) return .25 + .45 * (.5 + .5 * s);
    return fr(Math.floor(t * 9 + wn.ph * 10), wn.ph * 100) < .5 ? 1 : 0;
  }
  function drawWindows(ctx, k, y0, camX, screenW, t) {
    var glow = getGlow(k.cols), o = md(camX * k.p, k.w), top = y0 - k.h;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (var X = -o; X < screenW; X += k.w) for (var wi = 0; wi < k.wins.length; wi++) {
      var wn = k.wins[wi], sx = X + wn.x; if (sx < -20 || sx > screenW + 20) continue;
      var b = winLevel(wn, t) * wn.fade; if (b < .04) continue;
      var sy = top + wn.y, gs = wn.w * 5;
      ctx.globalAlpha = b; ctx.drawImage(glow[wn.ci], sx - gs / 2, sy - gs / 2, gs, gs);
      ctx.globalAlpha = Math.min(1, b * 1.3); ctx.fillStyle = k.cols[wn.ci]; ctx.fillRect(sx - wn.w / 2, sy - wn.h / 2, wn.w, wn.h);
      if (b > .75) { ctx.globalAlpha = (b - .75) * 3; ctx.fillStyle = '#f3e2ff'; ctx.fillRect(sx - wn.w * .25, sy - wn.h * .25, wn.w * .5, wn.h * .5); }
    }
    ctx.restore();
  }

  function buildWaterGradient(ctx, hz, bottom, stops) {
    var g = ctx.createLinearGradient(0, hz, 0, bottom);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }

  // opt: {grad, hz, bottom, W, H, sunX, camX, t}
  function drawWater(ctx, opt) {
    var hz = opt.hz, bottom = opt.bottom, W = opt.W, t = opt.t, camX = opt.camX || 0;
    ctx.fillStyle = opt.grad; ctx.fillRect(0, hz + 1, W, bottom - hz);
    var sunX = W * (opt.sunX === undefined ? .7 : opt.sunX), sr = Math.min(W, opt.H || (bottom - hz)) * .055;
    for (var i = 0; i < 70; i++) {
      var d = fr(i, 11), y = hz + 3 + (bottom - hz) * d * d, spread = sr * (1 + d * 6),
          x = sunX + (fr(i, 12) - .5) * spread * 2 + Math.sin(t * 1.5 + i) * 4, a = .25 + .6 * Math.max(0, Math.sin(t * 2.3 + i * 1.7));
      ctx.globalAlpha = a * (1 - d * .6); ctx.fillStyle = '#fff1c6';
      ctx.fillRect(x - spread * .15 * (.4 + fr(i, 13)), y, spread * .3 * (.4 + fr(i, 13)), Math.max(1, 1 + d * 2));
    }
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
    for (var j = 0; j < 110; j++) {
      var d2 = fr(j, 21), y2 = hz + 4 + (bottom - hz) * d2 * d2, p = .1 + d2 * .6,
          x2 = md(fr(j, 22) * W * 1.3 - camX * p + Math.sin(t * .8 + j) * 8, W * 1.3) - W * .15, l = 4 + d2 * 26;
      ctx.globalAlpha = .12 + .25 * Math.max(0, Math.sin(t * 1.7 + j)); ctx.fillRect(x2, y2, l, Math.max(.8, d2 * 2));
    }
    ctx.globalAlpha = 1;
  }

  return {
    createCity: createCity,
    drawCity: drawCity,
    drawCityReflection: drawCityReflection,
    drawWindows: drawWindows,
    buildWaterGradient: buildWaterGradient,
    drawWater: drawWater
  };
})();
