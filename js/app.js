import { generateForDifficulty, DIFFICULTIES, mulberry32, shuffle, createLogicState, placeIn, nextLogicStep } from './puzzle.js';
import { sfx, setSoundEnabled, unlockAudio } from './audio.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// ---------- Konstanten ----------
// Bonbon-Pastelltöne, nach Farbton im Kreis sortiert
const ZONE_COLORS = ['#ffcf9f', '#fff08c', '#cdf59a', '#9ff0c4', '#9fe9f5', '#a9c6ff', '#cdb8ff', '#f5b8f0', '#ffb3c1', '#e9cfae'];

// Farben so verteilen, dass benachbarte Zonen nie ähnliche Farbtöne haben
function assignZoneColors(n, regions, seed) {
  const rng = mulberry32(seed);
  const adj = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n * n; i++) {
    const r = (i / n) | 0, c = i % n;
    if (c + 1 < n && regions[i] !== regions[i + 1]) { adj[regions[i]].add(regions[i + 1]); adj[regions[i + 1]].add(regions[i]); }
    if (r + 1 < n && regions[i] !== regions[i + n]) { adj[regions[i]].add(regions[i + n]); adj[regions[i + n]].add(regions[i]); }
  }
  const P = ZONE_COLORS.length;
  const dist = (a, b) => { const d = Math.abs(a - b); return Math.min(d, P - d); };
  for (const minDist of [3, 2, 1]) {
    const pick = new Array(n).fill(-1);
    const used = new Set();
    const order = [...Array(n).keys()].sort((a, b) => adj[b].size - adj[a].size);
    const ok = (function rec(k) {
      if (k === n) return true;
      const g = order[k];
      for (const col of shuffle([...Array(P).keys()], rng)) {
        if (used.has(col)) continue;
        if ([...adj[g]].some((h) => pick[h] >= 0 && dist(pick[h], col) < minDist)) continue;
        pick[g] = col; used.add(col);
        if (rec(k + 1)) return true;
        pick[g] = -1; used.delete(col);
      }
      return false;
    })(0);
    if (ok) return pick.map((k) => ZONE_COLORS[k]);
  }
  return shuffle(ZONE_COLORS.slice(), rng);
}
// Schirmfarben passend zu den Sprites (für Partikel)
const CANOPY_COLORS = ['#ff5a36', '#1f7aff', '#e83e8c', '#14a37f', '#7b2ff7', '#ff8c00'];
const SPARK_COLORS = ['#ffd23f', '#ff8fc7', '#7ce0ff', '#a6f08a', '#ffffff', '#c9a6ff'];
const sprite = (k) => `assets/glider-${(k % 6) + 1}.webp`;
const SPRITE_SCARED = 'assets/glider-scared.webp';
const SPRITE_HAPPY = 'assets/glider-happy.webp';
// Bilder vorladen, damit nichts aufblitzt
[1, 2, 3, 4, 5, 6].map((k) => `assets/glider-${k}.webp`).concat([SPRITE_SCARED, SPRITE_HAPPY, 'assets/cloud.webp'])
  .forEach((src) => { const im = new Image(); im.src = src; });

// ---------- Flugmeilen & Ränge ----------
const RANKS = [
  [0, 'Flugschüler'], [250, 'Hüpfer'], [700, 'Thermikschnüffler'], [1500, 'Streckenflieger'],
  [3000, 'Wolkenkitzler'], [5500, 'Alpenadler'], [9000, 'Himmelsakrobat'], [14000, 'Wolkenkönig'], [21000, 'Himmelslegende'],
];
function rankInfo(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
  let from = RANKS[i][0], to = RANKS[i + 1]?.[0], name = RANKS[i][1], lvl = i + 1;
  if (to == null) { // jenseits der Liste: alle 9000 Meilen ein neuer Legenden-Rang
    const extra = Math.floor((xp - from) / 9000);
    from += extra * 9000; to = from + 9000; lvl += extra;
    if (extra) name += ' ' + ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(extra - 1, 8)];
  }
  return { lvl, name, from, to, frac: Math.min(1, (xp - from) / (to - from)) };
}
const XP_BASE = { leicht: 40, mittel: 80, schwer: 150, experte: 260 };
const DIFF_KEYS = ['leicht', 'mittel', 'schwer', 'experte'];
const DAILY_DIFF = ['experte', 'leicht', 'mittel', 'mittel', 'schwer', 'schwer', 'experte']; // So..Sa

