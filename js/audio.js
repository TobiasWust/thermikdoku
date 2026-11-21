// Klänge und Musik für Thermikdoku – alles live per WebAudio, keine Dateien.
// Die Engine (Instrumente, Effekt-Generator, Sequenzer) liegt in synth.js.
import { createAudio } from './synth.js';

const settings = { sfx: 80, music: 55 };

// ---------- Musik: ruhig und luftig, aufsteigende Arpeggien wie Thermik ----------
// D-Dur mit lydischer Farbe: Dmaj7 – Bm7 – Gmaj7(#11) – Asus
const hold = (chord, n = 16) => chord + ' -'.repeat(n - 1);
const arp = (notes) => notes.map((n) => `${n} .`).join(' '); // 8 Achtel → 16 Schritte
const CHORDS = {
  D: { pad: 'D4,F#4,A4,C#5', arp: ['D5', 'A5', 'F#5', 'C#6', 'A5', 'E6', 'C#6', 'A5'], bass: 'D2 - - - - - - - A1 - - - - - . .' },
  Bm: { pad: 'B3,D4,F#4,A4', arp: ['B4', 'F#5', 'D5', 'A5', 'F#5', 'C#6', 'A5', 'F#5'], bass: 'B1 - - - - - - - F#2 - - - - - . .' },
  G: { pad: 'G3,B3,D4,F#4', arp: ['G4', 'D5', 'B4', 'F#5', 'D5', 'C#6', 'B5', 'F#5'], bass: 'G1 - - - - - - - D2 - - - - - . .' },
  A: { pad: 'A3,D4,E4,G4', arp: ['A4', 'E5', 'D5', 'G5', 'E5', 'B5', 'A5', 'E5'], bass: 'A1 - - - - - - - E2 - - - - - . .' },
};
const patterns = {};
for (const [k, c] of Object.entries(CHORDS)) {
  patterns[k] = { pad: hold(c.pad), arp: arp(c.arp), bass: c.bass };
}
// Flötenmelodie, lang und sparsam
Object.assign(patterns, {
  m1: { flute: 'F#5 - - - - - E5 - D5 - - - - - - .' },
  m2: { flute: '. . . . B4 - - - D5 - - - E5 - - .' },
  m3: { flute: 'F#5 - - - - - - - A5 - - - G5 - - .' },
  m4: { flute: 'E5 - - - - - - - - - - - . . . .' },
  m5: { flute: 'A5 - - - - - F#5 - E5 - - - D5 - - .' },
  m6: { flute: '. . . . D5 - - - F#5 - - - A5 - - .' },
  m7: { flute: 'B5 - - - - - - - A5 - - - F#5 - - .' },
  m8: { flute: 'E5 - - - - - - - D5? - - - . . . .' },
  air: { shaker: '....x.......x..o' },
});

const SONG = {
  bpm: 80, swing: 0.08,
  tracks: {
    pad: { inst: 'pad', vol: 0.9 },
    arp: { inst: 'kalimba', vol: 0.55, echo: 0.3, pan: 0.15 },
    bass: { inst: 'subBass', vol: 0.75 },
    flute: { inst: 'flute', vol: 0.6, verb: 0.25, pan: -0.15 },
    shaker: { inst: 'shaker', vol: 0.5 },
  },
  patterns,
  sections: {
    // Startbildschirm und Menüs: nur Fläche, Arpeggio und Bass
    menu: ['D', 'Bm', 'G', 'A'],
    // Im Rätsel: dazu ein leiser Puls und ab dem zweiten Durchgang die Flöte
    play: ['D+air', 'Bm+air', 'G+air', 'A+air',
      'D+air+m1', 'Bm+air+m2', 'G+air+m3', 'A+air+m4',
      'D+air+m5', 'Bm+air+m6', 'G+air+m7', 'A+air+m8'],
  },
  start: 'menu',
  autostart: true,
};

const A = createAudio(() => settings, SONG);
document.addEventListener('visibilitychange', () => A.setHidden(document.hidden));

export function setSoundEnabled(v) { settings.sfx = v ? 80 : 0; A.update(); }
export function setMusicEnabled(v) {
  settings.music = v ? 55 : 0;
  if (!v) A.music.pause();
  A.update();
}
export function unlockAudio() { A.unlock(); }
/** Abschnitt der Musik: 'menu' oder 'play' (wechselt am Taktende) */
export function setMusic(section) { if (A.music.current !== section) A.music.section(section); }

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
const fx = A.fx, play = A.play;

