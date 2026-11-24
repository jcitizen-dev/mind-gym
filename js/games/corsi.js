// Corsi Span: tiles light up one after another; tap them back in the same order
// (or in reverse on "backward" levels). Levels alternate forward/backward as the span grows:
// level 1 = forward 2, level 2 = backward 2, level 3 = forward 3, ...
// Two right in a row at a level moves you up; two wrong in a row moves you down.
const CorsiSpan = (() => {
  const { sameAsPrevious } = GameKit;
  // fixed, irregular tile layout (percent of the board)
  const TILES = [
    [12, 14], [52, 8], [82, 18], [30, 36], [64, 40], [10, 62], [44, 66], [78, 70], [26, 86],
  ];
  const decode = l => ({ span: 2 + Math.floor((l - 1) / 2), backward: l % 2 === 0 });
  const levelName = l => { const { span, backward } = decode(l); return `${span} tiles ${backward ? 'backward' : 'forward'}`; };

  function playUnit(ctx) {
    const { span, backward } = decode(ctx.level);
    const seq = GameKit.U.shuffle([...TILES.keys()]).slice(0, span);
    const want = backward ? [...seq].reverse() : seq;
    const size = Device.chamber ? 18 : 14;     // tile size, % of the board
    const fit = (100 - size) / 86;             // keep bigger tiles inside the board
    ctx.stage.innerHTML = `
      <div class="corsi-board">${TILES.map(([x, y], i) => `<button class="corsi-tile" data-i="${i}" style="left:${x * fit}%;top:${y * fit}%;width:${size}%" disabled></button>`).join('')}</div>
      <p class="ss-q" id="q">Watch…</p>`;
    const tiles = [...ctx.stage.querySelectorAll('.corsi-tile')];
    const q = ctx.stage.querySelector('#q');

    // show the sequence
    seq.forEach((t, k) => {
      ctx.later(() => tiles[t].classList.add('lit'), 800 + k * 950);
      ctx.later(() => tiles[t].classList.remove('lit'), 800 + k * 950 + 700);
    });

    const got = [];
    ctx.later(() => {
      q.innerHTML = backward ? 'Now tap them in <b>reverse</b> order' : 'Now tap them in the <b>same</b> order';
      tiles.forEach(b => {
        b.disabled = false;
        Device.onPress(b, () => {
          if (got.length >= span) return;
          const i = +b.dataset.i;
          got.push(i);
          b.classList.add('tap');
          setTimeout(() => b.classList.remove('tap'), 200);
          const wrongSoFar = got.some((v, k) => v !== want[k]);
          if (got.length === span || wrongSoFar) finish(!wrongSoFar);
        });
      });
    }, 800 + span * 950);

    function finish(ok) {
      tiles.forEach(b => { b.disabled = true; });
      want.forEach((t, k) => { tiles[t].textContent = k + 1; });
      q.innerHTML = ok ? '<span class="ok">✓ Correct</span>' : '<span class="no">✗ The right order is numbered</span>';
      ctx.later(() => ctx.finish({ acc: ok ? 1 : 0 }), ok ? 700 : 1800);
    }
  }

  function nextLevel(lv, r, active) {
    const ok = r.acc === 1;
    if (!sameAsPrevious(active, lv, ok)) return lv;
    return ok ? lv + 1 : lv - 1;
  }

  return GameKit.create({
    id: 'corsi',
    orientation: { tablet: 'portrait', why: { portrait: 'The tiles are biggest and easiest to tap this way.' } },
    title: 'Corsi Span',
    unitName: 'trial',
    unitsPerSession: 16,
    warmup: 2,
    maxLevel: 15,
    autoContinue: true,
    levelName,
    playUnit,
    nextLevel,
    bestFrom: (lv, r) => (r.acc ? lv : 1),
    sessionHelp: 'Each trial takes 5–15 seconds',
    ruleText: 'Two right in a row moves you up; two wrong in a row moves you down. Levels alternate: forward, then backward at the same length, then one tile longer.',
    howTo: `
      <p>Some of the tiles light up one at a time. When they stop, tap the same tiles in the same order.</p>
      <p>On <b>backward</b> levels, tap them in reverse order, starting with the last one that lit. This is harder because you have to rearrange the sequence in your head, not just replay it.</p>`,
    evidence: `
      <p><b>Limited.</b> Practising memory span tasks reliably improves those tasks and very similar ones. Large reviews (for example Melby-Lervåg, Redick &amp; Hulme, 2016) found little sign that the gains spread to general reasoning or everyday life.</p>
      <p class="muted">Useful as a measure of short-term visual memory and as variety in your routine.</p>`,
  });
})();
