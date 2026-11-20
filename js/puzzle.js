// Thermikdoku – Puzzle-Generator & Solver
// Regeln: genau ein Schirm pro Reihe, Spalte und Zone; Schirme berühren sich nicht (auch nicht diagonal).

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Zufällige Permutation, bei der benachbarte Reihen nicht in benachbarten Spalten liegen
function randomPlacement(n, rng) {
  const pos = new Array(n);
  const used = new Array(n).fill(false);
  function rec(r) {
    if (r === n) return true;
    const cols = shuffle([...Array(n).keys()], rng);
    for (const c of cols) {
      if (used[c]) continue;
      if (r > 0 && Math.abs(pos[r - 1] - c) <= 1) continue;
      used[c] = true; pos[r] = c;
      if (rec(r + 1)) return true;
      used[c] = false;
    }
    return false;
  }
  rec(0);
  return pos;
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function growRegions(n, placement, rng) {
  const regions = new Int8Array(n * n).fill(-1);
  for (let r = 0; r < n; r++) regions[r * n + placement[r]] = r;
  const weights = Array.from({ length: n }, () => 0.45 + rng() * 1.1);
  let remaining = n * n - n;
  while (remaining > 0) {
    // Frontier pro Region sammeln
    const frontier = Array.from({ length: n }, () => []);
    for (let i = 0; i < n * n; i++) {
      if (regions[i] !== -1) continue;
      const r = (i / n) | 0, c = i % n;
      for (const [dr, dc] of DIRS) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const g = regions[rr * n + cc];
        if (g !== -1) frontier[g].push(i);
      }
    }
    let total = 0;
    for (let g = 0; g < n; g++) if (frontier[g].length) total += weights[g];
    let pick = rng() * total, g = 0;
    for (; g < n; g++) {
      if (!frontier[g].length) continue;
      pick -= weights[g];
      if (pick <= 0) break;
    }
    if (g >= n) g = frontier.findIndex((f) => f.length);
    const f = frontier[g];
    regions[f[Math.floor(rng() * f.length)]] = g;
    remaining--;
  }
  return regions;
}

// Zählt Lösungen (bis limit). Wählt immer die Reihe, Spalte oder Zone mit den
// wenigsten freien Plätzen – so bleibt die Suche auch bei 12×12 schnell.
export function solve(regions, n, limit = 2) {
  const N = n * n;
  const sols = [];
  const cand = new Uint8Array(N).fill(1);
  const units = [];
  for (let r = 0; r < n; r++) units.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) units.push(Array.from({ length: n }, (_, r) => r * n + c));
  const zones = Array.from({ length: n }, () => []);
  for (let i = 0; i < N; i++) zones[regions[i]].push(i);
  units.push(...zones);
  const used = new Uint8Array(units.length);
  const pos = new Array(n);
  const trail = [];
  function place(i) {
    const r = (i / n) | 0, c = i % n;
    const mark = trail.length;
    const kill = (j) => { if (cand[j]) { cand[j] = 0; trail.push(j); } };
    for (const j of units[r]) kill(j);
    for (const j of units[n + c]) kill(j);
    for (const j of zones[regions[i]]) kill(j);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n) kill(rr * n + cc);
    }
    used[r] = used[n + c] = used[2 * n + regions[i]] = 1;
    pos[r] = c;
    return mark;
  }
  function unplace(i, mark) {
    const r = (i / n) | 0, c = i % n;
    while (trail.length > mark) cand[trail.pop()] = 1;
    used[r] = used[n + c] = used[2 * n + regions[i]] = 0;
  }
  function rec(placed) {
    if (sols.length >= limit) return;
    if (placed === n) { sols.push(pos.slice()); return; }
    let best = -1, bestCount = Infinity;
    for (let u = 0; u < units.length; u++) {
      if (used[u]) continue;
      let k = 0;
      for (const j of units[u]) k += cand[j];
      if (k === 0) return; // Sackgasse
      if (k < bestCount) { bestCount = k; best = u; if (k === 1) break; }
    }
    for (const i of units[best].filter((j) => cand[j])) {
      const mark = place(i);
      rec(placed + 1);
      unplace(i, mark);
      if (sols.length >= limit) return;
    }
  }
  rec(0);
  return sols;
}

