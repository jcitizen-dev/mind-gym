// App shell: game list, routing, progress page and backup page.
// Ordered by strength of evidence for long-term cognitive health.
const GAMES = [
  { id: 'speed', title: 'Speed Spotter', ready: true, module: SpeedSpotter, evidence: 'Strongest evidence',
    blurb: 'Catch a split-second symbol in the centre and a target at the edge. Speed of processing, as in the ACTIVE trial.' },
  { id: 'switch', title: 'Task Switch', ready: true, module: TaskSwitch, evidence: 'Moderate evidence', timed: true,
    blurb: 'The rule flips between odd/even and low/high. Trains mental flexibility.' },
  { id: 'dnb', title: 'Dual N-Back', ready: true, module: DualNBack, evidence: 'Mixed evidence',
    blurb: 'Track a square and a spoken letter at once. Trains working memory; the level adapts every block.' },
  { id: 'span', title: 'Corsi Span', ready: true, module: CorsiSpan, evidence: 'Limited evidence',
    blurb: 'Repeat a growing sequence of flashed tiles, forwards and backwards. Visual short-term memory.' },
  { id: 'stroop', title: 'Color Clash', ready: true, module: ColorClash, evidence: 'Limited evidence', timed: true,
    blurb: 'Name the ink colour, not the word. Trains ignoring distractions.' },
  { id: 'mot', title: 'Multi-Object Tracking', ready: true, module: MultiTrack, evidence: 'Limited evidence',
    blurb: 'Follow several moving dots among identical decoys. Spread-out attention.' },
  { id: 'chess', title: 'Chess', ready: true, module: Chess, evidence: 'Limited evidence',
    blurb: 'Learn chess from zero with short hands-on lessons, then play a bot that adjusts to your skill.' },
];

const app = document.getElementById('app');
let current = null; // mounted game module

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function card(g, recommended) {
  return `
    <a class="card ${g.ready ? '' : 'soon'} ${recommended ? 'recommended' : ''}" ${g.ready ? `href="#/${g.id}"` : ''}>
      <div class="card-head">
        ${ICONS[g.id] ? `<span class="game-icon">${ICONS[g.id]}</span>` : ''}
        <h2>${esc(g.title)}</h2>
      </div>
      <div class="tags">
        ${recommended ? '<span class="evidence recommend">★ Recommended daily</span>' : ''}
        ${g.evidence ? `<span class="evidence ${g.evidence.split(' ')[0].toLowerCase()}">${esc(g.evidence)}</span>` : ''}
      </div>
      <p>${esc(g.blurb)}</p>
      <div class="card-foot">${g.ready ? g.module.cardStatus() : '<span class="tag">Coming soon</span>'}</div>
    </a>`;
}

function home() {
  const chamber = Device.chamber;
  const shown = chamber ? GAMES.filter(g => !g.timed) : GAMES;
  const hidden = GAMES.filter(g => g.timed);
  app.innerHTML = `
    <h1>Today's training</h1>
    <p class="muted">Your progress is saved after every block, so you can stop any time and pick up where you left off.</p>
    <label class="chamber-toggle ${chamber ? 'on' : ''}">
      <input type="checkbox" id="chamber" ${chamber ? 'checked' : ''}>
      <span class="switch" aria-hidden="true"></span>
      <span><b>Chamber mode</b><br><span class="muted small">For a mounted tablet and slow, steady taps: hides games that time your taps, slows Dual N-Back to 5 seconds a letter, makes buttons bigger, and ignores accidental double taps.</span></span>
    </label>
    ${chamber ? `<p class="note">Hidden in chamber mode because they score how fast you tap: ${hidden.map(g => esc(g.title)).join(' and ')}. Turn chamber mode off to play them.</p>` : ''}
    <div class="cards">
      ${shown.map(g => card(g, chamber && g.id === 'speed')).join('')}
    </div>`;
  document.getElementById('chamber').onchange = e => { Device.setChamber(e.target.checked); home(); };
}

function progress() {
  app.innerHTML = `<h1>Progress</h1><div id="prog"></div>`;
  GAMES.filter(g => g.ready).forEach(g => {
    const sec = document.createElement('section');
    sec.className = 'panel';
    document.getElementById('prog').appendChild(sec);
    g.module.renderProgress(sec);
  });
}

function backup() {
  app.innerHTML = `
    <h1>Backup</h1>
    <section class="panel">
      <p>Progress is stored in this browser. Download a backup to move it to another device or browser, or to keep it safe.</p>
      <div class="row">
        <button class="btn" id="exp">Download backup</button>
        <label class="btn ghost">Restore from file<input type="file" id="imp" accept="application/json" hidden></label>
      </div>
      <p id="msg" class="muted"></p>
    </section>`;
  document.getElementById('exp').onclick = () => {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mindgym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  document.getElementById('imp').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    const msg = document.getElementById('msg');
    if (!confirm('Replace all progress in this browser with the backup?')) return;
    try {
      Store.importJSON(await f.text());
      msg.textContent = 'Backup restored.';
    } catch (err) {
      msg.textContent = err.message;
    }
  };
}

function route() {
  if (current) { current.unmount(); current = null; }
  const path = location.hash.replace(/^#\/?/, '');
  const game = GAMES.find(g => g.ready && g.id === path);
  if (game) { current = game.module; game.module.mount(app); }
  else if (path === 'progress') progress();
  else if (path === 'backup') backup();
  else home();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
