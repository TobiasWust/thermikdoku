// Kit-Sprites: Animationen aus Streifen (waagerecht nebeneinander, gleich große Frames) abspielen.
// Jede Animation ist <name>.webp plus <name>.json { frames, frameWidth, frameHeight, fps, anchorX?, anchorY? }.
// Eine Figur fasst ihre Bewegungen in einer Übersicht zusammen, z.B. assets/anim/samuel.json:
//   { "character": "samuel", "default": "stand",
//     "moves": { "run": { "src": "samuel-run.webp", "frames": 10, "frameWidth": 205, "frameHeight": 256,
//                         "fps": 12, "loop": true, "anchorX": 100, "anchorY": 254 }, … } }
// Der Fußpunkt (anchorX/anchorY, Pixel im Frame) liegt auf der Bodenlinie; fehlt er, gilt unten Mitte.
// baseHeight (optional, gleich für alle Bewegungen einer Figur): Frame-Höhe des Standard-Frames bei festem
// Maßstab. Dann meint height beim Zeichnen die Höhe dieses Standard-Frames, und Bewegungen mit höheren
// Frames (Sprung, Schwert) werden entsprechend größer gezeichnet statt geschrumpft. Ohne baseHeight
// wird jede Bewegung auf height gebracht (wie bisher).
//
//   const sam = await Kit.sprite.load('assets/anim/samuel.json');
//   sam.play('run', { speed: 1.4 });           // Schleife; gleiche Bewegung läuft einfach weiter
//   sam.play('fall', { onEnd: () => … });      // einmalige Bewegung (loop: false in der Übersicht)
//   sam.seek(0.6);                             // Frame nach Fortschritt 0–1 (z.B. Sprungverlauf)
//   sam.update(dt);                            // im requestAnimationFrame, dt in Sekunden
//   sam.draw(ctx, x, y, { height: 112 });      // x/y = Fußpunkt

const imgCache = new Map();
const json = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Kit.sprite: ${url} nicht gefunden (${r.status})`);
  return r.json();
};
const dir = (url) => (url.includes('/') ? url.slice(0, url.lastIndexOf('/') + 1) : '');

function loadImage(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Kit.sprite: Bild ${src} lädt nicht`));
      img.src = src;
    }));
  }
  return imgCache.get(src);
}

/** Eine Bewegung vervollständigen: Standardwerte, Fußpunkt, Bild laden */
async function prepareMove(name, m, base) {
  const src = m.src.includes('/') || !base ? m.src : base + m.src;
  const move = {
    name,
    src,
    frames: m.frames,
    w: m.frameWidth,
    h: m.frameHeight,
    fps: m.fps || 12,
    loop: m.loop !== false,
    ax: m.anchorX ?? m.frameWidth / 2,
    ay: m.anchorY ?? m.frameHeight,
    base: m.baseHeight > 0 ? m.baseHeight : m.frameHeight, // Bezugshöhe für height (fester Maßstab pro Figur)
    reduce: m.reduce || 'slow', // bei „Animationen reduzieren“: 'slow' (halbes Tempo) oder 'still' (erstes Frame)
  };
  if (!(move.frames > 0 && move.w > 0 && move.h > 0)) throw new Error(`Kit.sprite: Bewegung „${name}“ braucht frames, frameWidth, frameHeight`);
  move.img = await loadImage(src);
  return move;
}

class Sprite {
  constructor(moves, def, getKit) {
    this.moves = moves;
    this.getKit = getKit;
    this.move = null;
    this.t = 0; // Sekunden in der aktuellen Bewegung
    this.speed = 1;
    this.done = false;
    this.fixed = null; // Fortschritt 0–1 bei seek()
    this.onEnd = null;
    this.play(def || Object.keys(moves)[0]);
  }

  get names() { return Object.keys(this.moves); }
  get current() { return this.move?.name || null; }

  /** Bewegung starten. Läuft sie schon, geht sie weiter (außer restart). */
  play(name, { speed, restart = false, loop, onEnd } = {}) {
    const m = this.moves[name];
    if (!m) { console.warn(`Kit.sprite: keine Bewegung „${name}“ (${this.names.join(', ')})`); return this; }
    if (speed != null) this.speed = speed;
    if (this.move === m && !restart && !this.done && this.fixed == null) return this;
    this.move = m;
    this.t = 0;
    this.done = false;
    this.fixed = null;
    this.loop = loop ?? m.loop;
    this.onEnd = onEnd || null;
    return this;
  }

  /** Frame nach Fortschritt 0–1 setzen und die Uhr anhalten (bis zum nächsten play) */
  seek(p) { this.fixed = Math.max(0, Math.min(1, p)); return this; }

