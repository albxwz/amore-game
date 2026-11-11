// Пазл 3x3: своп двух частей (не slide-puzzle), поэтому любая перестановка без
// неподвижных точек решаема - достаточно простого derangement-шафла.
window.Puzzle = (function () {
  var SIZE = 3;
  var TOTAL = SIZE * SIZE;

  var gridEl, hintOverlayEl, moveCountEl, hintBtn, containerEl;
  var board = []; // board[slotIndex] = pieceIndex
  var slots = []; // DOM .puzzle-slot элементы
  var selected = null;
  var moves = 0;
  var solved = false;
  var onCompleteCb = null;
  var imageUrl = '';

  var drag = null; // { slotIndex, startX, startY, active, el }

  function start(imageSrc, onComplete) {
    onCompleteCb = onComplete;
    moves = 0;
    selected = null;
    solved = false;

    gridEl = document.getElementById('puzzle-grid');
    hintOverlayEl = document.getElementById('puzzle-hint-overlay');
    moveCountEl = document.getElementById('puzzle-move-count');
    hintBtn = document.getElementById('puzzle-hint-btn');
    containerEl = document.getElementById('puzzle-container');

    moveCountEl.textContent = 'Ходов: 0';
    containerEl.classList.remove('is-solved');

    var probe = new Image();
    probe.onload = function () { imageUrl = imageSrc; buildBoard(); };
    probe.onerror = function () { imageUrl = buildPlaceholderDataUrl(); buildBoard(); };
    probe.src = imageSrc;
  }

  function buildPlaceholderDataUrl() {
    var c = document.createElement('canvas');
    c.width = 480; c.height = 480;
    var ctx = c.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 480, 480);
    grad.addColorStop(0, '#B3477F');
    grad.addColorStop(1, '#80074C');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 480);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    for (var i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 160, 0); ctx.lineTo(i * 160, 480); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 160); ctx.lineTo(480, i * 160); ctx.stroke();
    }
    ctx.fillStyle = '#F2FFA4';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Фото будет здесь', 240, 250);
    return c.toDataURL('image/png');
  }

  function buildBoard() {
    hintOverlayEl.style.backgroundImage = "url('" + imageUrl + "')";

    do {
      board = shuffledDerangement();
    } while (hasFixedPoint(board));

    gridEl.innerHTML = '';
    slots = [];
    for (var slotIndex = 0; slotIndex < TOTAL; slotIndex++) {
      var slot = document.createElement('div');
      slot.className = 'puzzle-slot';
      slot.dataset.slot = String(slotIndex);

      var piece = document.createElement('div');
      piece.className = 'puzzle-piece';
      piece.style.backgroundImage = "url('" + imageUrl + "')";
      slot.appendChild(piece);

      wireSlotEvents(slot);
      gridEl.appendChild(slot);
      slots.push(slot);
    }
    renderAll();

    hintBtn.onpointerdown = function () { hintOverlayEl.classList.add('is-visible'); };
    hintBtn.onpointerup = hintBtn.onpointerleave = function () { hintOverlayEl.classList.remove('is-visible'); };
  }

  function shuffledDerangement() {
    var arr = [];
    for (var i = 0; i < TOTAL; i++) arr.push(i);
    for (var i2 = arr.length - 1; i2 > 0; i2--) {
      var j = Math.floor(Math.random() * (i2 + 1));
      var tmp = arr[i2]; arr[i2] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function hasFixedPoint(arr) {
    for (var i = 0; i < arr.length; i++) if (arr[i] === i) return true;
    return false;
  }
  function isWin() {
    for (var i = 0; i < board.length; i++) if (board[i] !== i) return false;
    return true;
  }

  function renderPiece(slotIndex) {
    var pieceIndex = board[slotIndex];
    var col = pieceIndex % SIZE;
    var row = Math.floor(pieceIndex / SIZE);
    var piece = slots[slotIndex].firstChild;
    piece.style.backgroundPosition = (col * 50) + '% ' + (row * 50) + '%';
    slots[slotIndex].classList.toggle('is-correct', pieceIndex === slotIndex);
  }

  function renderAll() {
    for (var i = 0; i < TOTAL; i++) renderPiece(i);
  }

  function wireSlotEvents(slot) {
    slot.addEventListener('click', function (e) {
      if (drag && drag.moved) return; // клик после drag игнорируем
      onSlotTap(slot);
    });

    var piece = slot.firstChild;
    piece.addEventListener('pointerdown', function (e) {
      drag = {
        slotIndex: Number(slot.dataset.slot),
        startX: e.clientX, startY: e.clientY,
        active: false, moved: false,
        el: piece
      };
      piece.setPointerCapture(e.pointerId);
    });
    piece.addEventListener('pointermove', function (e) {
      if (!drag || drag.slotIndex !== Number(slot.dataset.slot)) return;
      var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (!drag.active && Math.hypot(dx, dy) > 8) {
        drag.active = true;
        drag.moved = true;
        slot.classList.add('is-dragging');
      }
      if (drag.active) {
        piece.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.08)';
      }
    });
    piece.addEventListener('pointerup', function (e) {
      if (!drag || drag.slotIndex !== Number(slot.dataset.slot)) { drag = null; return; }
      slot.classList.remove('is-dragging');
      piece.style.transform = '';
      if (drag.active) {
        var target = document.elementFromPoint(e.clientX, e.clientY);
        var targetSlot = target ? target.closest('.puzzle-slot') : null;
        if (targetSlot && targetSlot !== slot) {
          swap(Number(slot.dataset.slot), Number(targetSlot.dataset.slot));
        }
      }
      drag = null;
    });
    piece.addEventListener('pointercancel', function () {
      slot.classList.remove('is-dragging');
      piece.style.transform = '';
      drag = null;
    });
  }

  function onSlotTap(slot) {
    var idx = Number(slot.dataset.slot);
    if (selected === null) {
      selected = idx;
      slot.classList.add('is-selected');
      return;
    }
    if (selected === idx) {
      slot.classList.remove('is-selected');
      selected = null;
      return;
    }
    slots[selected].classList.remove('is-selected');
    swap(selected, idx);
    selected = null;
  }

  function swap(a, b) {
    if (solved) return;
    var tmp = board[a]; board[a] = board[b]; board[b] = tmp;
    renderPiece(a); renderPiece(b);
    moves++;
    moveCountEl.textContent = 'Ходов: ' + moves;
    if (isWin()) onSolved();
  }

  function onSolved() {
    solved = true;
    slots.forEach(function (s) { s.classList.add('is-correct'); });
    containerEl.classList.add('is-solved');
    if (onCompleteCb) setTimeout(onCompleteCb, 500);
  }

  return { start: start };
})();
