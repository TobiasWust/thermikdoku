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

export function solve(regions, n, limit = 2) {
  const sols = [];
  const colUsed = new Array(n).fill(false);
  const regUsed = new Array(n).fill(false);
  const pos = new Array(n);
  function rec(r) {
    if (sols.length >= limit) return;
    if (r === n) { sols.push(pos.slice()); return; }
    for (let c = 0; c < n; c++) {
      if (colUsed[c]) continue;
      const g = regions[r * n + c];
      if (regUsed[g]) continue;
      if (r > 0 && Math.abs(pos[r - 1] - c) <= 1) continue;
      colUsed[c] = regUsed[g] = true; pos[r] = c;
      rec(r + 1);
      colUsed[c] = regUsed[g] = false;
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
      const alt = sols.find((s) => s.some((c, r) => c !== placement[r]));
      const rows = shuffle([...Array(n).keys()].filter((r) => alt[r] !== placement[r]), rng);
      let moved = false;
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
        moved = true;
        break;
      }
      if (!moved) break;
    }
  }
  throw new Error('Kein Puzzle gefunden');
}

export function sizeForLevel(level) {
  if (level <= 8) return 5;
  if (level <= 25) return 6;
  if (level <= 50) return 7;
  if (level <= 90) return 8;
  if (level <= 140) return 9;
  return 10;
}

export function levelSeed(level) {
  return (level * 7919 + 104729) >>> 0;
}