  /** Zeit voranbringen (Sekunden). Bei „Animationen reduzieren“ halb so schnell bzw. still. */
  update(dt) {
    const m = this.move;
    if (!m || this.done || this.fixed != null) return this;
    const kit = this.getKit();
    const reduced = !!kit?.reducedMotion;
    if (reduced && m.reduce === 'still') return this;
    this.t += dt * this.speed * (reduced ? 0.5 : 1);
    if (!this.loop && this.t * m.fps >= m.frames) {
      this.t = (m.frames - 1) / m.fps;
      this.done = true;
      const cb = this.onEnd; this.onEnd = null;
      cb?.(this);
    }
    return this;
  }

  /** Aktueller Frame-Index */
  get frame() {
    const m = this.move;
    if (!m) return 0;
    if (this.fixed != null) return Math.min(m.frames - 1, Math.floor(this.fixed * m.frames));
    const f = Math.floor(this.t * m.fps);
    return this.loop ? ((f % m.frames) + m.frames) % m.frames : Math.min(m.frames - 1, f);
  }

  /** Breite in Pixeln bei gegebener Zeichenhöhe (für Kollision, Layout) */
  width(height, name = this.current) {
    const m = this.moves[name];
    return m ? (m.w * height) / m.base : 0;
  }

  /**
   * Zeichnen mit dem Fußpunkt auf (x, y).
   * o: { height (Zeichenhöhe eines Frames, mit baseHeight: des Standard-Frames; Standard: Originalgröße),
   *      flip, alpha, rotate (rad), squash (−1…1) }
   */
  draw(ctx, x, y, o = {}) {
    const m = this.move;
    if (!m) return;
    const k = o.height ? o.height / m.base : 1;
    const sq = o.squash || 0;
    ctx.save();
    ctx.translate(x, y);
    if (o.rotate) ctx.rotate(o.rotate);
    ctx.scale(k * (1 + sq * 0.25) * (o.flip ? -1 : 1), k * (1 - sq * 0.25));
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(m.img, this.frame * m.w, 0, m.w, m.h, -m.ax, -m.ay, m.w, m.h);
    ctx.restore();
  }

  /**
   * DOM-Element, das die Bewegung per CSS abspielt (für Menüs, Startbildschirm, Dialoge).
   * height: Anzeigehöhe in px. Das Element folgt play() nicht automatisch: el.dataset.move setzen
   * oder sprite.el(name) neu holen. Bei „Animationen reduzieren“ hält das Kit CSS-Animationen an.
   */
  el(name = this.current, { height = null } = {}) {
    const m = this.moves[name];
    const d = document.createElement('span');
    d.className = 'kit-sprite';
    const h = height ? (height * m.h) / m.base : m.h; // mit baseHeight: Höhe des Standard-Frames
    // absolute URL: ein relativer Pfad in einer CSS-Variable würde relativ zu kit/kit.css aufgelöst
    const url = new URL(m.src, document.baseURI).href;
    d.style.cssText = `--w:${(m.w * h) / m.h}px;--h:${h}px;--n:${m.frames};--dur:${(m.frames / m.fps).toFixed(3)}s;`
      + `--img:url("${url}");--loop:${m.loop ? 'infinite' : '1'}`;
    d.dataset.move = name;
    d.setAttribute('aria-hidden', 'true');
    return d;
  }
}

/**
 * Sprite-Bibliothek fürs Kit. getKit liefert das Kit-Objekt (für reducedMotion).
 */
export function createSprites(getKit) {
  return {
    /**
     * Figur laden. src: URL einer Übersicht (assets/anim/samuel.json) oder ein Objekt
     * { run: 'assets/anim/samuel-run', jump: { src: 'assets/anim/samuel-air', loop: false } }.
     * Bei einzelnen Pfaden wird die JSON daneben gelesen (<pfad>.json) und das Bild <pfad>.webp genommen.
     * opts: { default: 'stand' }
     */
    async load(src, opts = {}) {
      let moves = {}, def = opts.default;
      if (typeof src === 'string') {
        const man = await json(src);
        def ||= man.default;
        const base = dir(src);
        await Promise.all(Object.entries(man.moves || {}).map(async ([n, m]) => { moves[n] = await prepareMove(n, m, base); }));
      } else {
        await Promise.all(Object.entries(src).map(async ([n, spec]) => {
          const s = typeof spec === 'string' ? { src: spec } : spec;
          const stem = s.src.replace(/\.(webp|png|json)$/i, '');
          const meta = s.frames ? {} : await json(`${stem}.json`);
          moves[n] = await prepareMove(n, { ...meta, ...s, src: `${stem}.webp` }, '');
        }));
      }
      if (!Object.keys(moves).length) throw new Error('Kit.sprite: keine Bewegungen gefunden');
      return new Sprite(moves, def, getKit);
    },
    /** Alle Bilddateien einer Übersicht (z.B. um sie in sw.js vorzuladen) */
    async files(src) {
      const man = await json(src);
      const base = dir(src);
      return [src, ...Object.values(man.moves || {}).map((m) => (m.src.includes('/') ? m.src : base + m.src))];
    },
  };
}
