import { generatePuzzle, sizeForLevel, levelSeed, mulberry32, shuffle } from './puzzle.js';
import { sfx, setSoundEnabled, unlockAudio } from './audio.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// ---------- Konstanten ----------
const ZONE_COLORS = ['#ffd6a5', '#c8f7c5', '#9eeaf9', '#cdc1ff', '#ffb3b3', '#fdf6a8', '#a8c8ff', '#ffc8f0', '#e6dccb', '#8ed9c4'];
const CANOPIES = [
  ['#ff5a36', '#ffd23f'], ['#1f7aff', '#ffffff'], ['#e83e8c', '#ff9f1c'],
  ['#14a37f', '#f9e04b'], ['#7b2ff7', '#00d4ff'], ['#ff3d3d', '#ffffff'],
  ['#ff8c00', '#2b3a55'], ['#00a8e8', '#ffef5a'], ['#c0392b', '#f5d76e'], ['#2ecc71', '#1f3a93'],
];
const SIZE_NAMES = { 5: 'Übungshang', 6: 'Hausberg', 7: 'Streckenflug', 8: 'Alpenpass', 9: 'Hochalpin', 10: 'Himalaya' };
const SIZE_RANGES = [[5, 1, 8], [6, 9, 25], [7, 26, 50], [8, 51, 90], [9, 91, 140], [10, 141, Infinity]];
const DAILY_SIZES = [9, 6, 7, 7, 8, 8, 9]; // So..Sa

// ---------- Speicher ----------
const STORE_KEY = 'thermikdoku.v1';
function defaults() {
  return { unlocked: 1, stars: {}, best: {}, daily: {}, progress: {}, settings: { sound: true, vibe: true, autoX: false }, seenHelp: false };
}
const store = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    const d = defaults();
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  } catch { return defaults(); }
})();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {} }
setSoundEnabled(store.settings.sound);

function vibe(p) { if (store.settings.vibe && navigator.vibrate) { try { navigator.vibrate(p); } catch {} } }

// ---------- Hilfsfunktionen ----------
const fmtTime = (s) => { s = Math.floor(s); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };
const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

const puzzleCache = new Map();
function getPuzzle(key, n, seed) {
  if (!puzzleCache.has(key)) puzzleCache.set(key, generatePuzzle(n, seed));
  return puzzleCache.get(key);
}

function gliderSVG(region, extraClass = '') {
  const [c1, c2] = CANOPIES[region % CANOPIES.length];
  return `<div class="g-bob ${extraClass}" style="--c1:${c1};--c2:${c2};--bd:-${(Math.random() * 3).toFixed(2)}s"><svg viewBox="0 0 100 100"><use href="#glider"/></svg></div>`;
}

// ---------- Screens ----------
let currentScreen = 'home';
function show(name) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  currentScreen = name;
  if (name === 'home') renderHome();
  if (name === 'levels') renderLevels();
  if (name !== 'game') pauseTimer(); else resumeTimer();
}

