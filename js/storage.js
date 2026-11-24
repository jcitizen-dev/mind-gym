// Shared progress store for every mini game.
// Everything lives in one localStorage key so a single backup file captures it all.
const Store = (() => {
  const KEY = 'mindgym.v1';
  const empty = () => ({ version: 1, games: {} });

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      return d && typeof d.games === 'object' ? d : empty();
    } catch {
      return empty();
    }
  }

  let data = load();

  function save() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  // Returns the live state object for a game, filling in any defaults that
  // were added after the player's data was first saved.
  const merged = new Set();
  function game(id, defaults) {
    if (merged.has(id) && data.games[id]) return data.games[id];
    merged.add(id);
    const saved = data.games[id];
    const fresh = structuredClone(defaults);
    data.games[id] = saved
      ? { ...fresh, ...saved, settings: { ...fresh.settings, ...(saved.settings || {}) } }
      : fresh;
    save();
    return data.games[id];
  }

  function exportJSON() {
    return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
  }

  function importJSON(text) {
    const d = JSON.parse(text);
    if (!d || typeof d.games !== 'object') throw new Error('That file is not a Mind Gym backup.');
    delete d.exportedAt;
    data = d;
    merged.clear();
    save();
  }

  function resetGame(id) {
    delete data.games[id];
    merged.delete(id);
    save();
  }

  return { game, save, exportJSON, importJSON, resetGame };
})();
