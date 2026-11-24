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
  // In chamber mode a second tap within DOUBLE_TAP_MS of the last one is ignored,
  // so a bump or a shaky finger on a mounted tablet doesn't count twice.
  const DOUBLE_TAP_MS = 450;
  let lastPress = 0;
  function onPress(el, fn) {
    el.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      const now = performance.now();
      if (chamber() && now - lastPress < DOUBLE_TAP_MS) return;
      lastPress = now;
      fn(e);
    });
    return el;
  }

  // ---------- chamber mode ----------
  // For use in a hyperbaric chamber with a mounted tablet: no timed games, slower pace, bigger targets.
  const prefs = () => Store.game('app', { chamber: false });
  const chamber = () => !!prefs().chamber;
  function setChamber(on) {
    prefs().chamber = !!on;
    Store.save();
    document.documentElement.classList.toggle('chamber', !!on);
  }
  document.documentElement.classList.toggle('chamber', chamber());

  // Run a callback when the app goes to the background (switching apps, locking the phone).
  const hiddenHandlers = new Set();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenHandlers.forEach(fn => fn());
    else requestLock();
  });
  const onHidden = fn => { hiddenHandlers.add(fn); return () => hiddenHandlers.delete(fn); };

  // ---------- which way to hold the device ----------
  // tip = { tablet: 'portrait'|'landscape', phone?: 'portrait'|'landscape', why: { portrait?, landscape? } }
  // Shown on touch devices only. Updates itself when the device is turned.
  const portraitQuery = matchMedia('(orientation: portrait)');
  const isTablet = () => Math.min(screen.width, screen.height) >= 600;
  function orientHtml(tip) {
    const best = isTablet() ? tip.tablet : (tip.phone || 'portrait');
    const now = portraitQuery.matches ? 'portrait' : 'landscape';
    const why = (tip.why && tip.why[best]) || '';
    const device = isTablet() ? 'tablet' : 'phone';
    return now === best
      ? `<span class="orient-icon">✓</span><span><b>${best[0].toUpperCase() + best.slice(1)}</b> is the best way to hold your ${device} for this game. ${why}</span>`
      : `<span class="orient-icon">↻</span><span>Turn your ${device} to <b>${best}</b> for this game. ${why}</span>`;
  }
  const tips = new Map();
  const wrongWay = tip => (portraitQuery.matches ? 'portrait' : 'landscape') !== (isTablet() ? tip.tablet : (tip.phone || 'portrait'));
  function orientTip(tip) {
    if (!touch || !tip) return '';
    const id = 'o' + Math.random().toString(36).slice(2, 8);
    tips.set(id, tip);
    return `<p class="orient-tip ${wrongWay(tip) ? 'turn' : ''}" data-tip="${id}">${orientHtml(tip)}</p>`;
  }
  // when the device is turned, update any tip on screen
  // (window resize also fires on rotation, and works on older iPads)
  let lastPortrait = portraitQuery.matches;
  function refreshTips() {
    if (portraitQuery.matches === lastPortrait) return;
    lastPortrait = portraitQuery.matches;
    document.querySelectorAll('.orient-tip').forEach(el => {
      const tip = tips.get(el.dataset.tip);
      if (!tip) return;
      el.innerHTML = orientHtml(tip);
      el.classList.toggle('turn', wrongWay(tip));
    });
  }
  window.addEventListener('resize', refreshTips);
  window.addEventListener('orientationchange', () => setTimeout(refreshTips, 200));

  return { get touch() { return touch; }, get chamber() { return chamber(); }, setChamber, playing, unlockSpeech, onPress, onHidden, orientTip };
})();
