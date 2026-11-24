// Task Switch: a digit appears in a coloured frame. The colour says which rule to use:
//   blue frame   -> ODD or EVEN?
//   orange frame -> LOW (1-4) or HIGH (6-9)?
// Left answer (F) = odd / low, right answer (J) = even / high.
// Levels shorten the time allowed; from level 4 the rule changes unpredictably instead of every 2 trials.
const TaskSwitch = (() => {
  const { U } = GameKit;
  const TRIALS = 40;
  const DIGITS = [1, 2, 3, 4, 6, 7, 8, 9];
  const deadline = l => Math.max(450, Math.round(2500 * Math.pow(0.88, l - 1)));
  const random = l => l >= 4;
  const levelName = l => `Level ${l} · ${(deadline(l) / 1000).toFixed(2)} s${random(l) ? ' · random' : ''}`;

  function makeTrials(level) {
    const rules = [];
    if (random(level)) {
      // runs of 1-3 trials with the same rule, so switches can't be predicted
      let r = U.pick(['parity', 'size']);
      while (rules.length < TRIALS) {
        const run = 1 + Math.floor(Math.random() * 3);
        for (let k = 0; k < run && rules.length < TRIALS; k++) rules.push(r);
        r = r === 'parity' ? 'size' : 'parity';
      }
    } else {
      const start = U.pick([0, 1]);
      for (let i = 0; i < TRIALS; i++) rules.push(Math.floor((i + start * 2) / 2) % 2 ? 'size' : 'parity');
    }
    return rules.map((rule, i) => ({
      rule,
      digit: U.pick(DIGITS),
      kind: i === 0 ? 'first' : rule === rules[i - 1] ? 'repeat' : 'switch',
    }));
  }

  const correct = t => (t.rule === 'parity' ? (t.digit % 2 ? 'L' : 'R') : (t.digit < 5 ? 'L' : 'R'));

  function stats(records) {
    const scored = records.filter(r => r.kind !== 'first');
    const rt = kind => Math.round(U.mean(scored.filter(r => r.kind === kind && r.ok).map(r => r.rt)));
    return { acc: scored.filter(r => r.ok).length / scored.length, rep: rt('repeat'), sw: rt('switch') };
  }

  function playUnit(ctx) {
    GameKit.speededBlock(ctx, {
      trials: makeTrials(ctx.level),
      deadline: deadline(ctx.level),
      keys: { f: 'L', j: 'R' },
      buttonsHtml: `
        <button class="answer" data-resp="L"><kbd>F</kbd> Odd <span class="sep">·</span> Low</button>
        <button class="answer" data-resp="R"><kbd>J</kbd> Even <span class="sep">·</span> High</button>`,
      show(t, el) {
        el.innerHTML = `<div class="ts-frame ${t.rule}"><span class="ts-rule">${t.rule === 'parity' ? 'ODD or EVEN?' : 'LOW or HIGH?'}</span><span class="ts-digit">${t.digit}</span></div>`;
      },
      correct,
      done(records) {
        const s = stats(records);
        ctx.finish({
          acc: +s.acc.toFixed(3),
          data: { rep: s.rep, sw: s.sw },
          html: `<table class="score">
            <tr><th>Accuracy</th><th>Speed, same rule</th><th>Speed, after a switch</th><th>Switch cost</th></tr>
            <tr><td>${U.pct(s.acc)}</td><td>${s.rep || '–'} ms</td><td>${s.sw || '–'} ms</td><td><b>${s.sw && s.rep ? s.sw - s.rep : '–'} ms</b></td></tr>
          </table>`,
        });
      },
    });
  }

  const nextLevel = (lv, r) => (r.acc >= 0.9 ? lv + 1 : r.acc < 0.75 ? lv - 1 : lv);

  return GameKit.create({
    id: 'taskswitch',
    title: 'Task Switch',
    unitName: 'block',
    unitsPerSession: 6,
    warmup: 1,
    maxLevel: 20,
    levelName,
    playUnit,
    nextLevel,
    sessionHelp: `Each block is ${TRIALS} trials, about a minute`,
    ruleText: 'After each block: 90% or better moves you up a level, under 75% moves you down, otherwise you stay.',
    summaryHtml: s => {
      const sw = s.units.filter(u => u.sw && u.rep).map(u => u.sw - u.rep);
      return sw.length ? `<p>Average switch cost this session: <b>${Math.round(U.mean(sw))} ms</b>. Lower means switching rules is costing you less.</p>` : '';
    },
    howTo: `
      <p>A number appears inside a coloured frame. The colour tells you which question to answer:</p>
      <ul>
        <li><span class="ts-chip parity">Blue</span> Is it <b>odd</b> or <b>even</b>?</li>
        <li><span class="ts-chip size">Orange</span> Is it <b>low</b> (1–4) or <b>high</b> (6–9)?</li>
      </ul>
      <p>Press <kbd>F</kbd> for odd / low, <kbd>J</kbd> for even / high. Answer fast but accurately. Higher levels give you less time, and from level 4 the rule can change at any moment.</p>`,
    evidence: `
      <p><b>Moderate.</b> Task-switching training reliably makes people better at switching, and some studies, especially in older adults, found improvements on other untrained thinking tasks (for example Karbach &amp; Kray, 2009; a 2014 meta-analysis of training in adults over 60 by Karbach &amp; Verhaeghen).</p>
      <p class="muted">There is no long-term evidence about dementia or everyday function like there is for speed training.</p>`,
  });
})();