// ---------- Speicher ----------
const STORE_KEY = 'thermikdoku.v2';
function defaults() {
  return {
    settings: { sound: true, vibe: true, autoX: false },
    seenHelp: false,
    stats: {},      // diff -> { solved, best, perfect }
    daily: {},      // datum -> sterne
    current: {},    // key -> { puzzle, cells, elapsed, hints, mistakes }
    pool: {},       // diff -> vorab erzeugtes Rätsel
    xp: 0,          // Flugmeilen
  };
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
const statsOf = (d) => (store.stats[d] ||= { solved: 0, best: null, perfect: 0 });

function vibe(p) { if (store.settings.vibe && navigator.vibrate) { try { navigator.vibrate(p); } catch {} } }

// ---------- Hilfsfunktionen ----------
const fmtTime = (s) => { s = Math.floor(s); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };
const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// wartet auf das nächste Bild – mit Zeitlimit, falls der Tab im Hintergrund ist
const nextFrame = () => new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 60); });
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const sizeLabel = (d) => DIFFICULTIES[d].sizes.map((n) => `${n}×${n}`).join(' / ');

function gliderHTML(k, src = sprite(k)) {
  return `<div class="g-bob" style="--bd:-${(Math.random() * 3).toFixed(2)}s"><img src="${src}" alt="" draggable="false"></div>`;
}
const X_HTML = '<svg class="x" viewBox="0 0 24 24"><use href="#i-x"/></svg>';

// ---------- Rätsel-Erzeugung im Hintergrund ----------
let worker = null;
const pending = new Map();
let reqId = 0;
function syncGenerate(job) {
  setTimeout(() => job.resolve(generateForDifficulty(job.difficulty, job.seed)), 0);
}
try {
  worker = new Worker('js/worker.js', { type: 'module' });
  worker.onmessage = (e) => {
    const job = pending.get(e.data.id);
    if (!job) return;
    pending.delete(e.data.id);
    if (e.data.error) syncGenerate(job); else job.resolve(e.data.puzzle);
  };
  worker.onerror = () => {
    worker = null;
    for (const job of pending.values()) syncGenerate(job);
    pending.clear();
  };
} catch { worker = null; }

function generate(difficulty, seed = randomSeed()) {
  return new Promise((resolve) => {
    const job = { difficulty, seed, resolve };
    if (!worker) return syncGenerate(job);
    const id = ++reqId;
    pending.set(id, job);
    worker.postMessage({ id, difficulty, seed });
  });
}

const refilling = new Set();
function refillPool(d) {
  if (store.pool[d] || refilling.has(d)) return;
  refilling.add(d);
  generate(d).then((p) => { store.pool[d] = p; save(); refilling.delete(d); });
}
async function takePuzzle(d) {
  let p = store.pool[d];
  if (p) { delete store.pool[d]; save(); }
  else p = await generate(d);
  refillPool(d);
  return p;
}

// ---------- Screens ----------
let currentScreen = 'home';
function show(name) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  currentScreen = name;
  if (name === 'home') renderHome();
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
  const r = rankInfo(store.xp || 0);
  $('#rank-lvl').textContent = r.lvl;
  $('#rank-name').textContent = r.name;
  setTimeout(() => setRankBar($('#rank-fill'), r.frac), 400);
  $('#diff-grid').innerHTML = DIFF_KEYS.map((k, idx) => {
    const d = DIFFICULTIES[k];
    const st = statsOf(k);
    const icons = Array.from({ length: 4 }, (_, i) => `<img class="${i < d.icons ? '' : 'off'}" src="${sprite([0, 1, 5, 4][idx])}" alt="">`).join('');
    const info = st.solved ? `${st.solved} gelöst · ⏱ ${fmtTime(st.best)}` : 'Noch nicht geflogen';
    const resume = store.current[k] ? '<span class="badge">Fortsetzen</span>' : '';
    return `<button class="diff-card diff-${k}" data-diff="${k}" style="--k:${idx}">
      ${resume}
      <span class="diff-icons">${icons}</span>
      <span class="diff-name">${d.name}</span>
      <span class="diff-size">${sizeLabel(k)} · ${d.place}</span>
      <span class="diff-info">${info}</span>
    </button>`;
  }).join('');
  const done = !!store.daily[todayStr()];
  const streak = dailyStreak();
  $('[data-action="daily"]').classList.toggle('done-today', done);
  const dd = DIFFICULTIES[DAILY_DIFF[new Date().getDay()]];
  $('#daily-label').innerHTML = (done ? 'Heute geschafft' : `Heute: ${dd.name}`) + (streak > 1 ? ` · <span class="streak">🔥</span> ${streak} Tage` : '');
}

