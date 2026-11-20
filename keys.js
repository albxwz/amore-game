// Модуль "ключи": по одному ключу за каждый пройденный этап (4 этапа = 4
// ключа). Хранится отдельно от game_progress_stage, чтобы не зависеть от
// логики возобновления игры.
window.Keys = (function () {
  var STORAGE_KEY = 'game_keys_collected';
  var TOTAL = 4;
  var count = load();

  function load() {
    try {
      var v = Number(localStorage.getItem(STORAGE_KEY));
      return (v > 0 && v <= TOTAL) ? v : 0;
    } catch (e) { return 0; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, String(count)); } catch (e) {}
  }

  function renderButton() {
    var badge = document.getElementById('keys-btn-count');
    if (badge) badge.textContent = count + '/' + TOTAL;
  }

  function renderModal() {
    var slots = document.getElementById('keys-modal-slots');
    slots.innerHTML = '';
    for (var i = 1; i <= TOTAL; i++) {
      var span = document.createElement('span');
      span.className = 'keys-slot' + (i <= count ? ' is-collected' : '');
      if (i <= count) span.innerHTML = '<img class="heart-icon" src="heart.png" alt="">';
      else span.textContent = '🔒';
      slots.appendChild(span);
    }
    document.getElementById('keys-modal-count').textContent = count + ' / ' + TOTAL + ' собрано';
  }

  function collect(n) {
    if (n > count) {
      count = n;
      save();
      renderButton();
    }
  }

  function spawnSparkle(x, y) {
    var s = document.createElement('div');
    s.className = 'key-fly-sparkle';
    s.textContent = '✨';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    document.body.appendChild(s);

    var dx = (Math.random() - .5) * 50;
    var dy = (Math.random() - .5) * 50;
    var rot = (Math.random() - .5) * 140;
    var a = s.animate([
      { transform: 'translate(-50%, -50%) translate(0px, 0px) scale(.9) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'translate(-50%, -50%) translate(' + dx + 'px, ' + dy + 'px) scale(.25) rotate(' + rot + 'deg)', opacity: 0, offset: 1 }
    ], { duration: 550, easing: 'ease-out' });
    a.onfinish = function () { s.remove(); };
  }

  // Персистит счёт сразу (на случай, если анимация прервётся), но
  // визуальное обновление бейджа откладывает до момента "приземления" ключа.
  function collectAndFly(n, fromRect) {
    if (n <= count) return;
    count = n;
    save();

    var toEl = document.getElementById('keys-btn');
    if (!fromRect || !toEl) { renderButton(); return; }

    var toRect = toEl.getBoundingClientRect();
    var startX = fromRect.left + fromRect.width / 2;
    var startY = fromRect.top + fromRect.height / 2;
    var endX = toRect.left + toRect.width / 2;
    var endY = toRect.top + toRect.height / 2;
    var dx = endX - startX;
    var dy = endY - startY;
    var midX = dx * .5;
    var midY = dy * .5 - Math.max(120, Math.abs(dy) * .6); // дога - подъём над прямой линией

    var fly = document.createElement('div');
    fly.className = 'key-fly is-waiting';
    fly.innerHTML = '<img class="heart-icon heart-beat" src="heart.png" alt="">';
    fly.style.left = startX + 'px';
    fly.style.top = startY + 'px';
    fly.style.transform = 'translate(-50%, -50%)'; // пока ждёт - стоит по центру точки старта
    document.body.appendChild(fly);

    // Сначала ключ просто стоит на месте локации (заметно, с лёгкой
    // пульсацией) - и только потом летит к значку ключей.
    setTimeout(function () {
      fly.classList.remove('is-waiting');
      var anim = fly.animate([
        { transform: 'translate(-50%, -50%) translate(0px, 0px) scale(1) rotate(0deg)', offset: 0 },
        { transform: 'translate(-50%, -50%) translate(' + midX + 'px, ' + midY + 'px) scale(1.15) rotate(170deg)', offset: .55 },
        { transform: 'translate(-50%, -50%) translate(' + dx + 'px, ' + dy + 'px) scale(.35) rotate(380deg)', offset: 1 }
      ], { duration: 1300, easing: 'cubic-bezier(.3,.6,.3,1)' });

      // Блеск позади летящего ключа - читаем его текущую позицию каждый кадр,
      // пока сама анимация полёта идёт.
      var flyDuration = 1300;
      var flyStartTs = null;
      var lastSparkleT = -999;
      var sparkleRafId = requestAnimationFrame(function sparkleTick(ts) {
        if (flyStartTs == null) flyStartTs = ts;
        var elapsed = ts - flyStartTs;
        if (elapsed - lastSparkleT > 45) {
          lastSparkleT = elapsed;
          var r = fly.getBoundingClientRect();
          spawnSparkle(r.left + r.width / 2, r.top + r.height / 2);
        }
        if (elapsed < flyDuration) sparkleRafId = requestAnimationFrame(sparkleTick);
      });

      anim.onfinish = function () {
        cancelAnimationFrame(sparkleRafId);
        fly.remove();
        renderButton();
        toEl.classList.add('is-bumped');
        setTimeout(function () { toEl.classList.remove('is-bumped'); }, 260);
      };
    }, 2000);
  }

  function reset() {
    count = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    renderButton();
  }

  function open() {
    renderModal();
    window.openModal('modal-keys');
  }

  function init() {
    renderButton();
    document.getElementById('keys-btn').onclick = open;
    document.getElementById('keys-modal-close-btn').onclick = function () {
      window.closeModal('modal-keys');
    };
  }

  return { collect: collect, collectAndFly: collectAndFly, reset: reset, init: init };
})();