function connectedWithout(regions, n, g, skip) {
  let start = -1, count = 0;
  for (let i = 0; i < n * n; i++) {
    if (i !== skip && regions[i] === g) { count++; if (start < 0) start = i; }
  }
  if (count === 0) return false;
  const seen = new Uint8Array(n * n);
  const stack = [start]; seen[start] = 1; let reached = 0;
  while (stack.length) {
    const i = stack.pop(); reached++;
    const r = (i / n) | 0, c = i % n;
    for (const [dr, dc] of DIRS) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const j = rr * n + cc;
      if (j === skip || seen[j] || regions[j] !== g) continue;
      seen[j] = 1; stack.push(j);
    }
  }
  return reached === count;
}

export function generatePuzzle(n, seed) {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const placement = randomPlacement(n, rng);
    const regions = growRegions(n, placement, rng);
    for (let iter = 0; iter < 500; iter++) {
      const sols = solve(regions, n, 2);
      if (sols.length === 1) {
        return { n, regions, solution: placement, colorSeed: Math.floor(rng() * 1e9) };
      }
      // Ein Feld einer anderen Lösung in eine Nachbarzone schieben, damit diese Lösung wegfällt.
      // Klappt das bei der ersten anderen Lösung nirgends, weitere Lösungen durchprobieren.
      const tryAlt = (alt) => {
        const rows = shuffle([...Array(n).keys()].filter((r) => alt[r] !== placement[r]), rng);
        for (const r of rows) {
          const cell = r * n + alt[r];
          const A = regions[cell];
          const c = alt[r];
          const neigh = [];
          for (const [dr, dc] of DIRS) {
            const rr = r + dr, cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
            const B = regions[rr * n + cc];
            if (B !== A && !neigh.includes(B)) neigh.push(B);
          }
          if (!neigh.length || !connectedWithout(regions, n, A, cell)) continue;
          regions[cell] = neigh[Math.floor(rng() * neigh.length)];
          return true;
        }
        return false;
      };
      const isAlt = (s) => s.some((c, r) => c !== placement[r]);
      let moved = tryAlt(sols.find(isAlt));
      // (lohnt sich erst bei großen Feldern, kleine starten lieber neu)
      if (!moved && n >= 11) for (const alt of solve(regions, n, 24).filter(isAlt)) if ((moved = tryAlt(alt))) break;
      if (!moved) break;
    }
  }
  throw new Error('Kein Puzzle gefunden');
}

// =====================================================================
// Logik-Löser: löst wie ein Mensch, Schritt für Schritt, ohne Raten.
// Techniken (aufsteigend schwer):
//  1 single   – eine Reihe/Spalte/Zone hat nur noch einen freien Platz
//  2 confine  – Zone liegt ganz in einer Reihe/Spalte (oder umgekehrt)
//  3 block    – ein Schirm hier würde eine andere Einheit komplett blockieren
//  4 subset   – k Zonen passen nur in k Reihen/Spalten (oder umgekehrt)
//  5 probe    – Probeflug: ein Schirm hier führt zwangsläufig zum Widerspruch
// =====================================================================

export const TECH_NAMES = ['', 'Einzelplatz', 'Eingesperrt', 'Blockade', 'Gruppen', 'Probeflug'];

function buildUnits(n, regions) {
  const units = [];
  for (let r = 0; r < n; r++) units.push({ kind: 'row', idx: r, cells: Array.from({ length: n }, (_, c) => r * n + c) });
  for (let c = 0; c < n; c++) units.push({ kind: 'col', idx: c, cells: Array.from({ length: n }, (_, r) => r * n + c) });
  for (let g = 0; g < n; g++) {
    const cells = [];
    for (let i = 0; i < n * n; i++) if (regions[i] === g) cells.push(i);
    units.push({ kind: 'zone', idx: g, cells });
  }
  return units;
}