// ---------- Home ----------
function dailyStreak() {
  let d = new Date(); let streak = 0;
  if (!store.daily[todayStr(d)]) d.setDate(d.getDate() - 1);
  while (store.daily[todayStr(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function renderHome() {
  $('#continue-label').textContent = `Level ${store.unlocked} · ${SIZE_NAMES[sizeForLevel(store.unlocked)]}`;
  const done = !!store.daily[todayStr()];
  const streak = dailyStreak();
  const btn = $('[data-action="daily"]');
  btn.classList.toggle('done-today', done);
  const n = DAILY_SIZES[new Date().getDay()];
  $('#daily-label').textContent = (done ? 'Geschafft' : `${n}×${n} · Heute`) + (streak > 1 ? ` · ${streak} Tage in Folge` : '');
}

// ---------- Levelauswahl ----------
function renderLevels() {
  const list = $('#levels-list');
  const maxShow = Math.max(store.unlocked + 15, 50);
  let html = ''; let k = 0;
  for (const [n, from, to] of SIZE_RANGES) {
    if (from > maxShow) break;
    const end = Math.min(to, maxShow);
    html += `<div class="level-section"><h3>${n}×${n} · ${SIZE_NAMES[n]} <small>Level ${from}${to === Infinity ? '+' : '–' + to}</small></h3><div class="level-grid">`;
    for (let l = from; l <= end; l++) {
      const st = store.stars[l] || 0;
      const locked = l > store.unlocked;
      const cur = l === store.unlocked;
      const kk = Math.min(k++, 40);
      if (locked) {
        html += `<button class="lvl locked" style="--k:${kk}" disabled><svg class="lock"><use href="#i-lock"/></svg></button>`;
      } else {
        const stars = [0, 1, 2].map((i) => `<svg class="${i < st ? 'on' : ''}"><use href="#i-star"/></svg>`).join('');
        html += `<button class="lvl${cur ? ' current' : ''}" style="--k:${kk}" data-level="${l}">${l}<span class="lvl-stars">${stars}</span></button>`;
      }
    }
    html += '</div></div>';
  }
  list.innerHTML = html;
  $('#stars-total').textContent = Object.values(store.stars).reduce((a, b) => a + b, 0);
  const cur = list.querySelector('.lvl.current');
  if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
}

// ---------- Spielzustand ----------
const G = {
  key: null, mode: 'level', level: 1, date: null,
  n: 5, regions: null, solution: null, colors: null,
  cells: null, history: [], hints: 0, mistakes: 0,
  elapsed: 0, startedAt: null, done: false,
  cellEls: [],
};
let timerInt = null;

function pauseTimer() {
  if (G.startedAt != null) { G.elapsed += (performance.now() - G.startedAt) / 1000; G.startedAt = null; }
  clearInterval(timerInt); timerInt = null;
  saveProgress();
}
function resumeTimer() {
  if (G.done || !G.cells || currentScreen !== 'game') return;
  if (G.startedAt == null) G.startedAt = performance.now();
  clearInterval(timerInt);
  timerInt = setInterval(updateTimer, 500);
  updateTimer();
}
function currentElapsed() { return G.elapsed + (G.startedAt != null ? (performance.now() - G.startedAt) / 1000 : 0); }
function updateTimer() { $('#timer').textContent = fmtTime(currentElapsed()); }

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseTimer(); else if (currentScreen === 'game') resumeTimer();
});

function saveProgress() {
  if (!G.key || !G.cells || G.done) return;
  const any = G.cells.some((v) => v);
  if (!any && G.hints === 0) { delete store.progress[G.key]; }
  else store.progress[G.key] = { cells: Array.from(G.cells), elapsed: Math.floor(G.elapsed), hints: G.hints, mistakes: G.mistakes };
  save();
}

async function startGame({ mode, level, date }) {
  unlockAudio();
  pauseTimer();
  G.mode = mode;
  let n, seed, key, title, sub;
  if (mode === 'daily') {
    date = date || todayStr();
    const d = new Date(date + 'T12:00:00');
    n = DAILY_SIZES[d.getDay()];
    seed = Number(date.replaceAll('-', '')) * 31 + 7;
    key = 'D' + date; title = 'Tagesflug';
    sub = `${n}×${n} · ${d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}`;
    G.date = date;
  } else {
    n = sizeForLevel(level); seed = levelSeed(level);
    key = 'L' + level; title = `Level ${level}`;
    sub = `${n}×${n} · ${SIZE_NAMES[n]}`;
    G.level = level;
  }
  $('#game-title').textContent = title;
  $('#game-sub').textContent = sub;
  $('#board').innerHTML = '';
  $('#progress').innerHTML = '';
  $('#loading').classList.add('show');
  show('game');
  await nextFrame();

  const p = getPuzzle(key, n, seed);
  $('#loading').classList.remove('show');
  G.key = key; G.n = n; G.regions = p.regions; G.solution = p.solution;
  G.colors = shuffle(ZONE_COLORS.slice(), mulberry32(p.colorSeed));
  const saved = store.progress[key];
  G.cells = new Uint8Array(n * n);
  if (saved && saved.cells && saved.cells.length === n * n) saved.cells.forEach((v, i) => (G.cells[i] = v));
  G.hints = saved?.hints || 0; G.mistakes = saved?.mistakes || 0; G.elapsed = saved?.elapsed || 0;
  G.history = []; G.done = false; G.startedAt = null;
  buildBoard();
  render({ initial: true });
  resumeTimer();
  // nächstes Level im Leerlauf vorbereiten
  if (mode === 'level') idle(() => getPuzzle('L' + (level + 1), sizeForLevel(level + 1), levelSeed(level + 1)));
}
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 600));

