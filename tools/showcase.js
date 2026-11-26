// Showcase für Karakuri: Thermikdoku von seiner schönsten Seite.
// Rätsel kommen mit festen Seeds aus js/puzzle.js, gelöst wird Schritt für Schritt mit dem Logik-Löser des Spiels.
import { generateForDifficulty, createLogicState, nextLogicStep, applyStep } from '../js/puzzle.js';

export const url = '?zeit=tag#debug';

// Situationen: Stufe, Seed, Tageszeit, wie viele Schirme schon stehen, Spielstand
const S = {
  'erster-flug': { title: 'Erster Flug am Übungshang', kind: 'win', level: 'Leicht · Flug 1', diff: 'leicht', seed: 1, daytime: 'morgen', placed: 0, xp: 150, solved: 0, elapsed: 0 },
  'karakorum-nacht': { title: 'Expedition 12×12 bei Nacht', kind: 'win', level: 'Expedition · Flug 24', diff: 'expedition', seed: 52, daytime: 'nacht', placed: 6, xp: 12400, solved: 23, elapsed: 511 },
  'himalaya-legende': { title: 'Himalaya 10×10: Aufstieg zur Legende', kind: 'win', level: 'Experte · Flug 41', diff: 'experte', seed: 42, daytime: 'abend', placed: 4, xp: 20640, solved: 40, elapsed: 377 },
  'alpenpass-combo': { title: 'Alpenpass 8×8 in einem Zug: Combo ×8', kind: 'action', level: 'Schwer · Flug 12', diff: 'schwer', seed: 31, daytime: 'tag', placed: 0, xp: 5200, solved: 11, elapsed: 0, fast: true },
  'gegenwind': { title: 'Gegenwind: ein Schirm zu spät', kind: 'fail', level: 'Experte · Gegenwind', diff: 'experte', seed: 3, daytime: 'tag', placed: 7, xp: 16000, solved: 18, elapsed: 400, mods: { gegenwind: true }, limit: 420 },
  'zeitflug': { title: 'Zeitflug: Endspurt in den letzten Sekunden', kind: 'action', level: 'Zeitflug', zeitflug: true, daytime: 'morgen', xp: 9800 },
  'karakorum-fast': { title: 'Karakorum 11×11 kurz vor dem Ziel', kind: 'progress', level: 'Expedition · Flug 9', diff: 'expedition', seed: 51, daytime: 'abend', placed: 8, xp: 14800, solved: 8, elapsed: 1290, stopBefore: 1 },
  'wolkenflug': { title: 'Wolkenflug: ganz ohne Kreuze', kind: 'win', level: 'Mittel · Wolkenflug', diff: 'mittel', seed: 1, daytime: 'abend', placed: 2, xp: 9000, solved: 30, elapsed: 141, mods: { wolkenflug: true } },
};

// Lösungsweg wie ein Mensch: Schritte des Logik-Lösers (Schirm setzen oder Felder ausschließen)
function plan(p) {
  const st = createLogicState(p.n, p.regions);
  const steps = [];
  while (st.count < p.n) {
    let step = nextLogicStep(st, 5);
    if (!step) { // Notfall: nächsten Schirm der Lösung nehmen
      const r = p.solution.findIndex((c, r) => !st.placed[r * p.n + c]);
      step = { place: r * p.n + p.solution[r] };
    }
    applyStep(st, step);
    steps.push(step);
  }
  return steps;
}

// Spielstand nach den ersten k Schirmen: Schirme plus Kreuze auf allen ausgeschlossenen Feldern
function presetCells(p, steps, k, withX) {
  const st = createLogicState(p.n, p.regions);
  let done = 0, idx = 0;
  while (done < k) { const s = steps[idx++]; applyStep(st, s); if (s.place != null) done++; }
  const cells = Array.from({ length: p.n * p.n }, (_, i) => st.placed[i] ? 2 : (withX && !st.cand[i] ? 1 : 0));
  return { cells, rest: steps.slice(idx) };
}

const puzzleOf = (s) => generateForDifficulty(s.diff, s.seed);