// ---------- Spielzustand ----------
const G = {
  key: null, mode: 'free', diff: 'leicht', date: null,
  n: 5, regions: null, solution: null, colors: null,
  cells: null, history: [], hints: 0, mistakes: 0,
  elapsed: 0, startedAt: null, done: false,
  cellEls: [],
  combo: 0, bestCombo: 0, lastPlace: 0, comboT: null, milestones: new Set(),
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
  const cur = store.current[G.key];
  if (!cur) return;
  cur.cells = Array.from(G.cells);
  cur.elapsed = Math.floor(G.elapsed);
  cur.hints = G.hints;
  cur.mistakes = G.mistakes;
  cur.bestCombo = G.bestCombo;
  save();
}

let startToken = 0;
async function startGame({ mode, diff, fresh = false }) {
  unlockAudio();
  pauseTimer();
  const token = ++startToken;
  let key, title, sub, getPuzzle;
  if (mode === 'daily') {
    const date = todayStr();
    const day = new Date(date + 'T12:00:00');
    diff = DAILY_DIFF[day.getDay()];
    key = 'D' + date;
    title = 'Tagesflug';
    sub = `${DIFFICULTIES[diff].name} · ${day.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}`;
    getPuzzle = () => generate(diff, Number(date.replaceAll('-', '')) * 31 + 7);
    G.date = date;
    // alte Tagesflüge aufräumen
    for (const k of Object.keys(store.current)) if (k.startsWith('D') && k !== key) delete store.current[k];
  } else {
    key = diff;
    title = DIFFICULTIES[diff].name;
    sub = `Flug Nr. ${statsOf(diff).solved + 1} · ${DIFFICULTIES[diff].place}`;
    getPuzzle = () => takePuzzle(diff);
    if (fresh) delete store.current[key];
  }
  G.mode = mode; G.diff = diff;
  $('#game-title').textContent = title;
  $('#game-sub').textContent = sub;
  $('#timer').textContent = '0:00';
  $('#board').innerHTML = '';
  $('#progress').innerHTML = '';
  G.cells = null; G.key = null;
  show('game');

  let cur = store.current[key];
  if (!cur) {
    const loadT = setTimeout(() => $('#loading').classList.add('show'), 120);
    await nextFrame();
    const puzzle = await getPuzzle();
    clearTimeout(loadT);
    if (token !== startToken) return;
    cur = store.current[key] = { puzzle, cells: null, elapsed: 0, hints: 0, mistakes: 0 };
    save();
  }
  $('#loading').classList.remove('show');
  const p = cur.puzzle;
  const n = p.n;
  G.key = key; G.n = n; G.regions = p.regions; G.solution = p.solution;
  G.colors = assignZoneColors(n, p.regions, p.colorSeed);
  G.cells = new Uint8Array(n * n);
  if (cur.cells && cur.cells.length === n * n) cur.cells.forEach((v, i) => (G.cells[i] = v));
  G.hints = cur.hints || 0; G.mistakes = cur.mistakes || 0; G.elapsed = cur.elapsed || 0;
  G.history = []; G.done = false; G.startedAt = null;
  G.combo = 0; G.bestCombo = cur.bestCombo || 0; G.lastPlace = 0; G.milestones = new Set();
  $('#combo').classList.remove('show');
  $('#game-sub').textContent = `${n}×${n} · ` + sub;
  buildBoard();
  render({ initial: true });
  resumeTimer();
}

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
    return `<div class="pg" style="--k:${i}"><img src="${sprite(i)}" alt=""></div>`;
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
    if (v === 1 && !x) { el.insertAdjacentHTML('beforeend', X_HTML); }
    if (v !== 1 && x) x.remove();
    el.classList.toggle('has-x', v === 1);
    // Schirm
    let g = el.querySelector('.g-wrap:not(.leave)');
    if (v === 2 && !g) {
      g = document.createElement('div');
      g.className = 'g-wrap' + (initial || !animate.has(i) ? ' noanim' : '');
      if (initial) g.classList.remove('noanim');
      if (initial) g.style.animationDelay = `${0.25 + Math.random() * 0.3}s`;
      g.innerHTML = gliderHTML(G.regions[i]);
      el.appendChild(g);
    }
    if (v !== 2 && g) {
      g.classList.add('leave');
      setTimeout(() => g.remove(), 300);
    }
    el.classList.toggle('has-g', v === 2);
    el.classList.toggle('conflict', info.conflict.has(i));
    if (v === 2 && g) {
      const img = g.querySelector('img');
      const want = info.conflict.has(i) ? SPRITE_SCARED : sprite(G.regions[i]);
      if (img && !img.src.endsWith(want)) img.src = want;
    }
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
  $('#progress').classList.toggle('full', info.gl.length === G.n && !info.conflict.size);
  return info;
}

