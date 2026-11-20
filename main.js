// Главный модуль: тексты, пути к ассетам, управление экранами и ходом игры.
// Чтобы изменить любой текст в игре - редактируйте только объект TEXTS ниже.

// Раньше игра пыталась симулировать альбомный вид, пока телефон физически
// портретный (поворот всей страницы через CSS, с компенсацией реального
// угла устройства). Это оказалось слишком хрупко (баги orientation-API на
// разных устройствах/браузерах - напр. iOS 16.4 - постоянно давали неверные
// расположения элементов). Теперь - классический, надёжный способ: пока
// телефон держат портретно, поверх игры показывается подсказка "поверните
// телефон" (см. .rotate-hint-overlay в style.css, работает через чистый
// @media (orientation:portrait), без JS и без каких-либо orientation-API).
// Как только телефон физически в альбомной ориентации, подсказка прячется
// и видна сама игра - раскладка внутри #app ровно та же, что на десктопе
// (никаких мобильных переопределений размеров/позиций отдельных элементов -
// именно это раньше постоянно ломалось при повороте). Единственное
// мобильное отличие - #app целиком МАСШТАБИРУЕТСЯ (CSS transform:scale),
// если реальный экран меньше контрольного размера, на котором рассчитана
// десктопная раскладка - см. updateMobileScale() ниже. Это просто
// пропорциональное уменьшение (как Ctrl+- в браузере), без переноса/
// поворота элементов, поэтому не подвержено багам с осями, в отличие от
// прежнего подхода.
// .is-mobile нужен только чтобы подсказка/масштаб не включались у
// десктопных пользователей, которые просто сузили окно браузера -
// используем min(width,height), чтобы не путать "маленький телефон" с
// "узкое, но высокое десктопное окно".
function updateIsMobileClass() {
  var isPhone = Math.min(window.innerWidth, window.innerHeight) <= 500;
  document.documentElement.classList.toggle('is-mobile', isPhone);
}

// Контрольный размер, на который рассчитана десктопная раскладка без
// обрезания (с запасом над тем, что реально нужно самому требовательному
// экрану - пазлу: квадрат + счётчик/кнопки под ним). Если реальный экран
// меньше - пропорционально уменьшаем #app, чтобы НИЧЕГО не обрезалось, а
// не чтобы точно совпасть с десктопным брейкпоинтом стилей (это разные
// вещи: брейкпоинт меняет CSS-значения, масштаб просто уменьшает картинку).
// Разные экраны требуют разного места на десктопной раскладке - викторина
// широкая (две большие фотографии по бокам + диалог, мало по высоте), пазл
// высокий (крупный квадрат + контролы под ним, мало по ширине), карточка
// скромная по обоим измерениям. Если считать ОДИН масштаб на все экраны по
// худшему случаю (викторине), пазл и карточки сжимались бы сильнее, чем им
// реально нужно - кнопки и фото выглядели мельче, чем могли бы. Поэтому
// масштаб считается ПОД ТЕКУЩИЙ активный экран - значения измерены через
// getBoundingClientRect() на десктопной раскладке (не придуманы с запасом).
var MOBILE_FIT_DEFAULT = { w: 500, h: 520 };
var MOBILE_FIT_QUIZ = { w: 1360, h: 300 };
var MOBILE_FIT_PUZZLE = { w: 500, h: 560 };
var MOBILE_FIT_CARDS = { w: 360, h: 520 };
var MOBILE_FIT_WORLD = { w: 900, h: 420 };

function getMobileFit() {
  var quizSheet = document.getElementById('quiz-sheet');
  if (quizSheet && !quizSheet.hidden) return MOBILE_FIT_QUIZ;
  var activeScreen = document.querySelector('.screen--active');
  var name = activeScreen ? activeScreen.dataset.screen : null;
  if (name === 'puzzle') return MOBILE_FIT_PUZZLE;
  if (name === 'cards') return MOBILE_FIT_CARDS;
  if (name === 'world') return MOBILE_FIT_WORLD;
  return MOBILE_FIT_DEFAULT;
}

function clearMobileScale(app) {
  app.style.transform = '';
  app.style.transformOrigin = '';
  app.style.position = '';
  app.style.left = '';
  app.style.top = '';
  app.style.width = '';
  app.style.height = '';
}

