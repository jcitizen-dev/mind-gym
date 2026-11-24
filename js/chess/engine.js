// Chess rules and a small search-based bot. No dependencies.
// Board: array of 64, index 0 = a8 ... 63 = h1 (same order as FEN). Pieces: 'PNBRQK' white, 'pnbrqk' black, null empty.
const ChessEngine = (() => {
  const FILES = 'abcdefgh';
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const RK = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const SLIDES = { r: RK, b: BS, q: [...RK, ...BS] };

  const isWhite = p => p >= 'A' && p <= 'Z';
  const typeOf = p => p.toLowerCase();
  const sqName = i => FILES[i & 7] + (8 - (i >> 3));
  const sqIndex = s => (8 - +s[1]) * 8 + FILES.indexOf(s[0]);
  const other = c => (c === 'w' ? 'b' : 'w');

  // ---------- FEN ----------
  function fromFEN(fen) {
    const [pos, turn, cast, ep, half, full] = fen.trim().split(/\s+/);
    const board = [];
    for (const ch of pos.replace(/\//g, '')) {
      if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) board.push(null);
      else board.push(ch);
    }
    return {
      board,
      turn: turn || 'w',
      castling: cast && cast !== '-' ? cast : '',
      ep: ep && ep !== '-' ? sqIndex(ep) : -1,
      half: +half || 0,
      full: +full || 1,
    };
  }

  function toFEN(st) {
    let s = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = st.board[r * 8 + c];
        if (!p) { empty++; continue; }
        if (empty) { s += empty; empty = 0; }
        s += p;
      }
      if (empty) s += empty;
      if (r < 7) s += '/';
    }
    return `${s} ${st.turn} ${st.castling || '-'} ${st.ep >= 0 ? sqName(st.ep) : '-'} ${st.half} ${st.full}`;
  }

  // Position identity for repetition (ignores move counters).
  const key = st => st.board.map(p => p || '.').join('') + st.turn + st.castling + st.ep;

  // ---------- attacks ----------
  // Pieces of colour `by` that attack square i (as piece chars).
  function attackers(b, i, by, firstOnly = false) {
    const out = [];
    const r = i >> 3, c = i & 7, w = by === 'w';
    const P = w ? 'P' : 'p', N = w ? 'N' : 'n', B = w ? 'B' : 'b', R = w ? 'R' : 'r', Q = w ? 'Q' : 'q', K = w ? 'K' : 'k';
    const pr = w ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) {
      if (c > 0 && b[pr * 8 + c - 1] === P) { out.push(P); if (firstOnly) return out; }
      if (c < 7 && b[pr * 8 + c + 1] === P) { out.push(P); if (firstOnly) return out; }
    }
    for (const [dr, dc] of KN) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === N) { out.push(N); if (firstOnly) return out; }
    }
    for (const [dr, dc] of KG) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === K) { out.push(K); if (firstOnly) return out; }
    }
    for (const [dirs, a] of [[RK, R], [BS, B]]) {
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const p = b[rr * 8 + cc];
          if (p) {
            if (p === a || p === Q) { out.push(p); if (firstOnly) return out; }
            break;
          }
          rr += dr; cc += dc;
        }
      }
    }
    return out;
  }
  const attacked = (b, i, by) => attackers(b, i, by, true).length > 0;

  // ---------- move generation ----------
  // Pseudo-legal moves for the piece on `from` (does not check whether the own king is left in check).
  function pseudo(st, from, out = []) {
    const b = st.board, p = b[from];
    if (!p) return out;
    const w = isWhite(p), t = typeOf(p), r = from >> 3, c = from & 7;
    const enemy = q => q && isWhite(q) !== w;
    const add = (to, flag = null) => {
      const cap = flag === 'ep' ? (w ? 'p' : 'P') : b[to];
      if (t === 'p' && (to >> 3 === 0 || to >> 3 === 7)) {
        for (const pr of 'qrbn') out.push({ from, to, p, cap, promo: pr, flag });
      } else out.push({ from, to, p, cap, promo: null, flag });
    };

    if (t === 'p') {
      const dr = w ? -1 : 1, start = w ? 6 : 1, r1 = r + dr;
      if (r1 < 0 || r1 > 7) return out;
      if (!b[r1 * 8 + c]) {
        add(r1 * 8 + c);
        if (r === start && !b[(r + 2 * dr) * 8 + c]) add((r + 2 * dr) * 8 + c, '2');
      }
      for (const dc of [-1, 1]) {
        const cc = c + dc;
        if (cc < 0 || cc > 7) continue;
        const to = r1 * 8 + cc;
        if (enemy(b[to])) add(to);
        else if (to === st.ep) add(to, 'ep');
      }
      return out;
    }
    if (t === 'n' || t === 'k') {
      for (const [dr, dc] of t === 'n' ? KN : KG) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const q = b[rr * 8 + cc];
        if (!q || enemy(q)) add(rr * 8 + cc);
      }
      if (t === 'k' && st.castling) {
        const home = w ? 60 : 4, by = w ? 'b' : 'w', rook = w ? 'R' : 'r';
        if (from === home && !attacked(b, home, by)) {
          if (st.castling.includes(w ? 'K' : 'k') && !b[home + 1] && !b[home + 2] && b[home + 3] === rook
            && !attacked(b, home + 1, by) && !attacked(b, home + 2, by)) add(home + 2, 'k');
          if (st.castling.includes(w ? 'Q' : 'q') && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === rook
            && !attacked(b, home - 1, by) && !attacked(b, home - 2, by)) add(home - 2, 'q');
        }
      }
      return out;
    }
    for (const [dr, dc] of SLIDES[t]) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const q = b[rr * 8 + cc];
        if (!q) add(rr * 8 + cc);
        else { if (enemy(q)) add(rr * 8 + cc); break; }
        rr += dr; cc += dc;
      }
    }
    return out;
  }

  function make(st, m) {
    const b = st.board.slice(), w = isWhite(m.p);
    b[m.from] = null;
    b[m.to] = m.promo ? (w ? m.promo.toUpperCase() : m.promo) : m.p;
    if (m.flag === 'ep') b[m.to + (w ? 8 : -8)] = null;
    if (m.flag === 'k') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; }
    if (m.flag === 'q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; }
    let cs = st.castling;
    if (cs) {
      if (m.p === 'K') cs = cs.replace(/[KQ]/g, '');
      if (m.p === 'k') cs = cs.replace(/[kq]/g, '');
      for (const s of [m.from, m.to]) {
        if (s === 63) cs = cs.replace('K', '');
        if (s === 56) cs = cs.replace('Q', '');
        if (s === 7) cs = cs.replace('k', '');
        if (s === 0) cs = cs.replace('q', '');
      }
    }
    return {
      board: b,
      turn: w ? 'b' : 'w',
      castling: cs,
      ep: m.flag === '2' ? (m.from + m.to) / 2 : -1,
      half: typeOf(m.p) === 'p' || m.cap ? 0 : st.half + 1,
      full: st.full + (w ? 0 : 1),
    };
  }

  // Legal moves for the side to move. Each move carries `next`, the resulting position.
  function moves(st, { captures = false, from = -1 } = {}) {
    const raw = [], w = st.turn === 'w';
    if (from >= 0) pseudo(st, from, raw);
    else for (let i = 0; i < 64; i++) { const p = st.board[i]; if (p && isWhite(p) === w) pseudo(st, i, raw); }
    const out = [];
    for (const m of raw) {
      if (captures && !m.cap && !m.promo) continue;
      const n = make(st, m);
      const k = n.board.indexOf(w ? 'K' : 'k');
      if (k < 0 || !attacked(n.board, k, n.turn)) { m.next = n; out.push(m); }
    }
    return out;
  }

  function inCheck(st) {
    const k = st.board.indexOf(st.turn === 'w' ? 'K' : 'k');
    return k >= 0 && attacked(st.board, k, other(st.turn));
  }

  function insufficient(st) {
    const rest = st.board.filter(p => p && typeOf(p) !== 'k');
    return rest.length === 0 || (rest.length === 1 && 'nb'.includes(typeOf(rest[0])));
  }

  // Result of the position, given the keys of every earlier position in the game.
  function status(st, history = []) {
    const legal = moves(st);
    const check = inCheck(st);
    if (!legal.length) return { over: true, result: check ? (st.turn === 'w' ? 'black' : 'white') : 'draw', reason: check ? 'checkmate' : 'stalemate', check, legal };
    if (insufficient(st)) return { over: true, result: 'draw', reason: 'insufficient material', check, legal };
    if (st.half >= 100) return { over: true, result: 'draw', reason: '50-move rule', check, legal };
    const k = key(st);
    if (history.filter(h => h === k).length >= 2) return { over: true, result: 'draw', reason: 'threefold repetition', check, legal };
    return { over: false, check, legal };
  }

  // ---------- notation ----------
  const uci = m => sqName(m.from) + sqName(m.to) + (m.promo || '');
  const fromUci = (st, u) => moves(st).find(m => uci(m) === u) || null;

  function san(st, m, legal = moves(st)) {
    let s;
    if (m.flag === 'k') s = 'O-O';
    else if (m.flag === 'q') s = 'O-O-O';
    else {
      const t = typeOf(m.p);
      if (t === 'p') {
        s = (m.cap ? FILES[m.from & 7] + 'x' : '') + sqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
      } else {
        const twins = legal.filter(o => o.p === m.p && o.to === m.to && o.from !== m.from);
        let d = '';
        if (twins.length) {
          if (!twins.some(o => (o.from & 7) === (m.from & 7))) d = FILES[m.from & 7];
          else if (!twins.some(o => o.from >> 3 === m.from >> 3)) d = String(8 - (m.from >> 3));
          else d = sqName(m.from);
        }
        s = t.toUpperCase() + d + (m.cap ? 'x' : '') + sqName(m.to);
      }
    }
    const n = m.next || make(st, m);
    if (inCheck(n)) s += moves(n).length ? '+' : '#';
    return s;
  }

  // ---------- evaluation ----------
  // Piece-square tables from White's point of view, index 0 = a8.
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
  };

  // Score in centipawns from the side to move's point of view.
  function evaluate(st) {
    const b = st.board;
    let heavy = 0;
    for (const p of b) if (p) { const t = typeOf(p); if (t !== 'p' && t !== 'k') heavy += VAL[t]; }
    const endgame = heavy <= 2600;
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const t = typeOf(p), w = isWhite(p);
      const tbl = t === 'k' ? (endgame ? PST.ke : PST.k) : PST[t];
      const v = VAL[t] + tbl[w ? i : i ^ 56];
      s += w ? v : -v;
    }
    return st.turn === 'w' ? s : -s;
  }

  // ---------- search ----------
  const MATE = 1e6;
  const orderScore = m => (m.cap ? 10000 + 10 * VAL[typeOf(m.cap)] - VAL[typeOf(m.p)] : 0) + (m.promo ? 8000 : 0);
  const order = ms => ms.sort((a, b) => orderScore(b) - orderScore(a));

  function quiesce(st, alpha, beta, ctx, qd) {
    ctx.nodes++;
    const stand = evaluate(st);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qd >= 6) return alpha;
    for (const m of order(moves(st, { captures: true }))) {
      const sc = -quiesce(m.next, -beta, -alpha, ctx, qd + 1);
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function negamax(st, depth, alpha, beta, ply, ctx) {
    if ((++ctx.nodes & 1023) === 0 && performance.now() > ctx.deadline) throw ctx;
    if (st.half >= 100) return 0;
    if (depth <= 0) return ctx.q ? quiesce(st, alpha, beta, ctx, 0) : evaluate(st);
    const ms = moves(st);
    if (!ms.length) return inCheck(st) ? -MATE + ply : 0;
    for (const m of order(ms)) {
      const sc = -negamax(m.next, depth - 1, -beta, -alpha, ply + 1, ctx);
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  // Pick a move. depth: plies; noise: random centipawns added to each root score (weaker play);
  // blunder: chance of a completely random move; q: look through capture sequences; timeMs: time cap.
  function chooseMove(st, { depth = 2, noise = 0, blunder = 0, q = false, timeMs = 1500, rng = Math.random } = {}) {
    const ms = moves(st);
    if (!ms.length) return null;
    if (ms.length === 1) return ms[0];
    if (rng() < blunder) return ms[Math.floor(rng() * ms.length)];
    const ctx = { nodes: 0, deadline: performance.now() + timeMs, q };
    const margin = 2 * noise + 1;
    let scored = order(ms).map(m => ({ m, s: 0 }));
    for (let d = 1; d <= depth; d++) {
      try {
        const cur = [];
        let best = -Infinity;
        for (const x of scored) {
          const lo = best === -Infinity ? -2 * MATE : best - margin;
          const s = -negamax(x.m.next, d - 1, -2 * MATE, -lo, 1, ctx);
          cur.push({ m: x.m, s });
          if (s > best) best = s;
        }
        scored = cur.sort((a, b) => b.s - a.s);
      } catch (e) {
        if (e !== ctx) throw e;
        break; // out of time: keep the last finished depth
      }
    }
    const pick = scored
      .map(x => ({ m: x.m, s: x.s + (noise ? (rng() * 2 - 1) * noise : 0) }))
      .sort((a, b) => b.s - a.s);
    return pick[0].m;
  }

  // ---------- teaching helpers ----------
  // Pieces of `color` that can be won: attacked and either undefended or attacked by something cheaper.
  function hanging(st, color) {
    const b = st.board, them = other(color), out = [];
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p || (isWhite(p) ? 'w' : 'b') !== color || typeOf(p) === 'k') continue;
      const att = attackers(b, i, them);
      if (!att.length) continue;
      const cheapest = Math.min(...att.map(a => VAL[typeOf(a)] || 2000));
      const defended = attackers(b, i, color).length > 0;
      if (!defended || cheapest < VAL[typeOf(p)]) out.push({ sq: i, p, defended, cheapest });
    }
    return out.sort((a, c) => VAL[typeOf(c.p)] - VAL[typeOf(a.p)]);
  }

  function perft(st, depth) {
    if (depth === 0) return 1;
    const ms = moves(st);
    if (depth === 1) return ms.length;
    let n = 0;
    for (const m of ms) n += perft(m.next, depth - 1);
    return n;
  }

  return {
    START, VAL, FILES, fromFEN, toFEN, key, moves, pseudo, make, inCheck, status, attackers, attacked,
    uci, fromUci, san, evaluate, chooseMove, hanging, perft, sqName, sqIndex, isWhite, typeOf, other,
  };
})();

if (typeof module !== 'undefined') module.exports = ChessEngine;
