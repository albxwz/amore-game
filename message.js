// 3-й этап: письмо в будущее + экспорт в PDF (html2canvas -> jsPDF).
window.Message = (function () {
  var STORAGE_KEY = 'game_stage3_letter';
  var textarea, saveBtn, finishBtn, iosHint;
  var onFinishCb = null;
  var saveDebounce = null;

  function start(onFinish) {
    onFinishCb = onFinish;

    textarea = document.getElementById('future-letter-textarea');
    saveBtn = document.getElementById('save-pdf-btn');
    finishBtn = document.getElementById('message-finish-btn');
    iosHint = document.getElementById('pdf-ios-hint');

    var saved = readDraft();
    if (saved) textarea.value = saved;

    updateButtonState();
    finishBtn.hidden = true;
    iosHint.hidden = true;

    textarea.oninput = function () {
      updateButtonState();
      clearTimeout(saveDebounce);
      saveDebounce = setTimeout(function () { writeDraft(textarea.value); }, 300);
    };

    saveBtn.onclick = function () {
      if (!textarea.value.trim()) return;
      exportPdf();
    };

    finishBtn.onclick = function () {
      if (onFinishCb) onFinishCb();
    };
  }

  function updateButtonState() {
    var hasText = textarea.value.trim().length > 0;
    saveBtn.disabled = !hasText;
  }

  function readDraft() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
  }
  function writeDraft(text) {
    try { localStorage.setItem(STORAGE_KEY, text); } catch (e) {}
  }

  function formatRuDate(d) {
    var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' г.';
  }

  function probeImage(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(false); return; }
      var img = new Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = src;
    });
  }

  function fillPdfPage(text, bgAvailable, bgSrc) {
    var page = document.getElementById('pdf-letter-page');
    var body = document.getElementById('pdf-body');
    var dateEl = document.getElementById('pdf-date');

    page.style.backgroundImage = bgAvailable ? "url('" + bgSrc + "')" : '';
    page.style.backgroundSize = 'cover';

    body.innerHTML = '';
    text.split(/\n{2,}/).forEach(function (para) {
      var p = document.createElement('p');
      para.split('\n').forEach(function (line, i) {
        if (i > 0) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(line));
      });
      body.appendChild(p);
    });

    dateEl.textContent = 'Написано: ' + formatRuDate(new Date()) + ' ❤';
  }

  function exportPdf() {
    var text = textarea.value.trim();
    probeImage(window.ASSETS && window.ASSETS.images.pdfBackground).then(function (bgOk) {
      fillPdfPage(text, bgOk, window.ASSETS.images.pdfBackground);
      var page = document.getElementById('pdf-letter-page');
      page.style.display = 'block';

      html2canvas(page, {
        scale: 2,
        backgroundColor: '#fdf4e3',
        useCORS: true,
        onclone: function (clonedDoc) {
          // На телефоне body повёрнут на 90deg (см. style.css) для
          // горизонтального режима - html2canvas по умолчанию копирует и
          // этот transform, из-за чего PDF выходил "кривым" (повёрнутым).
          // Снимаем поворот только в клонированном документе для рендера.
          var clonedBody = clonedDoc.body;
          var clonedHtml = clonedDoc.documentElement;
          if (clonedBody) {
            clonedBody.style.transform = 'none';
            clonedBody.style.position = 'static';
            clonedBody.style.width = '';
            clonedBody.style.height = '';
          }
          if (clonedHtml) {
            clonedHtml.style.width = '';
            clonedHtml.style.height = '';
          }
        }
      }).then(function (canvas) {
        page.style.display = '';
        buildAndSavePdf(canvas);
      }).catch(function () {
        page.style.display = '';
      });
    });
  }

  function buildAndSavePdf(canvas) {
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    var marginMm = 10;
    var pageWmm = pdf.internal.pageSize.getWidth() - marginMm * 2;
    var pageHmm = pdf.internal.pageSize.getHeight() - marginMm * 2;

    var pxToMm = pageWmm / canvas.width;
    var pageHeightPx = Math.floor(pageHmm / pxToMm);

    var offset = 0;
    var first = true;
    while (offset < canvas.height) {
      var sliceH = Math.min(pageHeightPx, canvas.height - offset);
      var sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceH;
      var sctx = sliceCanvas.getContext('2d');
      sctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      var imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
      var sliceHmm = sliceH * pxToMm;

      if (!first) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, pageWmm, sliceHmm);
      first = false;
      offset += sliceH;
    }

    pdf.save('poslanie-v-budushchee.pdf');

    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      iosHint.hidden = false;
    }
    finishBtn.hidden = false;
  }

  return { start: start, exportPdf: exportPdf };
})();
