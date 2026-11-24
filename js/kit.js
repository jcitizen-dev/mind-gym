// GameKit: the parts every mini game shares.
//  - saved level, sessions, and an in-progress session that can be resumed for 12 hours
//  - warm-up: each new session starts a little below where you left off
//  - lobby, settings, between-block results, session summary, progress chart
// A game supplies how one "unit" (a trial or a block) is played and how the level adapts.
const GameKit = (() => {
  const RESUME_MS = 12 * 3600 * 1000;

  const U = {
    pick: a => a[Math.floor(Math.random() * a.length)],
    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    mean: xs => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0),
    fmtDate: t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    pct: x => `${Math.round(x * 100)}%`,
  };

  // True when the previous unit was at the same level, had the same outcome, and did not change level.
  // Used for "two in a row" staircases.
  function sameAsPrevious(active, level, ok) {
    const p = active.units[active.units.length - 1];
    return !!p && p.lv === level && p.next === level && (p.acc === 1) === ok;
  }

  // Line chart of one or two series over sessions. series: [{label, cls, values:[number]}]
  function chart(series, dates, { invert = false } = {}) {
    const W = 640, H = 220, P = 36;
    const all = series.flatMap(s => s.values);
    const lo = Math.min(0, ...all), hi = Math.max(...all) * 1.1 || 1;
    const n = dates.length;
    const x = i => P + (n === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (n - 1));
    const y = v => {
      const t = (v - lo) / (hi - lo);
      return invert ? P + t * (H - 2 * P) : H - P - t * (H - 2 * P);
    };
    const ticks = Array.from({ length: 5 }, (_, k) => lo + (hi - lo) * k / 4);
    const fmt = v => (Math.abs(v) >= 10 ? Math.round(v) : +v.toFixed(1));
    return `
      <div class="legend">${series.map(s => `<span class="key ${s.cls}"></span>${s.label}`).join(' ')}</div>
      <svg viewBox="0 0 ${W} ${H}" class="chart" role="img">
        ${ticks.map(v => `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" class="gridline"/><text x="${P - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${fmt(v)}</text>`).join('')}
        ${series.map(s => `
          <path class="line-${s.cls}" d="${s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>
          ${s.values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" class="dot-${s.cls}"><title>${U.fmtDate(dates[i])}: ${s.label.toLowerCase()} ${fmt(v)}</title></circle>`).join('')}`).join('')}
      </svg>`;
  }

  // Runs a block of timed key-press trials (used by Task Switch and Color Clash).
  // opts: trials[], deadline ms, keys {key: response}, buttonsHtml (buttons carry data-resp),
  //       show(trial, el), correct(trial) -> response, done(records)
  function speededBlock(ctx, opts) {
    ctx.stage.innerHTML = `
      <div class="speeded">
        <div class="stim" id="stim"></div>
        <div class="answer-row wide">${opts.buttonsHtml}</div>
      </div>`;
    const stim = ctx.stage.querySelector('#stim');
    const records = [];
    let i = -1, t0 = 0, open = false;

    const answer = resp => {
      if (!open) return;
      open = false;
      const t = opts.trials[i];
      const ok = resp === opts.correct(t);
      records.push({ kind: t.kind, ok, rt: resp == null ? null : Math.round(performance.now() - t0) });
      stim.className = `stim ${ok ? 'good' : 'bad'}`;
      if (resp == null) stim.innerHTML = '<span class="too-slow">Too slow</span>';
      ctx.later(next, resp == null ? 700 : 350);
    };

    const next = () => {
      i++;
      if (i >= opts.trials.length) return opts.done(records);
      ctx.status(`trial ${i + 1} of ${opts.trials.length}`);
      stim.className = 'stim';
      opts.show(opts.trials[i], stim);
      t0 = performance.now();
      open = true;
      const mine = i;
      ctx.later(() => { if (open && i === mine) answer(null); }, opts.deadline);
    };

    ctx.onKey(e => {
      const r = opts.keys[e.key.toLowerCase()];
      if (r === undefined) return false;
      answer(r);
      return true;
    });
    ctx.stage.querySelectorAll('[data-resp]').forEach(b => Device.onPress(b, () => answer(b.dataset.resp)));
    stim.innerHTML = '<span class="ready">Get ready…</span>';
    ctx.later(next, 1200);
  }

  function create(spec) {
    const DEFAULTS = {
      level: spec.startLevel || 1,
      best: spec.startLevel || 1,
      settings: { unitsPerSession: spec.unitsPerSession, warmup: spec.warmup ?? 1, ...(spec.settings || {}) },
      sessions: [],
      active: null,
    };
    const unit = spec.unitName || 'block';
    const maxLevel = spec.maxLevel || 99;
    const clamp = l => Math.max(1, Math.min(maxLevel, l));
    let g = null, root = null, stopUnit = null, keyHandler = null;

    const state = () => (g = Store.game(spec.id, DEFAULTS));
    const newSessionLevel = () => (g.sessions.length ? clamp(g.level - g.settings.warmup) : g.level);

    function activeSession() {
      const a = g.active;
      if (a && Date.now() - a.lastAt < RESUME_MS && a.units.length < g.settings.unitsPerSession) return a;
      if (a) finishSession();
      return null;
    }

    function finishSession() {
      const a = g.active;
      g.active = null;
      let sess = null;
      if (a && a.units.length) {
        const lvs = a.units.map(u => u.lv);
        sess = {
          startedAt: a.startedAt,
          endedAt: a.lastAt,
          startLevel: a.startLevel,
          endLevel: a.level,
          maxLevel: Math.max(...lvs),
          meanLevel: +U.mean(lvs).toFixed(2),
          accuracy: +U.mean(a.units.map(u => u.acc)).toFixed(3),
          ms: a.units.reduce((s, u) => s + (u.ms || 0), 0),
          units: a.units,
        };
        if (spec.summarize) sess.extra = spec.summarize(a.units);
        g.sessions.push(sess);
      }
      Store.save();
      return sess;
    }

    function startSession() {
      if (!activeSession()) {
        const lv = newSessionLevel();
        g.active = { startedAt: Date.now(), lastAt: Date.now(), startLevel: lv, level: lv, units: [] };
        Store.save();
      }
      runUnit();
    }

    function runUnit() {
      const a = g.active;
      const cleanups = [];
      let done = false;
      const cleanup = () => { cleanups.forEach(f => f()); cleanups.length = 0; keyHandler = null; stopUnit = null; Device.playing(false); };
      root.innerHTML = `
        <div class="play">
          <p class="status" id="kit-status"></p>
          <div id="kit-stage" class="kit-stage"></div>
          <button class="btn ghost small" id="kit-stop">Stop<span class="kh"> (Esc)</span></button>
        </div>`;
      Device.playing(true);
      const statusEl = root.querySelector('#kit-status');
      const head = `${spec.levelName(a.level)} · ${unit} ${a.units.length + 1} of ${g.settings.unitsPerSession}`;
      const started = performance.now();
      const ctx = {
        stage: root.querySelector('#kit-stage'),
        level: a.level,
        settings: g.settings,
        active: a,
        status: extra => { statusEl.textContent = extra ? `${head} · ${extra}` : head; },
        onKey: fn => { keyHandler = fn; },
        later: (fn, ms) => { const t = setTimeout(() => { if (!done) fn(); }, ms); cleanups.push(() => clearTimeout(t)); },
        frame: fn => {
          let id = requestAnimationFrame(function loop(ts) { if (done) return; if (fn(ts) !== false) id = requestAnimationFrame(loop); });
          cleanups.push(() => cancelAnimationFrame(id));
        },
        cleanup: fn => cleanups.push(fn),
        finish: result => {
          if (done) return;
          done = true;
          cleanup();
          unitDone({ ms: Math.round(performance.now() - started), ...result });
        },
      };
      stopUnit = () => { if (!done) { done = true; cleanup(); } };
      root.querySelector('#kit-stop').onclick = () => quit();
      ctx.status();
      spec.playUnit(ctx);
    }

    function unitDone(r) {
      const a = g.active;
      const lv = a.level;
      const next = clamp(spec.nextLevel(lv, r, a));
      a.units.push({ lv, next, acc: r.acc, ms: r.ms, ...(r.data || {}) });
      a.level = next;
      a.lastAt = Date.now();
      g.level = next;
      g.best = Math.max(g.best, spec.bestFrom ? spec.bestFrom(lv, r) : lv);
      Store.save();
      if (a.units.length >= g.settings.unitsPerSession) return renderSummary(finishSession());
      if (spec.autoContinue) return runUnit();
      renderUnitResult(lv, next, r);
    }

    function quit(why = 'Stopped.') {
      if (stopUnit) stopUnit();
      renderLobby(`${why} The unfinished ${unit} wasn’t counted; everything before it is saved.`);
    }
    let offHidden = null;

    function onKey(e) {
      if (!stopUnit) return;
      if (e.key === 'Escape') { quit(); e.preventDefault(); return; }
      if (keyHandler && keyHandler(e)) e.preventDefault();
    }

    function verdict(lv, next) {
      return next > lv ? `Level up! Next: <b>${spec.levelName(next)}</b>`
        : next < lv ? `Easing off to <b>${spec.levelName(next)}</b>`
        : `Staying at <b>${spec.levelName(lv)}</b>`;
    }

    function renderUnitResult(lv, next, r) {
      const a = g.active;
      root.innerHTML = `
        <h1>${spec.title}: ${unit} ${a.units.length} of ${g.settings.unitsPerSession} done</h1>
        <section class="panel hero">
          <p class="big">${verdict(lv, next)}</p>
          ${r.html || ''}
          <p class="muted">${spec.ruleText}</p>
          <div class="row"><button class="btn" id="go">Next ${unit}</button><button class="btn ghost" id="end">End session</button></div>
          <p class="muted">Progress saved. You can close the app and continue this session later.</p>
        </section>`;
      root.querySelector('#go').onclick = runUnit;
      root.querySelector('#end').onclick = () => renderSummary(finishSession());
    }

    function renderSummary(sess) {
      if (!sess) return renderLobby();
      root.innerHTML = `
        <h1>Session complete</h1>
        <section class="panel hero">
          <p class="big">Highest: <b>${spec.levelName(sess.maxLevel)}</b> · accuracy ${U.pct(sess.accuracy)} · ${sess.units.length} ${unit}${sess.units.length === 1 ? '' : 's'}</p>
          ${spec.summaryHtml ? spec.summaryHtml(sess) : ''}
          <p class="muted">Next session starts at ${spec.levelName(newSessionLevel())}${g.settings.warmup ? ' (warm-up)' : ''} and adapts from there.</p>
          ${spec.lobbyExtra ? spec.lobbyExtra(g) : ''}
          <div class="row"><a class="btn" href="#/progress">See progress</a><a class="btn ghost" href="#/">Back to games</a></div>
        </section>`;
    }

    function renderLobby(note = '') {
      const a = activeSession();
      const s = g.settings;
      root.innerHTML = `
        <h1>${spec.title}</h1>
        ${note ? `<p class="note">${note}</p>` : ''}
        <section class="panel hero">
          ${a ? `
            <p class="big">Session in progress: ${unit} ${a.units.length + 1} of ${s.unitsPerSession} at <b>${spec.levelName(a.level)}</b></p>
            <div class="row"><button class="btn" id="go">Continue session</button><button class="btn ghost" id="end">End session now</button></div>`
          : `
            <p class="big">Next session starts at <b>${spec.levelName(newSessionLevel())}</b></p>
            <p class="muted">${g.sessions.length
              ? `You finished last time at ${spec.levelName(g.level)}${s.warmup ? '; the session opens with a short warm-up below that and adapts from there' : ''}.`
              : 'First session. The difficulty adjusts as you go, so it will quickly find your edge.'}
              Best so far: ${spec.levelName(g.best)}.</p>
            <div class="row"><button class="btn" id="go">Start session</button></div>`}
          ${Device.orientTip(spec.orientation)}
        </section>
        ${spec.lobbyExtra ? `<section class="panel">${spec.lobbyExtra(g)}</section>` : ''}
        <section class="panel"><h2>How to play</h2>${spec.howTo}<p class="muted">${spec.ruleText}</p></section>
        <section class="panel"><h2>The evidence</h2>${spec.evidence}</section>
        <details class="panel">
          <summary>Settings</summary>
          <form id="settings" class="settings">
            <label>${unit[0].toUpperCase() + unit.slice(1)}s per session <input type="number" name="unitsPerSession" min="1" max="200" value="${s.unitsPerSession}"><small>${spec.sessionHelp || ''}</small></label>
            <label>Warm-up steps <input type="number" name="warmup" min="0" max="5" value="${s.warmup}"><small>How many levels below last session's finish to start</small></label>
            <label>Current level <input type="number" name="level" min="1" max="${maxLevel}" value="${g.level}"><small>${spec.levelName(g.level)} (override by hand if you like)</small></label>
          </form>
          <button class="btn ghost danger" id="reset">Reset all ${spec.title} progress</button>
        </details>`;

      root.querySelector('#go').onclick = startSession;
      const end = root.querySelector('#end');
      if (end) end.onclick = () => renderSummary(finishSession());
      root.querySelector('#settings').onchange = e => {
        const f = e.currentTarget.elements;
        s.unitsPerSession = Math.min(200, Math.max(1, +f.unitsPerSession.value || spec.unitsPerSession));
        s.warmup = Math.min(5, Math.max(0, +f.warmup.value || 0));
        g.level = clamp(+f.level.value || 1);
        if (g.active) g.active.level = g.level;
        Store.save();
        renderLobby('Settings saved.');
        root.querySelector('details').open = true;
      };
      root.querySelector('#reset').onclick = () => {
        if (!confirm(`Delete all ${spec.title} history and start from the beginning?`)) return;
        Store.resetGame(spec.id);
        state();
        renderLobby('Progress reset.');
      };
    }

    function renderProgress(el) {
      state();
      const ss = g.sessions;
      if (!ss.length) { el.innerHTML = `<h2>${spec.title}</h2><p class="muted">No finished sessions yet.</p>`; return; }
      el.innerHTML = `
        <h2>${spec.title}</h2>
        <p class="muted">Best: ${spec.levelName(g.best)} · ${ss.length} session${ss.length > 1 ? 's' : ''}</p>
        ${spec.progressChart ? spec.progressChart(ss) : chart([
          { label: 'Average level', cls: 'mean', values: ss.map(s => s.meanLevel) },
          { label: 'Highest level', cls: 'max', values: ss.map(s => s.maxLevel) },
        ], ss.map(s => s.startedAt))}
        <table class="score">
          <tr><th>Date</th><th>${unit[0].toUpperCase() + unit.slice(1)}s</th><th>Highest</th><th>Accuracy</th><th>Ended at</th></tr>
          ${ss.slice(-10).reverse().map(s => `<tr><td>${U.fmtDate(s.startedAt)}</td><td>${s.units.length}</td><td>${spec.levelName(s.maxLevel)}</td><td>${U.pct(s.accuracy)}</td><td>${spec.levelName(s.endLevel)}</td></tr>`).join('')}
        </table>
        ${spec.lobbyExtra ? spec.lobbyExtra(g) : ''}`;
    }

    function cardStatus() {
      state();
      const a = activeSession();
      return a
        ? `<span class="tag live">Session in progress · ${spec.levelName(a.level)}</span>`
        : `<span class="tag">${spec.levelName(g.level)}</span>`;
    }

    return {
      mount(el) {
        root = el;
        state();
        document.addEventListener('keydown', onKey);
        offHidden = Device.onHidden(() => { if (stopUnit) quit('Paused because the app went to the background.'); });
        renderLobby();
      },
      unmount() {
        if (stopUnit) stopUnit();
        if (offHidden) offHidden();
        document.removeEventListener('keydown', onKey);
        root = null;
      },
      renderProgress,
      cardStatus,
      state: () => state(),
    };
  }

  return { create, U, sameAsPrevious, speededBlock, chart };
})();