// ---------- Board ----------
function buildBoardInto(el, n, regions, colors) {
  el.innerHTML = '';
  el.style.setProperty('--n', n);
  el.style.setProperty('--thick', n <= 6 ? '3px' : n <= 8 ? '2.5px' : '2px');
  const thick = 'var(--thick) solid var(--ink)';
  const thin = '1px solid var(--thin)';
  const els = [];
  for (let i = 0; i < n * n; i++) {
    const r = (i / n) | 0, c = i % n;
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.i = i;
    d.style.setProperty('--rc', colors[regions[i]]);
    if (r > 0) d.style.borderTop = regions[i] !== regions[i - n] ? thick : thin;
    if (c > 0) d.style.borderLeft = regions[i] !== regions[i - 1] ? thick : thin;
    el.appendChild(d);
    els.push(d);
  }
  return els;
}

function buildBoard() {
  const board = $('#board');
  G.cellEls = buildBoardInto(board, G.n, G.regions, G.colors);
  board.classList.remove('enter', 'won');
  void board.offsetWidth;
  board.classList.add('enter');
  $('#progress').innerHTML = Array.from({ length: G.n }, (_, i) => {
    const [c1, c2] = CANOPIES[i % CANOPIES.length];
    return `<div class="pg" style="--c1:${c1};--c2:${c2}"><svg viewBox="0 0 100 100"><use href="#glider"/></svg></div>`;
  }).join('');
}

function analyze() {
  const { n, cells, regions } = G;
  const gl = [];
  for (let i = 0; i < n * n; i++) if (cells[i] === 2) gl.push(i);
  const conflict = new Set();
  const reasons = new Map();
  for (let a = 0; a < gl.length; a++) {
    for (let b = a + 1; b < gl.length; b++) {
      const why = clash(gl[a], gl[b]);
      if (why) { conflict.add(gl[a]); conflict.add(gl[b]); reasons.set(gl[a], why); reasons.set(gl[b], why); }
    }
  }
  const blocked = new Uint8Array(n * n);
  for (const g of gl) {
    const gr = (g / n) | 0, gc = g % n, rg = regions[g];
    for (let i = 0; i < n * n; i++) {
      if (i === g) continue;
      const r = (i / n) | 0, c = i % n;
      if (r === gr || c === gc || regions[i] === rg || (Math.abs(r - gr) <= 1 && Math.abs(c - gc) <= 1)) blocked[i] = 1;
    }
  }
  return { gl, conflict, reasons, blocked };
}

function clash(a, b) {
  const n = G.n;
  const ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
  if (Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1) return 'touch';
  if (ar === br) return 'row';
  if (ac === bc) return 'col';
  if (G.regions[a] === G.regions[b]) return 'zone';
  return null;
}

function render({ initial = false, animate = new Set() } = {}) {
  const { n, cells } = G;
  const info = analyze();
  for (let i = 0; i < n * n; i++) {
    const el = G.cellEls[i];
    const v = cells[i];
    // ×
    let x = el.querySelector('.x');
    if (v === 1 && !x) { x = document.createElement('span'); x.className = 'x'; x.textContent = '×'; el.appendChild(x); }
    if (v !== 1 && x) x.remove();
    el.classList.toggle('has-x', v === 1);
    // Schirm
    let g = el.querySelector('.g-wrap:not(.leave)');
    if (v === 2 && !g) {
      g = document.createElement('div');
      g.className = 'g-wrap' + (initial || !animate.has(i) ? ' noanim' : '');
      if (initial) g.classList.remove('noanim');
      if (initial) g.style.animationDelay = `${0.25 + Math.random() * 0.3}s`;
      g.innerHTML = gliderSVG(G.regions[i]);
      el.appendChild(g);
    }
    if (v !== 2 && g) {
      g.classList.add('leave');
      setTimeout(() => g.remove(), 300);
    }
    el.classList.toggle('has-g', v === 2);
    el.classList.toggle('conflict', info.conflict.has(i));
    el.classList.toggle('auto', store.settings.autoX && !!info.blocked[i]);
  }
  // Fortschritt
  const pgs = $$('#progress .pg');
  const good = info.gl.length - info.conflict.size;
  pgs.forEach((p, k) => {
    const on = k < info.gl.length;
    if (on && !p.classList.contains('on')) { p.classList.add('on'); }
    if (!on) p.classList.remove('on');
    p.classList.toggle('bad', on && k >= good);
  });
  return info;
}

