// Kit-Audio 2: WebAudio ohne Dateien. Zwei Busse (Musik, Effekte) mit eigener Lautstärke,
// gemeinsamer Hall und Echo, Instrumente (Subtraktiv, FM, Unisono, Drums), ein Effekt-Generator
// im Stil von sfxr und ein kleiner Sequenzer für komponierte oder generierte Musik.
//
// Bausteine für Spiele (Details in kit/README.md):
//   Kit.audio.play('pluck', { note: 'E5', dur: 0.2 })      Instrument spielen
//   Kit.audio.fx({ wave: 'square', f: 900, arp: { t: 0.06, mult: 1.5 }, d: 0.2 })   Effekt aus Parametern
//   Kit.audio.preset('coin', 7)                             Effekt-Parameter würfeln (Seed = reproduzierbar)
//   Kit.audio.sfx.add({ jump: {...} }) → Kit.audio.sfx.jump()
//   Kit.audio.music.song({...}), .section('boss'), .intensity(0.8), .layer('lead', 0)
// Alte API (tone, noise, sfx.click … lose, music.start/stop/configure, musicBus, sfxBus, ctx) bleibt.

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

// ---------- Instrumente ----------
// osc: Oszillatoren [{type, semi, detune, gain}], unison/spread: Stimmen und Verstimmung in Cent
// fm: {ratio, index, decay, sustain}, env: ADSR in Sekunden, filter: {type, f, q, env (Hz), d, keytrack}
// pitch: {semi, t} startet höher und fällt, vib: {rate, depth (Cent), delay}
// noise: {vol, type, f, q, d, burst}, drive 0–1, vol, verb/echo (Hall/Echo-Anteil), perc + f für Drums
const INSTRUMENTS = {
  // Melodisch
  pluck: { osc: [{ type: 'sawtooth' }, { type: 'square', semi: 12, gain: 0.25 }], filter: { f: 380, env: 3600, d: 0.16, q: 2.5, keytrack: 0.5 }, env: { a: 0.002, d: 0.35, s: 0, r: 0.2 }, vol: 0.18, verb: 0.18 },
  bell: { osc: [{ type: 'sine' }], fm: { ratio: 3.5, index: 3.2, decay: 1.1 }, env: { a: 0.002, d: 1.6, s: 0, r: 0.9 }, vol: 0.11, verb: 0.35 },
  kalimba: { osc: [{ type: 'sine' }], fm: { ratio: 5.4, index: 1.4, decay: 0.05 }, env: { a: 0.001, d: 0.9, s: 0, r: 0.4 }, vol: 0.16, verb: 0.3 },
  marimba: { osc: [{ type: 'sine' }], fm: { ratio: 4, index: 2, decay: 0.07 }, env: { a: 0.001, d: 0.45, s: 0, r: 0.15 }, vol: 0.2, verb: 0.2 },
  epiano: { osc: [{ type: 'sine' }], fm: { ratio: 1, index: 1.7, decay: 0.5, sustain: 0.25 }, env: { a: 0.003, d: 1.1, s: 0.25, r: 0.35 }, vol: 0.12, verb: 0.22 },
  organ: { osc: [{ type: 'sine' }, { type: 'sine', semi: 12, gain: 0.5 }, { type: 'sine', semi: 19, gain: 0.25 }], env: { a: 0.01, d: 0.1, s: 1, r: 0.1 }, vol: 0.07, verb: 0.2 },
  pad: { osc: [{ type: 'sawtooth' }, { type: 'triangle', semi: 12, gain: 0.4 }], unison: 3, spread: 16, filter: { f: 700, env: 700, d: 1.5, q: 0.7 }, env: { a: 0.7, d: 1, s: 0.8, r: 1.4 }, vol: 0.045, verb: 0.6 },
  strings: { osc: [{ type: 'sawtooth' }], unison: 3, spread: 11, filter: { f: 1700, q: 0.8 }, env: { a: 0.28, d: 0.4, s: 0.85, r: 0.6 }, vib: { rate: 5, depth: 9, delay: 0.3 }, vol: 0.05, verb: 0.5 },
  lead: { osc: [{ type: 'square' }, { type: 'sawtooth', detune: 9, gain: 0.6 }], filter: { f: 1800, env: 1600, d: 0.25, q: 1.5 }, env: { a: 0.01, d: 0.2, s: 0.7, r: 0.15 }, vib: { rate: 5.5, depth: 14, delay: 0.18 }, vol: 0.07, echo: 0.25, verb: 0.15 },
  flute: { osc: [{ type: 'triangle' }, { type: 'sine', semi: 12, gain: 0.15 }], filter: { f: 2200, q: 0.5 }, env: { a: 0.07, d: 0.1, s: 0.85, r: 0.18 }, vib: { rate: 5, depth: 12, delay: 0.2 }, vol: 0.12, verb: 0.3 },
  chip: { osc: [{ type: 'pulse25' }], env: { a: 0.001, d: 0.1, s: 0.6, r: 0.05 }, vol: 0.07 },
  chipLead: { osc: [{ type: 'pulse12' }], env: { a: 0.001, d: 0.15, s: 0.7, r: 0.06 }, vib: { rate: 6, depth: 18, delay: 0.15 }, vol: 0.06, echo: 0.2 },
  bass: { osc: [{ type: 'sawtooth' }, { type: 'sine', semi: -12, gain: 0.8 }], filter: { f: 220, env: 900, d: 0.14, q: 5 }, env: { a: 0.003, d: 0.2, s: 0.7, r: 0.08 }, drive: 0.25, vol: 0.2 },
  subBass: { osc: [{ type: 'sine' }, { type: 'triangle', semi: 12, gain: 0.15 }], env: { a: 0.006, d: 0.3, s: 0.9, r: 0.12 }, vol: 0.32 },
  chipBass: { osc: [{ type: 'triangle' }], env: { a: 0.001, d: 0.1, s: 0.9, r: 0.03 }, vol: 0.26 },
  // Drums (perc: Tonhöhe fest, im Song ein Zeichen pro Schritt)
  kick: { perc: true, f: 48, osc: [{ type: 'sine' }], pitch: { semi: 36, t: 0.055 }, env: { a: 0.001, d: 0.32, s: 0, r: 0.05 }, noise: { vol: 0.12, type: 'highpass', f: 3500, d: 0.012 }, drive: 0.3, vol: 0.75 },
  snare: { perc: true, f: 185, osc: [{ type: 'triangle' }], pitch: { semi: 7, t: 0.03 }, env: { a: 0.001, d: 0.11, s: 0, r: 0.05 }, noise: { vol: 0.55, type: 'highpass', f: 1600, d: 0.17 }, vol: 0.3, verb: 0.15 },
  clap: { perc: true, osc: [], env: { a: 0.001, d: 0.3, s: 0, r: 0.05 }, noise: { vol: 1.6, type: 'bandpass', f: 1300, q: 1.2, d: 0.16, burst: 3 }, vol: 0.4, verb: 0.25 },
  hat: { perc: true, osc: [], env: { a: 0.001, d: 0.05, s: 0, r: 0.02 }, noise: { vol: 0.5, type: 'highpass', f: 7500, d: 0.045 }, vol: 0.16 },
  openHat: { perc: true, osc: [], env: { a: 0.001, d: 0.3, s: 0, r: 0.05 }, noise: { vol: 0.5, type: 'highpass', f: 7000, d: 0.28 }, vol: 0.12 },
  shaker: { perc: true, osc: [], env: { a: 0.012, d: 0.06, s: 0, r: 0.02 }, noise: { vol: 0.5, type: 'highpass', f: 5500, d: 0.07 }, vol: 0.18 },
  tom: { perc: true, f: 105, osc: [{ type: 'sine' }], pitch: { semi: 7, t: 0.16 }, env: { a: 0.001, d: 0.35, s: 0, r: 0.08 }, vol: 0.4, verb: 0.2 },
  block: { perc: true, f: 880, osc: [{ type: 'sine' }], fm: { ratio: 2.4, index: 1, decay: 0.02 }, env: { a: 0.001, d: 0.06, s: 0, r: 0.02 }, vol: 0.18 },
};

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'C4' → 60, 'F#3' → 54, 'Bb2' → 46, Zahl bleibt MIDI */
export function noteToMidi(n) {
  if (typeof n === 'number') return n;
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(n).trim());
  if (!m) return null;
  return (Number(m[3]) + 1) * 12 + NOTE_BASE[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

// Kleiner, reproduzierbarer Zufall
function rng(seed = Math.random() * 1e9) {
  let s = (seed >>> 0) || 1;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  r.range = (a, b) => a + (b - a) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}

export function createAudio(getSettings, musicOpts = {}, sounds = null) {
  let ctx = null, master, duck, duckWet, noiseBuf = null, hidden = false;
  let synthOut = null; // Pegel der Synth-Musik (wird beim Wechsel zu einer Musikdatei ausgeblendet)
  const file = { url: null, src: null, gain: null, wantUrl: null, opts: {} }; // laufende Musikdatei
  const fileCache = new Map();
  const sends = {}; // pro Bus: { verb, echo } Eingänge
  const waves = {}, curves = {};
  const vol = (v) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 2);
  const busOn = (bus) => getSettings()[bus === 'sfx' ? 'sfx' : 'music'] > 0;

  // ---------- Graph aufbauen ----------
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 12; comp.ratio.value = 4;
      comp.attack.value = 0.004; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.9;
      master.connect(comp).connect(ctx.destination);
      const sfxBus = ctx.createGain(); sfxBus.connect(master);
      const musicBus = ctx.createGain();
      duck = ctx.createGain(); musicBus.connect(duck).connect(master);
      api.ctx = ctx; api.sfxBus = sfxBus; api.musicBus = musicBus;
      synthOut = ctx.createGain(); synthOut.connect(musicBus);
      // Ein gemeinsamer Hall für beide Busse (der Faltungshall ist der teuerste Teil des Graphen).
      // Jeder Bus schickt über einen eigenen Pegel hinein, der seiner Lautstärke folgt.
      const conv = ctx.createConvolver();
      conv.buffer = impulse(2.4, 2.6, 1.8);
      conv.connect(master);
      // Musik-Hall läuft zusätzlich über duckWet, damit duck() ihn wie die Musik leiser macht.
      duckWet = ctx.createGain(); duckWet.connect(conv);
      for (const [name, bus] of [['sfx', sfxBus], ['music', musicBus]]) {
        const verb = ctx.createGain(), wet = ctx.createGain();
        verb.connect(wet).connect(name === 'music' ? duckWet : conv);
        const echo = ctx.createGain(), dl = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
        dl.delayTime.value = 0.28; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2600;
        echo.connect(dl).connect(lp).connect(fb).connect(dl); lp.connect(bus);
        sends[name] = { verb, echo, delay: dl, wet };
      }
      update();
    }
    if (ctx.state === 'suspended' && !hidden) ctx.resume();
    return ctx;
  }

  // Hall-Impuls aus abklingendem Rauschen, stereo. Die Hüllkurve gilt für sec Sekunden,
  // der Puffer endet aber schon bei cut Sekunden (der Rest liegt unter -30 dB) und spart Rechenzeit.
  function impulse(sec, decay, cut = sec) {
    const full = Math.floor(ctx.sampleRate * sec), len = Math.floor(ctx.sampleRate * Math.min(cut, sec));
    const fade = Math.floor(ctx.sampleRate * 0.15), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += (Math.random() * 2 - 1 - lp) * (0.6 - 0.45 * i / full); // wird nach hinten dumpfer
        d[i] = lp * Math.pow(1 - i / full, decay) * (i < 90 ? i / 90 : 1) * (i > len - fade ? (len - i) / fade : 1);
      }
    }
    return b;
  }

  function noiseBuffer() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  // Pulswellen (Chiptune) als PeriodicWave
  function oscNode(type) {
    const o = ctx.createOscillator();
    const m = /^pulse(\d+)$/.exec(type);
    if (m) {
      const duty = Number(m[1]) / 100;
      if (!waves[type]) {
        const n = 64, re = new Float32Array(n), im = new Float32Array(n);
        for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
        waves[type] = ctx.createPeriodicWave(re, im);
      }
      o.setPeriodicWave(waves[type]);
    } else o.type = type || 'sine';
    return o;
  }

  function shaper(kind, amt) {
    const key = kind + amt;
    if (!curves[key]) {
      const n = 1024, c = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        if (kind === 'drive') { const k = 1 + amt * 12; c[i] = Math.tanh(k * x) / Math.tanh(k); }
        else { const steps = Math.max(2, Math.round(2 + (1 - amt) * 30)); c[i] = Math.round(x * steps) / steps; }
      }
      curves[key] = c;
    }
    const w = ctx.createWaveShaper(); w.curve = curves[key]; w.oversample = kind === 'drive' ? '2x' : 'none';
    return w;
  }

  // ---------- Zeit und Stimmen ----------
  // Alle Klänge, die im selben Moment (derselben JS-Aufgabe) ausgelöst werden, bekommen dieselbe
  // Startzeit, leicht in der Zukunft. Sonst liest jeder Aufruf ein anderes currentTime, und bei
  // Last landen Hüllkurven in der Vergangenheit: kurze Effekte werden abgeschnitten und knacksen.
  const LEAD = 0.012;
  let anchor = null;
  function now() {
    if (anchor == null || anchor < ctx.currentTime) {
      anchor = ctx.currentTime + LEAD;
      queueMicrotask(() => { anchor = null; });
    }
    return anchor;
  }

  // Höchstens so viele Effekt-Stimmen gleichzeitig; darüber wird die älteste kurz ausgeblendet.
  // Hält den Audio-Thread auch auf schwachen Handys im Takt, wenn viel auf einmal passiert.
  const MAX_SFX = 32;
  const voices = [];
  function claim(t, end, kill, srcs) {
    const cut = ctx.currentTime;
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end <= cut) voices.splice(i, 1);
    const busy = voices.filter((v) => !v.stolen && v.start <= t && v.end > t);
    if (busy.length >= MAX_SFX) {
      const v = busy[0]; // älteste zuerst (voices ist nach Startreihenfolge sortiert)
      v.kill.gain.setValueAtTime(1, t);
      v.kill.gain.linearRampToValueAtTime(0, t + 0.02);
      v.srcs.forEach((s) => { try { s.stop(t + 0.025); } catch { /* schon gestoppt */ } });
      v.end = t + 0.025; v.stolen = true;
    }
    voices.push({ start: t, end, kill, srcs });
  }

  // Nach dem Ende alle Knoten einer Stimme lösen, damit der Graph klein bleibt
  function release(srcs, nodes) {
    const done = () => { srcs.forEach((s) => s.disconnect()); nodes.forEach((n) => n.disconnect()); };
    if (srcs[0]) srcs[0].onended = done; else done();
  }

  // Ausgang einer Stimme: Panorama, trocken auf Bus/Ziel, Hall- und Echo-Anteil
  function route(node, t, { bus = 'sfx', pan = 0, verb = 0, echo = 0, dest = null }, nodes) {
    let out = node;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan, t); out = out.connect(p); nodes.push(p); }
    out.connect(dest || (bus === 'sfx' ? api.sfxBus : api.musicBus));
    if (!dest) {
      if (verb > 0) { const g = ctx.createGain(); g.gain.value = verb; out.connect(g).connect(sends[bus === 'sfx' ? 'sfx' : 'music'].verb); nodes.push(g); }
      if (echo > 0) { const g = ctx.createGain(); g.gain.value = echo; out.connect(g).connect(sends[bus === 'sfx' ? 'sfx' : 'music'].echo); nodes.push(g); }
    }
  }

  // Ausgang einer Effekt-/Instrument-Stimme anlegen: amp → kill → route; kill dient zum Ausblenden
  function voiceOut(amp, t, end, srcs, nodes, opts) {
    let out = amp;
    if (opts.bus === 'sfx' && !opts.dest) {
      const kill = ctx.createGain(); amp.connect(kill); nodes.push(kill); out = kill;
      claim(t, end, kill, srcs);
    }
    route(out, t, opts, nodes);
  }

  // ---------- Instrument-Stimme ----------
  function resolve(inst) {
    if (typeof inst === 'string') return INSTRUMENTS[inst] || INSTRUMENTS.pluck;
    if (inst?.extends) return { ...resolve(inst.extends), ...inst };
    return inst || INSTRUMENTS.pluck;
  }

  /**
   * Spielt eine Note. inst: Name aus INSTRUMENTS oder eigenes Objekt (auch { extends: 'pluck', … }).
   * o: { note ('C4' oder MIDI) | f (Hz), dur, vel 0–1, delay, when, bus, pan, verb, echo, dest }
   */
  function play(inst, o = {}) {
    const c = ac(); const bus = o.bus || 'sfx';
    if (!c || !busOn(bus)) return;
    const def = resolve(inst);
    const t = o.when != null ? Math.max(o.when, c.currentTime) : now() + (o.delay || 0);
    const nodes = [];
    const midiNote = o.note != null ? noteToMidi(o.note) : null;
    const f = def.perc ? (o.f || def.f || 200) : (o.f || (midiNote != null ? midi(midiNote) : 440));
    const dur = Math.max(0.01, o.dur ?? 0.2);
    const env = { a: 0.005, d: 0.1, s: 0.6, r: 0.15, ...def.env };
    const peak = (def.vol ?? 0.15) * (o.vel ?? 1);
    const off = t + Math.max(dur, env.a);
    const end = off + env.r * 2 + 0.05;

    const amp = c.createGain(); nodes.push(amp);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(peak, t + env.a);
    amp.gain.setTargetAtTime(peak * env.s, t + env.a, Math.max(0.001, env.d / 3));
    amp.gain.setTargetAtTime(0, off, Math.max(0.001, env.r / 4));

    // Klangkette: Quellen → Filter → Drive → amp
    let input = amp;
    if (def.drive) { const w = shaper('drive', def.drive); w.connect(input); input = w; nodes.push(w); }
    if (def.filter) {
      const fl = c.createBiquadFilter(), fd = def.filter; nodes.push(fl);
      fl.type = fd.type || 'lowpass'; fl.Q.value = fd.q ?? 1;
      const base = (fd.f ?? 1000) * Math.pow(f / 261.6, fd.keytrack ?? 0);
      fl.frequency.setValueAtTime(base, t);
      if (fd.env) {
        fl.frequency.linearRampToValueAtTime(base + fd.env, t + Math.max(0.003, env.a));
        fl.frequency.setTargetAtTime(base + fd.env * (fd.s ?? 0), t + env.a, Math.max(0.005, (fd.d ?? 0.2) / 3));
      }
      fl.connect(input); input = fl;
    }

    const srcs = [];
    const oscs = def.osc || [];
    const uni = Math.max(1, def.unison || 1);
    let fmGain = null;
    if (def.fm && oscs.length) {
      const fm = def.fm, mod = c.createOscillator();
      fmGain = c.createGain(); nodes.push(fmGain);
      mod.frequency.setValueAtTime(f * fm.ratio, t);
      const dev = f * fm.ratio * fm.index;
      fmGain.gain.setValueAtTime(dev, t);
      fmGain.gain.setTargetAtTime(dev * (fm.sustain ?? 0), t, Math.max(0.005, (fm.decay ?? 0.3) / 3));
      mod.connect(fmGain); srcs.push(mod);
    }
    let lfo = null;
    if (def.vib) {
      const v = def.vib; const l = c.createOscillator(); lfo = c.createGain(); nodes.push(lfo);
      l.frequency.value = v.rate ?? 5;
      lfo.gain.setValueAtTime(0, t);
      lfo.gain.linearRampToValueAtTime(v.depth ?? 10, t + (v.delay ?? 0.2) + 0.15);
      l.connect(lfo); srcs.push(l);
    }
    for (const spec of oscs) {
      const g = c.createGain(); g.gain.value = (spec.gain ?? 1) / Math.sqrt(uni); nodes.push(g);
      g.connect(input);
      for (let u = 0; u < uni; u++) {
        const os = oscNode(spec.type);
        const fr = f * Math.pow(2, (spec.semi || 0) / 12);
        if (def.pitch) {
          os.frequency.setValueAtTime(fr * Math.pow(2, def.pitch.semi / 12), t);
          os.frequency.exponentialRampToValueAtTime(fr, t + def.pitch.t);
        } else os.frequency.setValueAtTime(fr, t);
        os.detune.value = (spec.detune || 0) + (uni > 1 ? (u / (uni - 1) - 0.5) * 2 * (def.spread || 10) : 0);
        if (fmGain) fmGain.connect(os.frequency);
        if (lfo) lfo.connect(os.detune);
        os.connect(g); srcs.push(os);
      }
    }
    if (def.noise) {
      const nd = def.noise, ns = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
      nodes.push(nf, ng);
      ns.buffer = noiseBuffer(); ns.loop = true;
      ns.playbackRate.value = 0.8 + Math.random() * 0.4;
      nf.type = nd.type || 'highpass'; nf.frequency.value = nd.f ?? 2000; nf.Q.value = nd.q ?? 0.7;
      const bursts = nd.burst || 1;
      ng.gain.setValueAtTime(0.0001, t);
      for (let i = 0; i < bursts; i++) {
        const bt = t + i * 0.011;
        ng.gain.setValueAtTime(nd.vol ?? 0.3, bt);
        ng.gain.setTargetAtTime(0.0001, bt + 0.001, Math.max(0.002, (i < bursts - 1 ? 0.004 : (nd.d ?? 0.1) / 3)));
      }
      ns.connect(nf).connect(ng).connect(input); srcs.push(ns);
    }

    voiceOut(amp, t, end, srcs, nodes, { bus, pan: o.pan ?? def.pan ?? 0, verb: o.verb ?? def.verb ?? 0, echo: o.echo ?? def.echo ?? 0, dest: o.dest });
    srcs.forEach((s) => { s.start(t); s.stop(end); });
    release(srcs, nodes);
  }

  // ---------- Effekt-Generator (sfxr-artig) ----------
  /**
   * d: { wave ('square','sine','triangle','sawtooth','pulse25','pulse12','noise'), f, f2, slide ('exp'|'lin'),
   *      a, s, d (Attack, Halten, Abklingen), punch 0–1, vol, harm (Oktave darüber 0–1),
   *      arp: {t, mult} oder [{t, mult}], vib: {rate, depth (Halbtöne)}, lp: {f, f2, q}, hp: {f, f2}, q,
   *      drive 0–1, crush 0–1, repeat: {n, every, step (Halbtöne)}, vary (Halbtöne Zufall),
   *      verb, echo, pan, duck (Musik kurz leiser, 0–1) }
   * o: { delay, pitch (Faktor), vol (Faktor), pan }
   */
  function fx(d, o = {}) {
    const c = ac(); const bus = o.bus || 'sfx';
    if (!c || !busOn(bus)) return;
    const t0 = now() + (o.delay || 0);
    const vary = d.vary ? Math.pow(2, ((Math.random() * 2 - 1) * d.vary) / 12) : 1;
    const base = (o.pitch || 1) * vary;
    const rep = d.repeat || { n: 1, every: 0 };
    for (let i = 0; i < (rep.n || 1); i++) {
      fxOne(d, t0 + i * (rep.every || 0), base * Math.pow(2, (i * (rep.step || 0)) / 12), o, bus);
    }
    if (d.duck) api.duck(d.duck, (d.a ?? 0.005) + (d.s ?? 0) + (d.d ?? 0.15) + 0.2);
  }

  function fxOne(d, t, mult, o, bus) {
    const a = d.a ?? 0.005, hold = d.s ?? 0, dec = d.d ?? 0.15, total = a + hold + dec;
    const end = t + total + 0.05;
    const f = (d.f ?? 440) * mult, f2 = d.f2 != null ? d.f2 * mult : null;
    const amp = ctx.createGain(), v = (d.vol ?? 0.12) * (o.vol ?? 1), punch = d.punch || 0;
    const nodes = [amp];
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(v * (1 + punch), t + a);
    const pEnd = t + a + Math.min(0.04, hold + dec * 0.3);
    if (punch) amp.gain.linearRampToValueAtTime(v, pEnd);
    amp.gain.setValueAtTime(v, Math.max(t + a + hold, punch ? pEnd : t + a));
    amp.gain.exponentialRampToValueAtTime(0.0001, t + total);

    let input = amp;
    if (d.crush) { const w = shaper('crush', d.crush); w.connect(input); input = w; nodes.push(w); }
    if (d.drive) { const w = shaper('drive', d.drive); w.connect(input); input = w; nodes.push(w); }
    for (const [key, type] of [['lp', 'lowpass'], ['hp', 'highpass']]) {
      if (!d[key]) continue;
      const fl = ctx.createBiquadFilter(), fd = d[key]; nodes.push(fl);
      fl.type = type; fl.Q.value = fd.q ?? 0.8;
      fl.frequency.setValueAtTime(fd.f, t);
      if (fd.f2) fl.frequency.exponentialRampToValueAtTime(fd.f2, t + total);
      fl.connect(input); input = fl;
    }

    const srcs = [];
    const setFreq = (param, ff, ff2) => {
      param.setValueAtTime(ff, t);
      if (d.arp) {
        const steps = Array.isArray(d.arp) ? d.arp : [d.arp];
        steps.forEach((s) => param.setValueAtTime(ff * s.mult, t + s.t));
      } else if (ff2) {
        if (d.slide === 'lin') param.linearRampToValueAtTime(ff2, t + total);
        else param.exponentialRampToValueAtTime(Math.max(1, ff2), t + total);
      }
    };
    if (d.wave === 'noise') {
      const ns = ctx.createBufferSource(), bp = ctx.createBiquadFilter(); nodes.push(bp);
      ns.buffer = noiseBuffer(); ns.loop = true;
      bp.type = 'bandpass'; bp.Q.value = d.q ?? 1;
      setFreq(bp.frequency, f, f2);
      ns.connect(bp).connect(input); srcs.push(ns);
    } else {
      const os = oscNode(d.wave || 'square');
      setFreq(os.frequency, f, f2);
      os.connect(input); srcs.push(os);
      if (d.harm) {
        const h = oscNode(d.wave === 'sine' ? 'sine' : 'triangle'), hg = ctx.createGain(); nodes.push(hg);
        hg.gain.value = d.harm; setFreq(h.frequency, f * 2, f2 ? f2 * 2 : null);
        h.connect(hg).connect(input); srcs.push(h);
      }
      if (d.vib) {
        const l = ctx.createOscillator(), lg = ctx.createGain(); nodes.push(lg);
        l.frequency.value = d.vib.rate ?? 8; lg.gain.value = (d.vib.depth ?? 0.5) * 100;
        l.connect(lg); srcs.forEach((s) => s.detune && lg.connect(s.detune)); srcs.push(l);
      }
    }
    voiceOut(amp, t, end, srcs, nodes, { bus, pan: o.pan ?? d.pan ?? 0, verb: d.verb || 0, echo: d.echo || 0 });
    srcs.forEach((s) => { s.start(t); s.stop(end); });
    release(srcs, nodes);
  }

  // Würfelt Effekt-Parameter nach Art (wie sfxr). Gleicher Seed = gleicher Klang.
  function preset(kind, seed) {
    const r = rng(seed);
    const w = () => r.pick(['square', 'pulse25', 'triangle', 'sawtooth']);
    switch (kind) {
      case 'coin': { const f = r.range(800, 1400); return { wave: r.pick(['square', 'pulse25', 'triangle']), f, arp: { t: r.range(0.04, 0.08), mult: r.pick([1.335, 1.5, 2]) }, a: 0.001, s: r.range(0.02, 0.06), d: r.range(0.15, 0.3), punch: r.range(0.2, 0.6), vol: 0.08, verb: 0.12 }; }
      case 'jump': { const f = r.range(250, 480); return { wave: w(), f, f2: f * r.range(1.8, 2.8), a: 0.002, s: 0.02, d: r.range(0.16, 0.28), lp: { f: r.range(2000, 5000) }, vol: 0.08 }; }
      case 'hit': return { wave: r.pick(['noise', 'sawtooth', 'square']), f: r.range(300, 900), f2: r.range(60, 140), a: 0.001, d: r.range(0.1, 0.2), punch: 0.6, drive: r.range(0.2, 0.6), lp: { f: 3000, f2: 400 }, vol: 0.14, q: 0.7 };
      case 'hurt': return { wave: r.pick(['sawtooth', 'square']), f: r.range(400, 700), f2: r.range(90, 180), a: 0.001, d: r.range(0.18, 0.3), vib: { rate: r.range(20, 40), depth: 0.8 }, drive: 0.3, lp: { f: 2500 }, vol: 0.11 };
      case 'laser': { const f = r.range(1000, 2200); return { wave: w(), f, f2: f * r.range(0.12, 0.3), a: 0.001, d: r.range(0.12, 0.28), harm: r.range(0, 0.4), vol: 0.07, echo: r.range(0, 0.25) }; }
      case 'explosion': return { wave: 'noise', f: r.range(800, 1600), f2: r.range(50, 110), q: 0.5, a: 0.002, s: r.range(0.02, 0.1), d: r.range(0.5, 1.1), punch: 0.8, drive: r.range(0.3, 0.7), lp: { f: 4000, f2: 200 }, vol: 0.35, verb: 0.3, duck: 0.6 };
      case 'powerup': { const f = r.range(250, 450); return { wave: w(), f, f2: f * r.range(1.4, 2), a: 0.002, d: r.range(0.1, 0.16), repeat: { n: r.pick([3, 4, 5]), every: r.range(0.06, 0.09), step: r.pick([3, 4, 5, 7]) }, vib: { rate: 12, depth: 0.25 }, vol: 0.07, verb: 0.2 }; }
      case 'blip': return { wave: r.pick(['square', 'pulse25', 'sine', 'triangle']), f: r.range(500, 1200), a: 0.001, s: 0.01, d: r.range(0.04, 0.09), vol: 0.06 };
      case 'select': { const f = r.range(600, 1000); return { wave: r.pick(['triangle', 'sine', 'pulse25']), f, arp: { t: 0.045, mult: r.pick([1.5, 2]) }, a: 0.001, s: 0.03, d: 0.1, vol: 0.07 }; }
      case 'bounce': { const f = r.range(150, 300); return { wave: r.pick(['sine', 'triangle']), f, f2: f * r.range(2, 3.5), a: 0.002, d: r.range(0.14, 0.22), vib: { rate: r.range(14, 22), depth: 0.4 }, harm: 0.2, vol: 0.13 }; }
      case 'whoosh': return { wave: 'noise', f: r.range(300, 600), f2: r.range(2000, 4000), q: r.range(0.6, 1.2), a: r.range(0.04, 0.1), d: r.range(0.15, 0.3), vol: 0.1 };
      case 'thud': return { wave: 'sine', f: r.range(120, 180), f2: r.range(40, 60), a: 0.001, d: r.range(0.12, 0.2), punch: 0.5, drive: 0.4, vol: 0.3 };
      default: return preset('blip', seed);
    }
  }

  // ---------- Alte Bausteine (unverändert nutzbar) ----------
  function tone({ f = 440, f2 = null, dur = 0.12, type = 'sine', vol: v = 0.12, delay = 0, bus = 'sfx', attack = 0.012, verb = 0, echo = 0, pan = 0 }) {
    const c = ac(); if (!c || !busOn(bus)) return;
    const t = now() + delay, o = oscNode(type), g = c.createGain(), nodes = [g];
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); voiceOut(g, t, t + dur + 0.05, [o], nodes, { bus, verb, echo, pan });
    o.start(t); o.stop(t + dur + 0.05);
    release([o], nodes);
  }

  function noise({ dur = 0.1, vol: v = 0.1, f = 900, f2 = 500, q = 1.5, delay = 0, bus = 'sfx', verb = 0, pan = 0 }) {
    const c = ac(); if (!c || !busOn(bus)) return;
    const t = now() + delay, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), nodes = [bp, g];
    src.buffer = noiseBuffer(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f, t); bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g); voiceOut(g, t, t + dur + 0.05, [src], nodes, { bus, verb, pan });
    src.start(t); src.stop(t + dur + 0.05);
    release([src], nodes);
  }

  // Fertige Effekte, klingen jetzt voller (Hall, FM, Filter); Aufrufe wie bisher
  const COMBO = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const sfx = {
    click() { fx({ wave: 'triangle', f: 1500, f2: 1100, a: 0.001, d: 0.035, vol: 0.06, vary: 0.6 }); },
    toggle(on) { fx({ wave: 'triangle', f: on ? 520 : 700, arp: { t: 0.045, mult: on ? 1.5 : 0.667 }, a: 0.001, s: 0.03, d: 0.07, vol: 0.045, verb: 0.08 }); },
    pop(pitch = 1) {
      fx({ wave: 'sine', f: 420, f2: 980, a: 0.002, d: 0.085, harm: 0.25, punch: 0.4, vol: 0.075, vary: 0.4, verb: 0.08 }, { pitch });
      noise({ dur: 0.035, vol: 0.035, f: 3000, f2: 1500 });
    },
    good() { play('marimba', { note: 76, dur: 0.12, vel: 0.4, verb: 0.25 }); play('marimba', { note: 83, dur: 0.2, delay: 0.07, vel: 0.4, verb: 0.25 }); play('bell', { note: 88, dur: 0.3, delay: 0.07, vel: 0.12 }); },
    bad() { fx({ wave: 'sawtooth', f: 190, f2: 140, a: 0.002, d: 0.16, lp: { f: 900 }, drive: 0.3, vol: 0.06 }); fx({ wave: 'sawtooth', f: 165, f2: 115, a: 0.002, d: 0.2, lp: { f: 800 }, drive: 0.3, vol: 0.055 }, { delay: 0.11 }); },
    whoosh() { fx({ wave: 'noise', f: 380, f2: 3200, q: 0.8, a: 0.06, d: 0.2, vol: 0.08, vary: 2 }); },
    combo(n = 2) {
      const semi = COMBO[Math.min(Math.max(n - 2, 0), COMBO.length - 1)];
      play('pluck', { note: 76 + semi, dur: 0.1, vel: 0.45 });
      play('bell', { note: 83 + semi, dur: 0.25, delay: 0.06, vel: 0.25 });
    },
    win() {
      api.duck(0.7, 1.8);
      [72, 76, 79, 84, 88, 91].forEach((n, i) => play('pluck', { note: n, dur: 0.25, delay: 0.1 + i * 0.085, vel: 0.5, verb: 0.3 }));
      [84, 88, 91, 96].forEach((n, i) => play('bell', { note: n, dur: 0.8, delay: 0.62 + i * 0.03, vel: 0.15 }));
      play('pad', { note: 60, dur: 1.2, delay: 0.1, vel: 0.8 }); play('pad', { note: 67, dur: 1.2, delay: 0.1, vel: 0.8 });
    },
    lose() {
      api.duck(0.6, 1.4);
      [67, 63, 60, 55].forEach((n, i) => play('epiano', { note: n, dur: 0.35, delay: i * 0.15, vel: 0.25, verb: 0.35 }));
      play('subBass', { note: 43, dur: 0.6, delay: 0.45, vel: 0.2 });
    },
    /** Eigene Effekte registrieren: { name: fx-Parameter | Funktion } → Kit.audio.sfx.name(opts).
     * Ein Name eines fertigen Effekts (click, pop, good, combo …) ersetzt ihn im ganzen Spiel. Die Argumente
     * der alten Aufrufe wirken weiter: pop(pitch) als Tonhöhe, combo(n) steigt mit n, toggle(false) klingt tiefer. */
    add(map) {
      for (const [name, def] of Object.entries(map || {})) {
        if (name === 'add') continue;
        sfx[name] = typeof def === 'function' ? def : (arg) => fx(def, fxOpts(name, arg));
      }
    },
  };
  // Argument eines sfx-Aufrufs in fx-Optionen übersetzen (Objekt bleibt, Zahl ist Tonhöhe)
  function fxOpts(name, arg) {
    if (arg && typeof arg === 'object') return arg;
    if (name === 'combo') return { pitch: Math.pow(2, COMBO[Math.min(Math.max((arg ?? 2) - 2, 0), COMBO.length - 1)] / 12) };
    if (name === 'toggle') return { pitch: arg === false ? 0.75 : 1 };
    return typeof arg === 'number' ? { pitch: arg } : {};
  }
  if (sounds) sfx.add(sounds);

  // ---------- Musik: Sequenzer ----------
  // Song: { bpm, swing 0–0.5, tracks: { name: { inst, vol, verb, echo, pan, transpose, gate, level } },
  //         patterns: { name: { track: 'C4 - . E4 …' | 'x...x...' } },
  //         sections: { name: ['p1+p2', 'p1+p3'] | { bars: [...], next: 'other' } }, start }
  // Ein Takt hat so viele 16tel, wie die längste Spur Schritte hat (Standard 16).
  const mo = { bpm: 100, scale: 'pentatonic', root: 60, mood: 'happy', autostart: true, ...musicOpts };
  const isSong = (o) => !!(o.patterns || o.tracks || o.bars);
  let cur = null, pending = null, bar = null, pos = 0, sectionName = null, pendingSection = null, intensity = 1;
  const music = {
    wanted: !!mo.autostart, playing: false, step: 0, timer: null, next: 0, opts: mo,
    configure(o) { Object.assign(mo, o); load(isSong(mo) ? mo : generate(mo)); },
    song(def) { load(def); },
    section(name) { if ((pending || cur)?.sections[name]) pendingSection = name; },
    get current() { return sectionName; },
    layer(name, v = 1, fade = 0.4) {
      const tr = cur?.tracks[name]; if (!tr) return;
      tr.target = v;
      if (tr.node && ctx) tr.node.gain.setTargetAtTime(v * tr.vol, ctx.currentTime, fade / 3);
    },
    /** 0–1: blendet Spuren mit level ≤ x ein (z.B. Drums ab 0.4, Lead ab 0.7) */
    intensity(x) {
      intensity = x;
      if (cur) for (const [n, tr] of Object.entries(cur.tracks)) music.layer(n, (tr.level || 0) <= x + 1e-6 ? 1 : 0, 1.2);
    },
    tempo(bpm) { if (cur) cur.bpm = bpm; mo.bpm = bpm; syncEcho(); },
    start() {
      music.wanted = true;
      if (!ctx || music.playing || getSettings().music <= 0 || file.wantUrl) return;
      if (!cur) load(isSong(mo) ? mo : generate(mo));
      if (pending) swap();
      music.playing = true; music.next = ctx.currentTime + 0.1; music.step = 0;
      if (synthOut) synthOut.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
      clearInterval(music.timer);
      music.timer = setInterval(schedule, 25);
    },
    stop() { music.wanted = false; music.pause(); stopFile(0.3); file.wantUrl = null; },
    pause() { clearInterval(music.timer); music.playing = false; },
    /**
     * Musikdatei statt Synth-Musik spielen (z.B. ein Titelthema aus assets/music/…m4a), mit Überblendung.
     * music.track(null) kehrt zur Synth-Musik zurück. o: { loop = true, fade = 1.2 (s), vol = 1,
     *   loopStart, loopEnd (s): nahtlose Schleife im Stück, der Teil davor läuft einmal als Intro }
     */
    track(url, o = {}) {
      file.wantUrl = url || null;
      file.opts = { loop: true, fade: 1.2, vol: 1, ...o };
      if (!ctx) return Promise.resolve(); // spielt nach dem ersten Antippen (unlock)
      return playFile();
    },
    get file() { return file.url; },
  };

  async function loadFile(url) {
    if (!fileCache.has(url)) {
      fileCache.set(url, fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Kit.audio: ${url} nicht gefunden (${r.status})`);
        return r.arrayBuffer();
      }).then((b) => ctx.decodeAudioData(b)));
    }
    return fileCache.get(url);
  }

  function stopFile(fade) {
    if (!file.src || !ctx) { file.url = null; return; }
    const { src, gain } = file;
    gain.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fade / 3));
    setTimeout(() => { try { src.stop(); } catch {} gain.disconnect(); }, fade * 1000 + 200);
    file.src = file.gain = file.url = null;
  }

  async function playFile() {
    const url = file.wantUrl, { loop, fade, vol: v } = file.opts;
    if (!url) { // zurück zur Synth-Musik
      stopFile(fade);
      if (music.wanted) music.start();
      return;
    }
    if (file.url === url) return;
    let buf;
    try { buf = await loadFile(url); } catch (e) { console.warn(e.message); file.wantUrl = null; if (music.wanted) music.start(); return; }
    if (file.wantUrl !== url) return; // inzwischen anders entschieden
    stopFile(fade);
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf; src.loop = loop;
    const { loopStart, loopEnd } = file.opts;
    if (loop && loopEnd > (loopStart || 0) && loopEnd <= buf.duration) { src.loopStart = loopStart || 0; src.loopEnd = loopEnd; }
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    // Musikdateien (auf -18 LUFS angeglichen, z.B. von imagegen) etwa so laut wie die Synth-Musik
    gain.gain.setTargetAtTime(v * 2.2, ctx.currentTime, Math.max(0.01, fade / 3));
    src.connect(gain).connect(api.musicBus);
    src.start();
    src.onended = () => { if (file.src === src) { file.src = file.gain = file.url = null; file.wantUrl = null; if (music.wanted) music.start(); } };
    Object.assign(file, { url, src, gain });
    // Synth leise machen und danach anhalten (spart Akku)
    if (synthOut) synthOut.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fade / 3));
    setTimeout(() => { if (file.url === url) music.pause(); }, fade * 1000 + 100);
  }

  function load(def) {
    const song = parseSong(def);
    if (music.playing) pending = song; else { pending = song; if (ctx) swap(); }
  }

  function swap() {
    const old = cur;
    cur = pending; pending = null;
    for (const tr of Object.values(cur.tracks)) {
      tr.node = ctx.createGain();
      tr.target = (tr.level || 0) <= intensity + 1e-6 ? 1 : 0;
      tr.node.gain.value = tr.target * tr.vol;
      tr.node.connect(synthOut || api.musicBus);
      if (tr.verb) { const g = ctx.createGain(); g.gain.value = tr.verb; tr.node.connect(g).connect(sends.music.verb); }
      if (tr.echo) { const g = ctx.createGain(); g.gain.value = tr.echo; tr.node.connect(g).connect(sends.music.echo); }
    }
    if (old) setTimeout(() => Object.values(old.tracks).forEach((tr) => tr.node?.disconnect()), 4000);
    const start = pendingSection && cur.sections[pendingSection] ? pendingSection : cur.start;
    pendingSection = null;
    enterSection(start);
    syncEcho();
  }

  function syncEcho() { if (ctx && cur) sends.music.delay.delayTime.setTargetAtTime((60 / cur.bpm / 4) * 3, ctx.currentTime, 0.05); }

  function enterSection(name) { sectionName = name; pos = 0; bar = cur.bars[cur.sections[name].bars[0]]; }

  function nextBar() {
    if (pending) { swap(); return; }
    const sec = cur.sections[sectionName];
    if (pendingSection) { const n = pendingSection; pendingSection = null; enterSection(n); return; }
    pos++;
    if (pos >= sec.bars.length) {
      if (sec.next && cur.sections[sec.next]) { enterSection(sec.next); return; }
      pos = 0;
    }
    bar = cur.bars[sec.bars[pos]];
  }

  function schedule() {
    if (!ctx || hidden || !cur) return;
    if (music.next < ctx.currentTime - 0.05) music.next = ctx.currentTime + 0.05; // nach Pause nicht nachholen
    while (music.next < ctx.currentTime + 0.15) {
      const stepDur = 60 / cur.bpm / 4;
      const swing = music.step % 2 ? (cur.swing || 0) * stepDur * 0.66 : 0;
      for (const ev of bar.byStep[music.step] || []) {
        const tr = cur.tracks[ev.track];
        if (!tr || tr.target <= 0) continue;
        const when = music.next + swing + (Math.random() - 0.5) * 0.006;
        const vel = ev.vel * (0.94 + Math.random() * 0.12);
        const dur = ev.len * stepDur * (tr.gate ?? 0.92);
        for (const n of ev.notes) play(tr.inst, { note: n == null ? null : n + (tr.transpose || 0), dur, vel, when, bus: 'music', dest: tr.node, pan: tr.pan || 0 });
      }
      music.step++; music.next += stepDur;
      if (music.step >= bar.len) { music.step = 0; nextBar(); }
    }
  }

  // Song-Text in Ereignisse übersetzen
  function parseSong(def) {
    const tracks = {};
    for (const [n, t] of Object.entries(def.tracks || {})) {
      const inst = resolve(t.inst || n);
      tracks[n] = { vol: 1, ...t, inst, perc: !!inst.perc };
    }
    const parsed = {};
    for (const [pn, p] of Object.entries(def.patterns || {})) {
      const events = []; let len = 0;
      for (const [tn, str] of Object.entries(p)) {
        if (typeof str !== 'string') continue;
        if (!tracks[tn]) { const inst = resolve(tn); tracks[tn] = { vol: 1, inst, perc: !!inst.perc }; }
        const perc = tracks[tn].perc;
        const toks = perc ? str.replace(/[\s|]/g, '').split('') : str.replace(/\|/g, ' ').trim().split(/\s+/);
        len = Math.max(len, toks.length);
        let last = null;
        toks.forEach((tok, i) => {
          if (perc) {
            if (tok === '.' || tok === '-') return;
            events.push({ step: i, track: tn, notes: [null], len: 1, vel: tok === 'X' ? 1 : tok === 'x' ? 0.8 : 0.5 });
            return;
          }
          if (tok === '-') { if (last) last.len++; return; }
          if (tok === '.') { last = null; return; }
          const accent = tok.endsWith('!'), soft = tok.endsWith('?');
          const notes = tok.replace(/[!?]$/, '').split(',').map(noteToMidi).filter((x) => x != null);
          if (!notes.length) { last = null; return; }
          last = { step: i, track: tn, notes, len: 1, vel: accent ? 1 : soft ? 0.55 : 0.8 };
          events.push(last);
        });
      }
      const byStep = [];
      events.forEach((e) => (byStep[e.step] ||= []).push(e));
      parsed[pn] = { len: len || 16, events, byStep };
    }
    // Takte: 'p1+p2' kombiniert mehrere Muster gleichzeitig
    const bars = { ...(def.bars || {}) }; // generierte Songs liefern fertige Takte
    const barOf = (spec) => {
      if (bars[spec]) return spec;
      const parts = spec.split('+').map((s) => parsed[s.trim()]).filter(Boolean);
      const len = Math.max(16, ...parts.map((p) => p.len));
      const byStep = [];
      parts.forEach((p) => p.byStep.forEach((list, i) => list && (byStep[i] ||= []).push(...list)));
      bars[spec] = { len, byStep };
      return spec;
    };
    const sections = {};
    const srcSections = def.sections || { main: Object.keys(parsed) };
    for (const [sn, s] of Object.entries(srcSections)) {
      const list = Array.isArray(s) ? s : s.bars;
      sections[sn] = { bars: list.map(barOf), next: Array.isArray(s) ? null : s.next };
    }
    return { bpm: def.bpm || 100, swing: def.swing || 0, tracks, bars, sections, start: def.start && sections[def.start] ? def.start : Object.keys(sections)[0] };
  }

  // ---------- Generierte Musik aus { bpm, scale, root, mood } ----------
  // Akkordfolge, Bass, Flächen, ein wiederkehrendes Motiv und Drums je nach Stimmung.
  const MOODS = {
    happy: { prog: [0, 4, 5, 3], minor: false, lead: 'pluck', chords: 'epiano', bass: 'bass', drums: 'pop', swing: 0.12 },
    calm: { prog: [0, 5, 3, 4], minor: false, lead: 'kalimba', chords: 'pad', bass: 'subBass', drums: 'soft', swing: 0.08 },
    tense: { prog: [0, 5, 6, 4], minor: true, lead: 'lead', chords: 'strings', bass: 'bass', drums: 'drive', swing: 0 },
    epic: { prog: [0, 5, 2, 6], minor: true, lead: 'bell', chords: 'strings', bass: 'bass', drums: 'epic', swing: 0 },
    dreamy: { prog: [0, 3, 0, 4], minor: false, lead: 'bell', chords: 'pad', bass: 'subBass', drums: 'none', swing: 0, lydian: true },
    chip: { prog: [0, 5, 3, 4], minor: false, lead: 'chipLead', chords: 'chip', bass: 'chipBass', drums: 'pop', swing: 0 },
  };
  const DRUMS = {
    pop: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', shaker: '' },
    soft: { kick: 'x.......x.......', shaker: '..x...x...x...xx', block: '.......x.......' },
    drive: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', openHat: '..x...x...x...x.' },
    epic: { kick: 'x.....x.x.......', tom: '....x.......x.xx', snare: '............x...' },
    none: {},
  };

  function generate(o) {
    const m = MOODS[o.mood] || MOODS.happy;
    const r = rng(o.seed ?? Math.floor(Math.random() * 1e9));
    const minorScale = ['minor', 'minorPentatonic', 'dorian', 'harmonicMinor'].includes(o.scale) || m.minor;
    const harm = o.scale === 'dorian' ? SCALES.dorian : m.lydian ? SCALES.lydian : minorScale ? SCALES.minor : SCALES.major;
    const mel = SCALES[o.scale] || (minorScale ? SCALES.minorPentatonic : SCALES.pentatonic);
    const root = o.root ?? 60;
    const hdeg = (d, oct = 0) => root + oct * 12 + harm[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const chordNotes = (deg) => [hdeg(deg), hdeg(deg + 2), hdeg(deg + 4)];
    // Melodie-Ton nahe am Akkord: Skalenstufe der Melodieskala, gerundet auf die Nähe des Akkordtons
    const melNote = (target) => {
      let best = target, bd = 99;
      for (let oc = -1; oc <= 2; oc++) for (const s of mel) { const n = root + oc * 12 + s; const d = Math.abs(n - target); if (d < bd) { bd = d; best = n; } }
      return best;
    };

    // Motiv: 16 Schritte, Rhythmus aus 8teln, Tonhöhe als Stufe relativ zum Akkord
    const motif = [];
    const density = o.mood === 'calm' || o.mood === 'dreamy' ? 0.35 : o.mood === 'tense' ? 0.5 : 0.6;
    for (let i = 0; i < 16; i += 2) {
      if (i === 0 || r() < density) motif.push({ step: i, off: r.pick([0, 2, 4, 1, -1, 2, 4, 7]), len: r() < 0.3 ? 2 : 1 });
    }
    const variant = motif.map((n) => (r() < 0.35 ? { ...n, off: n.off + r.pick([-1, 1, 2]) } : n));

    const bars = {}, barNames = [];
    const hasDrums = m.drums !== 'none';
    for (let b = 0; b < 8; b++) {
      const deg = m.prog[b % 4], events = [];
      const add = (track, step, notes, len, vel) => events.push({ step, track, notes, len, vel });
      // Bass: Grundton auf 1 und 3, bei Spannung durchgehende 8tel
      const bassRoot = hdeg(deg, -2);
      if (o.mood === 'tense' || o.mood === 'epic') for (let s = 0; s < 16; s += 2) add('bass', s, [bassRoot + (s === 6 || s === 14 ? 12 : 0)], 1, s % 4 ? 0.6 : 0.85);
      else { add('bass', 0, [bassRoot], 5, 0.9); add('bass', 6, [bassRoot], 2, 0.6); add('bass', 8, [hdeg(deg + 4, -2)], 6, 0.75); }
      // Akkorde: Flächen lang, Klavier als Stabs
      const ch = chordNotes(deg);
      if (m.chords === 'pad' || m.chords === 'strings') add('chords', 0, ch, 16, 0.7);
      else for (const s of [0, 6, 10]) add('chords', s, ch, 2, s ? 0.55 : 0.75);
      // Motiv auf den Akkord gelegt, zweite Hälfte variiert, letzter Takt endet auf dem Grundton
      const mot = b % 4 === 3 ? [{ step: 0, off: 0, len: 6 }, ...variant.filter((n) => n.step >= 8)] : (b >= 4 ? variant : motif);
      for (const n of mot) add('lead', n.step, [melNote(hdeg(deg + n.off, 1))], n.len * 2, 0.75);
      // Arpeggio als Glitzer (ab höherer Intensität)
      if (o.mood !== 'tense') for (let s = 0; s < 16; s += 4) add('arp', s + 2, [ch[(s / 4) % 3] + 24], 1, 0.4);
      if (hasDrums) for (const [inst, pat] of Object.entries(DRUMS[m.drums])) {
        const p = b === 7 && inst === 'snare' ? '....x.......x.xx' : pat;
        p.split('').forEach((cc, s) => cc !== '.' && add(inst, s, [null], 1, s % 4 ? 0.6 : 0.9));
      }
      const byStep = [];
      events.forEach((e) => (byStep[e.step] ||= []).push(e));
      bars['g' + b] = { len: 16, byStep };
      barNames.push('g' + b);
    }
    const tracks = {
      bass: { inst: m.bass, vol: 0.9 },
      chords: { inst: m.chords, vol: 0.8 },
      lead: { inst: m.lead, vol: 0.85, level: 0.5 },
      arp: { inst: 'bell', vol: 0.5, level: 0.8, echo: 0.3 },
    };
    if (hasDrums) for (const inst of Object.keys(DRUMS[m.drums])) tracks[inst] = { inst, vol: 0.85, level: inst === 'kick' ? 0.25 : 0.4 };
    return { bpm: o.bpm || 100, swing: m.swing, tracks, bars, patterns: {}, sections: { main: barNames } };
  }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function update() {
    if (!ctx) return;
    const s = getSettings();
    const t = ctx.currentTime;
    api.sfxBus.gain.setTargetAtTime(vol(s.sfx) * 0.9, t, 0.03);
    api.musicBus.gain.setTargetAtTime(vol(s.music) * 0.17, t, 0.15);
    sends.sfx.wet.gain.setTargetAtTime(vol(s.sfx) * 0.9, t, 0.03);
    sends.music.wet.gain.setTargetAtTime(vol(s.music) * 0.17, t, 0.15);
    if (s.music > 0 && music.wanted && !music.playing) music.start();
  }

  const api = {
    ctx: null, sfxBus: null, musicBus: null,
    tone, noise, sfx, music, SCALES, INSTRUMENTS, midi, noteToMidi,
    play, fx, preset,
    /** Eigenes Instrument registrieren, danach per Name in play() und Songs nutzbar */
    instrument(name, def) { INSTRUMENTS[name] = def.extends ? { ...resolve(def.extends), ...def } : def; },
    /** Musik kurz leiser (0–1), z.B. für große Momente */
    duck(amount = 0.5, time = 0.6) {
      if (!ctx) return;
      const t = ctx.currentTime;
      for (const g of [duck.gain, duckWet.gain]) {
        g.setTargetAtTime(1 - amount, t, 0.02);
        g.setTargetAtTime(1, t + time * 0.4, time / 3);
      }
    },
    unlock() { ac(); if (file.wantUrl && !file.url) playFile(); else if (music.wanted) music.start(); },
    update,
    setHidden(h) {
      hidden = h;
      if (!ctx) return;
      if (h) ctx.suspend(); else ctx.resume();
    },
  };
  return api;
}
