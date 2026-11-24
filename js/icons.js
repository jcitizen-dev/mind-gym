// Small pictures for each game, drawn to look like the game itself.
const ICONS = (() => {
  const svg = body => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
  const BLUE = '#5b8cff', ORANGE = '#f2a541', GREEN = '#3ccf8e', RED = '#ff5d6c', YELLOW = '#f5d142', DIM = '#2a3550', LIGHT = '#e6ebf5';
  return {
    // flashed centre symbol plus a target out at the edge of the field
    speed: svg(`
      <circle cx="24" cy="24" r="20" fill="#0b0f18" stroke="${DIM}" stroke-width="2"/>
      <circle cx="24" cy="24" r="12" fill="none" stroke="${DIM}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <polygon points="24,17 30,28 18,28" fill="${LIGHT}"/>
      <circle cx="37" cy="13" r="4" fill="${YELLOW}"/>
      <path d="M33 9 l-3 -3 M41 9 l3 -3 M41 17 l3 3" stroke="${YELLOW}" stroke-width="1.8" stroke-linecap="round"/>`),
    // a digit in a frame, with two arrows swapping between rule colours
    switch: svg(`
      <rect x="11" y="11" width="26" height="26" rx="5" fill="#0b0f18" stroke="${BLUE}" stroke-width="3"/>
      <text x="24" y="31" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="17" fill="${LIGHT}">7</text>
      <path d="M6 18 a18 18 0 0 1 14 -14" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 4 l-5 -1 M20 4 l-2 5" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round"/>
      <path d="M42 30 a18 18 0 0 1 -14 14" fill="none" stroke="${BLUE}" stroke-width="3" stroke-linecap="round"/>
      <path d="M28 44 l5 1 M28 44 l2 -5" stroke="${BLUE}" stroke-width="3" stroke-linecap="round"/>`),
    // 3x3 grid with one lit square and a sound wave
    dnb: svg(`
      ${[0, 1, 2].flatMap(r => [0, 1, 2].map(c => `<rect x="${3 + c * 11}" y="${11 + r * 11}" width="9" height="9" rx="2" fill="${r === 0 && c === 2 ? BLUE : r === 1 && c === 1 ? 'none' : DIM}"/>`)).join('')}
      <path d="M38 22 q4 5 0 10 M42 18 q7 9 0 18" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="37" cy="27" r="2" fill="${ORANGE}"/>`),
    // scattered tiles lighting up in order
    span: svg(`
      <rect x="4" y="5" width="11" height="11" rx="3" fill="${ORANGE}"/>
      <rect x="27" y="4" width="11" height="11" rx="3" fill="${DIM}"/>
      <rect x="17" y="19" width="11" height="11" rx="3" fill="${ORANGE}"/>
      <rect x="34" y="23" width="11" height="11" rx="3" fill="${DIM}"/>
      <rect x="6" y="33" width="11" height="11" rx="3" fill="${DIM}"/>
      <rect x="26" y="35" width="11" height="11" rx="3" fill="${ORANGE}"/>
      <text font-family="system-ui,sans-serif" font-weight="800" font-size="8" fill="#1d1d1d" text-anchor="middle">
        <tspan x="9.5" y="13.5">1</tspan><tspan x="22.5" y="27.5">2</tspan><tspan x="31.5" y="43.5">3</tspan></text>`),
    // a colour word printed in the "wrong" ink
    stroop: svg(`
      <rect x="2" y="9" width="44" height="30" rx="6" fill="#0b0f18" stroke="${DIM}" stroke-width="2"/>
      <text x="24" y="30" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="15" fill="${BLUE}">RED</text>
      <circle cx="9" cy="44" r="3" fill="${RED}"/><circle cx="19" cy="44" r="3" fill="${GREEN}"/><circle cx="29" cy="44" r="3" fill="${BLUE}"/><circle cx="39" cy="44" r="3" fill="${YELLOW}"/>`),
    // moving dots with trails; the orange ones are the targets
    mot: svg(`
      <rect x="2" y="2" width="44" height="44" rx="8" fill="#0b0f18" stroke="${DIM}" stroke-width="2"/>
      <path d="M7 31 L14 25 M38 8 L33 14" stroke="${ORANGE}" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>
      <path d="M7 7 L11 10 M37 42 L40 35 M23 43 L28 39" stroke="#94a0b8" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>
      <circle cx="17" cy="22" r="4.5" fill="${ORANGE}"/>
      <circle cx="30" cy="17" r="4.5" fill="${ORANGE}"/>
      <circle cx="14" cy="12" r="4.5" fill="#94a0b8"/>
      <circle cx="31" cy="35" r="4.5" fill="#94a0b8"/>
      <circle cx="40" cy="31" r="4.5" fill="#94a0b8"/>`),
    // a corner of the board with a knight
    chess: svg(`
      ${[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3].map(c => `<rect x="${4 + c * 10}" y="${4 + r * 10}" width="10" height="10" fill="${(r + c) % 2 ? '#ad8461' : '#ecdcc0'}"/>`)).join('')}
      <rect x="4" y="4" width="40" height="40" rx="2" fill="none" stroke="#0b0f18" stroke-opacity=".4"/>
      <path d="M15 42 L35 42 L35 38 L32 36 C34 28 33 19 28 13 L27 7 L23 12 C17 14 12 20 11 27 L14 30 L19 27 L22 28 C18 31 16 35 16 38 Z"
        fill="#fff" stroke="#1b1b1b" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="20" cy="19" r="1.6" fill="#1b1b1b"/>`),
  };
})();