// ---------- Aktionen ----------
function pushHistory() {
  G.history.push(G.cells.slice());
  if (G.history.length > 300) G.history.shift();
}

function setCells(changes, { sound = true } = {}) {
  // changes: [[i, v], ...]
  const before = analyze();
  const animate = new Set();
  let placed = null, marked = false, removed = false;
  for (const [i, v] of changes) {
    const old = G.cells[i];
    if (old === v) continue;
    G.cells[i] = v;
    if (v === 2) { animate.add(i); placed = i; }
    else if (v === 1) marked = true;
    if (old === 2) removed = true;
  }
  const info = render({ animate });
  if (placed != null) {
    puff(placed);
    const newConflict = [...info.conflict].some((i) => !before.conflict.has(i));
    if (newConflict && info.conflict.has(placed)) {
      G.mistakes++;
      if (sound) sfx.bad();
      vibe([30, 50, 30]);
      const why = info.reasons.get(placed);
      toast({ touch: 'Kollisionsgefahr! Schirme dürfen sich nicht berühren.', row: 'Zwei Schirme in einer Reihe!', col: 'Zwei Schirme in einer Spalte!', zone: 'Zwei Schirme in einer Thermik-Zone!' }[why], 'bad');
      G.cellEls[placed].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 300 });
    } else {
      if (sound) sfx.place();
      vibe(12);
      ripple(placed);
    }
  } else if (marked) { if (sound) sfx.mark(); vibe(5); }
  else if (removed) { if (sound) sfx.remove(); vibe(5); }
  saveProgress();
  checkWin(info);
}

function puff(i) {
  const el = G.cellEls[i];
  const p = document.createElement('div');
  p.className = 'puff';
  p.innerHTML = Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2 + Math.random();
    return `<i style="--px:${Math.cos(a) * 70}%;--py:${Math.sin(a) * 50 + 20}%;animation-delay:${0.25 + Math.random() * 0.08}s"></i>`;
  }).join('');
  el.appendChild(p);
  setTimeout(() => p.remove(), 1000);
}

function ripple(i) {
  // Thermik-Welle über Reihe, Spalte und Zone
  const n = G.n, r = (i / n) | 0, c = i % n, rg = G.regions[i];
  for (let j = 0; j < n * n; j++) {
    const jr = (j / n) | 0, jc = j % n;
    if (j === i || !(jr === r || jc === c || G.regions[j] === rg)) continue;
    const el = G.cellEls[j];
    const dist = Math.max(Math.abs(jr - r), Math.abs(jc - c));
    el.classList.remove('flash');
    void el.offsetWidth;
    el.style.setProperty('--d', `${0.12 + dist * 0.045}s`);
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1200);
  }
}

function cycleCell(i) {
  if (G.done) return;
  pushHistory();
  const v = G.cells[i];
  setCells([[i, v === 0 ? 1 : v === 1 ? 2 : 0]]);
}

function undo() {
  if (G.done) return;
  const prev = G.history.pop();
  if (!prev) { toast('Nichts zum Rückgängigmachen'); return; }
  const changes = [];
  for (let i = 0; i < prev.length; i++) if (prev[i] !== G.cells[i]) changes.push([i, prev[i]]);
  setCells(changes, { sound: false });
  sfx.undo(); vibe(8);
  bumpTool('undo', 'spin');
}

function resetBoard() {
  if (G.done) return;
  if (!G.cells.some((v) => v)) return;
  pushHistory();
  const changes = [];
  for (let i = 0; i < G.cells.length; i++) if (G.cells[i]) changes.push([i, 0]);
  setCells(changes, { sound: false });
  sfx.remove(); vibe(15);
  bumpTool('reset', 'spin');
  toast('Neustart. Mit „Zurück“ holst du alles wieder.');
}

