// Силуэт города (бесконечный, с параллаксом) - перенесено из отдельного
// прототипа gorod.html. createCity(height, minWidth, color, litWindows, seed)
// рисует одну повторяющуюся (без шва) полосу города в офф-скрин canvas;
// city.draw(ctx, baseY, screenW, camX, parallax) копирует её, подставляя
// нужный сдвиг камеры - само здание не пересчитывается каждый кадр.
window.City = (function () {
  function fr(i, k) { var v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); }

  function createCity(CH, minW, col, lit, s) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var TW = Math.round(Math.max(minW, 700) * 1.3);
    var o = document.createElement('canvas');
    o.width = Math.ceil(TW * dpr); o.height = Math.ceil(CH * dpr);
    var g = o.getContext('2d'); g.scale(dpr, dpr);

    function building(x, w, h, type, i) {
      var y = CH - h; g.fillStyle = col; g.fillRect(x, y, w, h);
      if (type < .14) {                                           // шпиль
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 2, y - w * 1.1); g.lineTo(x + w, y); g.fill();
        g.fillRect(x + w / 2 - .6, y - w * 1.6, 1.2, w * .6);
      } else if (type < .3) {                                     // ступенчатая крыша
        g.fillRect(x + w * .15, y - h * .12, w * .7, h * .12);
        g.fillRect(x + w * .32, y - h * .2, w * .36, h * .08);
      } else if (type < .4) {                                     // купол
        g.beginPath(); g.ellipse(x + w / 2, y, w * .42, w * .42, 0, Math.PI, 0); g.fill();
        g.fillRect(x + w / 2 - .6, y - w * .75, 1.2, w * .35);
      } else if (type < .47) {                                    // телебашня
        g.fillRect(x + w * .4, y - h * .55, w * .2, h * .55);
        g.beginPath(); g.ellipse(x + w / 2, y - h * .4, w * .45, w * .22, 0, 0, 7); g.fill();
        g.fillRect(x + w / 2 - .6, y - h * .8, 1.2, h * .25);
      } else if (fr(i, s + 5) < .35) {                            // антенна
        g.fillRect(x + w * .7, y - h * .15, 1.2, h * .15);
      }
      if (lit) {                                                  // горящие окна
        var st = Math.max(4, w * .16); g.fillStyle = '#ffe1a3';
        for (var wy = y + st; wy < CH - st * .5; wy += st) {
          for (var wx = x + st * .6; wx < x + w - st * .6; wx += st) {
            if (fr(wx * .37 + wy, s + 9) < .09) { g.globalAlpha = .6 + fr(wx, wy) * .4; g.fillRect(wx, wy, st * .4, st * .5); }
          }
        }
        g.globalAlpha = 1;
      }
    }

    for (var x = 0, i = 0; x < TW; i++) {
      var w = CH * (.07 + fr(i, s) * .13), tp = fr(i, s + 3);
      var h = CH * (.22 + fr(i, s + 1) * .5) * (tp < .14 ? 1.05 : (tp >= .4 && tp < .47 ? .9 : 1));
      building(x, w, h, tp, i);
      if (x + w > TW) building(x - TW, w, h, tp, i);              // переносим хвост в начало, чтобы не было шва
      x += w * (.75 + fr(i, s + 2) * .45) + (fr(i, s + 4) < .12 ? w * .6 : 0);
    }

    return {
      width: TW, height: CH,
      draw: function (ctx, baseY, screenW, camX, p) {
        if (camX === undefined) camX = 0;
        if (p === undefined) p = .08;
        var off = ((camX * p) % TW + TW) % TW;
        for (var x = -off; x < screenW; x += TW) ctx.drawImage(o, x, baseY - CH, TW, CH);
      }
    };
  }

  return { create: createCity };
})();
