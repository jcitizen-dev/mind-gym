// Color Clash: a colour word is printed in a coloured ink. Answer the INK colour, not the word.
// Levels shorten the time allowed and raise the share of mismatched ("clashing") trials.
const ColorClash = (() => {
  const { U } = GameKit;
  const TRIALS = 40;
  const COLORS = [
    { id: 'red', word: 'RED', ink: '#ff5d6c', key: 'd' },
    { id: 'green', word: 'GREEN', ink: '#3ccf8e', key: 'f' },
    { id: 'blue', word: 'BLUE', ink: '#5b8cff', key: 'j' },
    { id: 'yellow', word: 'YELLOW', ink: '#f5d142', key: 'k' },
  ];
  const deadline = l => Math.max(450, Math.round(2000 * Math.pow(0.9, l - 1)));
  const clashShare = l => Math.min(0.8, 0.4 + 0.05 * (l - 1));
  const levelName = l => `Level ${l} · ${(deadline(l) / 1000).toFixed(2)} s`;

  function makeTrials(level) {
    const nClash = Math.round(TRIALS * clashShare(level));
    const kinds = U.shuffle([...Array(TRIALS)].map((_, i) => (i < nClash ? 'clash' : 'match')));
    return kinds.map(kind => {
      const ink = U.pick(COLORS);
      const word = kind === 'match' ? ink : U.pick(COLORS.filter(c => c !== ink));
      return { kind, ink, word };
    });
  }

  function stats(records) {
    const rt = kind => Math.round(U.mean(records.filter(r => r.kind === kind && r.ok).map(r => r.rt)));
    return { acc: records.filter(r => r.ok).length / records.length, match: rt('match'), clash: rt('clash') };
  }

  function playUnit(ctx) {
    GameKit.speededBlock(ctx, {
      trials: makeTrials(ctx.level),
      deadline: deadline(ctx.level),
      keys: Object.fromEntries(COLORS.map(c => [c.key, c.id])),
      buttonsHtml: COLORS.map(c => `<button class="answer cc-btn" data-resp="${c.id}"><span class="cc-swatch" style="background:${c.ink}"></span><kbd>${c.key.toUpperCase()}</kbd></button>`).join(''),
      show(t, el) { el.innerHTML = `<span class="cc-word" style="color:${t.ink.ink}">${t.word.word}</span>`; },
      correct: t => t.ink.id,
      done(records) {
        const s = stats(records);
        ctx.finish({
          acc: +s.acc.toFixed(3),
          data: { m: s.match, c: s.clash },
          html: `<table class="score">
            <tr><th>Accuracy</th><th>Speed, matching</th><th>Speed, clashing</th><th>Interference</th></tr>
            <tr><td>${U.pct(s.acc)}</td><td>${s.match || '–'} ms</td><td>${s.clash || '–'} ms</td><td><b>${s.clash && s.match ? s.clash - s.match : '–'} ms</b></td></tr>
          </table>`,
        });
      },
    });
  }

  const nextLevel = (lv, r) => (r.acc >= 0.9 ? lv + 1 : r.acc < 0.75 ? lv - 1 : lv);

  return GameKit.create({
    id: 'colorclash',
    title: 'Color Clash',
    unitName: 'block',
    unitsPerSession: 5,
    warmup: 1,
    maxLevel: 20,
    levelName,
    playUnit,
    nextLevel,
    sessionHelp: `Each block is ${TRIALS} trials, under a minute`,
    ruleText: 'After each block: 90% or better moves you up a level, under 75% moves you down, otherwise you stay.',
    summaryHtml: s => {
      const d = s.units.filter(u => u.c && u.m).map(u => u.c - u.m);
      return d.length ? `<p>Average interference this session: <b>${Math.round(U.mean(d))} ms</b>, the extra time clashing words cost you.</p>` : '';
    },
    howTo: `
      <p>A colour word appears, printed in coloured ink. Answer the <b>ink colour</b> and ignore what the word says.</p>
      <p>Keys: <kbd>D</kbd> red, <kbd>F</kbd> green, <kbd>J</kbd> blue, <kbd>K</kbd> yellow, or tap the colour buttons. Higher levels give you less time and more clashing words.</p>`,
    evidence: `
      <p><b>Limited.</b> Stroop practice makes you faster at the Stroop task, but studies that trained this kind of self-control mostly found the gains did not carry over to other tasks (for example Enge et al., 2014). Reviews of training in older adults disagree with each other.</p>
      <p class="muted">Good as a quick focus warm-up and as a measure of how well you ignore distractions.</p>`,
  });
})();
