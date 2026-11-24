// Dual N-Back, following the Jaeggi et al. (2008, PNAS) training protocol:
//  - each block has 20 + n trials, one every 3 s, stimulus shown for 0.5 s
//  - per block: 6 position targets and 6 sound targets (4 position-only, 4 sound-only, 2 both)
//  - after each block: fewer than 3 errors in BOTH modalities -> n + 1,
//    more than 5 errors in EITHER modality -> n - 1, otherwise stay
//  - a session is 20 blocks (about 25 minutes)
// An error is a missed target or a false alarm.
const DualNBack = (() => {
  const ID = 'dualnback';
  const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T']; // consonants used by Jaeggi et al.
  // Spoken as the letter's name: a bare capital letter makes many voices say "capital C".
  const SPOKEN = { C: 'see', H: 'aitch', K: 'kay', L: 'ell', Q: 'cue', R: 'are', S: 'ess', T: 'tee' };
  const CELLS = [0, 1, 2, 3, 5, 6, 7, 8]; // 3x3 grid without the centre
  const RESUME_WINDOW_MS = 12 * 3600 * 1000; // an unfinished session can be continued for 12 h

  const DEFAULTS = {
    level: 2,          // n to play next
    highest: 2,        // highest n ever played
    settings: {
      blocksPerSession: 20,
      warmup: 1,       // start each new session this many levels below where you left off
      trialMs: 3000,
      stimulusMs: 500,
      feedback: true,
      sound: true,
    },
    sessions: [],      // finished sessions
    active: null,      // session in progress
  };

  let g = null;        // saved state (live object from Store)
  let root = null;
  let run = null;      // the block currently being played
  let offHidden = null;

  // ---------- helpers ----------
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const pickOther = (a, not) => { let v; do v = pick(a); while (v === not); return v; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const errors = m => m.miss + m.fa;
  const fmtDate = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;

  function state() { return (g = Store.game(ID, DEFAULTS)); }

  function activeSession() {
    const a = g.active;
    if (a && Date.now() - a.lastAt < RESUME_WINDOW_MS && a.blocks.length < g.settings.blocksPerSession) return a;
    if (a) finishSession(); // stale or complete: file it away
    return null;
  }

  function newSessionLevel() {
    if (!g.sessions.length) return g.level; // no warm-up before your very first session
    return Math.max(1, g.level - g.settings.warmup);
  }

  // ---------- block generation & scoring ----------
  function makeBlock(n) {
    const len = 20 + n;
    const slots = shuffle([...Array(len - n).keys()].map(i => i + n));
    const both = slots.slice(0, 2);
    const posT = new Set([...both, ...slots.slice(2, 6)]);
    const audT = new Set([...both, ...slots.slice(6, 10)]);
    const pos = [], aud = [];
    for (let i = 0; i < len; i++) {
      if (i < n) { pos.push(pick(CELLS)); aud.push(pick(LETTERS)); continue; }
      pos.push(posT.has(i) ? pos[i - n] : pickOther(CELLS, pos[i - n]));
      aud.push(audT.has(i) ? aud[i - n] : pickOther(LETTERS, aud[i - n]));
    }
    return { n, len, pos, aud, posT, audT };
  }

  function nextLevel(n, res) {
    const pe = errors(res.pos), ae = errors(res.aud);
    if (pe < 3 && ae < 3) return n + 1;
    if (pe > 5 || ae > 5) return Math.max(1, n - 1);
    return n;
  }

  // ---------- audio ----------
  function speak(letter) {
    if (!g.settings.sound || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(SPOKEN[letter] || letter.toLowerCase());
    u.rate = 1.1;
    speechSynthesis.speak(u);
  }

  // ---------- session flow ----------
  function startSession() {
    if (!activeSession()) {
      const n = newSessionLevel();
      g.active = { startedAt: Date.now(), lastAt: Date.now(), startLevel: n, currentN: n, blocks: [] };
      Store.save();
    }
    startBlock();
  }

  function finishSession() {
    const a = g.active;
    g.active = null;
    if (a && a.blocks.length) {
      const ns = a.blocks.map(b => b.n);
      g.sessions.push({
        startedAt: a.startedAt,
        endedAt: a.lastAt,
        startLevel: a.startLevel,
        endLevel: a.currentN,
        maxN: Math.max(...ns),
        meanN: +mean(ns).toFixed(2),
        blocks: a.blocks,
      });
    }
    Store.save();
    return a;
  }

  function startBlock() {
    Device.unlockSpeech(); // must run inside the tap on iPhone/iPad
    const n = g.active.currentN;
    run = {
      b: makeBlock(n), i: -1, timers: [],
      pressed: { pos: false, aud: false },
      res: { pos: { hit: 0, miss: 0, fa: 0, cr: 0 }, aud: { hit: 0, miss: 0, fa: 0, cr: 0 } },
    };
    renderPlay();
    let count = 3;
    const tick = () => {
      if (!run) return;
      const el = root.querySelector('#status');
      if (count > 0) { el.textContent = `${n}-back · starting in ${count}`; count--; run.timers.push(setTimeout(tick, 700)); }
      else nextTrial();
    };
    tick();
  }

  function nextTrial() {
    if (!run) return;
    if (run.i >= 0) scoreTrial();
    run.i++;
    const b = run.b;
    if (run.i >= b.len) return finishBlock();
    run.pressed = { pos: false, aud: false };
    root.querySelectorAll('.cell').forEach((c, k) => c.classList.toggle('on', k === b.pos[run.i]));
    speak(b.aud[run.i]);
    root.querySelector('#status').textContent =
      `${b.n}-back · trial ${run.i + 1} of ${b.len} · block ${g.active.blocks.length + 1} of ${g.settings.blocksPerSession}`;
    run.timers.push(setTimeout(() => root.querySelectorAll('.cell').forEach(c => c.classList.remove('on')), g.settings.stimulusMs));
    run.timers.push(setTimeout(nextTrial, g.settings.trialMs));
  }

  function scoreTrial() {
    const { b, i } = run;
    if (i < b.n) return;
    for (const [k, targets] of [['pos', b.posT], ['aud', b.audT]]) {
      const t = targets.has(i), p = run.pressed[k], r = run.res[k];
      if (t && p) r.hit++;
      else if (t) { r.miss++; flash(k, 'miss'); }
      else if (p) r.fa++;
      else r.cr++;
    }
  }

  function respond(k) {
    if (!run || run.i < 0 || run.pressed[k]) return;
    run.pressed[k] = true;
    const { b, i } = run;
    if (i < b.n) return flash(k, 'neutral');
    flash(k, (k === 'pos' ? b.posT : b.audT).has(i) ? 'good' : 'bad');
  }

  function flash(k, kind) {
    if (!g.settings.feedback && kind !== 'neutral') kind = 'neutral';
    const btn = root.querySelector(`#btn-${k}`);
    if (!btn) return;
    btn.classList.remove('good', 'bad', 'miss', 'neutral');
    void btn.offsetWidth; // restart animation
    btn.classList.add(kind);
  }

  function finishBlock() {
    const { b, res } = run;
    stopRun();
    const next = nextLevel(b.n, res);
    const a = g.active;
    a.blocks.push({ n: b.n, at: Date.now(), pos: res.pos, aud: res.aud, next });
    a.currentN = next;
    a.lastAt = Date.now();
    g.level = next;
    g.highest = Math.max(g.highest, b.n);
    Store.save();
    if (a.blocks.length >= g.settings.blocksPerSession) renderSummary(finishSession());
    else renderBlockResult(b.n, res, next);
  }

  function stopRun() {
    if (!run) return;
    run.timers.forEach(clearTimeout);
    run = null;
    Device.playing(false);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function onKey(e) {
    if (!run) return;
    if (e.key === 'a' || e.key === 'A') respond('pos');
    else if (e.key === 'l' || e.key === 'L') respond('aud');
    else if (e.key === 'Escape') quitBlock();
    else return;
    e.preventDefault();
  }

  function quitBlock() {
    stopRun();
    renderLobby('Block stopped. It wasn’t counted; your level is unchanged.');
  }

  // ---------- views ----------
  function renderLobby(note = '') {
    const a = activeSession();
    const last = g.sessions[g.sessions.length - 1];
    const s = g.settings;
    root.innerHTML = `
      <h1>Dual N-Back</h1>
      ${note ? `<p class="note">${note}</p>` : ''}
      <section class="panel hero">
        ${a ? `
          <p class="big">Session in progress: block ${a.blocks.length + 1} of ${s.blocksPerSession} at <b>${a.currentN}-back</b></p>
          <div class="row"><button class="btn" id="go">Continue session</button><button class="btn ghost" id="end">End session now</button></div>`
        : `
          <p class="big">Next session starts at <b>${newSessionLevel()}-back</b></p>
          <p class="muted">${g.sessions.length
            ? `You finished last time at ${g.level}-back${s.warmup ? `; the first block is a ${s.warmup}-level warm-up and the level adapts from there` : ''}.`
            : 'First session. The level adjusts after every block, so it will quickly find your edge.'}
            Highest level reached: ${g.highest}-back.</p>
          <div class="row"><button class="btn" id="go">Start session</button></div>`}
      </section>

      <section class="panel">
        <h2>How to play</h2>
        <p>Every 3 seconds a square lights up and a letter is spoken. Press when the current one matches the one from <b>n</b> steps back.</p>
        <ul>
          <li><kbd>A</kbd> or the left button: <b>position</b> matches</li>
          <li><kbd>L</kbd> or the right button: <b>sound</b> matches</li>
          <li>Both can match at once. <kbd>Esc</kbd> stops the block.</li>
        </ul>
        <p class="muted">After each block: fewer than 3 mistakes in both position and sound moves you up a level; more than 5 in either moves you down; otherwise you stay. Missing a match and pressing when there wasn't one both count as mistakes.</p>
      </section>

      <details class="panel">
        <summary>Settings</summary>
        <form id="settings" class="settings">
          <label>Blocks per session <input type="number" name="blocksPerSession" min="1" max="40" value="${s.blocksPerSession}"><small>Research protocol: 20 (about 25 min)</small></label>
          <label>Warm-up levels <input type="number" name="warmup" min="0" max="3" value="${s.warmup}"><small>How far below last session's level to start</small></label>
          <label>Seconds per trial
            <select name="trialMs">${[3000, 2500, 2000].map(v => `<option value="${v}" ${v === s.trialMs ? 'selected' : ''}>${v / 1000}${v === 3000 ? ' (research protocol)' : ''}</option>`).join('')}</select></label>
          <label class="check"><input type="checkbox" name="feedback" ${s.feedback ? 'checked' : ''}> Show right/wrong feedback</label>
          <label class="check"><input type="checkbox" name="sound" ${s.sound ? 'checked' : ''}> Speak letters</label>
          <label>Current level <input type="number" name="level" min="1" max="20" value="${g.level}"><small>Override if you want to set it by hand</small></label>
        </form>
        <button class="btn ghost danger" id="reset">Reset all Dual N-Back progress</button>
      </details>`;

    root.querySelector('#go').onclick = startSession;
    const end = root.querySelector('#end');
    if (end) end.onclick = () => { const done = finishSession(); done && done.blocks.length ? renderSummary(done) : renderLobby(); };
    root.querySelector('#settings').onchange = e => {
      const f = e.currentTarget.elements;
      s.blocksPerSession = Math.min(40, Math.max(1, +f.blocksPerSession.value || 20));
      s.warmup = Math.min(3, Math.max(0, +f.warmup.value || 0));
      s.trialMs = +f.trialMs.value;
      s.feedback = f.feedback.checked;
      s.sound = f.sound.checked;
      g.level = Math.min(20, Math.max(1, +f.level.value || 1));
      if (g.active) g.active.currentN = g.level;
      Store.save();
      renderLobby('Settings saved.');
      root.querySelector('details').open = true;
    };
    root.querySelector('#reset').onclick = () => {
      if (!confirm('Delete all Dual N-Back history and start again at 2-back?')) return;
      Store.resetGame(ID);
      state();
      renderLobby('Progress reset.');
    };
  }

  function renderPlay() {
    root.innerHTML = `
      <div class="play">
        <p id="status" class="status"></p>
        <div class="grid">${Array.from({ length: 9 }, (_, k) => `<div class="cell ${k === 4 ? 'centre' : ''}"></div>`).join('')}</div>
        <div class="answer-row">
          <button class="answer" id="btn-pos"><kbd>A</kbd> Position</button>
          <button class="answer" id="btn-aud"><kbd>L</kbd> Sound</button>
        </div>
        <button class="btn ghost small" id="quit">Stop block<span class="kh"> (Esc)</span></button>
      </div>`;
    Device.playing(true);
    Device.onPress(root.querySelector('#btn-pos'), () => respond('pos'));
    Device.onPress(root.querySelector('#btn-aud'), () => respond('aud'));
    root.querySelector('#quit').onclick = quitBlock;
  }

  function modalityLine(label, m) {
    return `<tr><td>${label}</td><td>${m.hit}/${m.hit + m.miss}</td><td>${m.miss}</td><td>${m.fa}</td><td><b>${errors(m)}</b></td></tr>`;
  }

  function renderBlockResult(n, res, next) {
    const a = g.active;
    const verdict = next > n ? `Level up! Next block: <b>${next}-back</b>`
      : next < n ? `Dropping to <b>${next}-back</b> for the next block`
      : `Staying at <b>${n}-back</b>`;
    root.innerHTML = `
      <h1>Block ${a.blocks.length} of ${g.settings.blocksPerSession} done</h1>
      <section class="panel hero">
        <p class="big">${verdict}</p>
        <table class="score">
          <tr><th></th><th>Matches caught</th><th>Missed</th><th>False alarms</th><th>Mistakes</th></tr>
          ${modalityLine('Position', res.pos)}${modalityLine('Sound', res.aud)}
        </table>
        <p class="muted">Up: under 3 mistakes in each. Down: over 5 in either.</p>
        <div class="row"><button class="btn" id="go">Next block</button><button class="btn ghost" id="end">End session</button></div>
        <p class="muted">Progress saved. You can close the app and continue this session later.</p>
      </section>`;
    root.querySelector('#go').onclick = startBlock;
    root.querySelector('#end').onclick = () => renderSummary(finishSession());
  }

  function renderSummary(sess) {
    const ns = sess.blocks.map(b => b.n);
    root.innerHTML = `
      <h1>Session complete</h1>
      <section class="panel hero">
        <p class="big">Average level <b>${mean(ns).toFixed(2)}</b> · highest <b>${Math.max(...ns)}-back</b> · ${ns.length} blocks</p>
        <p>Blocks: ${ns.map(n => `<span class="pill">${n}</span>`).join(' ')}</p>
        <p class="muted">Next session starts at ${newSessionLevel()}-back${g.settings.warmup ? ' (warm-up)' : ''} and adapts from there.</p>
        <div class="row"><a class="btn" href="#/progress">See progress</a><a class="btn ghost" href="#/">Back to games</a></div>
      </section>`;
  }

  // ---------- progress page ----------
  function renderProgress(el) {
    state();
    const ss = g.sessions;
    if (!ss.length) {
      el.innerHTML = `<h2>Dual N-Back</h2><p class="muted">No finished sessions yet.</p>`;
      return;
    }
    const W = 640, H = 220, P = 32;
    const maxY = Math.max(...ss.map(s => s.maxN)) + 1;
    const x = i => P + (ss.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (ss.length - 1));
    const y = v => H - P - (v / maxY) * (H - 2 * P);
    const line = key => ss.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[key]).toFixed(1)}`).join(' ');
    const grid = Array.from({ length: maxY + 1 }, (_, v) =>
      `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" class="gridline"/><text x="${P - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`).join('');
    const dots = key => ss.map((s, i) => `<circle cx="${x(i)}" cy="${y(s[key])}" r="3.5" class="dot-${key}"><title>${fmtDate(s.startedAt)}: ${key === 'meanN' ? 'average' : 'highest'} ${s[key]}</title></circle>`).join('');
    el.innerHTML = `
      <h2>Dual N-Back</h2>
      <p class="muted">Highest level reached: ${g.highest}-back · ${ss.length} session${ss.length > 1 ? 's' : ''}</p>
      <div class="legend"><span class="key mean"></span>Average n per session <span class="key max"></span>Highest n</div>
      <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Dual N-Back level per session">
        ${grid}
        <path d="${line('maxN')}" class="line-max"/>${dots('maxN')}
        <path d="${line('meanN')}" class="line-mean"/>${dots('meanN')}
      </svg>
      <table class="score">
        <tr><th>Date</th><th>Blocks</th><th>Started</th><th>Average</th><th>Highest</th><th>Ended</th></tr>
        ${ss.slice(-10).reverse().map(s => `<tr><td>${fmtDate(s.startedAt)}</td><td>${s.blocks.length}</td><td>${s.startLevel}</td><td>${s.meanN}</td><td>${s.maxN}</td><td>${s.endLevel}</td></tr>`).join('')}
      </table>`;
  }

  function cardStatus() {
    state();
    const a = activeSession();
    return a
      ? `<span class="tag live">Session in progress · ${a.currentN}-back</span>`
      : `<span class="tag">Level ${g.level} · best ${g.highest}</span>`;
  }

  return {
    mount(el) {
      root = el;
      state();
      document.addEventListener('keydown', onKey);
      offHidden = Device.onHidden(() => {
        if (!run) return;
        stopRun();
        renderLobby('Paused because the app went to the background. That block wasn’t counted; your level is unchanged.');
      });
      renderLobby();
    },
    unmount() {
      stopRun();
      if (offHidden) offHidden();
      document.removeEventListener('keydown', onKey);
      root = null;
    },
    renderProgress,
    cardStatus,
    _test: { makeBlock, nextLevel },
  };
})();
