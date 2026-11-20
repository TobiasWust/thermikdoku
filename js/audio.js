// Kleine Synthesizer-Sounds per WebAudio – keine Dateien nötig
let ctx = null;
let enabled = true;
let noiseBuf = null;

export function setSoundEnabled(v) { enabled = v; }

function ac() {
  if (!enabled) return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { ac(); }

function tone({ f = 440, f2 = null, dur = 0.12, type = 'sine', vol = 0.12, delay = 0 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

function whoosh({ dur = 0.3, vol = 0.1, f = 600, f2 = 2400, delay = 0 }) {
  const c = ac(); if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + delay;
  const src = c.createBufferSource(); src.buffer = noiseBuf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(f, t);
  bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t); src.stop(t + dur + 0.05);
}

export const sfx = {
  mark() { tone({ f: 950, f2: 720, dur: 0.05, type: 'triangle', vol: 0.06 }); },
  place() {
    whoosh({ dur: 0.28, vol: 0.12, f: 400, f2: 2200 });
    tone({ f: 520, f2: 820, dur: 0.18, type: 'sine', vol: 0.11, delay: 0.04 });
  },
  remove() { tone({ f: 620, f2: 300, dur: 0.12, type: 'sine', vol: 0.07 }); },
  bad() {
    tone({ f: 190, f2: 140, dur: 0.2, type: 'square', vol: 0.045 });
    tone({ f: 180, f2: 130, dur: 0.22, type: 'square', vol: 0.04, delay: 0.13 });
  },
  good() { tone({ f: 880, f2: 1320, dur: 0.12, type: 'triangle', vol: 0.05, delay: 0.08 }); },
  hint() { [660, 880, 1175].forEach((f, i) => tone({ f, dur: 0.14, type: 'triangle', vol: 0.07, delay: i * 0.07 })); },
  undo() { tone({ f: 520, f2: 380, dur: 0.08, type: 'triangle', vol: 0.06 }); },
  click() { tone({ f: 740, dur: 0.035, type: 'sine', vol: 0.05 }); },
  win() {
    whoosh({ dur: 1.6, vol: 0.1, f: 250, f2: 1800 });
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
      tone({ f, dur: 0.4, type: 'triangle', vol: 0.09, delay: 0.25 + i * 0.09 }));
  },
  star(i) { tone({ f: 880 * Math.pow(1.26, i), dur: 0.25, type: 'triangle', vol: 0.09 }); },
};
