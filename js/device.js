// Phone and tablet support shared by every game.
const Device = (() => {
  const touchQuery = matchMedia('(hover: none) and (pointer: coarse)');
  let touch = touchQuery.matches;
  document.documentElement.classList.toggle('touch', touch);
  // e.g. a tablet gaining or losing a keyboard/trackpad
  touchQuery.addEventListener('change', e => {
    touch = e.matches;
    document.documentElement.classList.toggle('touch', touch);
  });

  // Ask the browser not to clear saved progress when storage is low
  // (Safari otherwise may clear site data after a period of disuse).
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // Offline support (only works over HTTPS or on localhost).
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Keep the screen on while a game is running.
  let lock = null, wantLock = false;
  async function requestLock() {
    try {
      if (wantLock && !lock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
      }
    } catch { /* not allowed (e.g. not HTTPS); the game still works */ }
  }

  // Game screens hide the top bar on small screens and stop page scrolling/bouncing.
  // Turning off is delayed slightly so back-to-back trials don't make the layout jump.
  let offTimer = null;
  function playing(on) {
    clearTimeout(offTimer);
    if (on) {
      document.body.classList.add('playing');
      wantLock = true;
      requestLock();
      return;
    }
    offTimer = setTimeout(() => {
      document.body.classList.remove('playing');
      wantLock = false;
      if (lock) { lock.release().catch(() => {}); lock = null; }
    }, 300);
  }

  // iPhone/iPad only allow speech after it has been started inside a tap.
  // Call this from a tap handler before the first letter is spoken.
  let speechUnlocked = false;
  function unlockSpeech() {
    if (speechUnlocked || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
    speechUnlocked = true;
  }

  // Answer as soon as a finger touches the button rather than on release (no tap delay).
  // Returns the element so it can be chained.
  function onPress(el, fn) {
    el.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      fn(e);
    });
    return el;
  }

  // Run a callback when the app goes to the background (switching apps, locking the phone).
  const hiddenHandlers = new Set();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenHandlers.forEach(fn => fn());
    else requestLock();
  });
  const onHidden = fn => { hiddenHandlers.add(fn); return () => hiddenHandlers.delete(fn); };

  return { get touch() { return touch; }, playing, unlockSpeech, onPress, onHidden };
})();
