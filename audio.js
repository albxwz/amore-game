// Управление фоновой музыкой: играет непрерывно от начала до конца игры,
// не прерываясь на видео (видео показывается без собственного звука).
window.AudioCtl = (function () {
  var MUSIC_VOLUME = 0.6;

  var bgMusic = null;
  var muted = false;
  var wasMusicPlaying = false;

  function init(src) {
    bgMusic = new Audio(src);
    bgMusic.loop = true;
    bgMusic.volume = MUSIC_VOLUME;
    bgMusic.muted = readMuted();
    muted = bgMusic.muted;

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        wasMusicPlaying = !bgMusic.paused;
        if (wasMusicPlaying) bgMusic.pause();
      } else {
        if (wasMusicPlaying && !muted) bgMusic.play().catch(function () {});
      }
    });
  }

  function readMuted() {
    try { return localStorage.getItem('game_muted') === '1'; } catch (e) { return false; }
  }
  function writeMuted(v) {
    try { localStorage.setItem('game_muted', v ? '1' : '0'); } catch (e) {}
  }

  function startMusic() {
    if (!bgMusic) return;
    bgMusic.volume = MUSIC_VOLUME;
    bgMusic.play().catch(function () {});
  }

  function toggleMute() {
    muted = !muted;
    if (bgMusic) bgMusic.muted = muted;
    writeMuted(muted);
    return muted;
  }

  function isMuted() { return muted; }

  return {
    init: init,
    startMusic: startMusic,
    toggleMute: toggleMute,
    isMuted: isMuted
  };
})();