function bumpTool(action, cls) {
  const b = $(`.tool[data-action="${action}"]`);
  b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls);
}

// ---------- Tipps ----------
function unitsOf() {
  const { n, regions } = G;
  const units = [];
  for (let r = 0; r < n; r++) units.push({ type: 'Reihe', cells: Array.from({ length: n }, (_, c) => r * n + c) });
  for (let c = 0; c < n; c++) units.push({ type: 'Spalte', cells: Array.from({ length: n }, (_, r) => r * n + c) });
  for (let g = 0; g < n; g++) units.push({ type: 'Thermik-Zone', cells: [...regions.keys()].filter((i) => regions[i] === g) });
  return units;
}

let hintBusy = false;
function clearHighlights() {
  G.cellEls.forEach((el) => el.classList.remove('hint', 'hint-soft'));
}
function highlight(cells, soft = []) {
  clearHighlights();
  hintBusy = true;
  setTimeout(() => (hintBusy = false), 950);
  for (const i of soft) G.cellEls[i].classList.add('hint-soft');
  for (const i of cells) G.cellEls[i].classList.add('hint');
  const els = G.cellEls;
  setTimeout(() => {
    for (const i of soft) els[i]?.classList.remove('hint-soft');
    for (const i of cells) els[i]?.classList.remove('hint');
  }, 2600);
}

function hint() {
  if (G.done || !G.cells || hintBusy) return;
  const { n, cells, solution } = G;
  G.hints++;
  sfx.hint(); vibe(10);
  bumpTool('hint', 'wiggle');
  const isSol = (i) => solution[(i / n) | 0] === i % n;

  // 1) Fehler finden
  const wrongG = [...cells.keys()].filter((i) => cells[i] === 2 && !isSol(i));
  if (wrongG.length) {
    pushHistory();
    highlight([wrongG[0]]);
    toast('Dieser Schirm steht falsch. Ich nehme ihn weg.');
    later(() => setCells([[wrongG[0], 0]], { sound: false }), 900);
    return finishHint();
  }
  const wrongX = [...cells.keys()].filter((i) => cells[i] === 1 && isSol(i));
  if (wrongX.length) {
    pushHistory();
    highlight([wrongX[0]]);
    toast('Hier hast du ein × gesetzt, aber genau hier gehört ein Schirm hin.');
    later(() => setCells([[wrongX[0], 0]], { sound: false }), 900);
    return finishHint();
  }

  const info = analyze();
  const cand = (i) => cells[i] === 0 && !info.blocked[i];
  const units = unitsOf();
  const open = units.filter((u) => !u.cells.some((i) => cells[i] === 2));

  // 2) Nur noch ein Platz
  for (const u of open) {
    const cs = u.cells.filter(cand);
    if (cs.length === 1) {
      pushHistory();
      highlight([cs[0]], u.cells);
      toast(`In dieser ${u.type} ist nur noch ein Platz frei.`, 'good');
      later(() => setCells([[cs[0], 2]]), 700);
      return finishHint();
    }
  }

  // 3) Eingesperrte Zonen: Zone liegt komplett in einer Reihe/Spalte (oder umgekehrt)
  const rowOf = (i) => (i / n) | 0, colOf = (i) => i % n;
  for (const u of open) {
    const cs = u.cells.filter(cand);
    if (!cs.length) continue;
    const checks = [];
    if (u.type === 'Thermik-Zone') {
      if (cs.every((i) => rowOf(i) === rowOf(cs[0]))) checks.push(['Reihe', units[rowOf(cs[0])]]);
      if (cs.every((i) => colOf(i) === colOf(cs[0]))) checks.push(['Spalte', units[n + colOf(cs[0])]]);
    } else {
      const rg = G.regions[cs[0]];
      if (cs.every((i) => G.regions[i] === rg)) checks.push(['Thermik-Zone', units[2 * n + rg]]);
    }
    for (const [otherType, other] of checks) {
      const elim = other.cells.filter((i) => cand(i) && !u.cells.includes(i));
      if (elim.length) {
        pushHistory();
        highlight(elim, cs);
        const msg = u.type === 'Thermik-Zone'
          ? `Diese Zone kann nur in einer ${otherType} fliegen, also ist dort sonst nichts frei.`
          : `Die ${u.type} hat nur noch Plätze in einer Zone, also ist der Rest der Zone gesperrt.`;
        toast(msg, 'good');
        later(() => setCells(elim.map((i) => [i, 1])), 700);
        return finishHint();
      }
    }
  }

  // 4) Ein Schirm hier würde eine andere Einheit komplett blockieren
  for (let i = 0; i < n * n; i++) {
    if (!cand(i)) continue;
    for (const u of open) {
      if (u.cells.includes(i)) continue;
      const cs = u.cells.filter(cand);
      if (cs.length && cs.every((j) => blocks(i, j))) {
        pushHistory();
        highlight([i], cs);
        toast(`Ein Schirm hier würde die markierte ${u.type} komplett blockieren.`, 'good');
        later(() => setCells([[i, 1]]), 700);
        return finishHint();
      }
    }
  }

  // 5) Notfall: einen richtigen Schirm verraten
  for (let r = 0; r < n; r++) {
    const i = r * n + solution[r];
    if (cells[i] !== 2) {
      pushHistory();
      highlight([i]);
      toast('Kniffliger Flug! Hier fliegt sicher ein Schirm.', 'good');
      later(() => setCells([[i, 2]]), 700);
      return finishHint();
    }
  }
}
function blocks(a, b) {
  const n = G.n;
  const ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
  return ar === br || ac === bc || G.regions[a] === G.regions[b] || (Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1);
}
function finishHint() { saveProgress(); }