export function createLogicState(n, regions) {
  return {
    n, regions,
    units: buildUnits(n, regions),
    cand: new Uint8Array(n * n).fill(1),
    placed: new Uint8Array(n * n),
    count: 0,
  };
}

function cloneState(st) {
  return { ...st, cand: st.cand.slice(), placed: st.placed.slice() };
}

export function conflicts(n, regions, a, b) {
  const ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
  return ar === br || ac === bc || regions[a] === regions[b] || (Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1);
}

export function placeIn(st, i) {
  const { n, regions } = st;
  st.placed[i] = 1; st.count++;
  for (let j = 0; j < n * n; j++) if (st.cand[j] && conflicts(n, regions, i, j)) st.cand[j] = 0;
  st.cand[i] = 0;
}

function unitOpen(st, u) { return !u.cells.some((i) => st.placed[i]); }
function unitCands(st, u) { return u.cells.filter((i) => st.cand[i]); }
function unitOf(st, kind, idx) {
  const n = st.n;
  return st.units[(kind === 'row' ? 0 : kind === 'col' ? n : 2 * n) + idx];
}
const keyOf = (n, kind, i) => (kind === 'row' ? (i / n) | 0 : kind === 'col' ? i % n : null);

function contradiction(st) {
  for (const u of st.units) if (unitOpen(st, u) && unitCands(st, u).length === 0) return u;
  return null;
}

function* combos(arr, k, start = 0, acc = []) {
  if (acc.length === k) { yield acc.slice(); return; }
  for (let i = start; i < arr.length; i++) { acc.push(arr[i]); yield* combos(arr, k, i + 1, acc); acc.pop(); }
}

export function nextLogicStep(st, maxTech = 5) {
  const { n, regions } = st;
  const open = st.units.filter((u) => unitOpen(st, u));

  // 1 – Einzelplatz
  for (const u of open) {
    const cs = unitCands(st, u);
    if (cs.length === 1) return { tech: 1, place: cs[0], units: [u] };
  }
  if (maxTech < 2) return null;

  // 2 – Eingesperrt
  for (const u of open) {
    const cs = unitCands(st, u);
    if (!cs.length) continue;
    const targets = [];
    if (u.kind === 'zone') {
      for (const kind of ['row', 'col']) {
        const k0 = keyOf(n, kind, cs[0]);
        if (cs.every((i) => keyOf(n, kind, i) === k0)) targets.push(unitOf(st, kind, k0));
      }
    } else {
      const g = regions[cs[0]];
      if (cs.every((i) => regions[i] === g)) targets.push(unitOf(st, 'zone', g));
    }
    for (const t of targets) {
      const elim = t.cells.filter((i) => st.cand[i] && !u.cells.includes(i));
      if (elim.length) return { tech: 2, elim, units: [u], target: t };
    }
  }
  if (maxTech < 3) return null;

  // 3 – Blockade
  for (let c = 0; c < n * n; c++) {
    if (!st.cand[c]) continue;
    for (const u of open) {
      if (u.cells.includes(c)) continue;
      const cs = unitCands(st, u);
      if (cs.length && cs.every((j) => conflicts(n, regions, c, j))) return { tech: 3, elim: [c], units: [u] };
    }
  }
  if (maxTech < 4) return null;

  // 4 – Gruppen (k Einheiten passen nur in k andere Einheiten)
  const pairs = [['zone', 'row'], ['zone', 'col'], ['row', 'zone'], ['col', 'zone'], ['row', 'col'], ['col', 'row']];
  const maxK = Math.min(4, n - 2);
  for (let k = 2; k <= maxK; k++) {
    for (const [from, to] of pairs) {
      const srcs = open.filter((u) => u.kind === from);
      if (srcs.length <= k) continue;
      for (const group of combos(srcs, k)) {
        const keys = new Set();
        let ok = true;
        for (const u of group) {
          for (const i of unitCands(st, u)) {
            keys.add(to === 'zone' ? regions[i] : keyOf(n, to, i));
            if (keys.size > k) { ok = false; break; }
          }
          if (!ok) break;
        }
        if (!ok || keys.size !== k) continue;
        const inGroup = new Set(group.flatMap((u) => u.cells));
        const elim = [];
        for (const key of keys) {
          for (const i of unitOf(st, to, key).cells) if (st.cand[i] && !inGroup.has(i)) elim.push(i);
        }
        if (elim.length) return { tech: 4, elim, units: group, k, from, to };
      }
    }
  }
  if (maxTech < 5) return null;

  // 5 – Probeflug
  for (let c = 0; c < n * n; c++) {
    if (!st.cand[c]) continue;
    const t = cloneState(st);
    placeIn(t, c);
    let bad = contradiction(t);
    let guard = 0;
    while (!bad && t.count < n && guard++ < 4 * n * n) {
      const s = nextLogicStep(t, 3);
      if (!s) break;
      applyStep(t, s);
      bad = contradiction(t);
    }
    if (bad) return { tech: 5, elim: [c], units: [bad] };
  }
  return null;
}