export const sfx = {
  // × setzen: leises Holzklacken
  mark() { play('block', { f: 1250 + Math.random() * 150, vel: 0.45 }); },
  // Schirm setzen: Luftzug und ein aufsteigender Ton
  place() {
    fx({ wave: 'noise', f: 400, f2: 2200, q: 1.1, a: 0.08, d: 0.2, vol: 0.07 });
    fx({ wave: 'sine', f: 520, f2: 820, a: 0.01, d: 0.17, harm: 0.15, vol: 0.09, vary: 0.4, verb: 0.2 }, { delay: 0.04 });
    play('kalimba', { note: 81, dur: 0.3, delay: 0.1, vel: 0.35 });
  },
  remove() { fx({ wave: 'sine', f: 620, f2: 300, a: 0.003, d: 0.12, lp: { f: 1800 }, vol: 0.07, vary: 0.3 }); },
  // Fehler: weiches Plopp-Plopp statt Summer
  bad() {
    fx({ wave: 'triangle', f: 230, f2: 150, a: 0.003, d: 0.18, drive: 0.25, lp: { f: 900 }, vol: 0.09 });
    fx({ wave: 'triangle', f: 205, f2: 130, a: 0.003, d: 0.2, drive: 0.25, lp: { f: 800 }, vol: 0.08 }, { delay: 0.13 });
  },
  good() { play('marimba', { note: 88, dur: 0.15, delay: 0.08, vel: 0.4, verb: 0.25 }); },
  hint() { [74, 78, 81].forEach((n, i) => play('kalimba', { note: n, dur: 0.3, delay: i * 0.07, vel: 0.55 })); },
  undo() { fx({ wave: 'triangle', f: 520, f2: 380, a: 0.002, d: 0.08, vol: 0.06, verb: 0.1 }); },
  click() { fx({ wave: 'triangle', f: 1500, f2: 1100, a: 0.001, d: 0.035, vol: 0.06, vary: 0.6 }); },
  win() {
    A.duck(0.75, 2.4);
    fx({ wave: 'noise', f: 250, f2: 1800, q: 1, a: 0.5, d: 1.1, vol: 0.08 });
    [74, 78, 81, 86, 90, 93].forEach((n, i) => play('pluck', { note: n, dur: 0.3, delay: 0.25 + i * 0.09, vel: 0.5, verb: 0.3 }));
    [86, 90, 93, 97].forEach((n, i) => play('bell', { note: n, dur: 1, delay: 0.8 + i * 0.04, vel: 0.15 }));
    ['D4', 'F#4', 'A4', 'C#5'].forEach((n) => play('pad', { note: n, dur: 1.6, delay: 0.2, vel: 0.8 }));
  },
  star(i) {
    play('bell', { note: 81 + PENTA[i * 2], dur: 0.4, vel: 0.3 });
    play('kalimba', { note: 69 + PENTA[i * 2], dur: 0.3, delay: 0.03, vel: 0.5 });
  },
  // Combo: Tonleiter, die mit jeder Stufe höher klettert
  combo(n) {
    const s = PENTA[Math.min(Math.max(n - 2, 0), PENTA.length - 1)];
    play('kalimba', { note: 76 + s, dur: 0.2, vel: 0.6 });
    play('bell', { note: 83 + s, dur: 0.3, delay: 0.06, vel: 0.22 });
  },
  sparkle() { [91, 96, 100].forEach((n, i) => play('bell', { note: n, dur: 0.2, delay: i * 0.035, vel: 0.12 })); },
  tick() { play('block', { f: 1800 + Math.random() * 300, vel: 0.2 }); },
  milestone() { [79, 83, 86].forEach((n, i) => play('marimba', { note: n, dur: 0.15, delay: i * 0.08, vel: 0.5, verb: 0.25 })); },
  // Juhu: Schirm steigt in der Thermik
  whee() {
    fx({ wave: 'sine', f: 400, f2: 1400, a: 0.02, d: 0.42, vib: { rate: 7, depth: 0.3 }, harm: 0.2, vol: 0.08, verb: 0.2 });
    fx({ wave: 'noise', f: 500, f2: 3000, q: 1, a: 0.15, d: 0.35, vol: 0.07 });
  },
  levelUp() {
    A.duck(0.8, 3);
    fx({ wave: 'noise', f: 300, f2: 2500, q: 1, a: 0.4, d: 0.8, vol: 0.08 });
    const notes = [72, 76, 79, 84, 79, 84, 88, 91];
    notes.forEach((n, i) => play('pluck', { note: n, dur: i === notes.length - 1 ? 0.7 : 0.16, delay: i * 0.1, vel: 0.55, verb: 0.25 }));
    notes.forEach((n, i) => play('chipBass', { note: n - 24, dur: 0.12, delay: i * 0.1, vel: 0.35 }));
    ['C4', 'E4', 'G4', 'C5'].forEach((n) => play('strings', { note: n, dur: 1.4, delay: 0.7, vel: 0.9 }));
    play('bell', { note: 96, dur: 1.2, delay: 0.7, vel: 0.2 });
    play('tom', { delay: 0.7, vel: 0.5 });
  },
};
