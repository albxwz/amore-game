// Викторина 1-го этапа: вопросы берутся из TEXTS.quiz.questions (main.js).
window.Quiz = (function () {
  var counterEl, questionEl, answersEl, feedbackEl;
  var questions = [];
  var index = 0;
  var onCompleteCb = null;

  function start(questionList, onComplete) {
    questions = questionList;
    onCompleteCb = onComplete;
    index = 0;

    counterEl = document.getElementById('quiz-counter');
    questionEl = document.getElementById('quiz-question');
    answersEl = document.getElementById('quiz-answers');
    feedbackEl = document.getElementById('quiz-feedback');

    render();
  }

  function render() {
    var q = questions[index];
    counterEl.textContent = 'Вопрос ' + (index + 1) + ' из ' + questions.length;
    questionEl.textContent = q.text;
    feedbackEl.hidden = true;
    answersEl.innerHTML = '';

    q.answers.forEach(function (answer, i) {
      var btn = document.createElement('button');
      btn.className = 'quiz-answer-btn';
      btn.textContent = answer.text;
      btn.addEventListener('click', function () { handleAnswer(btn, answer.correct); });
      answersEl.appendChild(btn);
    });
  }

  function handleAnswer(btn, correct) {
    if (btn.classList.contains('is-correct')) return; // уже отвечено

    if (correct) {
      Array.prototype.forEach.call(answersEl.children, function (b) { b.disabled = true; });
      btn.classList.add('is-correct');
      spawnMiniHearts(btn);
      setTimeout(function () {
        index++;
        if (index < questions.length) {
          render();
        } else if (onCompleteCb) {
          onCompleteCb();
        }
      }, 1000);
    } else {
      btn.classList.remove('is-wrong');
      // перезапуск анимации shake
      requestAnimationFrame(function () {
        btn.classList.add('is-wrong');
      });
      feedbackEl.hidden = false;
      btn.addEventListener('animationend', function handler() {
        btn.classList.remove('is-wrong');
        btn.removeEventListener('animationend', handler);
      });
    }
  }

  function spawnMiniHearts(btn) {
    var rect = btn.getBoundingClientRect();
    for (var i = 0; i < 6; i++) {
      var heart = document.createElement('span');
      heart.className = 'mini-heart';
      heart.textContent = '❤';
      heart.style.left = (rect.left + rect.width * Math.random()) + 'px';
      heart.style.top = (rect.top + rect.height / 2) + 'px';
      document.body.appendChild(heart);
      setTimeout(function (el) { return function () { el.remove(); }; }(heart), 950);
    }
  }

  return { start: start };
})();