export function applyStep(st, step) {
  if (step.place != null) placeIn(st, step.place);
  else for (const i of step.elim) st.cand[i] = 0;
}

// Bewertet ein Rätsel: welche Techniken sind nötig?
export function gradePuzzle(n, regions) {
  const st = createLogicState(n, regions);
  const counts = [0, 0, 0, 0, 0, 0];
  let maxTech = 0, steps = 0;
  while (st.count < n) {
    if (contradiction(st)) return { ok: false };
    const s = nextLogicStep(st, 5);
    if (!s) return { ok: false };
    applyStep(st, s);
    counts[s.tech]++;
    maxTech = Math.max(maxTech, s.tech);
    if (++steps > 1000) return { ok: false };
  }
  // Punktzahl für Feinabstimmung
  const score = counts[2] * 1 + counts[3] * 3 + counts[4] * 8 + counts[5] * 15;
  return { ok: true, maxTech, counts, score };
}

// =====================================================================
// Schwierigkeitsstufen
// =====================================================================
export const DIFFICULTIES = {
  leicht:  { name: 'Leicht',  place: 'Übungshang', sizes: [5, 6],  minTech: 1, maxTech: 2, icons: 1 },
  mittel:  { name: 'Mittel',  place: 'Hausberg',   sizes: [6, 7],  minTech: 3, maxTech: 3, icons: 2 },
  schwer:  { name: 'Schwer',  place: 'Alpenpass',  sizes: [8],     minTech: 4, maxTech: 5, icons: 3 },
  experte: { name: 'Experte', place: 'Himalaya',   sizes: [9, 10], minTech: 4, maxTech: 5, minScore: 30, icons: 4 },
  expedition: { name: 'Expedition', place: 'Karakorum', sizes: [11, 12], minTech: 4, maxTech: 5, minScore: 40, icons: 4 },
};

// Erzeugt ein eindeutiges, rein logisch lösbares Rätsel der gewünschten Schwierigkeit.
export function generateForDifficulty(diffKey, seed) {
  const d = DIFFICULTIES[diffKey];
  const rng = mulberry32(seed);
  let fallback = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const n = d.sizes[Math.floor(rng() * d.sizes.length)];
    let p;
    try { p = generatePuzzle(n, Math.floor(rng() * 2 ** 31)); } catch { continue; }
    const g = gradePuzzle(n, p.regions);
    if (!g.ok) continue; // braucht Raten -> verwerfen
    const fits = g.maxTech >= d.minTech && g.maxTech <= d.maxTech && (!d.minScore || g.score >= d.minScore);
    const out = { ...p, regions: Array.from(p.regions), difficulty: diffKey, grade: g };
    if (fits) return out;
    // nächstbeste Lösung merken (falls die Suche zu lange dauert)
    const dist = g.maxTech < d.minTech ? d.minTech - g.maxTech : g.maxTech > d.maxTech ? g.maxTech - d.maxTech : 0.5;
    if (!fallback || dist < fallback.dist) fallback = { dist, out };
  }
  return fallback.out;
}