function updateMobileScale() {
  var app = document.getElementById('app');
  if (!app) return;
  if (!document.documentElement.classList.contains('is-mobile')) {
    clearMobileScale(app);
    return;
  }
  var fit = getMobileFit();
  var scale = Math.min(1, window.innerWidth / fit.w, window.innerHeight / fit.h);
  if (scale >= 1) {
    clearMobileScale(app);
    return;
  }
  app.style.position = 'fixed';
  app.style.left = '0';
  app.style.top = '0';
  app.style.width = (window.innerWidth / scale) + 'px';
  app.style.height = (window.innerHeight / scale) + 'px';
  app.style.transformOrigin = 'top left';
  app.style.transform = 'scale(' + scale + ')';
}
window.updateMobileScale = updateMobileScale;

function updateViewportVars() {
  document.documentElement.style.setProperty('--vw', window.innerWidth + 'px');
  document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
  updateIsMobileClass();
  updateMobileScale();
}
window.updateViewportVars = updateViewportVars;
updateViewportVars();
window.addEventListener('resize', updateViewportVars);
window.addEventListener('orientationchange', updateViewportVars);

// body формально остаётся скролл-контейнером (overflow:hidden просто прячет
// полосу прокрутки и блокирует прокрутку пальцем/колесом, но НЕ блокирует
// программный scrollTop/scrollLeft). Клик по кнопке переводит на неё фокус,
// и браузер иногда сам вызывает scrollIntoView для только что
// сфокусированного элемента - на нашей повёрнутой на 90deg странице это
// "подведение в видимую область" считается по нетронутой (непровёрнутой)
// геометрии и сдвигает body.scrollTop на случайную величину, из-за чего всё
// визуально съезжает (ровно это и "чинило" ручное переворачивание телефона -
// оно переcчитывало раскладку и сбрасывало сдвиг). Жёстко держим прокрутку в
// (0,0) всегда.
function resetBodyScroll() {
  if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
  if (document.body.scrollLeft !== 0) document.body.scrollLeft = 0;
}
document.body.addEventListener('scroll', resetBodyScroll, { passive: true });