// ---------- Aktionen ----------
function pushHistory() {
  G.history.push(G.cells.slice());
  if (G.history.length > 300) G.history.shift();
}

function setCells(changes, { sound = true, hint = false } = {}) {
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
      breakCombo();
      if (sound) sfx.bad();
      vibe([30, 50, 30]);
      const why = info.reasons.get(placed);
      toast({ touch: 'Kollisionsgefahr! Schirme dürfen sich nicht berühren.', row: 'Zwei Schirme in einer Reihe!', col: 'Zwei Schirme in einer Spalte!', zone: 'Zwei Schirme in einer Zone!' }[why], 'bad');
      quake();
    } else {
      if (sound) sfx.place();
      vibe(12);
      ripple(placed);
      burstAtCell(placed, 9, [CANOPY_COLORS[G.regions[placed] % 6], ...SPARK_COLORS]);
      if (!hint) bumpCombo(placed); else breakCombo();
      milestone(info, placed);
    }
  } else if (marked) { if (sound) sfx.mark(); vibe(5); }
  else if (removed) { if (sound) sfx.remove(); vibe(5); }
  saveProgress();
  checkWin(info);
}

// ---------- Belohnungs-Effekte ----------
function cellCenter(i) {
  const r = G.cellEls[i].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
}
function burst(x, y, count = 10, colors = SPARK_COLORS, { spread = 70, size = 14 } = {}) {
  const fx = $('#fx');
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + Math.random() * 0.6;
    const d = spread * (0.5 + Math.random() * 0.7);
    const el = document.createElement('div');
    el.className = 'spark';
    el.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--s:${size * (0.6 + Math.random() * 0.8)}px;--c:${colors[k % colors.length]};--r:${(Math.random() - 0.5) * 540}deg;--t:${0.6 + Math.random() * 0.4}s`;
    el.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-spark"/></svg>';
    fx.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
}
function burstAtCell(i, count, colors) {
  const c = cellCenter(i);
  burst(c.x, c.y, count, colors, { spread: c.w * 1.1, size: Math.max(10, c.w * 0.28) });
}
function popup(text, x, y, { color = '#fff', size = 24 } = {}) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  el.style.cssText = `left:${x}px;top:${y}px;--c:${color};--fs:${size}px`;
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function quake() {
  const b = $('#board');
  b.classList.remove('quake'); void b.offsetWidth; b.classList.add('quake');
}

const COMBO_WORDS = ['', '', 'Schön!', 'Super!', 'Klasse!', 'Wahnsinn!', 'Thermik-Profi!', 'Unaufhaltsam!', 'Himmelsstürmer!', 'Legendär!', 'Perfekt!'];
const COMBO_COLORS = ['#fff', '#fff', '#a6f08a', '#7ce0ff', '#ffd23f', '#ff8fc7', '#c9a6ff', '#ff9f5a', '#7ce0ff', '#ffd23f', '#ff8fc7'];
function bumpCombo(i) {
  const now = performance.now();
  G.combo = now - G.lastPlace < 9000 ? G.combo + 1 : 1;
  G.lastPlace = now;
  G.bestCombo = Math.max(G.bestCombo, G.combo);
  const el = $('#combo');
  if (G.combo >= 2) {
    const k = Math.min(G.combo, COMBO_WORDS.length - 1);
    const c = cellCenter(i);
    popup(COMBO_WORDS[k], c.x, c.y - c.w * 0.3, { color: COMBO_COLORS[k], size: 20 + Math.min(G.combo, 8) * 2 });
    sfx.combo(G.combo);
    el.textContent = `Combo ×${G.combo}`;
    el.classList.add('show');
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    if (G.combo >= 4) burst(c.x, c.y, 6 + G.combo, SPARK_COLORS, { spread: c.w * 1.8, size: 16 });
  }
  clearTimeout(G.comboT);
  G.comboT = setTimeout(() => el.classList.remove('show'), 9000);
}
function breakCombo() {
  G.combo = 0;
  $('#combo').classList.remove('show');
}

function milestone(info, i) {
  const count = info.gl.length - info.conflict.size;
  const c = cellCenter(i);
  const half = Math.ceil(G.n / 2);
  let text = null;
  if (count === G.n - 1 && !G.milestones.has('last')) { G.milestones.add('last'); text = 'Noch einer!'; }
  else if (count === half && G.n >= 6 && !G.milestones.has('half')) { G.milestones.add('half'); text = 'Halbzeit!'; }
  if (text) {
    setTimeout(() => {
      const b = $('#board').getBoundingClientRect();
      popup(text, b.left + b.width / 2, b.top + b.height / 2, { color: '#ffd23f', size: 34 });
      sfx.milestone();
      burst(b.left + b.width / 2, b.top + b.height / 2, 14, SPARK_COLORS, { spread: 120, size: 18 });
    }, 350);
  }
}

// Gelegentlich macht ein Schirm einen Freudenhüpfer
setInterval(() => {
  if (currentScreen !== 'game' || G.done || !G.cells || document.hidden) return;
  const ws = G.cellEls.map((el) => el.querySelector('.g-wrap:not(.leave)')).filter((g) => g && !g.parentElement.classList.contains('conflict'));
  if (!ws.length) return;
  const g = ws[Math.floor(Math.random() * ws.length)];
  g.classList.remove('noanim'); g.style.animation = 'none';
  g.classList.add('happy');
  setTimeout(() => g.classList.remove('happy'), 700);
}, 3200);

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

// ---------- Tipps (über den Logik-Löser) ----------
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
  }, 2800);
}

const UNIT = { row: 'Reihe', col: 'Spalte', zone: 'Zone' };
const UNITS = { row: 'Reihen', col: 'Spalten', zone: 'Zonen' };

function explain(step) {
  const u = step.units[0];
  switch (step.tech) {
    case 1: return `In dieser ${UNIT[u.kind]} ist nur noch ein Platz frei.`;
    case 2: return u.kind === 'zone'
      ? `Diese Zone liegt komplett in einer ${UNIT[step.target.kind]}. Der Rest der ${UNIT[step.target.kind]} ist gesperrt.`
      : `Diese ${UNIT[u.kind]} hat nur noch Plätze in einer Zone. Der Rest der Zone ist gesperrt.`;
    case 3: return `Ein Schirm hier würde die markierte ${UNIT[u.kind]} komplett blockieren.`;
    case 4: return `Diese ${step.k} ${UNITS[step.from]} passen nur in ${step.k} ${UNITS[step.to]}. Dort ist sonst alles gesperrt.`;
    case 5: return `Probeflug: Mit einem Schirm hier bliebe für die markierte ${UNIT[u.kind]} später kein Platz.`;
  }
  return '';
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
    return saveProgress();
  }
  const wrongX = [...cells.keys()].filter((i) => cells[i] === 1 && isSol(i));
  if (wrongX.length) {
    pushHistory();
    highlight([wrongX[0]]);
    toast('Hier hast du ein × gesetzt, aber genau hier gehört ein Schirm hin.');
    later(() => setCells([[wrongX[0], 0]], { sound: false }), 900);
    return saveProgress();
  }

  // 2) Nächsten logischen Schritt suchen
  const st = createLogicState(n, G.regions);
  for (let i = 0; i < n * n; i++) if (cells[i] === 2) placeIn(st, i);
  for (let i = 0; i < n * n; i++) if (cells[i] === 1) st.cand[i] = 0;
  const step = nextLogicStep(st, 5);
  pushHistory();
  if (!step) {
    // Notfall: einen richtigen Schirm verraten
    const r = [...Array(n).keys()].find((r) => cells[r * n + solution[r]] !== 2);
    const i = r * n + solution[r];
    highlight([i]);
    toast('Kniffliger Flug! Hier fliegt sicher ein Schirm.', 'good');
    later(() => setCells([[i, 2]], { hint: true }), 700);
    return saveProgress();
  }
  const soft = [...new Set(step.units.flatMap((u) => u.cells))];
  toast(explain(step), 'good');
  if (step.place != null) {
    highlight([step.place], soft);
    later(() => setCells([[step.place, 2]], { hint: true }), 750);
  } else {
    highlight(step.elim, soft);
    later(() => setCells(step.elim.map((i) => [i, 1])), 750);
  }
  saveProgress();
}

// ---------- Gewinnen ----------
function checkWin(info) {
  if (G.done) return;
  if (info.gl.length !== G.n || info.conflict.size) return;
  G.done = true;
  pauseTimer();
  breakCombo();
  const time = Math.floor(G.elapsed);
  const errors = G.hints + G.mistakes;
  const stars = errors === 0 ? 3 : errors <= 2 ? 2 : 1;
  let record = '';
  const st = statsOf(G.diff);
  if (G.mode === 'daily') {
    store.daily[G.date] = Math.max(store.daily[G.date] || 0, stars);
    const s = dailyStreak();
    if (s > 1) record = `🔥 ${s} Tage in Folge!`;
  } else {
    st.solved++;
    if (stars === 3) st.perfect++;
    if (st.best == null || time < st.best) { if (st.best != null) record = 'Bestzeit!'; st.best = time; }
  }
  // Flugmeilen
  const base = XP_BASE[G.diff] * (G.mode === 'daily' ? 1.5 : 1);
  const mult = stars === 3 ? 2 : stars === 2 ? 1.4 : 1;
  const comboBonus = G.bestCombo >= 2 ? G.bestCombo * 5 : 0;
  const gain = Math.round(base * mult + comboBonus);
  const xpBefore = store.xp || 0;
  store.xp = xpBefore + gain;
  delete store.current[G.key];
  save();
  celebrate(stars, time, record, { gain, xpBefore, comboBonus, mult });
}

function celebrate(stars, time, record, xp) {
  const board = $('#board');
  sfx.win(); vibe([20, 60, 20, 60, 40]);
  const flash = document.createElement('div');
  flash.className = 'flashscreen';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
  const br = board.getBoundingClientRect();
  burst(br.left + br.width / 2, br.top + br.height / 2, 24, SPARK_COLORS, { spread: br.width * 0.7, size: 22 });
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
      fly.innerHTML = gliderHTML(G.regions[i]);
      fx.appendChild(fly);
      g.style.visibility = 'hidden';
      setTimeout(() => fly.remove(), 3000);
    });
  }, 650);
  setTimeout(confetti, 900);
  setTimeout(() => showWin(stars, time, record, xp), 1700);
}

function confetti(amount = 54) {
  const fx = $('#fx');
  const cols = ['#ff5a4e', '#ffd23f', '#3d8bff', '#ff8fc7', '#36c97a', '#8a4dff', '#7ce0ff'];
  for (let k = 0; k < amount; k++) {
    const d = document.createElement('div');
    const kind = k % 5 === 0 ? 'glider' : k % 3 === 0 ? 'star' : 'piece';
    const size = kind === 'glider' ? 34 + Math.random() * 22 : kind === 'star' ? 16 + Math.random() * 12 : 9 + Math.random() * 8;
    d.className = 'confetti ' + kind;
    d.style.cssText = `left:${Math.random() * 100}vw;width:${size}px;height:${kind === 'piece' ? size * 0.6 : size}px;--dur:${2.6 + Math.random() * 2.6}s;--dl:${Math.random() * 0.9}s;--rot:${(Math.random() - 0.5) * 720}deg;--col:${cols[k % cols.length]}`;
    d.innerHTML = kind === 'glider' ? `<div><img src="${sprite(k)}" alt=""></div>`
      : kind === 'star' ? '<div><svg viewBox="0 0 24 24"><use href="#i-star"/></svg></div>' : '<div></div>';
    fx.appendChild(d);
    setTimeout(() => d.remove(), 6500);
  }
}

const WIN_TITLES = ['Sanft gelandet!', 'Perfekte Thermik!', 'Toplandung!', 'Was für ein Flug!', 'Luftraum gesichert!', 'Butterweich gelandet!'];
function countUp(el, to, { dur = 900, fmt = (v) => v, tick = true } = {}) {
  const t0 = performance.now();
  let last = -1;
  function step(t) {
    const p = Math.min(1, (t - t0) / dur);
    const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
    el.textContent = fmt(v);
    if (tick && v !== last && Math.floor(v / Math.max(1, to / 12)) !== Math.floor(last / Math.max(1, to / 12))) sfx.tick();
    last = v;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  // Endwert garantiert setzen, auch wenn keine Bilder gezeichnet werden
  setTimeout(() => { el.textContent = fmt(to); }, dur + 100);
}

function setRankBar(fill, frac, instant = false) {
  if (instant) { fill.style.transition = 'none'; fill.style.width = frac * 100 + '%'; void fill.offsetWidth; fill.style.transition = ''; }
  else fill.style.width = frac * 100 + '%';
}

function showWin(stars, time, record, xp) {
  $('#win-title').textContent = stars === 3 ? WIN_TITLES[Math.floor(Math.random() * WIN_TITLES.length)] : stars === 2 ? 'Gut gelandet!' : 'Gelandet!';
  $('#win-hints').textContent = G.hints;
  $('#win-combo').textContent = G.bestCombo >= 2 ? `×${G.bestCombo}` : '–';
  $('#win-record').textContent = record;
  $('#win-next').textContent = G.mode === 'daily' ? 'Zum Menü' : `Neuer Flug · ${DIFFICULTIES[G.diff].name}`;
  $('[data-action="win-menu"]').style.display = G.mode === 'daily' ? 'none' : '';
  $$('.win-stars .star').forEach((s) => s.classList.remove('on'));
  const before = rankInfo(xp.xpBefore), after = rankInfo(xp.xpBefore + xp.gain);
  const fill = $('#win-fill');
  $('#win-rank').textContent = `${before.name} · Rang ${before.lvl}`;
  $('#win-xp').textContent = '+0';
  const notes = [];
  if (xp.mult > 1) notes.push(`Sterne ×${xp.mult}`);
  if (xp.comboBonus) notes.push(`Combo +${xp.comboBonus}`);
  if (G.mode === 'daily') notes.push('Tagesflug ×1.5');
  $('#win-xp-note').textContent = 'Flugmeilen' + (notes.length ? ' · ' + notes.join(' · ') : '');
  setRankBar(fill, before.frac, true);
  openModal('#modal-win');
  countUp($('#win-time'), time, { dur: 700, fmt: fmtTime, tick: false });
  [0, 1, 2].forEach((i) => {
    if (i >= stars) return;
    setTimeout(() => {
      const st = $(`.win-stars .star[data-i="${i}"]`);
      st.classList.add('on'); sfx.star(i); vibe(15);
      const r = st.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 10, ['#ffd23f', '#fff', '#ffe37a'], { spread: 60, size: 14 });
    }, 500 + i * 320);
  });
  // Meilen hochzählen und Balken füllen
  setTimeout(() => {
    countUp($('#win-xp'), xp.gain, { dur: 1000, fmt: (v) => `+${v}` });
    if (after.lvl > before.lvl) {
      setRankBar(fill, 1);
      setTimeout(() => {
        setRankBar(fill, 0, true);
        setRankBar(fill, after.frac);
        $('#win-rank').textContent = `${after.name} · Rang ${after.lvl}`;
        showRankUp(after);
      }, 750);
    } else setRankBar(fill, after.frac);
  }, 500 + stars * 320 + 200);
}

function showRankUp(r) {
  $('#rankup-name').textContent = r.name;
  $('#rankup-lvl').textContent = `Rang ${r.lvl}`;
  const el = $('#rankup');
  el.classList.add('show');
  sfx.levelUp(); vibe([40, 60, 40, 60, 80]);
  confetti(70);
  setTimeout(() => burst(innerWidth / 2, innerHeight / 2, 28, SPARK_COLORS, { spread: 170, size: 24 }), 300);
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
    g.innerHTML = gliderHTML(k);
    els[i].appendChild(g);
  });
  [0, 2, 3, 5].forEach((i) => els[i].insertAdjacentHTML('beforeend', X_HTML));
}

// ---------- Buttons ----------
let helpReturn = 'home';
let pendingStart = null;
document.addEventListener('click', (e) => {
  const dc = e.target.closest('[data-diff]');
  if (dc) {
    sfx.click();
    const diff = dc.dataset.diff;
    if (!store.seenHelp) { store.seenHelp = true; save(); pendingStart = { mode: 'free', diff }; helpReturn = 'start'; openHelp(); }
    else startGame({ mode: 'free', diff });
    return;
  }
  const b = e.target.closest('[data-action]');
  if (!b) return;
  unlockAudio();
  const a = b.dataset.action;
  if (b.matches('.btn, .tool, .icon-btn, .rank')) { b.classList.remove('jelly'); void b.offsetWidth; b.classList.add('jelly'); }
  if (!['undo', 'hint', 'reset'].includes(a)) sfx.click();
  switch (a) {
    case 'daily': startGame({ mode: 'daily' }); break;
    case 'rank': {
      const r = rankInfo(store.xp || 0);
      toast(`${r.name}: noch ${r.to - (store.xp || 0)} Flugmeilen bis Rang ${r.lvl + 1}`, 'good');
      break;
    }
    case 'rankup-close': $('#rankup').classList.remove('show'); break;
    case 'home': show('home'); break;
    case 'back-from-game': show('home'); break;
    case 'help': helpReturn = currentScreen; openHelp(); break;
    case 'help-close':
      if (helpReturn === 'start' && pendingStart) { helpReturn = 'home'; startGame(pendingStart); pendingStart = null; }
      else show(helpReturn === 'start' ? 'home' : helpReturn);
      break;
    case 'settings': syncSettings(); openModal('#modal-settings'); break;
    case 'settings-close': closeModal('#modal-settings'); break;
    case 'privacy': closeModal('#modal-settings'); openModal('#modal-privacy'); $('#modal-privacy .legal').scrollTop = 0; break;
    case 'imprint': closeModal('#modal-settings'); openModal('#modal-imprint'); break;
    case 'legal-close': closeModal('#modal-privacy'); closeModal('#modal-imprint'); break;
    case 'reset-progress':
      if (confirm('Wirklich Statistik und Spielstände löschen?')) {
        const s = store.settings, pool = store.pool;
        Object.assign(store, defaults(), { settings: s, pool, seenHelp: true }); save();
        closeModal('#modal-settings'); renderHome(); toast('Fortschritt gelöscht');
      }
      break;
    case 'undo': undo(); break;
    case 'hint': hint(); break;
    case 'reset':
      if (G.done) break;
      $('#new-puzzle-btn').style.display = G.mode === 'daily' ? 'none' : '';
      openModal('#modal-new');
      break;
    case 'clear-board': closeModal('#modal-new'); resetBoard(); break;
    case 'new-puzzle': closeModal('#modal-new'); startGame({ mode: 'free', diff: G.diff, fresh: true }); break;
    case 'new-cancel': closeModal('#modal-new'); break;
    case 'next':
      closeModal('#modal-win');
      if (G.mode === 'daily') show('home');
      else startGame({ mode: 'free', diff: G.diff });
      break;
    case 'win-menu': closeModal('#modal-win'); show('home'); break;
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
  if (now - lastTouch < 350 && !e.target.closest('.help-scroll, .legal')) e.preventDefault();
  lastTouch = now;
}, { passive: false });

// verzögerte Aktion nur ausführen, wenn noch dasselbe Rätsel offen ist
function later(fn, ms) {
  const k = G.key;
  setTimeout(() => { if (G.key === k && !G.done) fn(); }, ms);
}

// ---------- Startseite: verspielte Details ----------
$('#title').innerHTML = [...'Thermikdoku'].map((ch, i) =>
  `<span class="${i >= 7 ? 'y' : ''}" style="animation-delay:${0.45 + i * 0.05}s, ${2 + i * 0.12}s">${ch}</span>`).join('');

$('#logo').addEventListener('click', () => {
  unlockAudio();
  const l = $('#logo');
  if (l.classList.contains('loop')) return;
  l.classList.add('loop');
  sfx.whee(); vibe(20);
  const r = l.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 14, SPARK_COLORS, { spread: r.width * 0.9, size: 18 });
  setTimeout(() => { l.classList.remove('loop'); l.querySelector('img').src = sprite(Math.floor(Math.random() * 6)); }, 1000);
});

setInterval(() => {
  if (currentScreen !== 'home' || document.hidden) return;
  const cards = $$('.diff-card');
  if (!cards.length) return;
  const resume = cards.filter((c) => c.querySelector('.badge'));
  const pool = resume.length && Math.random() < 0.6 ? resume : cards;
  const c = pool[Math.floor(Math.random() * pool.length)];
  c.classList.remove('wiggle'); void c.offsetWidth; c.classList.add('wiggle');
}, 4200);

// Der Schirm im Hintergrund wechselt bei jeder Runde die Farbe
$('.sky-glider').addEventListener('animationiteration', (e) => {
  if (e.animationName === 'skyGlide') $('.sky-glider img').src = sprite(Math.floor(Math.random() * 6));
});

// ---------- Start ----------
localStorage.removeItem('thermikdoku.v1');
renderHome();
// Vorrat für alle Stufen im Hintergrund füllen
DIFF_KEYS.forEach((d, i) => setTimeout(() => refillPool(d), 400 + i * 300));
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
