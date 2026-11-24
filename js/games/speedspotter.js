// Speed Spotter: speed-of-processing training in the style of the "useful field of view" task
// used in the ACTIVE trial. A centre symbol (and, from stage 2, a target out on the edge of the
// field) is flashed, then masked. You report the centre symbol and where the target was.
// The display time shortens as you get better (2 right in a row = faster, 1 wrong = slower).
const SpeedSpotter = (() => {
  const { U, sameAsPrevious } = GameKit;
  const STAGES = [
    { name: 'Centre only', steps: 12 },
    { name: 'Centre + edge', steps: 12 },
    { name: 'With distractors', steps: 12 },
    { name: 'Wide field', steps: 16 },
  ];
  const MAX = STAGES.reduce((s, x) => s + x.steps, 0);
  const DIR_KEYS = ['w', 'e', 'd', 'c', 'x', 'z', 'a', 'q']; // clockwise from the top
  const MONTH = 30.44 * 24 * 3600 * 1000;

  function decode(level) {
    let base = 0, i = 0;
    while (i < STAGES.length - 1 && level > base + STAGES[i].steps) { base += STAGES[i].steps; i++; }
    return { stage: i + 1, step: level - base, base };
  }
  const duration = step => Math.round(500 * Math.pow(0.8, step - 1)); // 500 ms down to ~18 ms
  const levelName = l => { const { stage, step } = decode(l); return `Stage ${stage} · ${duration(step)} ms`; };

  const spot = (dir, r) => {
    const a = (-90 + 45 * dir) * Math.PI / 180;
    return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
  };

  function layout(stage) {
    const targetRing = stage === 4 ? 44 : 32;
    const rings = stage === 3 ? [20, 32] : stage === 4 ? [20, 32, 44] : [];
    return { targetRing, rings };
  }

  const triangle = up => `<svg viewBox="0 0 40 40" class="ss-sym"><polygon points="${up ? '20,6 36,34 4,34' : '4,6 36,6 20,34'}"/></svg>`;

  function maskSvg() {
    let s = '';
    for (let i = 0; i < 500; i++) {
      s += `<rect x="${Math.random() * 100}" y="${Math.random() * 100}" width="${2 + Math.random() * 5}" height="${2 + Math.random() * 5}" fill="${U.pick(['#5b8cff', '#f2a541', '#94a0b8', '#e6ebf5', '#273149'])}"/>`;
    }
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="ss-mask">${s}</svg>`;
  }

  function playUnit(ctx) {
    const { stage, step } = decode(ctx.level);
    const ms = duration(step);
    const up = Math.random() < 0.5;
    const dir = Math.floor(Math.random() * 8);
    const { targetRing, rings } = layout(stage);

    let items = '';
    if (stage >= 2) {
      const t = spot(dir, targetRing);
      items += `<div class="ss-target" style="left:${t.x}%;top:${t.y}%"></div>`;
      for (const r of rings) for (let d = 0; d < 8; d++) {
        if (r === targetRing && d === dir) continue;
        const p = spot(d, r);
        items += `<div class="ss-distractor" style="left:${p.x}%;top:${p.y}%"></div>`;
      }
    }

    ctx.stage.innerHTML = `
      <div class="ss-field" id="field">
        <div class="ss-fix">+</div>
        <div class="ss-flash" id="flash" hidden><div class="ss-centre">${triangle(up)}</div>${items}</div>
        <div id="mask" hidden>${maskSvg()}</div>
        <div id="picks"></div>
      </div>
      <p class="ss-q" id="q">&nbsp;</p>
      <div class="answer-row" id="answers"></div>`;
    const $ = s => ctx.stage.querySelector(s);

    let centreAns = null;
    const askCentre = () => {
      $('#mask').hidden = true;
      $('#q').textContent = 'Which symbol was in the centre?';
      $('#answers').innerHTML = `
        <button class="answer" data-up="1"><kbd>↑</kbd> ${triangle(true)}</button>
        <button class="answer" data-up="0"><kbd>↓</kbd> ${triangle(false)}</button>`;
      ctx.stage.querySelectorAll('[data-up]').forEach(b => Device.onPress(b, () => pickCentre(b.dataset.up === '1')));
      ctx.onKey(e => {
        if (e.key === 'ArrowUp') pickCentre(true);
        else if (e.key === 'ArrowDown') pickCentre(false);
        else return false;
        return true;
      });
    };
    const pickCentre = v => {
      if (centreAns !== null) return;
      centreAns = v;
      if (stage === 1) return result(null);
      $('#answers').innerHTML = '';
      $('#q').innerHTML = 'Where was the yellow disc? <span class="muted kh">(click, or Q W E / A D / Z X C)</span>';
      $('#picks').innerHTML = Array.from({ length: 8 }, (_, d) => {
        const p = spot(d, targetRing);
        return `<button class="ss-pick" data-dir="${d}" style="left:${p.x}%;top:${p.y}%">${DIR_KEYS[d].toUpperCase()}</button>`;
      }).join('');
      ctx.stage.querySelectorAll('[data-dir]').forEach(b => Device.onPress(b, () => result(+b.dataset.dir)));
      ctx.onKey(e => {
        const d = DIR_KEYS.indexOf(e.key.toLowerCase());
        if (d < 0) return false;
        result(d);
        return true;
      });
    };
    let answered = false;
    const result = d => {
      if (answered) return;
      answered = true;
      ctx.onKey(() => false);
      const okC = centreAns === up;
      const okP = stage === 1 || d === dir;
      const ok = okC && okP;
      $('#picks').innerHTML = '';
      if (stage >= 2) {
        const t = spot(dir, targetRing);
        $('#picks').innerHTML = `<div class="ss-target reveal" style="left:${t.x}%;top:${t.y}%"></div>`;
      }
      $('#answers').innerHTML = '';
      $('#q').innerHTML = ok
        ? '<span class="ok">✓ Correct</span>'
        : `<span class="no">✗ ${okC ? '' : `Centre was ${up ? '▲' : '▼'}. `}${okP ? '' : 'The disc was where it’s shown now.'}</span>`;
      ctx.later(() => ctx.finish({ acc: ok ? 1 : 0, data: { c: okC ? 1 : 0, p: okP ? 1 : 0 } }), ok ? 600 : 1300);
    };

    // fixation, then a frame-timed flash, then the mask
    ctx.later(() => {
      let t0 = 0;
      ctx.frame(() => {
        if (!t0) { $('#flash').hidden = false; t0 = performance.now(); return; }
        if (performance.now() - t0 < ms - 4) return;
        $('#flash').hidden = true;
        $('.ss-fix').hidden = true;
        $('#mask').hidden = false;
        ctx.later(askCentre, 250);
        return false;
      });
    }, 700);
  }

  function nextLevel(lv, r, active) {
    const { stage, step, base } = decode(lv);
    if (!r.acc) return step === 1 ? lv : lv - 1;      // never drop back a whole stage
    if (!sameAsPrevious(active, lv, true)) return lv;   // need two right in a row
    if (stage < STAGES.length && step === STAGES[stage - 1].steps) return base + STAGES[stage - 1].steps + 4;
    return lv + 1;
  }

  // ACTIVE schedule: 10 sessions (~10 h) over 5-6 weeks, boosters at 11 and 35 months.
  function course(g) {
    const all = [...g.sessions.map(s => ({ at: s.startedAt, ms: s.ms }))];
    if (g.active) all.push({ at: g.active.startedAt, ms: g.active.units.reduce((s, u) => s + (u.ms || 0), 0) });
    if (!all.length) {
      return `<h2>Training course</h2>
        <p>In the ACTIVE trial, people did about 10 hours of speed training over 5–6 weeks, then 4 booster sessions at 11 months and again at 35 months. The lower dementia risk showed up in the group that did the boosters. Your training time and booster dates will be tracked here once you start.</p>`;
    }
    const first = Math.min(...all.map(x => x.at));
    const minsBetween = (a, b) => Math.round(all.filter(x => x.at >= first + a && x.at < first + b).reduce((s, x) => s + x.ms, 0) / 60000);
    const fmtM = m => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);
    const initial = minsBetween(0, 6 * 7 * 24 * 3600 * 1000);
    const b1 = minsBetween(10.5 * MONTH, 13 * MONTH);
    const b2 = minsBetween(34.5 * MONTH, 37 * MONTH);
    const now = Date.now();
    const phase = now < first + 6 * 7 * 24 * 3600 * 1000 ? 'initial'
      : now < first + 10.5 * MONTH ? 'gap1' : now < first + 13 * MONTH ? 'b1'
      : now < first + 34.5 * MONTH ? 'gap2' : now < first + 37 * MONTH ? 'b2' : 'done';
    const row = (label, when, mins, goal, cur) => `<tr class="${cur ? 'current' : ''}"><td>${label}</td><td>${when}</td><td>${fmtM(mins)}</td><td>${goal}</td></tr>`;
    return `<h2>Training course (ACTIVE schedule)</h2>
      <table class="score">
        <tr><th>Phase</th><th>When</th><th>You've done</th><th>Study dose</th></tr>
        ${row('Initial training', `${U.fmtDate(first)} – ${U.fmtDate(first + 42 * 864e5)}`, initial, '≈10 h', phase === 'initial')}
        ${row('Booster 1', `from ${U.fmtDate(first + 11 * MONTH)}`, b1, '≈4 h', phase === 'b1')}
        ${row('Booster 2', `from ${U.fmtDate(first + 35 * MONTH)}`, b2, '≈4 h', phase === 'b2')}
      </table>
      <p class="muted">${{
        initial: 'You are in the initial training window. Short sessions on most days add up.',
        gap1: `Between phases. Practising is fine, but the study's next step is the first booster around ${U.fmtDate(first + 11 * MONTH)}.`,
        b1: 'Booster 1 window is open now. In the study, the boosters were what separated a lasting benefit from none.',
        gap2: `Next booster around ${U.fmtDate(first + 35 * MONTH)}.`,
        b2: 'Booster 2 window is open now.',
        done: 'You have passed the end of the study schedule. Keeping up occasional practice is reasonable; the study did not test that.',
      }[phase]}</p>`;
  }

  return GameKit.create({
    id: 'speedspotter',
    title: 'Speed Spotter',
    unitName: 'trial',
    unitsPerSession: 80,
    warmup: 2,
    maxLevel: MAX,
    autoContinue: true,
    levelName,
    playUnit,
    nextLevel,
    bestFrom: (lv, r) => (r.acc ? lv : 1),
    lobbyExtra: course,
    sessionHelp: 'About 5 seconds each; 80 trials is roughly 7 minutes',
    ruleText: 'Two right in a row makes the flash shorter; one mistake makes it longer. Once you are quick enough at a stage, the next stage adds more to look at.',
    howTo: `
      <p>Look at the + in the middle. A symbol flashes very briefly, then the screen is covered with visual noise.</p>
      <ul>
        <li>Say which symbol was in the centre: <kbd>↑</kbd> for ▲ or <kbd>↓</kbd> for ▼.</li>
        <li>From stage 2, a yellow disc also flashes out at the edge. Click where it was, or press the key for that direction (<kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> / <kbd>A</kbd> <kbd>D</kbd> / <kbd>Z</kbd> <kbd>X</kbd> <kbd>C</kbd>).</li>
        <li>Stage 3 adds grey squares as distractors; stage 4 spreads everything wider.</li>
      </ul>`,
    evidence: `
      <p><b>Strongest of any game here.</b> In the ACTIVE trial (2,802 adults aged 65+), speed-of-processing training like this was the only kind linked to lower dementia rates: about 29% lower at 10 years, and about 25% lower at 20 years for people who also did the booster sessions. Memory and reasoning training did not show this.</p>
      <p class="muted">These are long-term follow-ups of a randomized trial that used medical claims to identify dementia, so they are strong but not conclusive. The study used older adults; effects in younger people are less studied.</p>`,
  });
})();