var TEXTS = {
  startBtn: 'Начать игру',
  rules: {
    title: 'Правила игры',
    body: [
      'Вам предстоит пройти 4 этапа. Чтобы победить в игре, необходимо успешно пройти все четыре этапа.',
      'За каждый пройденный этап ты получишь сердце — собери все 4, посмотреть их можно по значку ❤️ вверху экрана.',
      'Готовы?'
    ],
    startBtn: 'Начать игру'
  },
  quiz: {
    questions: [
      {
        text: 'В какой день и в каком году мы познакомились?',
        answers: [
          { text: '22.03.2023', correct: false },
          { text: '10.05.2023', correct: false },
          { text: '25.11.2023', correct: true }
        ]
      },
      {
        text: 'В какой одежде мы были в тот день?',
        answers: [
          { text: 'На мне были коричневая куртка и клетчатый шарф, а на тебе — коричневая дублёнка.', correct: true },
          { text: 'Я был в синих брюках и чёрной куртке, а ты — в чёрной куртке и высоких сапогах.', correct: false },
          { text: 'Я был в белой рубашке и синих джинсах, а ты — в зелёном спортивном костюме.', correct: false }
        ]
      },
      {
        text: 'Какие первые слова я тебе сказал?',
        answers: [
          { text: 'Привет, можно познакомиться?', correct: false },
          { text: 'Ты что, не смотришь в глаза?', correct: true },
          { text: 'Как тебя зовут?', correct: false }
        ]
      }
    ],
    feedback: 'Попробуй ещё раз ❤️'
  },
  letterStage1: {
    opening: 'Моя любимая…',
    body: [
      'Помнишь нашу первую встречу? Кто бы мог подумать, что обычный день и случайно пролитый на меня кофе станут началом такой красивой истории.',
      'Когда ты пролила на меня кофе, я, конечно, немного растерялся. Но знаешь, я совсем не злился. Наоборот, мне хотелось улыбаться, потому что передо мной стояла такая милая девушка. Я смотрел на тебя и пытался скрыть своё волнение.',
      'А потом ты посмотрела на меня… И в тот момент я почувствовал что-то особенное. Мне захотелось узнать твоё имя, услышать твой голос, поговорить с тобой ещё немного. Я даже не представлял, что одна случайная встреча может так сильно запомниться.',
      'С того дня я всё чаще вспоминал тебя. Твою улыбку, взгляд и тот самый момент с кофе. Забавно, что тогда я даже не подозревал, насколько важным человеком ты станешь в моей жизни.',
      'Сейчас, оглядываясь назад, я понимаю: я бы ни за что не хотел изменить тот день. Даже если бы мне снова пришлось испачкаться кофе, я бы с удовольствием пережил всё заново.',
      'Ведь именно тогда я встретил тебя. И именно с того случайного момента началась наша история.'
    ],
    closing: 'Спасибо тебе за то, что однажды пролила на меня кофе. ❤️'
  },
  stage3: {
    title: 'Что бы вы хотели сказать самим себе в будущем?',
    body: [
      'Представьте, что прошло 5 или 10 лет. Какими вы стали? О чём мечтаете, чего уже добились и что хотели бы пожелать себе сегодняшним?',
      'Оставьте послание самим себе в будущее, которое однажды вы сможете перечитать вместе и вспомнить этот особенный момент.'
    ],
    placeholder: 'Дорогие мы из будущего…'
  },
  final: { title: 'Поздравляем! Вы успешно прошли игру ❤️' },
  stage2Cards: {
    nextBtn: 'Следующий',
    questions: [
      'Что тебе больше всего нравится во мне?',
      'В какой момент ты понял(а), что я тебе нравлюсь?',
      'Есть ли что-то важное, что ты от меня скрывал(а)?',
      'За какие мои качества ты меня любишь?',
      'Как я могу поддерживать тебя в трудные моменты?',
      'Какой мой поступок может тебя обидеть?',
      'Какую общую мечту мы должны исполнить?',
      'Что бы ты хотел(а) пообещать мне на будущее?'
    ]
  },
  buttons: {
    task: 'Задание',
    toNextStage: 'Перейти к следующему этапу',
    letterFinish: 'Продолжить',
    savePdf: 'Сохранить в PDF',
    finish: 'Завершить',
    downloadAgain: 'Скачать послание ещё раз',
    restart: 'Начать заново'
  },
  envelopeHint: 'Нажми, чтобы открыть',
  keysComplete: {
    title: 'Все сердца собраны! ❤️❤️❤️❤️',
    body: 'Теперь вы можете открыть свой подарок.',
    btn: 'Открыть подарок'
  }
};

var ASSETS = {
  images: {
    heart: 'heart.png',
    quizPhoto1: '11.jpg',
    quizPhoto2: '22.jpg',
    quizPhoto3: '33.jpg',
    quizPhoto4: '44.jpg',
    envelope: 'envelope.jpg',
    puzzle: 'puzzle.jpg',
    cardBg: 'ghm.png',
    pdfBackground: 'pdf_background.jpg',
    charIdle: 'al.png',
    charWalk1: 'on.png',
    charWalk2: 'sol.png',
    loc1: '1.png',
    loc2: '2.png',
    loc3: '3.png',
    loc4: '4.png',
    bench: 'bench.png'
  },
  audio: { main: 'main.mp3' }
};
window.ASSETS = ASSETS;

var STAGES = [
  {
    photos: [
      ASSETS.images.quizPhoto1,
      ASSETS.images.quizPhoto2,
      ASSETS.images.quizPhoto3,
      ASSETS.images.quizPhoto4
    ],
    type: 'quiz'
  },
  { type: 'puzzle' },
  { type: 'cards' },
  { type: 'message' }
];

var STAGE_SCREENS = { photo: true, puzzle: true, cards: true, message: true };

var currentStage = 0;
var currentScreenName = null;

function showScreen(name) {
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) {
    var s = screens[i];
    if (s.dataset.screen === name) {
      s.classList.remove('screen--leaving');
      s.classList.add('screen--active');
    } else if (s.classList.contains('screen--active')) {
      s.classList.remove('screen--active');
      s.classList.add('screen--leaving');
      (function (el) {
        setTimeout(function () { el.classList.remove('screen--leaving'); }, 650);
      })(s);
    }
  }
  currentScreenName = name;
  updateStageIndicator();
  updateMobileScale();
}

