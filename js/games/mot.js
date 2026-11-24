// Multi-Object Tracking: some dots are marked as targets, then every dot looks the same and moves.
// When they stop, pick out the targets. Levels add targets and speed.
const MultiTrack = (() => {
  const { sameAsPrevious } = GameKit;
  const SIZE = 400, R = 13, MOVE_MS = 7000, CUE_MS = 2200;
  const decode = l => ({ targets: Math.min(6, 2 + Math.floor((l - 1) / 3)), speed: 70 + 35 * ((l - 1) % 3) });
  const levelName = l => { const { targets, speed } = decode(l); return `${targets} targets · speed ${['slow', 'medium', 'fast'][(speed - 70) / 35]}`; };

  function playUnit(ctx) {
    const { targets, speed } = decode(ctx.level);
    const total = targets + 5;
    const dots = [];
    while (dots.length < total) {
      const d = { x: R + Math.random() * (SIZE - 2 * R), y: R + Math.random() * (SIZE - 2 * R) };
      if (dots.some(o => Math.hypot(o.x - d.x, o.y - d.y) < 3 * R)) continue;
      const a = Math.random() * 2 * Math.PI;
      dots.push({ ...d, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, target: dots.length < targets, picked: false });
    }

    ctx.stage.innerHTML = `<canvas class="mot-canvas" width="${SIZE * 2}" height="${SIZE * 2}"></canvas><p class="ss-q" id="q">Remember the orange dots</p>`;
    const cv = ctx.stage.querySelector('canvas');
    const q = ctx.stage.querySelector('#q');
    const c2 = cv.getContext('2d');
    c2.scale(2, 2);
    let phase = 'cue', reveal = false;

    function draw(ts) {
      c2.clearRect(0, 0, SIZE, SIZE);
      for (const d of dots) {
        let fill = '#94a0b8', stroke = null;
        if (phase === 'cue' && d.target) fill = Math.floor(ts / 250) % 2 ? '#f2a541' : '#ffd08a';
        if (phase === 'pick' && d.picked) fill = '#5b8cff';
        if (reveal) {
          if (d.target && d.picked) fill = '#3ccf8e';
          else if (d.picked) fill = '#ff5d6c';
          else if (d.target) stroke = '#3ccf8e';
        }
        c2.beginPath();
        c2.arc(d.x, d.y, R, 0, 2 * Math.PI);
        c2.fillStyle = fill;
        c2.fill();
        if (stroke) { c2.lineWidth = 4; c2.strokeStyle = stroke; c2.stroke(); }
      }
    }

    function step(dt) {
      for (const d of dots) {
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.x < R) { d.x = R; d.vx = Math.abs(d.vx); }
        if (d.x > SIZE - R) { d.x = SIZE - R; d.vx = -Math.abs(d.vx); }
        if (d.y < R) { d.y = R; d.vy = Math.abs(d.vy); }
        if (d.y > SIZE - R) { d.y = SIZE - R; d.vy = -Math.abs(d.vy); }
      }
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        const a = dots[i], b = dots[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy < 4 * R * R && (b.vx - a.vx) * dx + (b.vy - a.vy) * dy < 0) {
          [a.vx, b.vx] = [b.vx, a.vx];
          [a.vy, b.vy] = [b.vy, a.vy];
        }
      }
    }

    let last = 0, moveStart = 0;
    ctx.frame(ts => {
      if (phase === 'move') {
        if (!moveStart) moveStart = ts;
        step(Math.min(0.05, (ts - (last || ts)) / 1000));
        if (ts - moveStart > MOVE_MS) {
          phase = 'pick';
          q.innerHTML = `Click the <b>${targets}</b> dots you were tracking`;
        }
      }
      last = ts;
      draw(ts);
      return true;
    });
    ctx.later(() => { phase = 'move'; q.textContent = 'Keep your eyes on them…'; }, CUE_MS);

    Device.onPress(cv, e => {
      if (phase !== 'pick' || reveal) return;
      const rect = cv.getBoundingClientRect();
      const x = (e.clientX - rect.left) * SIZE / rect.width;
      const y = (e.clientY - rect.top) * SIZE / rect.height;
      // nearest dot, with a bigger allowance for fingers than for a mouse
      const dist = d => Math.hypot(d.x - x, d.y - y);
      const hit = dots.reduce((best, d) => (dist(d) < dist(best) ? d : best));
      if (dist(hit) > R + (Device.touch ? 16 : 6)) return;
      hit.picked = !hit.picked;
      const picked = dots.filter(d => d.picked);
      if (picked.length < targets) return;
      reveal = true;
      const hits = picked.filter(d => d.target).length;
      const ok = hits === targets;
      q.innerHTML = ok ? '<span class="ok">✓ All found</span>' : `<span class="no">✗ ${hits} of ${targets}. Green rings show the ones you missed.</span>`;
      ctx.later(() => ctx.finish({ acc: +(hits / targets).toFixed(3) }), ok ? 900 : 2000);
    });
  }

  function nextLevel(lv, r, active) {
    const ok = r.acc === 1;
    if (!sameAsPrevious(active, lv, ok)) return lv;
    return ok ? lv + 1 : lv - 1;
  }

  return GameKit.create({
    id: 'mot',
    title: 'Multi-Object Tracking',
    unitName: 'trial',
    unitsPerSession: 15,
    warmup: 2,
    maxLevel: 15,
    autoContinue: true,
    levelName,
    playUnit,
    nextLevel,
    bestFrom: (lv, r) => (r.acc === 1 ? lv : 1),
    sessionHelp: 'Each trial is about 12 seconds',
    ruleText: 'Two perfect trials in a row move you up; two imperfect ones in a row move you down. Each level adds speed, then another target.',
    howTo: `
      <p>Some dots flash orange: those are your targets. Then they all turn grey and move around, bouncing off each other.</p>
      <p>When they stop, click the dots you were tracking. Click a dot again to unselect it. Keep your eyes roughly in the middle and follow the group rather than one dot at a time.</p>`,
    evidence: `
      <p><b>Limited.</b> People get much better at tracking with practice, and some studies (mostly in athletes) report benefits for attention. Few randomized trials have looked at broader thinking skills or long-term brain health, and those that did found mixed results.</p>
      <p class="muted">Included for variety and as practice for keeping attention spread across a scene, which matters in driving and sport.</p>`,
  });
})();