export async function storage(id) {
  const s = S[id];
  const save = {
    seenHelp: true, kofiShown: true, xp: s.xp, mods: {}, pool: {}, current: {}, stats: {},
    zeitflug: { best: 7, runs: 12 },
  };
  if (!s.zeitflug) {
    const p = puzzleOf(s);
    const { cells } = presetCells(p, plan(p), s.placed, !s.mods?.wolkenflug);
    save.current[s.diff] = { puzzle: p, cells, elapsed: s.elapsed, hints: 0, mistakes: 0, bestCombo: s.placed > 1 ? 3 : 0, mods: s.mods || {}, limit: s.limit || null };
    save.stats[s.diff] = { solved: s.solved, best: s.elapsed ? s.elapsed + 95 : 160, perfect: Math.floor(s.solved / 2) };
  }
  // Vorrat füllen, damit das Spiel im Hintergrund nichts erzeugt
  const spare = generateForDifficulty('leicht', 7);
  for (const d of ['leicht', 'mittel', 'schwer', 'experte', 'expedition']) save.pool[d] = spare;
  return { 'thermikdoku:save': JSON.stringify(save) };
}

export async function list() {
  return Object.entries(S).map(([id, s]) => ({ id, title: s.title, kind: s.kind, level: s.level }));
}

// ---------- Hilfen ----------
const D = () => window.thermikDebug;
const $ = (q) => document.querySelector(q);
function center(i) {
  const r = $(`#board .cell[data-i="${i}"]`).getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}
function setDaytime(dt) {
  history.replaceState(null, '', `?zeit=${dt}#debug`);
  document.documentElement.dataset.daytime = dt;
}
async function boardReady(sc, check = () => true) {
  await sc.until(() => D()?.G.cells && check() && document.querySelectorAll('#board .cell').length === D().G.n ** 2, 20000);
  await sc.wait(1300); // Brett und Schirme fliegen ein
}
// Doppeltippen setzt einen Schirm
async function glider(sc, i) { const [x, y] = center(i); await sc.tap(x, y); await sc.tap(x, y); }
async function cross(sc, i) { const [x, y] = center(i); await sc.tap(x, y); }
const modalOpen = (sel) => $(sel)?.classList.contains('show');

// CSS läuft in Echtzeit, die Spieluhr nicht: vor einem Bild Übergänge und Einflüge zu Ende spielen
const SETTLE = new Set(['boardIn', 'cardIn', 'popIn', 'drop', 'pgPop', 'winDrop', 'starPop', 'rankIn', 'fadeIn', 'xIn', 'stamp']);
async function shot(sc, label) {
  if (sc.mode === 'shots') {
    for (const a of document.getAnimations()) {
      try { if (a instanceof CSSTransition || SETTLE.has(a.animationName)) a.finish(); } catch {}
    }
  }
  await sc.shot(label);
}

// Restliche Schritte spielen: Kreuze (sparsam) und Schirme. onBeforeLast vor dem letzten Schirm.
async function solveRest(sc, rest, { xBudget = 3, fast = false, noX = false, stopBefore = 0, onHalf, onBeforeLast } = {}) {
  const places = rest.filter((s) => s.place != null).length;
  let placed = 0, budget = xBudget;
  const think = () => fast ? sc.think(300, 600) : sc.think();
  for (const s of rest) {
    if (s.place == null) {
      if (noX) continue;
      for (const i of s.elim) {
        if (budget <= 0) break;
        if (D().G.cells[i] !== 0) continue;
        await think(); await cross(sc, i); budget--;
      }
      continue;
    }
    if (placed === places - stopBefore) return;
    if (placed === places - stopBefore - 1) await onBeforeLast?.();
    await think();
    await glider(sc, s.place);
    placed++; budget = xBudget;
    if (!stopBefore && placed === Math.ceil(places / 2)) await onHalf?.();
  }
}

async function waitWin(sc) {
  await sc.until(() => modalOpen('#modal-win'), 15000);
  await sc.mark('win');
  await sc.wait(2200); // Sterne und Punkte
  await shot(sc, 'Gelandet');
}