function openModal(id) { document.getElementById(id).hidden = false; }
function closeModal(id) { document.getElementById(id).hidden = true; }

function updateStageIndicator() {
  var el = document.getElementById('stage-indicator');
  if (STAGE_SCREENS[currentScreenName] && currentStage > 0) {
    el.textContent = 'Этап ' + currentStage + ' из 4';
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

// Вход в fullscreen меняет innerWidth/innerHeight не сразу синхронно -
// пересчитываем --vw/--vh ещё пару раз с задержкой, чтобы точно поймать
// финальный размер (а не только момент до/в начале перехода).
function afterFullscreenTransition() {
  updateViewportVars();
  setTimeout(updateViewportVars, 150);
  setTimeout(updateViewportVars, 500);
}

function requestFullscreen() {
  var el = document.documentElement;
  var req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (!req) {
    afterFullscreenTransition();
    return;
  }
  try {
    var result = req.call(el);
    if (result && result.then) {
      result.then(afterFullscreenTransition).catch(afterFullscreenTransition);
    } else {
      afterFullscreenTransition();
    }
  } catch (e) {
    afterFullscreenTransition();
  }
}

document.addEventListener('fullscreenchange', updateViewportVars);
document.addEventListener('webkitfullscreenchange', updateViewportVars);

/* ===================== Экран загрузки ===================== */

// Ждём на экране загрузки вообще все файлы - картинки и музыку.
// <audio> для предзагрузки обязательно добавляем в DOM (не просто new
// Audio()/createElement без вставки) - некоторые мобильные браузеры
// приостанавливают загрузку медиаэлементов, которые не находятся в документе.
function preloadAssets(onProgress, onDone) {
  var items = [];
  Object.keys(ASSETS.images).forEach(function (k) { items.push({ type: 'image', url: ASSETS.images[k] }); });
  items.push({ type: 'audio', url: ASSETS.audio.main });

  var total = items.length;
  var loaded = 0;
  var done = false;

  function finish() {
    if (done) return;
    done = true;
    onDone();
  }

  function settle() {
    if (done) return;
    loaded++;
    onProgress(loaded, total);
    if (loaded >= total) finish();
  }

  if (total === 0) { finish(); return; }

  items.forEach(function (item) {
    if (item.type === 'image') {
      var img = new Image();
      // decode(), а не просто onload - иначе это лишь "байты скачались", а
      // сама декодировка битмапа откладывается браузером до первой отрисовки.
      // Для персонажа/локаций (мира) это давало фриз ровно на первых шагах.
      img.onload = function () {
        if (img.decode) img.decode().then(settle, settle);
        else settle();
      };
      img.onerror = settle;
      img.src = item.url;
    } else if (item.type === 'audio') {
      var audio = new Audio();
      audio.preload = 'auto';
      audio.oncanplaythrough = settle;
      audio.onloadeddata = settle;
      audio.onerror = settle;
      audio.src = item.url;
      document.body.appendChild(audio);
      audio.style.display = 'none';
      audio.load();
    }
  });

  // Защита: если какой-то файл никогда не "доложит" о своей загрузке
  // (ограничения мобильного браузера/сети), экран загрузки не должен
  // застрять навсегда.
  setTimeout(finish, 60000);
}

function updateMuteIcon() {
  document.getElementById('mute-toggle').textContent = AudioCtl.isMuted() ? '🔇' : '🔊';
}

function buildHearts(container, count) {
  for (var i = 0; i < count; i++) {
    var h = document.createElement('span');
    h.className = 'heart';
    h.textContent = '❤︎';
    h.style.setProperty('--x', (Math.random() * 100) + '%');
    h.style.setProperty('--delay', (Math.random() * 10).toFixed(2) + 's');
    h.style.setProperty('--duration', (10 + Math.random() * 8).toFixed(2) + 's');
    h.style.setProperty('--size', (14 + Math.random() * 16).toFixed(0) + 'px');
    container.appendChild(h);
  }
}

function buildSnow(container, count) {
  for (var i = 0; i < count; i++) {
    var f = document.createElement('span');
    f.className = 'flake';
    f.style.setProperty('--x', (Math.random() * 100) + '%');
    f.style.setProperty('--delay', (Math.random() * 12).toFixed(2) + 's');
    f.style.setProperty('--duration', (9 + Math.random() * 10).toFixed(2) + 's');
    f.style.setProperty('--size', (3 + Math.random() * 6).toFixed(1) + 'px');
    f.style.setProperty('--drift', ((Math.random() * 60) - 30).toFixed(0) + 'px');
    container.appendChild(f);
  }
}

function saveProgress(n) {
  try { localStorage.setItem('game_progress_stage', String(n)); } catch (e) {}
}
function clearProgress() {
  try {
    localStorage.removeItem('game_progress_stage');
    localStorage.removeItem('game_stage3_letter');
  } catch (e) {}
}

/* ===================== Поток этапов ===================== */

function launchStage(n) {
  currentStage = n;
  updateStageIndicator();
  beginStageTask(n);
}
window.launchStage = launchStage;

function setQuizPhoto(src) {
  var img = document.getElementById('stage-photo-img');
  var placeholder = document.getElementById('stage-photo-placeholder');
  img.style.display = '';
  placeholder.hidden = true;
  img.src = src;
}

function beginStageTask(n) {
  var stage = STAGES[n - 1];

  if (stage.type === 'quiz') {
    showScreen('photo');

    var img = document.getElementById('stage-photo-img');
    var placeholder = document.getElementById('stage-photo-placeholder');
    var quizSheet = document.getElementById('quiz-sheet');
    var snowLayer = document.getElementById('photo-snow');

    snowLayer.hidden = false;
    document.getElementById('quiz-continue-btn').hidden = true;
    quizSheet.classList.remove('is-visible');

    img.onerror = function () { img.style.display = 'none'; placeholder.hidden = false; };
    setQuizPhoto(stage.photos[0]);

    quizSheet.hidden = false;
    updateMobileScale();
    requestAnimationFrame(function () { quizSheet.classList.add('is-visible'); });
    Quiz.start(TEXTS.quiz.questions, onQuizComplete, function (questionIndex) {
      setQuizPhoto(stage.photos[questionIndex]);
    });
  } else if (stage.type === 'puzzle') {
    document.getElementById('puzzle-continue-btn').hidden = true;
    showScreen('puzzle');
    Puzzle.start(ASSETS.images.puzzle, onPuzzleComplete);
  } else if (stage.type === 'cards') {
    showScreen('cards');
    openModal('modal-cards-notice');
  } else if (stage.type === 'message') {
    showScreen('message');
    Message.start(onMessageFinish);
  }
}

function onQuizComplete() {
  var quizSheet = document.getElementById('quiz-sheet');
  quizSheet.classList.remove('is-visible');
  setTimeout(function () {
    quizSheet.hidden = true;
    updateMobileScale();
    document.getElementById('quiz-continue-btn').hidden = false;
  }, 500);
}

function wireEnvelope() {
  var envelope = document.getElementById('envelope');
  envelope.onclick = function () {
    envelope.classList.add('is-open');
    envelope.onclick = null;
    setTimeout(openLetterModal, 700);
  };
}

function openLetterModal() {
  var body = document.getElementById('letter-paper-body');
  body.innerHTML = '';

  var open = document.createElement('p');
  var openStrong = document.createElement('strong');
  openStrong.textContent = TEXTS.letterStage1.opening;
  open.appendChild(openStrong);
  body.appendChild(open);

  TEXTS.letterStage1.body.forEach(function (para) {
    var p = document.createElement('p');
    p.textContent = para;
    body.appendChild(p);
  });

  var close = document.createElement('p');
  var closeStrong = document.createElement('strong');
  closeStrong.textContent = TEXTS.letterStage1.closing;
  close.appendChild(closeStrong);
  body.appendChild(close);

  openModal('modal-letter');
}

function onPuzzleComplete() {
  setTimeout(function () {
    document.getElementById('puzzle-continue-btn').hidden = false;
  }, 600);
}

var cardsIndex = 0;

function startCards() {
  cardsIndex = 0;
  renderCard();
}

function renderCard() {
  var total = TEXTS.stage2Cards.questions.length;
  document.getElementById('question-card-counter').textContent = 'Вопрос ' + (cardsIndex + 1) + ' из ' + total;
  document.getElementById('question-card-text').textContent = TEXTS.stage2Cards.questions[cardsIndex];
  document.getElementById('cards-next-btn').textContent = (cardsIndex === total - 1) ? TEXTS.buttons.toNextStage : TEXTS.stage2Cards.nextBtn;

  var card = document.getElementById('question-card');
  card.style.animation = 'none';
  void card.offsetWidth; // перезапуск анимации появления карточки
  card.style.animation = '';
}

function onCardsNext() {
  var total = TEXTS.stage2Cards.questions.length;
  if (cardsIndex < total - 1) {
    cardsIndex++;
    renderCard();
  } else {
    completeStage(3);
  }
}

function onMessageFinish() {
  completeStage(4);
}

function completeStage(n) {
  saveProgress(n);
  if (n < 4) {
    returnToWorld(n);
  } else {
    showAllKeysCollected();
  }
}

// Последний (4-й) ключ: лететь неоткуда (экран мира не открывается), поэтому
// момент "все ключи собраны" сам по себе служит наградой - модалка перед конвертом.
function showAllKeysCollected() {
  Keys.collect(4);
  showScreen('final');
  document.getElementById('final-content').hidden = true;
  document.getElementById('envelope-wrap').hidden = true;
  openModal('modal-keys-complete');
}

function revealEnvelope() {
  document.getElementById('final-content').hidden = true;
  var envelope = document.getElementById('envelope');
  envelope.classList.remove('is-open');
  document.getElementById('envelope-wrap').hidden = false;
  wireEnvelope();
}

function returnToWorld(completedStage) {
  currentStage = 0;
  showScreen('world');
  World.completeCurrent(completedStage);
  var anchorRect = World.getStageAnchorRect(completedStage);
  Keys.collectAndFly(completedStage, anchorRect);
}

var homeMeadowHandle = null;
function showHome() {
  showScreen('home');
  if (!homeMeadowHandle) {
    homeMeadowHandle = window.Meadow.mount(
      document.getElementById('home-meadow-back'),
      document.getElementById('home-meadow-front'),
      document.getElementById('home-bg-viewport')
    );
  }
  homeMeadowHandle.start();
}

var finalMeadowHandle = null;
function showFinal() {
  showScreen('final');
  if (!finalMeadowHandle) {
    finalMeadowHandle = window.Meadow.mount(
      document.getElementById('final-meadow-back'),
      document.getElementById('final-meadow-front'),
      document.getElementById('final-bg-viewport')
    );
  }
  finalMeadowHandle.start();
  Fireworks.launch('final');
}

function restartGame() {
  if (finalMeadowHandle) finalMeadowHandle.stop();
  clearProgress();
  Keys.reset();
  currentStage = 0;
  showHome();
}

/* ===================== Применение текстов к статической разметке ===================== */

function applyTexts() {
  document.getElementById('start-game-btn').textContent = TEXTS.startBtn;

  var rulesBox = document.querySelector('#modal-rules .modal-box');
  rulesBox.querySelector('h2').textContent = TEXTS.rules.title;
  var rulesPs = rulesBox.querySelectorAll('p');
  rulesPs[0].textContent = TEXTS.rules.body[0];
  rulesPs[1].textContent = TEXTS.rules.body[1];
  rulesPs[2].textContent = TEXTS.rules.body[2];
  document.getElementById('rules-start-btn').textContent = TEXTS.rules.startBtn;

  document.getElementById('quiz-feedback').textContent = TEXTS.quiz.feedback;
  document.querySelector('.envelope-hint').textContent = TEXTS.envelopeHint;
  document.getElementById('letter-continue-btn').textContent = TEXTS.buttons.letterFinish;

  document.getElementById('quiz-continue-btn').textContent = TEXTS.buttons.toNextStage;
  document.getElementById('puzzle-continue-btn').textContent = TEXTS.buttons.toNextStage;

  for (var s = 1; s <= STAGES.length; s++) {
    document.getElementById('world-task-btn-' + s).textContent = TEXTS.buttons.task + ' ' + s;
  }

  var msgTask = document.querySelector('.message-task');
  msgTask.querySelector('h2').textContent = TEXTS.stage3.title;
  var msgPs = msgTask.querySelectorAll('p');
  msgPs[0].textContent = TEXTS.stage3.body[0];
  msgPs[1].textContent = TEXTS.stage3.body[1];
  document.getElementById('future-letter-textarea').placeholder = TEXTS.stage3.placeholder;
  document.getElementById('save-pdf-btn').textContent = TEXTS.buttons.savePdf;
  document.getElementById('message-finish-btn').textContent = TEXTS.buttons.finish;

  document.getElementById('final-title').textContent = TEXTS.final.title;
  document.getElementById('download-again-btn').textContent = TEXTS.buttons.downloadAgain;
  document.getElementById('restart-btn').textContent = TEXTS.buttons.restart;

  var keysCompleteBox = document.querySelector('#modal-keys-complete .modal-box');
  keysCompleteBox.querySelector('h2').textContent = TEXTS.keysComplete.title;
  keysCompleteBox.querySelector('p').textContent = TEXTS.keysComplete.body;
  document.getElementById('keys-complete-btn').textContent = TEXTS.keysComplete.btn;
}

/* ===================== Инициализация ===================== */

function init() {
  applyTexts();

  buildHearts(document.getElementById('home-hearts'), 14);
  buildHearts(document.getElementById('final-hearts'), 14);
  buildHearts(document.getElementById('puzzle-hearts'), 12);
  buildHearts(document.getElementById('cards-hearts'), 12);
  buildHearts(document.getElementById('message-hearts'), 12);
  buildSnow(document.getElementById('photo-snow'), 150);

  AudioCtl.init(ASSETS.audio.main);
  updateMuteIcon();
  Keys.init();

  document.getElementById('mute-toggle').onclick = function () {
    AudioCtl.toggleMute();
    updateMuteIcon();
  };

  document.getElementById('start-game-btn').onclick = function () {
    requestFullscreen();
    AudioCtl.startMusic();
    openModal('modal-rules');
  };
  document.getElementById('rules-btn').onclick = function () {
    openModal('modal-rules');
  };
  document.getElementById('rules-start-btn').onclick = function () {
    requestFullscreen();
    AudioCtl.startMusic();
    closeModal('modal-rules');
    if (homeMeadowHandle) homeMeadowHandle.stop();
    Keys.reset();
    World.open(0);
  };

  document.getElementById('quiz-continue-btn').onclick = function () { completeStage(1); };
  document.getElementById('puzzle-continue-btn').onclick = function () { completeStage(2); };
  document.getElementById('cards-next-btn').onclick = function () { onCardsNext(); };
  document.getElementById('cards-notice-btn').onclick = function () {
    closeModal('modal-cards-notice');
    startCards();
  };
  document.getElementById('keys-complete-btn').onclick = function () {
    closeModal('modal-keys-complete');
    AudioCtl.startMusic();
    revealEnvelope();
  };
  document.getElementById('letter-continue-btn').onclick = function () {
    closeModal('modal-letter');
    document.getElementById('envelope-wrap').hidden = true;
    document.getElementById('final-content').hidden = false;
    clearProgress();
    showFinal();
  };

  document.getElementById('download-again-btn').onclick = function () { Message.exportPdf(); };
  document.getElementById('restart-btn').onclick = restartGame;

  var loadingScreen = document.getElementById('loading-screen');
  var loadingBarFill = document.getElementById('loading-bar-fill');
  var loadingPercent = document.getElementById('loading-percent');

  preloadAssets(function (loaded, total) {
    var pct = Math.round((loaded / total) * 100);
    loadingBarFill.style.width = pct + '%';
    loadingPercent.textContent = pct + '%';
  }, function () {
    loadingScreen.classList.add('is-hidden');

    showHome();

    var savedStage = Number((function () {
      try { return localStorage.getItem('game_progress_stage') || 0; } catch (e) { return 0; }
    })());

    if (savedStage === 4) {
      requestFullscreen();
      AudioCtl.startMusic();
      showAllKeysCollected();
    } else if (savedStage > 0 && savedStage < 4) {
      document.getElementById('resume-text').textContent = 'Продолжить с этапа ' + (savedStage + 1) + '?';
      openModal('modal-resume');
    }

    document.getElementById('resume-continue-btn').onclick = function () {
      closeModal('modal-resume');
      requestFullscreen();
      AudioCtl.startMusic();
      World.open(savedStage);
    };
    document.getElementById('resume-restart-btn').onclick = function () {
      closeModal('modal-resume');
      clearProgress();
      Keys.reset();
    };
  });
}

document.addEventListener('DOMContentLoaded', init);
