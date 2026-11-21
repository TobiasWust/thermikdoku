#!/usr/bin/env node
// Prüft die Übersetzungen:  node scripts/check-i18n.mjs
// - de.json und en.json haben genau dieselben Schlüssel und dieselben {platzhalter}
// - jeder in index.html und js/*.js benutzte Schlüssel existiert (auch .one/.other bei tp())
// - dynamische Schlüssel (rank.N, combo.N, win.title.N, diff.*, place.*, mod.*) sind vollständig
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const LANGS = ['de', 'en'];
const dicts = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(read(`i18n/${l}.json`))]));
const errors = [];
const warnings = [];

// 1) gleiche Schlüssel, gleiche Platzhalter
const [a, b] = LANGS;
const keysA = new Set(Object.keys(dicts[a])), keysB = new Set(Object.keys(dicts[b]));
for (const k of keysA) if (!keysB.has(k)) errors.push(`${k}: fehlt in ${b}.json`);
for (const k of keysB) if (!keysA.has(k)) errors.push(`${k}: fehlt in ${a}.json`);
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const k of keysA) {
  if (!keysB.has(k)) continue;
  if (vars(dicts[a][k]) !== vars(dicts[b][k])) errors.push(`${k}: Platzhalter unterschiedlich ({${vars(dicts[a][k])}} / {${vars(dicts[b][k])}})`);
  for (const l of LANGS) if (!String(dicts[l][k]).trim()) errors.push(`${k}: leer in ${l}.json`);
}

const has = (k) => LANGS.every((l) => k in dicts[l]);
const used = new Set();
const need = (k, where) => { used.add(k); if (!has(k)) errors.push(`${k}: benutzt in ${where}, aber nicht in allen Sprachen vorhanden`); };

// 2) HTML
const html = read('index.html');
for (const m of html.matchAll(/data-i18n(?:-html|-aria|-title|-placeholder)?="([^"]+)"/g)) need(m[1], 'index.html');
need('meta.title', 'i18n.js'); need('meta.description', 'i18n.js');

// 3) JavaScript
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js'));
const prefixes = [];
for (const f of jsFiles) {
  const src = read(`js/${f}`);
  for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) need(m[1], `js/${f}`);
  for (const m of src.matchAll(/\btp\(\s*'([^']+)'/g)) { need(`${m[1]}.one`, `js/${f}`); need(`${m[1]}.other`, `js/${f}`); }
  for (const m of src.matchAll(/\btp?\(\s*`([^`$]*)\$\{/g)) prefixes.push([m[1], `js/${f}`]);
}
const allKeys = [...keysA];
for (const [p, where] of prefixes) {
  const hit = allKeys.filter((k) => k.startsWith(p));
  if (!hit.length) errors.push(`${p}…: dynamischer Schlüssel in ${where}, aber kein passender Eintrag`);
  hit.forEach((k) => used.add(k));
}

// 4) dynamische Familien vollständig
const app = read('js/app.js'), puzzle = read('js/puzzle.js');
const ranks = app.match(/const RANKS = \[([^\]]+)\]/)[1].split(',').length;
for (let i = 0; i < ranks; i++) need(`rank.${i}`, 'RANKS');
const comboMax = Number(app.match(/const COMBO_MAX = (\d+)/)[1]);
for (let i = 2; i <= comboMax; i++) need(`combo.${i}`, 'COMBO_MAX');
const winTitles = Number(app.match(/const WIN_TITLES = (\d+)/)[1]);
for (let i = 0; i < winTitles; i++) need(`win.title.${i}`, 'WIN_TITLES');
const diffs = [...puzzle.match(/export const DIFFICULTIES = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s*(\w+):\s*\{/gm)].map((m) => m[1]);
for (const d of diffs) { need(`diff.${d}`, 'DIFFICULTIES'); need(`place.${d}`, 'DIFFICULTIES'); }
const mods = [...app.match(/const MODS = \[([\s\S]*?)\];/)[1].matchAll(/key: '(\w+)'/g)].map((m) => m[1]);
for (const k of mods) { need(`mod.${k}.name`, 'MODS'); need(`mod.${k}.desc`, 'MODS'); }
for (const u of ['row', 'col', 'zone']) ['hint.single', 'hint.block', 'hint.probe', 'hint.units'].forEach((p) => need(`${p}.${u}`, 'explain()'));
for (const u of ['row', 'col']) { need(`hint.zoneInLine.${u}`, 'explain()'); need(`hint.lineInZone.${u}`, 'explain()'); }
for (const w of ['touch', 'row', 'col', 'zone']) need(`conflict.${w}`, 'setCells()');

// 5) unbenutzte Schlüssel (nur Hinweis)
for (const k of allKeys) if (!used.has(k)) warnings.push(`${k}: wird nirgends benutzt`);

for (const w of warnings) console.log(`Hinweis: ${w}`);
for (const e of errors) console.log(`FEHLER:  ${e}`);
console.log(errors.length ? `\n${errors.length} Fehler` : `OK: ${keysA.size} Schlüssel in ${LANGS.join(' + ')}, alle benutzten Schlüssel vorhanden`);
process.exit(errors.length ? 1 : 0);