// ---------- Gewinnen ----------
function checkWin(info) {
  if (G.done) return;
  if (info.gl.length !== G.n || info.conflict.size) return;
  G.done = true;
  pauseTimer();
  const time = Math.floor(G.elapsed);
  const errors = G.hints + G.mistakes;
  const stars = errors === 0 ? 3 : errors <= 2 ? 2 : 1;
  let record = '';
  if (G.mode === 'level') {
    const L = G.level;
    store.stars[L] = Math.max(store.stars[L] || 0, stars);
    if (!store.best[L] || time < store.best[L]) { if (store.best[L]) record = 'Neue Bestzeit!'; store.best[L] = time; }
    store.unlocked = Math.max(store.unlocked, L + 1);
  } else {
    const prev = store.daily[G.date];
    store.daily[G.date] = Math.max(prev || 0, stars);
    const s = dailyStreak();
    if (s > 1) record = `${s} Tage in Folge geflogen!`;
  }
  delete store.progress[G.key];
  save();
  celebrate(stars, time, record);
}

function celebrate(stars, time, record) {
  const board = $('#board');
  sfx.win(); vibe([20, 60, 20, 60, 40]);
  // Welle über das Brett
  const n = G.n;
  G.cellEls.forEach((el, i) => {
    const r = (i / n) | 0, c = i % n;
    el.style.setProperty('--d', `${(r + c) * 0.04}s`);
    el.classList.add('wave');
  });
  board.classList.add('won');
  // Schirme heben ab
  setTimeout(() => {
    const fx = $('#fx');
    G.cellEls.forEach((el, i) => {
      if (G.cells[i] !== 2) return;
      const g = el.querySelector('.g-wrap');
      if (!g) return;
      const rect = g.getBoundingClientRect();
      const fly = document.createElement('div');
      fly.className = 'fly';
      fly.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;--ld:${((i / n) | 0) * 0.09}s;--lx:${(Math.random() - 0.5) * 60}vw;--lr:${(Math.random() - 0.5) * 50}deg`;
      fly.innerHTML = gliderSVG(G.regions[i]);
      fx.appendChild(fly);
      g.style.visibility = 'hidden';
      setTimeout(() => fly.remove(), 3000);
    });
  }, 650);
  setTimeout(confetti, 900);
  setTimeout(() => showWin(stars, time, record), 1700);
}

function confetti() {
  const fx = $('#fx');
  const cols = ['#ff5a36', '#ffd23f', '#1f7aff', '#e83e8c', '#2fbf71', '#7b2ff7', '#00d4ff'];
  for (let k = 0; k < 46; k++) {
    const d = document.createElement('div');
    const isGlider = k % 4 === 0;
    const size = isGlider ? 26 + Math.random() * 20 : 8 + Math.random() * 8;
    d.className = 'confetti' + (isGlider ? '' : ' piece');
    d.style.cssText = `left:${Math.random() * 100}vw;width:${size}px;height:${isGlider ? size : size * 0.6}px;--dur:${2.8 + Math.random() * 2.5}s;--dl:${Math.random() * 0.8}s;--rot:${(Math.random() - 0.5) * 720}deg;--col:${cols[k % cols.length]}`;
    if (isGlider) {
      const [c1, c2] = CANOPIES[k % CANOPIES.length];
      d.innerHTML = `<div style="--c1:${c1};--c2:${c2}"><svg viewBox="0 0 100 100"><use href="#glider"/></svg></div>`;
    } else d.innerHTML = '<div></div>';
    fx.appendChild(d);
    setTimeout(() => d.remove(), 6500);
  }
}

const WIN_TITLES = ['Sanft gelandet!', 'Perfekte Thermik!', 'Toplandung!', 'Was für ein Flug!', 'Luftraum gesichert!', 'Butterweich gelandet!'];
function showWin(stars, time, record) {
  $('#win-title').textContent = stars === 3 ? WIN_TITLES[Math.floor(Math.random() * WIN_TITLES.length)] : stars === 2 ? 'Gut gelandet!' : 'Gelandet!';
  $('#win-time').textContent = fmtTime(time);
  $('#win-hints').textContent = G.hints;
  $('#win-mistakes').textContent = G.mistakes;
  $('#win-record').textContent = record;
  $('#win-next').textContent = G.mode === 'level' ? `Level ${G.level + 1}` : 'Weiter mit Level ' + store.unlocked;
  $$('.win-stars .star').forEach((s) => s.classList.remove('on'));
  openModal('#modal-win');
  [0, 1, 2].forEach((i) => {
    if (i < stars) setTimeout(() => { $(`.win-stars .star[data-i="${i}"]`).classList.add('on'); sfx.star(i); vibe(15); }, 450 + i * 280);
  });
}

// ---------- Modals & Toast ----------
function openModal(sel) { const m = $(sel); m.classList.add('show'); m.setAttribute('aria-hidden', 'false'); }
function closeModal(sel) { const m = $(sel); m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }

let toastT = null;
function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast ' + kind;
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- Eingabe auf dem Brett ----------
(function setupBoardInput() {
  const board = $('#board');
  let drag = null;
  const cellAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const c = el && el.closest && el.closest('#board .cell');
    return c ? Number(c.dataset.i) : null;
  };
  board.addEventListener('pointerdown', (e) => {
    if (G.done || !G.cells) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i == null) return;
    e.preventDefault();
    unlockAudio();
    try { board.setPointerCapture(e.pointerId); } catch {}
    const v = G.cells[i];
    drag = { id: e.pointerId, start: i, moved: false, long: false, mode: v === 0 ? 1 : v === 1 ? 0 : null, visited: new Set([i]), snap: null };
    G.cellEls[i].classList.add('press');
    drag.timer = setTimeout(() => {
      if (!drag || drag.moved) return;
      drag.long = true;
      G.cellEls[i].classList.remove('press');
      pushHistory();
      setCells([[i, G.cells[i] === 2 ? 0 : 2]]);
    }, 430);
  });
  board.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || drag.long) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i == null || drag.visited.has(i)) return;
    if (drag.mode == null) return; // Start auf einem Schirm: kein Wischen
    if (!drag.moved) {
      drag.moved = true;
      clearTimeout(drag.timer);
      G.cellEls[drag.start].classList.remove('press');
      pushHistory();
      paint(drag.start);
    }
    drag.visited.add(i);
    paint(i);
  });
  function paint(i) {
    const v = G.cells[i];
    if (drag.mode === 1 && v === 0) setCells([[i, 1]]);
    else if (drag.mode === 0 && v === 1) setCells([[i, 0]]);
  }
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    clearTimeout(drag.timer);
    G.cellEls[drag.start]?.classList.remove('press');
    if (!drag.moved && !drag.long && e.type === 'pointerup') cycleCell(drag.start);
    drag = null;
  };
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', end);
  board.addEventListener('contextmenu', (e) => e.preventDefault());
})();

// ---------- Hilfe-Beispiel ----------
function buildHelpExample() {
  const regions = Int8Array.from([0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 1, 2, 3, 3, 3]);
  const els = buildBoardInto($('#help-board'), 4, regions, ['#ffd6a5', '#9eeaf9', '#c8f7c5', '#cdc1ff']);
  [1, 7, 8, 14].forEach((i, k) => {
    const g = document.createElement('div');
    g.className = 'g-wrap';
    g.style.animationDelay = `${0.2 + k * 0.18}s`;
    g.innerHTML = gliderSVG(k);
    els[i].appendChild(g);
  });
  [0, 2, 3, 5].forEach((i) => { const x = document.createElement('span'); x.className = 'x'; x.textContent = '×'; els[i].appendChild(x); });
}

// ---------- Buttons ----------
let helpReturn = 'home';
document.addEventListener('click', (e) => {
  const lvl = e.target.closest('[data-level]');
  if (lvl) { sfx.click(); startGame({ mode: 'level', level: Number(lvl.dataset.level) }); return; }
  const b = e.target.closest('[data-action]');
  if (!b) return;
  unlockAudio();
  const a = b.dataset.action;
  if (!['undo', 'hint', 'reset'].includes(a)) sfx.click();
  switch (a) {
    case 'continue':
      if (!store.seenHelp) { store.seenHelp = true; save(); helpReturn = 'start'; openHelp(); }
      else startGame({ mode: 'level', level: store.unlocked });
      break;
    case 'daily': startGame({ mode: 'daily' }); break;
    case 'levels': show('levels'); break;
    case 'home': show('home'); break;
    case 'back-from-game': show(G.mode === 'level' ? 'levels' : 'home'); break;
    case 'help': helpReturn = currentScreen; openHelp(); break;
    case 'help-close':
      if (helpReturn === 'start') { helpReturn = 'home'; startGame({ mode: 'level', level: store.unlocked }); }
      else show(helpReturn); break;
    case 'settings': syncSettings(); openModal('#modal-settings'); break;
    case 'settings-close': closeModal('#modal-settings'); break;
    case 'reset-progress':
      if (confirm('Wirklich den ganzen Fortschritt löschen?')) {
        const s = store.settings; Object.assign(store, defaults(), { settings: s, seenHelp: true }); save();
        closeModal('#modal-settings'); renderHome(); toast('Fortschritt gelöscht');
      }
      break;
    case 'undo': undo(); break;
    case 'hint': hint(); break;
    case 'reset': resetBoard(); break;
    case 'next':
      closeModal('#modal-win');
      startGame({ mode: 'level', level: G.mode === 'level' ? G.level + 1 : store.unlocked });
      break;
    case 'win-menu': closeModal('#modal-win'); show(G.mode === 'level' ? 'levels' : 'home'); break;
  }
});
function openHelp() { buildHelpExample(); show('help'); }

function syncSettings() {
  $('#set-sound').checked = store.settings.sound;
  $('#set-vibe').checked = store.settings.vibe;
  $('#set-autox').checked = store.settings.autoX;
}
$('#set-sound').addEventListener('change', (e) => { store.settings.sound = e.target.checked; setSoundEnabled(e.target.checked); save(); if (e.target.checked) sfx.place(); });
$('#set-vibe').addEventListener('change', (e) => { store.settings.vibe = e.target.checked; save(); vibe(30); });
$('#set-autox').addEventListener('change', (e) => { store.settings.autoX = e.target.checked; save(); if (G.cells) render(); });

// Doppeltipp-Zoom auf iOS verhindern
let lastTouch = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouch < 350 && !e.target.closest('.levels-scroll, .help-scroll')) e.preventDefault();
  lastTouch = now;
}, { passive: false });

// ---------- Start ----------
renderHome();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// verzögerte Aktion nur ausführen, wenn noch dasselbe Rätsel offen ist
function later(fn, ms) {
  const k = G.key;
  setTimeout(() => { if (G.key === k && !G.done) fn(); }, ms);
}
