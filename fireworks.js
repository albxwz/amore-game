// Канвас-анимация салюта: ракеты -> взрыв (круг / сердце / искры / двухцветный).
window.Fireworks = (function () {
  var canvas = document.getElementById('fireworks-canvas');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var cssW = 0, cssH = 0;

  var COLORS = {
    core: '#B3477F',
    accent: '#F2FFA4',
    white: '#ffffff',
    gold: '#FFE27A',
    deep: '#80074C'
  };

  var isNarrow = window.innerWidth < 600;
  var PARTICLE_CAP = isNarrow ? 800 : 1500;

  // Общий множитель замедления салюта - меньше единицы = медленнее взлёт
  // ракет и расхождение искр (жизнь частиц продлеваем на ту же величину,
  // иначе медленный, но короткоживущий взрыв выглядел бы просто мельче).
  // Для ракеты скорость масштабируем на SLOWMO, а гравитацию - на SLOWMO^2:
  // макс. высота v²/(2a) тогда не меняется (взлёт просто дольше), иначе
  // ракеты взрывались бы гораздо ниже прежнего.
  var SLOWMO = 0.6;
  var ROCKET_GRAVITY = 0.09 * SLOWMO * SLOWMO;

  var rockets = [];
  var particles = [];
  var rafId = null;
  var stopTimer = null;
  var running = false;

  function resize() {
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  resize();

  function addParticles(newOnes) {
    var room = PARTICLE_CAP - particles.length;
    if (room < newOnes.length) {
      particles.splice(0, newOnes.length - room);
    }
    for (var i = 0; i < newOnes.length; i++) particles.push(newOnes[i]);
  }

  function heartPoints(count) {
    var pts = [];
    for (var i = 0; i < count; i++) {
      var t = (i / count) * Math.PI * 2;
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push({ x: x, y: -y });
    }
    return pts;
  }

  function burst(x, y, type) {
    var list = [];
    var count, speedScale;

    if (type === 'heart') {
      count = 180;
      speedScale = 0.16;
      var hp = heartPoints(count);
      for (var i = 0; i < count; i++) {
        var p = hp[i];
        list.push(makeParticle(x, y, p.x * speedScale, p.y * speedScale, pickColor('heart'), 70 + Math.random() * 20, 0.985, 0.045));
      }
    } else if (type === 'sparkle') {
      count = 90;
      for (var i2 = 0; i2 < count; i2++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 1 + Math.random() * 2.2;
        list.push(makeParticle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd - 1, COLORS.gold, 90 + Math.random() * 40, 0.97, 0.03, true));
      }
    } else if (type === 'twotone') {
      count = 130;
      for (var i3 = 0; i3 < count; i3++) {
        var ang3 = (i3 / count) * Math.PI * 2 + Math.random() * 0.05;
        var spd3 = 2.6 + Math.random() * 1.6;
        var col = i3 % 2 === 0 ? COLORS.core : COLORS.deep;
        list.push(makeParticle(x, y, Math.cos(ang3) * spd3, Math.sin(ang3) * spd3, col, 60 + Math.random() * 25, 0.978, 0.05));
      }
    } else if (type === 'gold') {
      count = 130;
      for (var i5 = 0; i5 < count; i5++) {
        var ang5 = (i5 / count) * Math.PI * 2;
        var spd5 = 2.4 + Math.random() * 2.2;
        var goldCol = Math.random() < 0.6 ? COLORS.gold : '#FFF3C4';
        list.push(makeParticle(x, y, Math.cos(ang5) * spd5, Math.sin(ang5) * spd5, goldCol, 75 + Math.random() * 35, 0.98, 0.045, Math.random() < 0.5));
      }
    } else { // circle
      count = 110;
      for (var i4 = 0; i4 < count; i4++) {
        var ang4 = (i4 / count) * Math.PI * 2;
        var spd4 = 2.2 + Math.random() * 1.8;
        list.push(makeParticle(x, y, Math.cos(ang4) * spd4, Math.sin(ang4) * spd4, pickColor('circle'), 65 + Math.random() * 25, 0.978, 0.05));
      }
    }
    addParticles(list);
  }

  function pickColor(kind) {
    var r = Math.random();
    if (kind === 'heart') return r < 0.6 ? COLORS.core : (r < 0.85 ? COLORS.accent : COLORS.white);
    return r < 0.55 ? COLORS.core : (r < 0.8 ? COLORS.accent : COLORS.white);
  }

  function makeParticle(x, y, vx, vy, color, life, drag, gravity, flicker) {
    life = life / SLOWMO;
    return {
      x: x, y: y, vx: vx * SLOWMO, vy: vy * SLOWMO,
      color: color,
      life: life, maxLife: life,
      drag: drag, gravity: gravity * SLOWMO,
      flicker: !!flicker,
      phase: Math.random() * Math.PI * 2
    };
  }

  function buildBurstQueue(n) {
    var q = [];
    var minHeart = Math.max(2, Math.round(n * 0.3));
    var minSparkle = Math.max(1, Math.round(n * 0.2));
    var minTwo = Math.max(1, Math.round(n * 0.15));
    for (var i = 0; i < minHeart; i++) q.push('heart');
    for (var i2 = 0; i2 < minSparkle; i2++) q.push('sparkle');
    for (var i3 = 0; i3 < minTwo; i3++) q.push('twotone');
    while (q.length < n) q.push('circle');
    // Fisher-Yates shuffle
    for (var i4 = q.length - 1; i4 > 0; i4--) {
      var j = Math.floor(Math.random() * (i4 + 1));
      var tmp = q[i4]; q[i4] = q[j]; q[j] = tmp;
    }
    return q;
  }

  var PRESETS = {
    medium:  { rocketCount: 8,  duration: 4200 / SLOWMO, launchEvery: 420 / SLOWMO },
    large:   { rocketCount: 14, duration: 5800 / SLOWMO, launchEvery: 340 / SLOWMO },
    final:   { rocketCount: 16, duration: 6200 / SLOWMO, launchEvery: 300 / SLOWMO, golden: true, fullWidth: true }
  };

  function buildGoldQueue(n) {
    var q = [];
    var minSparkle = Math.max(2, Math.round(n * 0.35));
    for (var i = 0; i < minSparkle; i++) q.push('sparkle');
    while (q.length < n) q.push('gold');
    for (var i2 = q.length - 1; i2 > 0; i2--) {
      var j = Math.floor(Math.random() * (i2 + 1));
      var tmp = q[i2]; q[i2] = q[j]; q[j] = tmp;
    }
    return q;
  }

  function launch(intensity) {
    var preset = PRESETS[intensity] || PRESETS.medium;
    var queue = preset.golden ? buildGoldQueue(preset.rocketCount) : buildBurstQueue(preset.rocketCount);
    var launched = 0;
    running = true;
    if (!rafId) loop();

    var launchTimer = setInterval(function () {
      if (launched >= preset.rocketCount) { clearInterval(launchTimer); return; }
      launched++;
      spawnRocket(queue.pop(), preset.fullWidth);
    }, preset.launchEvery);

    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = setTimeout(function () {
      clearInterval(launchTimer);
      running = false;
    }, preset.duration);
  }

  function spawnRocket(burstType, fullWidth) {
    var x = fullWidth ? cssW * (0.04 + Math.random() * 0.92) : cssW * (0.18 + Math.random() * 0.64);
    var targetY = cssH * (0.14 + Math.random() * 0.34);
    // Стартовая скорость считается ОТ нужной высоты (а не берётся фиксированной
    // константой) - иначе на высоком десктопном окне ракета не долетает и до
    // половины экрана: гравитация (ROCKET_GRAVITY) постоянна в px/кадр, а нужный
    // подъём (rise) на мобильном экране и на широком десктопе отличается в разы.
    var rise = (cssH + 10) - targetY;
    var vy0 = -Math.sqrt(2 * ROCKET_GRAVITY * rise) * (0.97 + Math.random() * 0.06);
    rockets.push({
      x: x, y: cssH + 10,
      vx: (Math.random() - 0.5) * 0.6 * SLOWMO,
      vy: vy0,
      targetY: targetY,
      trail: [],
      burstType: burstType
    });
  }

  function loop() {
    ctx.clearRect(0, 0, cssW, cssH);

    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 6) r.trail.shift();
      r.vy += ROCKET_GRAVITY;
      r.x += r.vx;
      r.y += r.vy;

      ctx.lineWidth = 2;
      for (var t = 0; t < r.trail.length; t++) {
        ctx.globalAlpha = (t + 1) / r.trail.length * 0.6;
        ctx.fillStyle = COLORS.accent;
        ctx.beginPath();
        ctx.arc(r.trail[t].x, r.trail[t].y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (r.vy >= 0 || r.y <= r.targetY) {
        burst(r.x, r.y, r.burstType);
        rockets.splice(i, 1);
      }
    }

    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.vy += pt.gravity;
      pt.vx *= pt.drag;
      pt.vy *= pt.drag;
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= 1;
      if (pt.life <= 0) { particles.splice(p, 1); continue; }

      var lifeRatio = pt.life / pt.maxLife;
      var alpha = pt.flicker
        ? Math.max(0, lifeRatio) * (0.55 + 0.45 * Math.sin(pt.life * 0.4 + pt.phase))
        : Math.max(0, Math.pow(lifeRatio, 0.6));

      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.flicker ? 1.6 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (rockets.length || particles.length || running) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  return { launch: launch };
})();