// ---------- Vorführung ----------
export async function play(id, sc) {
  const s = S[id];
  setDaytime(s.daytime);
  await sc.wait(600);
  if (s.zeitflug) return zeitflug(sc);

  await sc.click(`[data-diff="${s.diff}"]`);
  await boardReady(sc, () => D().G.key === s.diff);
  const G = D().G;
  const p = { n: G.n, regions: G.regions, solution: G.solution };
  const { rest } = presetCells(p, plan(p), s.placed, !s.mods?.wolkenflug);

  if (s.mods?.gegenwind) return gegenwind(sc, rest);

  await sc.mark('ready');
  await shot(sc, 'Ausgangslage');
  await solveRest(sc, rest, {
    fast: s.fast, xBudget: s.fast ? 0 : 3, noX: !!s.mods?.wolkenflug, stopBefore: s.stopBefore || 0,
    onHalf: () => shot(sc, 'Mittendrin'),
    onBeforeLast: async () => { await shot(sc, 'Kurz vor Schluss'); await sc.mark('climax'); },
  });
  if (s.stopBefore) { await sc.wait(1200); await shot(sc, 'Letzter Schirm'); return { outcome: 'other' }; }
  await waitWin(sc);
  if (s.xp + 600 > 21000 || s.diff === 'leicht') { // Rang-Aufstieg
    if (await sc.until(() => $('#rankup')?.classList.contains('show'), 6000)) { await sc.wait(1200); await shot(sc, 'Neuer Rang'); }
  }
  return { outcome: 'win' };
}

// Gegenwind: der vorletzte Schirm sitzt, dann ein Fehlgriff, und die Zeit läuft ab
async function gegenwind(sc, rest) {
  const G = D().G;
  G.elapsed = G.limit - 13 - (performance.now() - G.startedAt) / 1000; // noch 13 Sekunden
  await sc.wait(600);
  await sc.mark('ready');
  await shot(sc, 'Ausgangslage');
  const places = rest.filter((s) => s.place != null).map((s) => s.place);
  await sc.think(); await glider(sc, places[0]);
  await sc.wait(900);
  // Fehlgriff: ein Feld in der letzten Reihe neben einem Schirm
  const n = G.n, last = places[1], r = (last / n) | 0;
  const touches = (i) => G.cells.some((v, j) => v === 2 && Math.abs(((j / n) | 0) - ((i / n) | 0)) <= 1 && Math.abs((j % n) - (i % n)) <= 1);
  const cand = [...Array(n).keys()].map((c) => r * n + c).filter((i) => i !== last && G.cells[i] !== 2 && touches(i));
  const wrong = cand.sort((a, b) => Math.abs(a - last) - Math.abs(b - last))[0];
  await sc.mark('climax');
  await sc.think(); await glider(sc, wrong);
  await sc.wait(700);
  await shot(sc, 'Zusammenstoß');
  await sc.think(); await cross(sc, wrong); // Schirm wieder weg
  await sc.until(() => modalOpen('#modal-wind'), 20000);
  await sc.mark('fail');
  await sc.wait(900);
  await shot(sc, 'Abgetrieben');
  return { outcome: 'fail' };
}

// Zeitflug: die letzten Sekunden, Rätsel um Rätsel bis zur Wertung
async function zeitflug(sc) {
  await sc.click('[data-action="zeitflug"]');
  await boardReady(sc, () => D().G.mode === 'zeitflug');
  const G = D().G;
  G.run.solved = 6;
  G.elapsed = 300 - 23 - (performance.now() - G.startedAt) / 1000; // noch 23 Sekunden
  await sc.mark('ready');
  await shot(sc, 'Ausgangslage');
  let round = 0;
  while (!modalOpen('#modal-win') && round < 6) {
    const regions = G.regions;
    const steps = plan({ n: G.n, regions, solution: G.solution });
    if (G.run.solved === 8) await sc.mark('climax');
    for (const st of steps) {
      if (st.place == null) continue;
      if (G.done) break;
      await sc.think(280, 520);
      if (G.done) break;
      await glider(sc, st.place);
    }
    round++;
    if (round === 2) await shot(sc, 'Mittendrin');
    await sc.until(() => modalOpen('#modal-win') || (G.regions !== regions && G.cells && !G.done), 8000);
    if (!modalOpen('#modal-win')) await sc.wait(700);
  }
  await sc.until(() => modalOpen('#modal-win'), 20000);
  await sc.mark('win');
  await sc.wait(2200);
  await shot(sc, 'Wertung');
  return { outcome: 'win' };
}
