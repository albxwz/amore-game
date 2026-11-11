// 2D-мир между этапами: персонаж всегда стоит по центру экрана, "камера"
// (трек с объектами + фон "Закатный луг" в meadow.js) едет под ним. У
// каждого объекта стоит "стена" - пока задание не выполнено, пройти дальше
// нельзя, а дойдя до него, персонаж оказывается ровно напротив его центра.
// Подходит к объекту -> видна кнопка "Задание N" -> клик запускает нужный
// этап через window.launchStage(n) (main.js).
window.World = (function () {
  var FIRST_LEFT_FACTOR = .93; // левый край 1-й локации = 93% ширины экрана (чуть видна справа в начале)
  var STEP_FACTOR = 1.3;       // расстояние между локациями, в долях ширины экрана
  var TRIGGER_RADIUS = 130;    // на каком расстоянии до стоп-линии появляется кнопка
  var SPEED = 230;             // px/сек
  var WALK_FRAME_MS = 190;     // как часто меняются фото "правая/левая нога вперёд"

  var viewport, track, charEl, btnLeft, btnRight;
  var meadowHandle = null;
  var objects = [];            // { stage, el, btnEl, cx, completed }
  var built = false;

  // Фонари (lamp.js) - каждый в своём маленьком canvas (см. .world-lamp-canvas
  // в index.html), рисуются и мерцают независимо от большого фона луга.
  var lampInstances = [];      // { ctx, lamp, x, by, seed }
  var garlandInstances = [];   // { ctx, x1, y1, x2, y2, w, h, seed }
  var lampsRunning = false;
  var lampLastTs = null;
  var lampRafId = null;

  var x = 0;
  var moveDir = 0;
  var facing = 1;
  var walkFrame = 1;
  var walkFrameTimer = 0;
  var keysDown = { left: false, right: false };
  var trackWidth = 0;
  var active = false;
  var rafId = null;
  var lastTs = null;

  function byId(id) { return document.getElementById(id); }

  function currentScreenName() {
    var activeScreen = document.querySelector('.screen--active');
    return activeScreen ? activeScreen.dataset.screen : null;
  }

  function wireTaskButton(o) {
    o.btnEl.onclick = function () {
      o.btnEl.hidden = true;
      stopLoop();
      if (meadowHandle) meadowHandle.stop();
      stopLamps();
      window.launchStage(o.stage);
    };
  }

  function updateMoveDir() {
    if (keysDown.left && !keysDown.right) moveDir = -1;
    else if (keysDown.right && !keysDown.left) moveDir = 1;
    else moveDir = 0;
  }

  function wireInput() {
    document.addEventListener('keydown', function (e) {
      if (currentScreenName() !== 'world') return;
      if (e.key === 'ArrowLeft') { keysDown.left = true; updateMoveDir(); }
      else if (e.key === 'ArrowRight') { keysDown.right = true; updateMoveDir(); }
      else if (e.key === 'Enter') {
        for (var i = 0; i < objects.length; i++) {
          if (!objects[i].btnEl.hidden) { objects[i].btnEl.click(); break; }
        }
      }
    });
    document.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowLeft') { keysDown.left = false; updateMoveDir(); }
      else if (e.key === 'ArrowRight') { keysDown.right = false; updateMoveDir(); }
    });

    function pressStart(dir) {
      return function (e) {
        e.preventDefault();
        if (dir < 0) keysDown.left = true; else keysDown.right = true;
        updateMoveDir();
      };
    }
    function pressEnd(dir) {
      return function () {
        if (dir < 0) keysDown.left = false; else keysDown.right = false;
        updateMoveDir();
      };
    }

    ['pointerdown'].forEach(function (evt) {
      btnLeft.addEventListener(evt, pressStart(-1));
      btnRight.addEventListener(evt, pressStart(1));
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
      btnLeft.addEventListener(evt, pressEnd(-1));
      btnRight.addEventListener(evt, pressEnd(1));
    });
  }

  // Расставляет локации в долях ширины экрана (а не фиксированными px), и
  // меряет их фактический центр/высоту фото - нужно для камеры и для того,
  // чтобы кнопка "Задание N" плавала над картинкой любого размера.
  function layoutObjects() {
    var vw = viewport.clientWidth;
    var firstLeft = vw * FIRST_LEFT_FACTOR;
    var step = vw * STEP_FACTOR;

    for (var i = 0; i < objects.length; i++) {
      objects[i].el.style.left = (firstLeft + i * step) + 'px';
    }
    trackWidth = firstLeft + (objects.length - 1) * step + vw;
    track.style.width = trackWidth + 'px';

    // Кнопка "Задание N" должна оставаться кликабельной даже если фото очень
    // высокое (портретное) и его верх уходит выше экрана. На мобильном все
    // кнопки стоят у правого края фото по центру видимой высоты вьюпорта
    // (см. CSS); на десктопе - плавают над фото, а если естественный отступ
    // туда не помещается (4-я локация), тоже съезжают по центру вьюпорта.
    var isMobile = document.documentElement.classList.contains('is-mobile');
    var BTN_GAP = 56, BTN_MIN_SCREEN_Y = 24;
    var viewportRect = viewport.getBoundingClientRect();
    for (var j = 0; j < objects.length; j++) {
      var o = objects[j];
      o.cx = o.el.offsetLeft + o.el.offsetWidth / 2;
      var rect = o.el.getBoundingClientRect();
      var naturalY = rect.top - BTN_GAP;
      var desiredScreenY;
      if (isMobile || (o.stage === 4 && naturalY < viewportRect.top)) {
        desiredScreenY = viewportRect.top + viewportRect.height / 2;
        if (isMobile && o.stage === 4) desiredScreenY += 40;
      } else {
        desiredScreenY = Math.max(BTN_MIN_SCREEN_Y, naturalY);
      }
      o.btnEl.style.top = (desiredScreenY - rect.top) + 'px';
    }

    // Декор (скамейка + фонари) - по центру между каждой парой соседних локаций.
    var decorEls = track.querySelectorAll('.world-decor');
    for (var k = 0; k < decorEls.length && k < objects.length - 1; k++) {
      decorEls[k].style.left = ((objects[k].cx + objects[k + 1].cx) / 2) + 'px';
    }
  }

  // Каждый <canvas class="world-lamp-canvas"> делаем крупнее самого фонаря,
  // чтобы в кадр влезало и мягкое свечение вокруг (иначе обрезается по краям
  // canvas) - сам фонарь стоит "ногой" у нижнего края. Рисуем фонарь не ровно
  // по центру canvas, а со сдвигом к скамейке (SHIFT) - визуально ближе к ней,
  // хотя сам canvas остаётся широким ради места под свечение. Гирлянда -
  // отдельный canvas на весь .world-decor, дуга между верхушками фонарей.
  // Сдвиг фонаря к скамейке масштабируем вместе с размером самого фонаря
  // (LH) - иначе на десктопе, где фонарь вырос в несколько раз, тот же
  // сдвиг в px становится незаметен на фоне выросшего canvas.
  var LAMP_BENCH_SHIFT_BASE = 30;

  function mountLamps() {
    var isMobile = document.documentElement.classList.contains('is-mobile');
    var LH = isMobile ? 92 * 1.3 * 1.5 * 1.4 * .7 * 1.15 * 1.22 : 92 * 1.7 * 1.7 * 1.4, R = LH * .55;
    var LAMP_BENCH_SHIFT = LAMP_BENCH_SHIFT_BASE * (LH / 92) * (isMobile ? 1.6 : 2.4);
    // Ширина canvas должна вмещать сдвинутое к скамейке свечение целиком:
    // центр свечения уезжает от середины canvas на LAMP_BENCH_SHIFT, и радиус
    // самого свечения - R, значит до ближнего края нужно minimum R+SHIFT с
    // каждой стороны - иначе свечение упирается в край canvas и обрезается
    // прямой линией (виден жёсткий "срез" вместо мягкого затухания).
    var canvasW = Math.ceil((R + LAMP_BENCH_SHIFT) * 2 * 1.05), canvasH0 = LH + R * 1.25;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    // "Пятно света" на земле (lamp.js light(): drawImage ... by-R*.22 .. by+R*.22)
    // уходит ниже точки "ноги" фонаря (by) на R*.22 - это больше тени (R*.22 >
    // LW*.18), поэтому именно это и есть нижняя граница, под которую нужно
    // место, иначе снизу виден жёсткий срез (светлая линия на границе canvas).
    var bottomMargin = R * .22 * 1.1;
    var canvasH = Math.ceil(canvasH0 + bottomMargin);
    var lampBy = canvasH - bottomMargin;
    var lampTopY = lampBy - LH;

    var decorList = track.querySelectorAll('.world-decor');
    var pending = []; // тяжёлая отрисовка самого фонаря (Lamp.create) - откладываем на потом
    for (var d = 0; d < decorList.length; d++) {
      var decorEl = decorList[d];
      var lampCanvases = decorEl.querySelectorAll('.world-lamp-canvas');
      var localXs = [];
      for (var i = 0; i < lampCanvases.length; i++) {
        var cv = lampCanvases[i];
        cv.style.width = canvasW + 'px';
        cv.style.height = canvasH + 'px';
        cv.width = Math.ceil(canvasW * dpr);
        cv.height = Math.ceil(canvasH * dpr);
        var ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var shift = i === 0 ? LAMP_BENCH_SHIFT : -LAMP_BENCH_SHIFT;
        pending.push({
          ctx: ctx,
          w: canvasW, h: canvasH,
          x: canvasW / 2 + shift,
          by: lampBy,
          seed: (d * 2 + i) * 3.7
        });
        localXs.push(cv.offsetLeft + canvasW / 2 + shift);
      }

      var garlandCv = decorEl.querySelector('.world-garland-canvas');
      if (garlandCv && localXs.length === 2) {
        var totalW = Math.ceil(decorEl.offsetWidth);
        garlandCv.style.width = totalW + 'px';
        garlandCv.style.height = canvasH + 'px';
        garlandCv.width = Math.ceil(totalW * dpr);
        garlandCv.height = Math.ceil(canvasH * dpr);
        var gctx = garlandCv.getContext('2d');
        gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        garlandInstances.push({
          ctx: gctx, w: totalW, h: canvasH,
          x1: localXs[0], y1: lampTopY, x2: localXs[1], y2: lampTopY,
          seed: d * 5.3
        });
      }
    }

    // Сама отрисовка фонаря (Lamp.create) - десятки fill/arc на немаленький
    // offscreen canvas, на десктопе (фонарь крупный) все 6 штук разом одним
    // синхронным тасом давали заметный фриз как раз на первом шаге персонажа
    // (ensureBuilt вызывается из того же клика, что и первое движение). Создаём
    // по одному фонарю за кадр - дольше на несколько кадров, зато без фриза.
    var pendingIdx = 0;
    function createNextLamp() {
      if (pendingIdx >= pending.length) return;
      var p = pending[pendingIdx++];
      lampInstances.push({
        ctx: p.ctx, lamp: window.Lamp.create(LH),
        w: p.w, h: p.h, x: p.x, by: p.by, seed: p.seed
      });
      if (pendingIdx < pending.length) requestAnimationFrame(createNextLamp);
    }
    createNextLamp();
  }

  function lampTick(ts) {
    if (!lampsRunning) return;
    if (lampLastTs == null) lampLastTs = ts;
    var t = ts / 1000;
    for (var i = 0; i < lampInstances.length; i++) {
      var li = lampInstances[i];
      li.ctx.clearRect(0, 0, li.w, li.h);
      li.lamp.draw(li.ctx, li.x, li.by);
      li.lamp.light(li.ctx, li.x, li.by, t, li.seed);
    }
    for (var gi = 0; gi < garlandInstances.length; gi++) {
      var g = garlandInstances[gi];
      g.ctx.clearRect(0, 0, g.w, g.h);
      window.Lamp.drawGarland(g.ctx, g.x1, g.y1, g.x2, g.y2, t, g.seed);
    }
    lampRafId = requestAnimationFrame(lampTick);
  }

  function startLamps() {
    if (lampsRunning) return;
    lampsRunning = true;
    lampLastTs = null;
    lampRafId = requestAnimationFrame(lampTick);
  }

  function stopLamps() {
    lampsRunning = false;
    if (lampRafId != null) { cancelAnimationFrame(lampRafId); lampRafId = null; }
  }

  function ensureBuilt() {
    if (built) return;
    built = true;

    viewport = byId('world-viewport');
    track = byId('world-track');
    charEl = byId('world-character');
    btnLeft = byId('world-btn-left');
    btnRight = byId('world-btn-right');

    meadowHandle = window.Meadow.mount(byId('meadow-back'), byId('meadow-front'), viewport);

    var nodeList = track.querySelectorAll('.world-object');
    for (var i = 0; i < nodeList.length; i++) {
      var el = nodeList[i];
      var stage = Number(el.dataset.stage);
      var o = {
        stage: stage,
        el: el,
        btnEl: byId('world-task-btn-' + stage),
        cx: 0,
        completed: false
      };
      objects.push(o);
      wireTaskButton(o);
    }
    objects.sort(function (a, b) { return a.stage - b.stage; });
    layoutObjects();
    mountLamps();

    wireInput();
    window.addEventListener('resize', function () {
      if (!built) return;
      layoutObjects();
      if (active) { render(); updateTaskButtons(); }
    });
  }

  function nextIncomplete() {
    for (var i = 0; i < objects.length; i++) {
      if (!objects[i].completed) return objects[i];
    }
    return null;
  }

  function clampX(nx) {
    if (nx < 0) nx = 0;
    var viewportW = viewport.clientWidth;
    var blocker = nextIncomplete();
    if (blocker) {
      var stopLine = blocker.cx - viewportW / 2;
      if (nx > stopLine) nx = stopLine;
    } else {
      var maxX = trackWidth - viewportW / 2;
      if (nx > maxX) nx = maxX;
    }
    return nx;
  }

  function render() {
    track.style.transform = 'translateX(' + (-x) + 'px)';
    if (meadowHandle) meadowHandle.setScroll(x);
  }

  function updateTaskButtons() {
    var blocker = nextIncomplete();
    var viewportW = viewport.clientWidth;
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.completed) { o.btnEl.hidden = true; continue; }
      var isCurrent = blocker && blocker.stage === o.stage;
      var stopLine = o.cx - viewportW / 2;
      var inZone = isCurrent && Math.abs(x - stopLine) <= TRIGGER_RADIUS;
      o.btnEl.hidden = !inZone;
    }
  }

  function applyCompletedState() {
    for (var i = 0; i < objects.length; i++) {
      objects[i].el.classList.toggle('is-complete', objects[i].completed);
    }
  }

  function tick(ts) {
    if (!active) return;
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (moveDir !== 0) {
      x = clampX(x + moveDir * SPEED * dt);
      facing = moveDir;
      charEl.classList.add('is-walking');
      walkFrameTimer += dt;
      if (walkFrameTimer > WALK_FRAME_MS / 1000) {
        walkFrameTimer = 0;
        walkFrame = walkFrame === 1 ? 2 : 1;
      }
      charEl.classList.toggle('walk-frame-1', walkFrame === 1);
      charEl.classList.toggle('walk-frame-2', walkFrame === 2);
    } else {
      charEl.classList.remove('is-walking');
      walkFrameTimer = 0;
    }
    charEl.classList.toggle('facing-left', facing < 0);

    render();
    updateTaskButtons();

    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (meadowHandle) meadowHandle.start();
    startLamps();
    if (active) return;
    active = true;
    lastTs = null;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    active = false;
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    keysDown.left = false;
    keysDown.right = false;
    moveDir = 0;
    if (charEl) charEl.classList.remove('is-walking');
  }

  // fromStage: 0 = самое начало, N = этапы 1..N уже пройдены (резюме).
  function open(fromStage) {
    // Экран (и его масштаб под мобильный fit) переключаем ДО первого
    // ensureBuilt()/layoutObjects() - иначе позиции/кнопки считаются ещё
    // под чужой (прошлого экрана) масштаб и потом застревают неверными.
    window.showScreen('world');
    ensureBuilt();

    for (var i = 0; i < objects.length; i++) {
      objects[i].completed = objects[i].stage <= fromStage;
      objects[i].btnEl.hidden = true;
    }
    applyCompletedState();

    var blocker = nextIncomplete();
    var viewportW = viewport.clientWidth;
    if (fromStage > 0 && blocker) {
      x = Math.max(0, blocker.cx - viewportW / 2);
    } else if (!blocker) {
      x = Math.max(0, trackWidth - viewportW / 2);
    } else {
      x = 0;
    }
    facing = 1;
    moveDir = 0;
    keysDown.left = false;
    keysDown.right = false;

    render();
    updateTaskButtons();
    startLoop();
  }

  // Вызывается из main.js после того, как мини-игра этапа n завершена.
  function completeCurrent(n) {
    ensureBuilt();
    for (var i = 0; i < objects.length; i++) {
      if (objects[i].stage === n) objects[i].completed = true;
    }
    applyCompletedState();
    render();
    updateTaskButtons();
    startLoop();
  }

  return { open: open, completeCurrent: completeCurrent };
})();
