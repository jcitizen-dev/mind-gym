// Chess: lessons for complete beginners, then games against a bot whose strength follows your rating.
const Chess = (() => {
  const E = ChessEngine;
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
  const POINTS = { p: 1, n: 3, b: 3, r: 5, q: 9 };

  // Bot levels. Ratings are rough estimates on a beginner scale, not official chess ratings.
  const BOTS = [
    { rating: 250, depth: 1, noise: 350, blunder: 0.5 },
    { rating: 350, depth: 1, noise: 250, blunder: 0.35 },
    { rating: 450, depth: 1, noise: 180, blunder: 0.25 },
    { rating: 550, depth: 2, noise: 140, blunder: 0.18 },
    { rating: 650, depth: 2, noise: 100, blunder: 0.12 },
    { rating: 750, depth: 2, noise: 70, blunder: 0.08, q: true },
    { rating: 850, depth: 3, noise: 50, blunder: 0.05, q: true },
    { rating: 950, depth: 3, noise: 35, blunder: 0.03, q: true },
    { rating: 1050, depth: 3, noise: 20, blunder: 0.015, q: true },
    { rating: 1150, depth: 4, noise: 12, blunder: 0.005, q: true },
    { rating: 1250, depth: 4, noise: 6, blunder: 0, q: true },
    { rating: 1350, depth: 5, noise: 0, blunder: 0, q: true },
  ];

  const DEFAULTS = { rating: 250, lessons: {}, games: [], current: null, settings: { coach: true } };

  // ---------- lessons ----------
  const LESSONS = [
    {
      id: 'board', title: 'The board and the goal',
      steps: [
        { type: 'look', fen: E.START, text: `
          <p>Chess is played on a board of 8 × 8 squares. You have the <b>white</b> pieces at the bottom; your opponent has <b>black</b>. White always moves first, then you take turns, one move each.</p>
          <p>Each side starts with 16 pieces: 8 pawns in front, and behind them rook, knight, bishop, queen, king, bishop, knight, rook.</p>
          <p>Columns are called <b>files</b> (a to h) and rows are <b>ranks</b> (1 to 8), so every square has a name, like <b>e4</b>. The letters and numbers are printed along the edge of the board.</p>` },
        { type: 'look', fen: E.START, text: `
          <p><b>The goal:</b> attack the enemy king so it has no way to escape. That is called <b>checkmate</b>, and it wins the game.</p>
          <p>Along the way you capture enemy pieces by moving onto their square. You can never capture a king, though: the game ends as soon as it is trapped.</p>
          <p>Next you'll learn how each piece moves, one at a time.</p>` },
      ],
    },
    {
      id: 'rook', title: 'The rook',
      steps: [{ type: 'stars', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', mover: 'd4', stars: ['d7', 'g7', 'g2'], text: `
        <p>The <b>rook</b> ${glyphHtml('R')} moves in a straight line: up, down, left or right, as many squares as it likes. It can't jump over other pieces.</p>
        <p>Tap the rook, then tap a square to move it. <b>Collect all the stars.</b></p>` }],
    },
    {
      id: 'bishop', title: 'The bishop',
      steps: [{ type: 'stars', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', mover: 'c1', stars: ['e3', 'h6', 'f8'], text: `
        <p>The <b>bishop</b> ${glyphHtml('B')} moves diagonally, any number of squares. Because of this, a bishop stays on the same colour of square for the whole game.</p>
        <p><b>Collect all the stars.</b></p>` }],
    },
    {
      id: 'queen', title: 'The queen',
      steps: [{ type: 'stars', fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', mover: 'd1', stars: ['d5', 'a8', 'h8'], text: `
        <p>The <b>queen</b> ${glyphHtml('Q')} is the strongest piece: she moves like a rook <i>and</i> a bishop, in any straight line or diagonal.</p>
        <p><b>Collect all the stars.</b></p>` }],
    },
    {
      id: 'king', title: 'The king',
      steps: [{ type: 'stars', fen: '8/8/8/8/8/8/8/4K3 w - - 0 1', mover: 'e1', stars: ['f2', 'g3', 'g4'], text: `
        <p>The <b>king</b> ${glyphHtml('K')} moves one square in any direction. He is slow, but he is the piece you must protect: if your king is trapped, you lose.</p>
        <p>The king may never move to a square where he could be captured.</p>
        <p><b>Collect all the stars.</b></p>` }],
    },
    {
      id: 'knight', title: 'The knight',
      steps: [{ type: 'stars', fen: '8/8/8/8/8/8/5PPP/6N1 w - - 0 1', mover: 'g1', stars: ['f3', 'e5', 'd7'], text: `
        <p>The <b>knight</b> ${glyphHtml('N')} moves in an "L": two squares in one direction, then one square to the side. It is the only piece that can <b>jump over</b> other pieces.</p>
        <p>Notice it can jump right over the pawns in front of it. <b>Collect all the stars.</b></p>` }],
    },
    {
      id: 'pawn', title: 'The pawn',
      steps: [
        { type: 'stars', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', mover: 'e2', stars: ['e4', 'e6'], text: `
          <p>The <b>pawn</b> ${glyphHtml('P')} moves straight forward one square, never backwards. On its very first move it may go forward <b>two</b> squares.</p>
          <p><b>Collect the stars.</b> Try moving two squares on the first move.</p>` },
        { type: 'stars', fen: '8/8/8/3npb2/4P3/8/8/8 w - - 0 1', mover: 'e4', stars: ['d5', 'f5'], need: 1, text: `
          <p>Pawns are unusual: they move straight, but they <b>capture diagonally</b>, one square forward to the left or right. A piece directly in front blocks a pawn completely.</p>
          <p>Your pawn is blocked by the black pawn. <b>Capture one of the black pieces.</b></p>` },
        { type: 'stars', fen: '8/1P6/8/8/8/8/8/8 w - - 0 1', mover: 'b7', stars: ['b8'], text: `
          <p>When a pawn reaches the far side of the board it is <b>promoted</b>: it turns into a queen, rook, bishop or knight (almost always a queen).</p>
          <p><b>Promote your pawn.</b></p>` },
      ],
    },
    {
      id: 'capture', title: 'Capturing and piece values',
      steps: [{ type: 'puzzle', fen: '6k1/5ppp/8/1r1p4/8/2N5/5PPP/6K1 w - - 0 1', goal: 'capture:b5',
        text: `
          <p>To capture, move your piece onto an enemy piece's square. Pieces are worth different amounts:</p>
          <p class="values">Pawn <b>1</b> · Knight <b>3</b> · Bishop <b>3</b> · Rook <b>5</b> · Queen <b>9</b> · King: priceless</p>
          <p>Your knight can capture two different pieces. <b>Make the best capture.</b></p>`,
        wrong: m => (m.to === E.sqIndex('d5') ? 'That pawn is only worth 1. The rook is worth 5: take that instead!' : 'Look for an enemy piece your knight can capture.'),
        success: 'Well done: you won a rook (5 points) for free. Always check which captures are available, and grab the most valuable safe one.' }],
    },
    {
      id: 'check', title: 'Check',
      steps: [{ type: 'puzzle', fen: 'R3r1k1/5ppp/8/8/2B5/8/5PPP/4K3 w - - 0 1', goal: 'any',
        text: `
          <p>When a king is attacked, it is in <b>check</b>. You must get out of check on your very next move. There are three ways:</p>
          <ol><li><b>Move</b> the king to a safe square</li><li><b>Block</b> the attack by putting a piece in the way</li><li><b>Capture</b> the attacking piece</li></ol>
          <p>The black rook on e8 is checking your king. <b>Get out of check.</b> (All three ways work here.)</p>`,
        success: (m) => (m.p === 'K' ? 'You <b>moved</b> the king out of the line of attack.'
          : m.to === E.sqIndex('e8') ? 'You <b>captured</b> the attacking rook. It’s also check on Black now!'
          : 'You <b>blocked</b> the attack with your bishop.') + ' The other two ways would also have worked.' }],
    },
    {
      id: 'mate', title: 'Checkmate',
      steps: [
        { type: 'puzzle', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', goal: 'mate',
          text: `<p><b>Checkmate</b> is check with no way out: the king can't move, the attack can't be blocked, and the attacker can't be captured.</p>
            <p>Black's king is boxed in by its own pawns. <b>Checkmate in one move.</b></p>`,
          success: 'Checkmate! The king is attacked along the back row and its own pawns stop it escaping. This is called a "back-rank mate".' },
        { type: 'puzzle', fen: '7k/4Q3/6K1/8/8/8/8/8 w - - 0 1', goal: 'mate',
          text: `<p>A queen with her king's help can trap a lone king. <b>Checkmate in one move.</b> (There is more than one way.)</p>`,
          success: 'Checkmate! Your king guards the squares next to the black king, so it has nowhere to go.' },
      ],
    },
    {
      id: 'special', title: 'Castling, stalemate and other rules',
      steps: [
        { type: 'puzzle', fen: '4k3/8/8/8/8/8/5PPP/4K2R w K - 0 1', goal: 'castle',
          text: `<p><b>Castling</b> tucks your king into safety and brings a rook into play, both in one move. Move the king <b>two squares</b> toward a rook, and the rook jumps over to the other side of the king.</p>
            <p>You can only castle if neither piece has moved yet, the squares between are empty, and your king isn't in check or passing through an attacked square.</p>
            <p><b>Castle:</b> tap your king, then the square two to its right.</p>`,
          success: 'Castled! Your king is safe in the corner behind pawns. Try to castle early in every game.' },
        { type: 'look', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', text: `
          <p><b>Stalemate</b> is a draw: the player to move is <i>not</i> in check but has no legal move. Here Black's king isn't attacked, yet every square it could go to is. The game ends in a draw!</p>
          <p>When you are winning, always leave the enemy king a square until you can checkmate.</p>
          <p class="muted">Other rules you'll meet: <b>en passant</b> (a special pawn capture the app will show you when it's possible) and draws by repeating the same position three times.</p>` },
      ],
    },
    {
      id: 'tips', title: 'How to start a game well',
      steps: [{ type: 'look', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', text: `
        <ol>
          <li><b>Take the centre.</b> Move a centre pawn (e or d) forward two squares.</li>
          <li><b>Bring out knights and bishops</b> early, before moving the same piece twice.</li>
          <li><b>Castle</b> in the first ten moves or so.</li>
          <li><b>Keep the queen home</b> at first; she is easy to chase around.</li>
        </ol>
        <p>Before every move ask two questions: <b>What does my opponent's last move threaten?</b> and <b>Is the piece I'm about to move safe there?</b></p>
        <p>That's everything you need. The coach will point out pieces you leave unprotected while you play. Have fun!</p>` }],
    },
  ];

  let g = null, root = null, timers = [], G = null, L = null;

  const state = () => (g = Store.game('chess', DEFAULTS));
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function glyphHtml(p) {
    return `<span class="pc ${E.isWhite(p) ? 'w' : 'b'} inline">${GLYPH[p.toLowerCase()]}︎</span>`;
  }
  const pieceName = p => NAME[E.typeOf(p)];
  const sq = i => E.sqName(i);

  function levelFor(rating) {
    let best = 0;
    BOTS.forEach((b, i) => { if (Math.abs(b.rating - rating) < Math.abs(BOTS[best].rating - rating)) best = i; });
    return best + 1;
  }

  // ---------- board ----------
  // o: { st, flip, sel, targets:Set, last:{from,to}, check, hint:{from,to}, stars:Set, onTap }
  function drawBoard(el, o) {
    let html = '';
    for (let v = 0; v < 64; v++) {
      const i = o.flip ? 63 - v : v;
      const r = i >> 3, c = i & 7, p = o.st.board[i];
      const cls = ['sq', (r + c) % 2 ? 'dark' : 'light'];
      if (o.sel === i) cls.push('sel');
      if (o.last && (o.last.from === i || o.last.to === i)) cls.push('last');
      if (o.hint && (o.hint.from === i || o.hint.to === i)) cls.push('hint');
      if (o.check === i) cls.push('check');
      let inner = '';
      if (p) inner += `<span class="pc ${E.isWhite(p) ? 'w' : 'b'}">${GLYPH[E.typeOf(p)]}︎</span>`;
      if (o.stars && o.stars.has(i)) inner += '<span class="star">★</span>';
      if (o.targets && o.targets.has(i)) inner += `<span class="${p ? 'ring' : 'dot'}"></span>`;
      if (v % 8 === 0) inner += `<span class="coord rank">${8 - r}</span>`;
      if (v >= 56) inner += `<span class="coord file">${E.FILES[c]}</span>`;
      html += `<div class="${cls.join(' ')}" data-sq="${i}">${inner}</div>`;
    }
    el.innerHTML = `<div class="cb">${html}</div>`;
    if (!el.dataset.bound) {
      el.dataset.bound = '1';
      Device.onPress(el, e => {
        const s = e.target.closest('[data-sq]');
        if (s && el._onTap) el._onTap(+s.dataset.sq);
      });
    }
    el._onTap = o.onTap;
  }

  function promoPicker(color, cb) {
    const ov = document.createElement('div');
    ov.className = 'promo-ov';
    ov.innerHTML = `<div class="promo-box"><p>Promote to:</p><div class="row">${'qrbn'.split('').map(t =>
      `<button class="promo-btn" data-t="${t}">${glyphHtml(color === 'w' ? t.toUpperCase() : t)}<small>${NAME[t]}</small></button>`).join('')}</div></div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-t]').forEach(b => Device.onPress(b, () => { ov.remove(); cb(b.dataset.t); }));
  }

  // ---------- lobby ----------
  function renderLobby(note = '') {
    clearTimers();
    Device.playing(false);
    G = null; L = null;
    const done = LESSONS.filter(l => g.lessons[l.id]).length;
    const level = g.current ? g.current.level : levelFor(g.rating);
    const firstOpen = LESSONS.find(l => !g.lessons[l.id]);
    root.innerHTML = `
      <h1>Chess</h1>
      ${note ? `<p class="note">${note}</p>` : ''}
      <section class="panel hero">
        ${g.current
          ? `<p class="big">Game in progress against <b>Bot level ${g.current.level}</b>, ${g.current.moves.length} moves played.</p>
             <div class="row"><button class="btn" id="cont">Continue game</button></div>`
          : `<p class="big">Next opponent: <b>Bot level ${level}</b> of ${BOTS.length}</p>
             <p class="muted">Your rating estimate: <b>${Math.round(g.rating)}</b> after ${g.games.length} game${g.games.length === 1 ? '' : 's'}. The bot is picked to match it, and it moves up or down as you win and lose.</p>
             <div class="row">
               ${done < LESSONS.length && !g.games.length ? `<button class="btn" id="learn">${done ? 'Continue lessons' : 'Start learning'}</button><button class="btn ghost" id="play">Play the bot</button>`
                 : `<button class="btn" id="play">Play the bot</button>`}
             </div>`}
        ${Device.orientTip({ tablet: 'landscape', phone: 'portrait', why: { landscape: 'The board sits beside the lesson text and coach tips, so you won\u2019t need to scroll.', portrait: 'The board fills the width, with the text and buttons underneath.' } })}
      </section>
      <section class="panel">
        <h2>Lessons <span class="muted small">${done} of ${LESSONS.length} done</span></h2>
        <ol class="lesson-list">
          ${LESSONS.map((l, k) => `<li><button class="lesson-btn ${g.lessons[l.id] ? 'done' : ''} ${l === firstOpen ? 'next' : ''}" data-l="${k}">
            <span class="tick">${g.lessons[l.id] ? '✓' : k + 1}</span>${l.title}</button></li>`).join('')}
        </ol>
      </section>
      <section class="panel">
        <h2>How the bot adapts</h2>
        <p>After each game your rating estimate goes up when you win and down when you lose (more after an upset), using the Elo method that real chess ratings use. The next game is against the bot level closest to your rating, so you should win about half your games. Levels 1–3 make lots of random moves; the top levels look several moves ahead.</p>
        <p class="muted">Take-backs and hints are allowed and don't affect your rating. Resigning counts as a loss.</p>
      </section>
      <section class="panel"><h2>The evidence</h2>
        <p><b>Limited.</b> Studies of chess training have mostly found that it makes people better at chess rather than at other thinking skills (for example, meta-analyses by Sala &amp; Gobet). Large observational studies have linked board games like chess to lower dementia risk in older age, but that can't show cause and effect.</p>
        <p class="muted">Chess is still a rich way to practise planning, attention and memory, and enjoyment helps you keep training.</p>
      </section>
      <details class="panel"><summary>Settings</summary>
        <form class="settings" id="settings">
          <label class="check"><input type="checkbox" name="coach" ${g.settings.coach ? 'checked' : ''}> Coach tips during games (warns about unprotected pieces, points out chances)</label>
          <label>Rating estimate <input type="number" name="rating" min="100" max="2000" value="${Math.round(g.rating)}"><small>Change to pick a different starting bot level</small></label>
        </form>
        <button class="btn ghost danger" id="reset">Reset all chess progress</button>
      </details>`;
    const on = (id, fn) => { const el = root.querySelector(id); if (el) el.onclick = fn; };
    on('#cont', () => startGame());
    on('#play', () => startGame());
    on('#learn', () => openLesson(LESSONS.indexOf(firstOpen)));
    root.querySelectorAll('[data-l]').forEach(b => { b.onclick = () => openLesson(+b.dataset.l); });
    root.querySelector('#settings').onchange = e => {
      const f = e.currentTarget.elements;
      g.settings.coach = f.coach.checked;
      g.rating = Math.min(2000, Math.max(100, +f.rating.value || g.rating));
      Store.save();
      renderLobby('Settings saved.');
    };
    on('#reset', () => {
      if (!confirm('Delete all chess lessons, games and rating?')) return;
      Store.resetGame('chess');
      state();
      renderLobby('Chess progress reset.');
    });
  }

  // ---------- lessons ----------
  function openLesson(k, step = 0) {
    clearTimers();
    const lesson = LESSONS[k];
    const s = lesson.steps[step];
    L = { k, step, lesson, s, st: E.fromFEN(s.fen), sel: -1, collected: new Set(), done: false, mover: s.mover ? E.sqIndex(s.mover) : -1 };
    renderLesson();
  }

  function renderLesson(msg = '') {
    const { lesson, s, step } = L;
    const last = step === lesson.steps.length - 1;
    root.innerHTML = `
      <div class="chess-wrap">
        <div class="chess-board" id="board"></div>
        <div class="chess-side">
          <p class="muted small"><a href="#/chess" id="back">← All lessons</a> · Lesson ${L.k + 1} of ${LESSONS.length}${lesson.steps.length > 1 ? ` · part ${step + 1} of ${lesson.steps.length}` : ''}</p>
          <h1>${lesson.title}</h1>
          <div class="lesson-text">${s.text}</div>
          <p class="coach ${L.done ? 'good' : msg ? 'warn' : ''}" id="msg" ${msg || L.done ? '' : 'hidden'}>${msg}</p>
          <div class="row">
            ${s.type !== 'look' && !L.done ? '<button class="btn ghost" id="redo">Reset</button>' : ''}
            ${s.type === 'look' || L.done ? `<button class="btn" id="next">${last ? (L.k === LESSONS.length - 1 ? 'Play the bot' : 'Next lesson') : 'Continue'}</button>` : ''}
          </div>
        </div>
      </div>`;
    root.querySelector('#back').onclick = e => { e.preventDefault(); renderLobby(); };
    const redo = root.querySelector('#redo');
    if (redo) redo.onclick = () => openLesson(L.k, L.step);
    const next = root.querySelector('#next');
    if (next) next.onclick = () => {
      if (!last) return openLesson(L.k, L.step + 1);
      g.lessons[lesson.id] = true;
      Store.save();
      if (L.k === LESSONS.length - 1) startGame();
      else openLesson(L.k + 1);
    };
    drawLessonBoard();
  }

  function drawLessonBoard() {
    const { s } = L;
    const stars = s.type === 'stars' ? new Set(s.stars.map(E.sqIndex).filter(i => !L.collected.has(i))) : null;
    let targets = null;
    if (L.sel >= 0 && !L.done) targets = new Set(lessonMoves(L.sel).map(m => m.to));
    drawBoard(root.querySelector('#board'), {
      st: L.st, sel: L.sel, targets, stars, last: L.last,
      check: s.type === 'puzzle' && E.inCheck(L.st) ? L.st.board.indexOf(L.st.turn === 'w' ? 'K' : 'k') : -1,
      onTap: lessonTap,
    });
  }

  function lessonMoves(from) {
    if (L.s.type === 'stars') return from === L.mover ? E.pseudo({ ...L.st, ep: -1, castling: '' }, from) : [];
    return E.moves(L.st, { from });
  }

  function lessonTap(i) {
    if (L.done || L.s.type === 'look') return;
    if (L.s.type === 'puzzle' && L.st.turn !== 'w') return; // resetting after a wrong answer
    if (L.sel >= 0) {
      const ms = lessonMoves(L.sel).filter(m => m.to === i);
      if (ms.length) {
        const m = ms.find(x => !x.promo || x.promo === 'q');
        L.sel = -1;
        return L.s.type === 'stars' ? starMove(m) : puzzleMove(m);
      }
    }
    const p = L.st.board[i];
    if (L.s.type === 'stars') L.sel = i === L.mover && L.sel !== i ? i : -1;
    else L.sel = p && E.isWhite(p) && L.sel !== i ? i : -1;
    if (L.sel >= 0 && !lessonMoves(L.sel).length && L.s.type === 'puzzle') {
      L.sel = -1;
      return renderLesson(`Your ${pieceName(p)} can't move right now.`);
    }
    drawLessonBoard();
  }

  function starMove(m) {
    L.st = { ...E.make(L.st, m), turn: 'w', ep: -1 };
    L.last = { from: m.from, to: m.to };
    L.mover = m.to;
    if (L.s.stars.map(E.sqIndex).includes(m.to)) L.collected.add(m.to);
    const need = L.s.need || L.s.stars.length;
    if (L.collected.size >= need) {
      L.done = true;
      return renderLesson(m.promo ? 'Promoted to a queen! ★ Done.' : 'All stars collected! ★');
    }
    if (!lessonMoves(L.mover).length) return renderLesson('Stuck! This piece has no moves left. Tap Reset to try again.');
    drawLessonBoard();
  }

  function puzzleMove(m) {
    const s = L.s, next = m.next;
    let ok;
    if (s.goal === 'mate') ok = E.inCheck(next) && !E.moves(next).length;
    else if (s.goal === 'castle') ok = m.flag === 'k' || m.flag === 'q';
    else if (s.goal.startsWith('capture:')) ok = m.to === E.sqIndex(s.goal.slice(8));
    else ok = true;
    L.st = next;
    L.last = { from: m.from, to: m.to };
    if (ok) {
      L.done = true;
      return renderLesson(typeof s.success === 'function' ? s.success(m) : s.success);
    }
    let why = s.wrong ? s.wrong(m)
      : s.goal === 'mate' ? (E.inCheck(next) ? 'Check, but the king can still escape. Look for a move that leaves it no way out.' : 'That isn’t checkmate. Look for a move that attacks the king.')
      : s.goal === 'castle' ? 'That’s not castling. Tap the king, then the square two to its right.'
      : 'Not quite.';
    renderLesson(why + ' Resetting…');
    later(() => openLesson(L.k, L.step), 2200);
  }

  // ---------- game ----------
  function rebuild() {
    let st = E.fromFEN(E.START);
    const keys = [], sans = [];
    let last = null;
    for (const u of g.current.moves) {
      const m = E.fromUci(st, u);
      if (!m) break; // shouldn't happen; stop at a bad entry
      sans.push(E.san(st, m));
      keys.push(E.key(st));
      last = { from: m.from, to: m.to };
      st = m.next;
    }
    G = { cur: g.current, st, keys, sans, last, sel: -1, hint: null, msg: '', msgKind: '', thinking: false, pending: null, over: null };
  }

  function startGame() {
    if (!g.current) {
      const color = g.games.length % 2 === 0 ? 'w' : 'b';
      g.current = { color, level: levelFor(g.rating), moves: [], startedAt: Date.now(), hints: 0, undos: 0 };
      Store.save();
    }
    rebuild();
    Device.playing(true);
    if (!G.msg) say(g.current.moves.length ? 'Welcome back. Your game is just as you left it.'
      : g.current.color === 'w' ? 'You play White and move first. Tap a piece, then tap where it should go.'
      : 'You play Black this time (it alternates). The bot moves first.');
    renderGame();
    afterMove(true);
  }

  const mine = () => G.cur.color;
  const myTurn = () => G.st.turn === mine();

  function say(text, kind = '') { G.msg = text; G.msgKind = kind; }

  function renderGame() {
    const cur = G.cur, bot = BOTS[cur.level - 1];
    const capturedBy = color => { // pieces of the other colour that are missing
      const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }, theirs = E.other(color);
      for (const p of G.st.board) if (p && (E.isWhite(p) ? 'w' : 'b') === theirs && start[E.typeOf(p)] !== undefined) start[E.typeOf(p)]--;
      return Object.entries(start).flatMap(([t, n]) => Array(Math.max(0, n)).fill(t));
    };
    const myCaps = capturedBy(mine()), botCaps = capturedBy(E.other(mine()));
    const pts = list => list.reduce((s, t) => s + POINTS[t], 0);
    const diff = pts(myCaps) - pts(botCaps);
    const capsHtml = (list, color) => list.map(t => glyphHtml(color === 'w' ? t.toUpperCase() : t)).join('');
    const pairs = [];
    for (let k = 0; k < G.sans.length; k += 2) pairs.push(`<span class="mv"><b>${k / 2 + 1}.</b> ${G.sans[k]} ${G.sans[k + 1] || ''}</span>`);
    root.innerHTML = `
      <div class="chess-wrap">
        <div class="chess-board" id="board"></div>
        <div class="chess-side">
          <p class="muted small"><a href="#/chess" id="back">← Chess menu</a> · vs Bot level ${cur.level} (~${bot.rating}) · you are ${mine() === 'w' ? 'White' : 'Black'}</p>
          <div class="caps">
            <div>Bot: ${capsHtml(botCaps, mine()) || '<span class="muted">no captures</span>'}</div>
            <div>You: ${capsHtml(myCaps, E.other(mine())) || '<span class="muted">no captures</span>'} ${diff ? `<b class="${diff > 0 ? 'ok' : 'no'}">${diff > 0 ? '+' : ''}${diff}</b>` : ''}</div>
          </div>
          <p class="turn">${G.over ? 'Game over' : G.thinking ? '<span class="spin"></span> Bot is thinking…' : myTurn() ? '<b>Your move</b>' : 'Bot to move'}</p>
          <p class="coach ${G.msgKind}" ${G.msg ? '' : 'hidden'}>${G.msg}</p>
          ${G.pending ? `<div class="row"><button class="btn" id="takeback">Take it back</button><button class="btn ghost" id="keep">Keep my move</button></div>` : ''}
          ${G.over ? '' : `<div class="row game-btns">
            <button class="btn ghost small" id="hint" ${myTurn() && !G.thinking && !G.pending ? '' : 'disabled'}>Hint</button>
            <button class="btn ghost small" id="undo" ${G.sans.length && !G.thinking ? '' : 'disabled'}>Take back</button>
            <button class="btn ghost small danger-text" id="resign">Resign</button>
          </div>`}
          ${G.over ? G.over.html : ''}
          <div class="moves">${pairs.join(' ') || '<span class="muted">Moves will appear here.</span>'}</div>
        </div>
      </div>`;
    const on = (id, fn) => { const el = root.querySelector(id); if (el) el.onclick = fn; };
    on('#back', e => { e.preventDefault(); renderLobby(); });
    on('#hint', hint);
    on('#undo', undo);
    on('#resign', () => { if (confirm('Resign this game? It counts as a loss.')) finish('loss', 'resigned'); });
    on('#takeback', undo);
    on('#keep', () => { G.pending = null; say(''); renderGame(); afterMove(); });
    on('#again', () => startGame());
    on('#menu', () => renderLobby());
    drawGameBoard();
    const mv = root.querySelector('.moves');
    if (mv) mv.scrollTop = mv.scrollHeight;
  }

  function drawGameBoard() {
    const st = G.st;
    const k = st.board.indexOf(st.turn === 'w' ? 'K' : 'k');
    const targets = G.sel >= 0 ? new Set(E.moves(st, { from: G.sel }).map(m => m.to)) : null;
    drawBoard(root.querySelector('#board'), {
      st, flip: mine() === 'b', sel: G.sel, targets, last: G.last, hint: G.hint,
      check: E.inCheck(st) ? k : -1,
      onTap: gameTap,
    });
  }

  function gameTap(i) {
    if (G.over || G.thinking || G.pending || !myTurn()) return;
    const st = G.st, p = st.board[i];
    if (G.sel >= 0) {
      const ms = E.moves(st, { from: G.sel }).filter(m => m.to === i);
      if (ms.length) {
        G.sel = -1;
        if (ms.length > 1) return promoPicker(mine(), t => playerMove(ms.find(m => m.promo === t)));
        return playerMove(ms[0]);
      }
      if (E.pseudo(st, G.sel).some(m => m.to === i)) {
        G.sel = -1;
        say(E.inCheck(st) ? 'You’re in check, and that move doesn’t fix it. Move the king, block, or capture the attacker.'
          : 'That move would leave your king open to capture, so it isn’t allowed.', 'warn');
        return renderGame();
      }
    }
    if (p && (E.isWhite(p) ? 'w' : 'b') === mine() && G.sel !== i) {
      G.sel = i;
      if (!E.moves(st, { from: i }).length) {
        G.sel = -1;
        say(`Your ${pieceName(p)} has no legal moves right now.`, 'warn');
        return renderGame();
      }
    } else G.sel = -1;
    drawGameBoard();
  }

  function push(m) {
    G.sans.push(E.san(G.st, m));
    G.keys.push(E.key(G.st));
    g.current.moves.push(E.uci(m));
    G.last = { from: m.from, to: m.to };
    G.st = m.next;
    G.hint = null;
    Store.save();
  }

  function playerMove(m) {
    const before = new Set(E.hanging(G.st, mine()).map(h => h.sq + h.p));
    push(m);
    say('');
    const s = E.status(G.st, G.keys);
    if (s.over) return gameOver(s);
    if (g.settings.coach) {
      const fresh = E.hanging(G.st, mine()).filter(h => !before.has(h.sq + h.p));
      if (fresh.length) {
        const h = fresh[0];
        say(`Careful: your ${pieceName(h.p)} on ${sq(h.sq)} can be captured ${h.defended ? 'by a cheaper piece' : 'for free (nothing protects it)'}. Take the move back?`, 'warn');
        G.pending = true;
        return renderGame();
      }
    }
    renderGame();
    afterMove();
  }

  // Decide what happens next: bot's turn, coaching, or nothing.
  function afterMove(resumed = false) {
    if (G.over || G.pending) return;
    if (!myTurn()) {
      G.thinking = true;
      renderGame();
      later(botMove, resumed ? 700 : 450);
    }
  }

  function botMove() {
    if (!G || G.over) return;
    const cfg = BOTS[g.current.level - 1];
    const m = E.chooseMove(G.st, { ...cfg, timeMs: 1200 });
    G.thinking = false;
    if (!m) return gameOver(E.status(G.st, G.keys));
    const movedName = pieceName(m.p);
    push(m);
    const s = E.status(G.st, G.keys);
    if (s.over) return gameOver(s);
    say('');
    if (s.check) say(`Check! The bot's ${movedName} is attacking your king. Move the king, block, or capture the attacker.`, 'warn');
    else if (g.settings.coach) {
      const chance = E.hanging(G.st, E.other(mine()))[0];
      const mineHanging = E.hanging(G.st, mine())[0];
      if (mineHanging) say(`The bot is threatening your ${pieceName(mineHanging.p)} on ${sq(mineHanging.sq)}. Can you move it or protect it?`, 'warn');
      else if (chance) say(`Opportunity: the bot's ${pieceName(chance.p)} on ${sq(chance.sq)} can be won. Can you find the capture?`, 'good');
      else say(`The bot moved its ${movedName} to ${sq(m.to)}. What does it threaten?`);
    }
    renderGame();
  }

  function hint() {
    if (!myTurn() || G.over) return;
    const m = E.chooseMove(G.st, { depth: 3, q: true, timeMs: 900 });
    if (!m) return;
    g.current.hints++;
    Store.save();
    G.hint = { from: m.from, to: m.to };
    say(`Hint: move your ${pieceName(m.p)} from ${sq(m.from)} to ${sq(m.to)}${m.cap ? `, capturing the ${pieceName(m.cap)}` : ''}.`, 'good');
    renderGame();
  }

  function undo() {
    clearTimers();
    const mv = g.current.moves;
    if (!mv.length) return;
    // take back to the last position where it was your turn
    mv.pop();
    let st = E.fromFEN(E.START);
    for (const u of mv) st = E.fromUci(st, u).next;
    if (st.turn !== mine() && mv.length) mv.pop();
    g.current.undos++;
    Store.save();
    rebuild();
    say('Move taken back. Your turn.');
    renderGame();
    afterMove();
  }

  function gameOver(s) {
    const r = s.result === 'draw' ? 'draw' : (s.result === 'white') === (mine() === 'w') ? 'win' : 'loss';
    finish(r, s.reason);
  }

  function finish(result, reason) {
    clearTimers();
    const cur = g.current, bot = BOTS[cur.level - 1];
    const before = g.rating;
    const expected = 1 / (1 + Math.pow(10, (bot.rating - before) / 400));
    const k = g.games.length < 5 ? 64 : g.games.length < 15 ? 48 : 32;
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    g.rating = Math.max(100, Math.round(before + k * (score - expected)));
    g.games.push({ at: Date.now(), result, reason, color: cur.color, level: cur.level, botRating: bot.rating,
      ratingBefore: Math.round(before), ratingAfter: g.rating, moves: cur.moves.length, hints: cur.hints, undos: cur.undos });
    g.current = null;
    Store.save();
    Device.playing(false);
    const nextLevel = levelFor(g.rating);
    const change = g.rating - Math.round(before);
    const title = result === 'win' ? 'You win!' : result === 'draw' ? 'Draw' : 'The bot wins';
    G.over = { html: `
      <div class="panel result ${result}">
        <p class="big"><b>${title}</b>: ${reason === 'resigned' ? 'you resigned' : reason}.</p>
        <p>Rating estimate: ${Math.round(before)} → <b>${g.rating}</b> (${change >= 0 ? '+' : ''}${change}).
          Next opponent: Bot level ${nextLevel}${nextLevel > cur.level ? ' ↑' : nextLevel < cur.level ? ' ↓' : ''}.</p>
        <div class="row"><button class="btn" id="again">Play again</button><button class="btn ghost" id="menu">Chess menu</button></div>
      </div>` };
    say('');
    renderGame();
  }

  // ---------- progress & card ----------
  function renderProgress(el) {
    state();
    const gs = g.games;
    const done = LESSONS.filter(l => g.lessons[l.id]).length;
    if (!gs.length) {
      el.innerHTML = `<h2>Chess</h2><p class="muted">Lessons: ${done} of ${LESSONS.length} done. No games finished yet.</p>`;
      return;
    }
    const w = gs.filter(x => x.result === 'win').length, d = gs.filter(x => x.result === 'draw').length;
    el.innerHTML = `
      <h2>Chess</h2>
      <p class="muted">Rating estimate ${g.rating} · ${gs.length} games: ${w} won, ${d} drawn, ${gs.length - w - d} lost · lessons ${done}/${LESSONS.length}</p>
      ${GameKit.chart([{ label: 'Rating estimate', cls: 'mean', values: gs.map(x => x.ratingAfter) }], gs.map(x => x.at))}
      <table class="score">
        <tr><th>Date</th><th>Result</th><th>Bot</th><th>Moves</th><th>Rating</th></tr>
        ${gs.slice(-10).reverse().map(x => `<tr><td>${GameKit.U.fmtDate(x.at)}</td><td>${x.result} (${x.reason})</td><td>level ${x.level}</td><td>${Math.ceil(x.moves / 2)}</td><td>${x.ratingAfter}</td></tr>`).join('')}
      </table>`;
  }

  function cardStatus() {
    state();
    if (g.current) return `<span class="tag live">Game in progress · bot level ${g.current.level}</span>`;
    const done = LESSONS.filter(l => g.lessons[l.id]).length;
    return done < LESSONS.length && !g.games.length
      ? `<span class="tag">Lessons ${done}/${LESSONS.length}</span>`
      : `<span class="tag">Rating ${g.rating} · bot level ${levelFor(g.rating)}</span>`;
  }

  return {
    mount(el) { root = el; state(); renderLobby(); },
    unmount() { clearTimers(); Device.playing(false); document.querySelectorAll('.promo-ov').forEach(o => o.remove()); root = null; G = null; L = null; },
    renderProgress,
    cardStatus,
    _test: { LESSONS, BOTS, levelFor },
  };
})();
