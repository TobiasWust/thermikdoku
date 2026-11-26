// Games Factory Kit: gemeinsame Bausteine für alle Spiele.
// Footer, Einstellungen (Sprache, Musik, Effekte, Vibration, Farbenblind, Animationen),
// Datenschutz, Impressum, Installieren, Offline, Speichern, Audio, Toasts.
// NICHT im Spiel bearbeiten: wird von der Factory per Kit-Update überschrieben.
import { createAudio } from './audio.js';
import { createSprites } from './sprite.js';
import { legalHtml } from './legal.js';
import { MORE_STRINGS } from './strings.js';

export const KIT_VERSION = '1.12.0';

/** Die Sprachen aller Spiele (Reihenfolge = Auswahl in den Einstellungen). Englisch ist der Rückfall. */
export const KIT_LANGUAGES = ['en', 'de', 'es', 'fr', 'pt', 'it', 'ja', 'ko', 'tr', 'id', 'ru', 'pl', 'nl', 'zh', 'vi', 'th', 'ar', 'hi', 'uk', 'sv'];
// zh = Chinesisch in Langzeichen (Taiwan, Hongkong: dort gibt es Google Play)

/**
 * Läuft das Spiel als Android-App aus dem Play Store (TWA)? Die App startet mit ?app=play.
 * Gemerkt wird das nur für diesen Tab (sessionStorage): localStorage teilt sich die TWA mit dem normalen
 * Chrome, sonst sähe die Website plötzlich aus wie die App.
 */
/**
 * Vertriebswege und was dort sichtbar ist. Das Kit erkennt den Weg selbst (Kit.channel) und blendet aus,
 * was dort nicht erlaubt oder nicht passend ist. Neue Stores (z.B. Apple) bekommen hier eine Zeile.
 *  web   Website und games.wust.dev („Wust-Store“)
 *  play  Android-App aus Google Play (Werft/Capacitor, früher TWA mit ?app=play)
 */
export const CHANNELS = {
  web:  { madeWith: true,  kofi: true,  install: true,  ads: false, removeAds: false, countAs: '' },
  play:  { madeWith: false, kofi: false, install: false, ads: true,  removeAds: true,  countAs: 'app' },
  apple: { madeWith: false, kofi: false, install: false, ads: true,  removeAds: true,  countAs: 'ios' },
};

function detectApp() {
  try {
    if (window.Werft?.app) return window.Werft.platform === 'ios' ? 'apple' : 'play'; // native App aus der Werft (Capacitor)
    const q = new URLSearchParams(location.search).get('app');
    if (q) sessionStorage.setItem('kit:app', q);
    if (!sessionStorage.getItem('kit:app') && document.referrer.startsWith('android-app://')) sessionStorage.setItem('kit:app', 'play');
    return sessionStorage.getItem('kit:app') || null;
  } catch { return null; }
}

const KIT_STRINGS = {
  de: {
    'kit.settings': 'Einstellungen',
    'kit.language': 'Sprache',
    'kit.music': 'Musik',
    'kit.sfx': 'Effekte',
    'kit.vibration': 'Vibration',
    'kit.colorblind': 'Farbenblind-Modus',
    'kit.colorblindHint': 'Farben zusätzlich mit Symbolen und Mustern',
    'kit.reduceMotion': 'Animationen reduzieren',
    'kit.reduceMotionHint': 'Weniger Bewegung, kein Wackeln',
    'kit.install': '📲 Als App installieren',
    'kit.done': 'Fertig',
    'kit.reset': 'Fortschritt löschen',
    'kit.removeAds': '🚫 Werbung entfernen – {price}',
    'kit.removeAdsDone': 'Danke! Die Werbung ist weg.',
    'kit.restore': 'Käufe wiederherstellen',
    'kit.restoreNone': 'Kein Kauf gefunden',
    'kit.adConsent': 'Datenschutz-Einstellungen (Werbung)',
    'kit.logEmpty': 'Noch keine Einträge seit dem Start',
    'kit.resetTitle': 'Fortschritt löschen?',
    'kit.resetText': 'Alle Punkte und Fortschritte auf diesem Gerät sind dann weg.',
    'kit.resetYes': 'Ja, löschen',
    'kit.resetNo': 'Behalten',
    'kit.resetDone': 'Fortschritt gelöscht',
    'kit.privacy': 'Datenschutz',
    'kit.imprint': 'Impressum',
    'kit.coffee': '☕ Kaffee spendieren',
    'kit.coffeeLong': '☕ Gefällt dir {name}? Spendier mir einen Kaffee',
    'kit.close': 'Schließen',
    'kit.installTitle': 'Als App installieren',
    'kit.installIos1': 'Tippe unten auf <b>Teilen</b> <span aria-hidden="true">⬆️</span>',
    'kit.installIos2': 'Wähle <b>Zum Home-Bildschirm</b>',
    'kit.installIos3': 'Tippe auf <b>Hinzufügen</b>',
    'kit.installMenu1': 'Öffne das Browser-Menü <span aria-hidden="true">⋮</span> (oder klicke auf das Installieren-Symbol in der Adressleiste)',
    'kit.installMenu2': 'Wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>',
    'kit.installMac1': 'Klicke oben in der Menüleiste auf <b>Ablage</b> (oder auf <b>Teilen</b>)',
    'kit.installMac2': 'Wähle <b>Zum Dock hinzufügen</b>',
    'kit.installText': '{name} startet dann wie eine App und funktioniert auch offline.',
    'kit.installed': 'Installiert! Viel Spaß.',
    'kit.gotIt': 'Alles klar',
    'kit.madeWith': 'Made with',
    'kit.by': 'by',
  },
  en: {
    'kit.settings': 'Settings',
    'kit.language': 'Language',
    'kit.music': 'Music',
    'kit.sfx': 'Sound effects',
    'kit.vibration': 'Vibration',
    'kit.colorblind': 'Colourblind mode',
    'kit.colorblindHint': 'Colours also shown as symbols and patterns',
    'kit.reduceMotion': 'Reduce animations',
    'kit.reduceMotionHint': 'Less movement, no shaking',
    'kit.install': '📲 Install as app',
    'kit.done': 'Done',
    'kit.reset': 'Delete progress',
    'kit.removeAds': '🚫 Remove ads – {price}',
    'kit.removeAdsDone': 'Thank you! The ads are gone.',
    'kit.restore': 'Restore purchases',
    'kit.restoreNone': 'No purchase found',
    'kit.adConsent': 'Privacy settings (ads)',
    'kit.logEmpty': 'No entries since start',
    'kit.resetTitle': 'Delete progress?',
    'kit.resetText': 'All points and progress on this device will be gone.',
    'kit.resetYes': 'Yes, delete',
    'kit.resetNo': 'Keep it',
    'kit.resetDone': 'Progress deleted',
    'kit.privacy': 'Privacy',
    'kit.imprint': 'Legal notice',
    'kit.coffee': '☕ Buy me a coffee',
    'kit.coffeeLong': '☕ Enjoying {name}? Buy me a coffee',
    'kit.close': 'Close',
    'kit.installTitle': 'Install as app',
    'kit.installIos1': 'Tap <b>Share</b> at the bottom <span aria-hidden="true">⬆️</span>',
    'kit.installIos2': 'Choose <b>Add to Home Screen</b>',
    'kit.installIos3': 'Tap <b>Add</b>',
    'kit.installMenu1': 'Open the browser menu <span aria-hidden="true">⋮</span> (or click the install icon in the address bar)',
    'kit.installMenu2': 'Choose <b>Install app</b> or <b>Add to Home screen</b>',
    'kit.installMac1': 'Click <b>File</b> in the menu bar (or <b>Share</b>)',
    'kit.installMac2': 'Choose <b>Add to Dock</b>',
    'kit.installText': '{name} then starts like an app and also works offline.',
    'kit.installed': 'Installed! Have fun.',
    'kit.gotIt': 'Got it',
    'kit.madeWith': 'Made with',
    'kit.by': 'by',
  },
};

Object.assign(KIT_STRINGS, MORE_STRINGS);

export const LANG_NAMES = { en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', pt: 'Português', it: 'Italiano', ja: '日本語', ko: '한국어', tr: 'Türkçe', id: 'Bahasa Indonesia', ru: 'Русский', pl: 'Polski', nl: 'Nederlands', zh: '繁體中文', vi: 'Tiếng Việt', th: 'ไทย', ar: 'العربية', hi: 'हिन्दी', uk: 'Українська', sv: 'Svenska' };

// Okabe-Ito: für alle Formen von Farbenblindheit unterscheidbar
export const SAFE_COLORS = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#999999'];
export const SYMBOLS = ['●', '▲', '■', '◆', '★', '✚', '⬢', '✖'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const listeners = {};
const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Gemeinsamer GoatCounter aller Karakuri-Spiele (Aufrufe je Spiel unter /<id>/, Ko-fi-Klicks unter kofi/<id>/)
const GOATCOUNTER = 'https://karakurigames.goatcounter.com/count';

const Kit = {
  version: KIT_VERSION,
  config: null,
  lang: 'en',
  languages: KIT_LANGUAGES,
  strings: {},
  settings: null,
  audio: null,
  ready: false,

  /**
   * @param {object} cfg
   * @param {string} cfg.id            Eindeutiger Slug, Präfix für den Speicher
   * @param {string} cfg.name          Spielname (für Texte, Rechtliches)
   * @param {string[]} [cfg.languages] Verfügbare Sprachen, jeweils i18n/<lang>.json (Standard: KIT_LANGUAGES)
   * @param {string|false} [cfg.goatcounter] GoatCounter-URL; Standard ist der gemeinsame Zähler aller Karakuri-Spiele, false schaltet ihn ab
   * @param {Array}  [cfg.extraSettings] [{key, label:{de,en}, hint:{de,en}, default:true}]
   * @param {boolean} [cfg.colorblind=true]   false: Spiel transportiert nichts über Farbe, Schalter entfällt
   * @param {boolean} [cfg.reduceMotion=true] false: Spiel hat keine nennenswerte Bewegung, Schalter entfällt
   * @param {Function} [cfg.onReset]   Wird nach „Fortschritt löschen“ aufgerufen
   * @param {object} [cfg.music]       Hintergrundmusik: { bpm, scale, root, mood } (generiert) oder ein Song (siehe README)
   * @param {object} [cfg.sounds]      Eigene Effekte { name: fx-Parameter } → Kit.audio.sfx.name()
   */
  async init(cfg) {
    this.config = { languages: KIT_LANGUAGES, extraSettings: [], colorblind: true, reduceMotion: true, goatcounter: GOATCOUNTER, ...cfg };
    this.languages = this.config.languages;
    this.app = detectApp();
    this.channel = CHANNELS[this.app] ? this.app : (this.app ? 'play' : 'web');
    document.documentElement.classList.toggle('kit-app', !!this.app);
    document.documentElement.dataset.kitChannel = this.channel;
    const defaults = {
      lang: this.pickLang(),
      music: 60,
      sfx: 80,
      vibration: true,
      colorblind: false,
      reduceMotion: prefersReduced(),
    };
    for (const s of this.config.extraSettings) defaults[s.key] = s.default ?? false;
    const saved = this.store.get('settings', {});
    // Die Sprache folgt dem Browser, bis jemand sie in den Einstellungen selbst wählt (langChosen).
    // So bekommen Spieler neue Sprachen automatisch, statt auf der ersten automatisch gewählten festzuhängen.
    if (!saved.langChosen) delete saved.lang;
    this.settings = { ...defaults, ...saved };
    if (!this.languages.includes(this.settings.lang)) this.settings.lang = this.pickLang();
    // Ohne Schalter: Farbenblind aus, Animationen folgen der Systemeinstellung
    if (this.config.colorblind === false) this.settings.colorblind = false;
    if (this.config.reduceMotion === false) this.settings.reduceMotion = prefersReduced();

    await this.loadStrings(this.settings.lang);
    this.audio = createAudio(() => this.settings, this.config.music, this.config.sounds);
    this.buildUi();
    this.applyChannel();
    this.applySettings();
    this.setupInstall();
    this.registerSw();
    this.loadCounter();
    this.ads.load();
    this.ready = true;
    window.Kit = this;
    this.emit('ready');
    // Direktlink auf Datenschutz/Impressum (z.B. ?app=play#privacy als Datenschutz-URL im Play Store)
    const h = location.hash.slice(1);
    if (h === 'privacy' || h === 'imprint') this.openDialog(`kit-${h}`);
    return this;
  },

  // ---------- Speicher (pro Spiel getrennt) ----------
  store: {
    key(k) { return `${Kit.config?.id || 'game'}:${k}`; },
    get(k, def = null) {
      try { const v = localStorage.getItem(this.key(k)); return v == null ? def : JSON.parse(v); } catch { return def; }
    },
    set(k, v) { try { localStorage.setItem(this.key(k), JSON.stringify(v)); } catch {} },
    remove(k) { try { localStorage.removeItem(this.key(k)); } catch {} },
    clearProgress() {
      const prefix = `${Kit.config.id}:`;
      Object.keys(localStorage).filter((k) => k.startsWith(prefix) && k !== `${prefix}settings`).forEach((k) => localStorage.removeItem(k));
    },
  },

  // ---------- Ereignisse ----------
  on(ev, fn) { (listeners[ev] ||= []).push(fn); return () => (listeners[ev] = listeners[ev].filter((f) => f !== fn)); },
  emit(ev, data) { (listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },

  // ---------- Einstellungen ----------
  get colorblind() { return !!this.settings?.colorblind; },
  get reducedMotion() { return !!this.settings?.reduceMotion; },
  /** 1 bei vollen Animationen, sonst ein kleiner Faktor (z.B. für Partikelzahl, Wackeln) */
  get motion() { return this.reducedMotion ? 0.15 : 1; },
  set(key, value) {
    this.settings[key] = value;
    this.store.set('settings', this.settings);
    this.applySettings();
    this.emit('settings', { key, value, settings: this.settings });
  },
  applySettings() {
    const root = document.documentElement;
    root.classList.toggle('kit-colorblind', this.colorblind);
    root.classList.toggle('kit-reduce-motion', this.reducedMotion);
    root.style.setProperty('--kit-motion', this.reducedMotion ? '0' : '1');
    this.audio?.update();
  },

  // ---------- Sprache ----------
  /** Erste Browsersprache, die das Spiel kann (pt-BR → pt, in → id), sonst Englisch */
  pickLang() {
    const alias = { in: 'id', iw: 'he', nb: 'no' };
    const langs = (navigator.languages?.length ? navigator.languages : [navigator.language || 'en']).map((l) => { const c = String(l).slice(0, 2).toLowerCase(); return alias[c] || c; });
    return langs.find((l) => this.languages.includes(l)) || (this.languages.includes('en') ? 'en' : this.languages[0]);
  },
  async loadStrings(lang) {
    const load = async (l) => { try { const res = await fetch(`i18n/${l}.json`, { cache: 'no-cache' }); return res.ok ? await res.json() : {}; } catch { return {}; } };
    // Fehlt ein Text in der gewählten Sprache, steht dort der englische statt des Schlüssels
    const [game, fallback] = await Promise.all([load(lang), lang === 'en' ? {} : load('en')]);
    this.strings = { ...KIT_STRINGS.en, ...(KIT_STRINGS[lang] || {}), ...fallback, ...game };
    this.lang = lang;
    document.documentElement.lang = lang;
  },
  async setLang(lang) {
    this.settings.lang = lang;
    this.settings.langChosen = true;
    this.store.set('settings', this.settings);
    await this.loadStrings(lang);
    this.translate();
    this.emit('lang', lang);
    this.emit('settings', { key: 'lang', value: lang, settings: this.settings });
  },
  /** Text holen, {platzhalter} werden ersetzt. Fehlt ein Schlüssel, kommt der Schlüssel zurück. */
  t(key, vars = {}) {
    let s = this.strings[key];
    if (s == null) { console.warn(`[kit] fehlender Text: ${key} (${this.lang})`); s = key; }
    return String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? (k === 'name' ? this.config.name : `{${k}}`)));
  },
  /** Übersetzt [data-i18n], [data-i18n-html], [data-i18n-aria], [data-i18n-title], [data-i18n-placeholder] */
  translate(root = document) {
    $$('[data-i18n]', root).forEach((el) => (el.textContent = this.t(el.dataset.i18n)));
    $$('[data-i18n-html]', root).forEach((el) => (el.innerHTML = this.t(el.dataset.i18nHtml)));
    $$('[data-i18n-aria]', root).forEach((el) => el.setAttribute('aria-label', this.t(el.dataset.i18nAria)));
    $$('[data-i18n-title]', root).forEach((el) => el.setAttribute('title', this.t(el.dataset.i18nTitle)));
    $$('[data-i18n-placeholder]', root).forEach((el) => el.setAttribute('placeholder', this.t(el.dataset.i18nPlaceholder)));
    if (this.strings['meta.title']) document.title = this.strings['meta.title'];
    this.renderLegal();
  },

  // ---------- Farbenblind ----------
  /** Farbe i aus der Spielpalette, im Farbenblind-Modus aus der sicheren Palette */
  color(i, palette) {
    const p = this.colorblind || !palette ? SAFE_COLORS : palette;
    return p[i % p.length];
  },
  /** Symbol für Farbe i (im Farbenblind-Modus immer zusätzlich anzeigen) */
  symbol(i) { return SYMBOLS[i % SYMBOLS.length]; },

  // ---------- Feedback ----------
  vibrate(pattern = 12) {
    if (this.settings?.vibration && navigator.vibrate) { try { navigator.vibrate(pattern); } catch {} }
  },
  toast(msg, kind = '') {
    const el = $('#kit-toast');
    el.textContent = msg;
    el.className = `kit-toast show ${kind}`;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => (el.className = 'kit-toast'), 2200);
  },
  openSettings() { this.audio.sfx.click(); this.openDialog('kit-settings'); },
  openDialog(id) {
    const d = document.getElementById(id);
    if (d && !d.open) d.showModal();
    this.emit('pause', true);
  },
  closeDialog(id) {
    const d = document.getElementById(id);
    if (d?.open) d.close();
  },

  /** Ist etwas auf diesem Vertriebsweg erlaubt? Kit.has('kofi'), Kit.has('ads') … */
  has(feature) { return !!(CHANNELS[this.channel] || CHANNELS.web)[feature]; },
  /** Elemente mit data-kit-feature="…" (auch im Spiel nutzbar) je nach Vertriebsweg ausblenden */
  applyChannel(root = document) {
    $$('[data-kit-feature]', root).forEach((el) => { if (!el.dataset.kitFeature.split(' ').every((f) => this.has(f))) el.hidden = true; });
  },

  // ---------- Oberfläche ----------
  buildUi() {
    const cfg = this.config;
    // Footer in jedes <footer data-kit-footer>
    $$('[data-kit-footer]').forEach((f) => {
      f.classList.add('kit-footer');
      f.innerHTML = `
        <p data-kit-feature="madeWith"><span data-i18n="kit.madeWith"></span> <span class="kit-heart">❤️</span> <span data-i18n="kit.by"></span> <a href="https://wust.dev/" target="_blank" rel="noopener noreferrer">Wust</a><span class="kit-install-link" hidden> · <button type="button" data-kit="install" data-i18n="kit.install"></button></span></p>
        <p class="kit-footer-legal">
          <button type="button" data-kit="privacy" data-i18n="kit.privacy"></button>
          <span aria-hidden="true">·</span>
          <button type="button" data-kit="imprint" data-i18n="kit.imprint"></button>
          <span data-kit-feature="kofi"><span aria-hidden="true">·</span>
          <a href="https://ko-fi.com/tobiaswust" target="_blank" rel="noopener noreferrer" data-kofi="footer" data-i18n="kit.coffee"></a></span>
        </p>`;
    });

    // Zahnrad, falls das Spiel keins hat
    if (!$('[data-kit="settings"]')) {
      const b = document.createElement('button');
      b.className = 'kit-gear kit-gear-floating';
      b.dataset.kit = 'settings';
      b.dataset.i18nAria = 'kit.settings';
      b.innerHTML = gearSvg();
      document.body.append(b);
    }
    $$('[data-kit="settings"]').forEach((b) => { if (!b.innerHTML.trim()) b.innerHTML = gearSvg(); });

    const langOptions = this.languages.map((l) => `<option value="${l}">${LANG_NAMES[l] || l}</option>`).join('');
    const extra = cfg.extraSettings.map((s) => toggleHtml(s.key, `extra.${s.key}`, s.hint ? `extra.${s.key}.hint` : null)).join('');
    for (const s of cfg.extraSettings) {
      for (const l of Object.keys(KIT_STRINGS)) {
        KIT_STRINGS[l][`extra.${s.key}`] = s.label?.[l] ?? s.label?.en ?? s.key;
        if (s.hint) KIT_STRINGS[l][`extra.${s.key}.hint`] = s.hint?.[l] ?? s.hint?.en ?? '';
      }
    }
    this.strings = { ...(KIT_STRINGS[this.lang] || KIT_STRINGS.en), ...this.strings };

    const wrap = document.createElement('div');
    wrap.className = 'kit-root';
    wrap.innerHTML = `
      <dialog class="kit-dialog" id="kit-settings" aria-labelledby="kit-settings-title">
        <form method="dialog" class="kit-card">
          <h2 id="kit-settings-title" data-i18n="kit.settings"></h2>
          <label class="kit-row"><span data-i18n="kit.language"></span>
            <select id="kit-set-lang" class="kit-select">${langOptions}</select></label>
          <label class="kit-row kit-slider"><span data-i18n="kit.music"></span>
            <input type="range" min="0" max="100" step="5" id="kit-set-music"><output id="kit-out-music"></output></label>
          <label class="kit-row kit-slider"><span data-i18n="kit.sfx"></span>
            <input type="range" min="0" max="100" step="5" id="kit-set-sfx"><output id="kit-out-sfx"></output></label>
          ${'vibrate' in navigator ? toggleHtml('vibration', 'kit.vibration') : ''}
          ${cfg.colorblind !== false ? toggleHtml('colorblind', 'kit.colorblind', 'kit.colorblindHint') : ''}
          ${cfg.reduceMotion !== false ? toggleHtml('reduceMotion', 'kit.reduceMotion', 'kit.reduceMotionHint') : ''}
          ${extra}
          <button type="button" class="kit-btn kit-btn-light kit-install-btn" data-kit="install" hidden data-i18n="kit.install"></button>
          <button type="button" class="kit-btn kit-btn-light kit-remove-ads" data-kit="remove-ads" hidden></button>
          <button class="kit-btn kit-btn-primary" value="done" data-i18n="kit.done"></button>
          <button type="button" class="kit-link-btn" data-kit="reset" data-i18n="kit.reset"></button>
          <span class="kit-app-links" hidden><button type="button" class="kit-link-btn" data-kit="restore" data-i18n="kit.restore" hidden></button><button type="button" class="kit-link-btn" data-kit="ad-consent" data-i18n="kit.adConsent" hidden></button></span>
          <button type="button" class="kit-link-btn kit-app-info" data-kit="app-info" hidden></button>
          <pre class="kit-app-log" hidden></pre>
          <p class="kit-settings-legal"><span data-kit-feature="madeWith"><span data-i18n="kit.madeWith"></span> ❤️ <span data-i18n="kit.by"></span> <a href="https://wust.dev/" target="_blank" rel="noopener noreferrer">Wust</a> · </span><button type="button" data-kit="privacy" data-i18n="kit.privacy"></button> · <button type="button" data-kit="imprint" data-i18n="kit.imprint"></button><span data-kit-feature="kofi"><br><a class="kit-kofi" href="https://ko-fi.com/tobiaswust" target="_blank" rel="noopener noreferrer" data-kofi="settings" data-i18n="kit.coffeeLong"></a></span></p>
        </form>
      </dialog>
      <dialog class="kit-dialog" id="kit-reset">
        <form method="dialog" class="kit-card">
          <h2 data-i18n="kit.resetTitle"></h2>
          <p data-i18n="kit.resetText"></p>
          <button type="button" class="kit-btn kit-btn-primary" data-kit="reset-confirm" data-i18n="kit.resetYes"></button>
          <button class="kit-btn kit-btn-light" data-i18n="kit.resetNo"></button>
        </form>
      </dialog>
      <dialog class="kit-dialog" id="kit-install">
        <form method="dialog" class="kit-card">
          <h2 data-i18n="kit.installTitle"></h2>
          <ol class="kit-install-steps" id="kit-install-steps"></ol>
          <p data-i18n="kit.installText"></p>
          <button class="kit-btn kit-btn-primary" data-i18n="kit.gotIt"></button>
        </form>
      </dialog>
      <dialog class="kit-dialog" id="kit-privacy"><form method="dialog" class="kit-card kit-legal-card"><div class="kit-legal" id="kit-privacy-body"></div><button class="kit-btn kit-btn-light" data-i18n="kit.close"></button></form></dialog>
      <dialog class="kit-dialog" id="kit-imprint"><form method="dialog" class="kit-card kit-legal-card"><div class="kit-legal" id="kit-imprint-body"></div><button class="kit-btn kit-btn-light" data-i18n="kit.close"></button></form></dialog>
      <div class="kit-toast" id="kit-toast" role="status" aria-live="polite"></div>`;
    document.body.append(wrap);

    // Werte setzen
    const s = this.settings;
    $('#kit-set-lang').value = this.lang;
    for (const k of ['music', 'sfx']) {
      const input = $(`#kit-set-${k}`), out = $(`#kit-out-${k}`);
      input.value = s[k]; out.textContent = s[k];
      input.addEventListener('input', () => { out.textContent = input.value; this.set(k, +input.value); });
      input.addEventListener('change', () => this.audio.sfx.click());
    }
    $$('input[data-kit-setting]').forEach((cb) => {
      cb.checked = !!s[cb.dataset.kitSetting];
      cb.addEventListener('change', () => { this.set(cb.dataset.kitSetting, cb.checked); this.audio.sfx.toggle(cb.checked); });
    });
    $('#kit-set-lang').addEventListener('change', (e) => this.setLang(e.target.value));

    $$('dialog.kit-dialog').forEach((d) => {
      d.addEventListener('close', () => { if (!$$('dialog.kit-dialog').some((x) => x.open)) this.emit('pause', false); });
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // Klick neben die Karte schließt
    });

    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-kit]');
      if (!el) return;
      const a = el.dataset.kit;
      if (a === 'settings') this.openSettings();
      else if (a === 'privacy' || a === 'imprint') { this.audio.sfx.click(); this.openDialog(`kit-${a}`); }
      else if (a === 'install') this.install();
      else if (a === 'remove-ads') this.buyRemoveAds();
      else if (a === 'restore') this.restorePurchases();
      else if (a === 'ad-consent') window.Werft?.privacy.open();
      else if (a === 'app-info') {
        const pre = $('.kit-app-log');
        pre.hidden = !pre.hidden;
        const W = window.Werft;
        if (!pre.hidden) pre.textContent = [`Build ${W?.config?.build || '?'} · Werft ${W?.version || '?'} · Kit ${KIT_VERSION}`, ...(W?.log?.length ? W.log : [this.t('kit.logEmpty')])].join('\n');
      }
      else if (a === 'reset') { this.closeDialog('kit-settings'); this.openDialog('kit-reset'); }
      else if (a === 'reset-confirm') {
        this.store.clearProgress();
        this.closeDialog('kit-reset');
        this.config.onReset?.();
        this.emit('reset');
        this.toast(this.t('kit.resetDone'));
      }
    });

    // Audio erst nach erster Geste
    const unlock = () => { this.audio.unlock(); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => this.audio.setHidden(document.hidden));

    this.translate();
  },

  renderLegal() {
    const p = $('#kit-privacy-body'), i = $('#kit-imprint-body');
    if (!p) return;
    const W = window.Werft;
    const listing = !W?.app && !!this.app; // ?app=play im Browser: vollständiger App-Text für den Store-Eintrag
    const ads = listing || !!(W?.app && W.config?.admob);
    const purchase = listing || !!(W?.app && W.config?.removeAds);
    const html = legalHtml(this.lang, this.config.name, !!this.config.goatcounter, { app: !!this.app, ads, purchase, store: this.channel });
    p.innerHTML = html.privacy;
    i.innerHTML = html.imprint;
  },

  // ---------- Installieren ----------
  // Der Knopf ist immer sichtbar, außer das Spiel läuft schon als App.
  // Gibt der Browser ein Installations-Angebot (Chrome/Edge/Android), nutzen wir es,
  // sonst zeigen wir eine Anleitung passend zur Plattform.
  setupInstall() {
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMacSafari = !isIOS && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua);
    this._installSteps = isIOS ? ['kit.installIos1', 'kit.installIos2', 'kit.installIos3']
      : isMacSafari ? ['kit.installMac1', 'kit.installMac2']
      : ['kit.installMenu1', 'kit.installMenu2'];
    const mq = matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)');
    let installed = false;
    const update = () => {
      const standalone = mq.matches || navigator.standalone || installed || !this.has('install'); // in der Play-Store-App gibt es nichts zu installieren
      $$('.kit-install-link, .kit-install-btn').forEach((el) => (el.hidden = !!standalone));
    };
    mq.addEventListener?.('change', update);
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this._installPrompt = e; update(); });
    addEventListener('appinstalled', () => { this._installPrompt = null; installed = true; update(); this.toast(this.t('kit.installed'), 'good'); });
    this._updateInstall = update;
    update();
  },
  async install() {
    if (this._installPrompt) {
      const p = this._installPrompt; this._installPrompt = null;
      p.prompt(); await p.userChoice.catch(() => {});
      this._updateInstall();
      return;
    }
    const ol = $('#kit-install-steps');
    ol.innerHTML = this._installSteps.map((k) => `<li data-i18n-html="${k}"></li>`).join('');
    this.translate(ol);
    this.closeDialog('kit-settings');
    this.openDialog('kit-install');
  },

  registerSw() {
    if (window.Werft?.app) return; // in der App liegen die Dateien schon lokal
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  // ---------- Werbepausen und „Werbung entfernen“ (nur in der Android-App aus der Werft) ----------
  // Das Spiel meldet nur natürliche Pausen: await Kit.ads.break('level-done').
  // Im Browser (Website, games.wust.dev) gibt es window.Werft nicht oder mit app=false: nie Werbung, kein Kauf-Knopf.
  // In der App zeigt werft.js über AdMob ein Interstitial, hält Abstände ein und lässt es weg, wenn „Werbung entfernen“ gekauft ist.
  ads: {
    get enabled() { return !!(Kit.has('ads') && window.Werft?.app && window.Werft.ads.enabled && !window.Werft.removeAds.owned); },
    async load() {
      const W = window.Werft;
      if (!Kit.app || !W?.app) return;
      await W.ready;
      W.on('change', () => Kit.updateAppUi());
      Kit.updateAppUi();
    },
    /**
     * Natürliche Pause im Spiel (Level geschafft, nach Game Over vor dem Neustart). Nie mitten im Spiel, nie beim Start.
     * Gibt { shown } zurück, sobald es weitergehen kann; ohne Werbung sofort.
     */
    async break(name = 'break') {
      if (!this.enabled) return { shown: false };
      return window.Werft.ads.break(name, {
        beforeAd: () => { Kit.audio?.setHidden(true); Kit.emit('pause', true); },
        afterAd: () => { Kit.audio?.setHidden(document.hidden); Kit.emit('pause', false); },
      });
    },
  },

  /** Knöpfe für Kauf, Wiederherstellen und Einwilligung in den Einstellungen; Datenschutztext passend zur App */
  updateAppUi() {
    const W = window.Werft;
    const inApp = !!(this.app && W?.app);
    const buy = $('.kit-remove-ads');
    const canBuy = inApp && this.has('removeAds') && W.removeAds.available && !W.removeAds.owned;
    if (buy) { buy.hidden = !canBuy; buy.textContent = this.t('kit.removeAds').replace('{price}', W?.removeAds.price || ''); }
    const restore = $('[data-kit="restore"]'), consent = $('[data-kit="ad-consent"]'), links = $('.kit-app-links');
    if (restore) restore.hidden = !(inApp && W.removeAds.available && !W.removeAds.owned);
    if (consent) consent.hidden = !(inApp && W.privacy.available);
    if (links) links.hidden = !(restore && !restore.hidden) && !(consent && !consent.hidden);
    // Welche Version läuft in der App (Live-Updates)? Antippen zeigt das Werft-Protokoll (Werbepausen, Updates)
    const info = $('.kit-app-info');
    if (info) {
      info.hidden = !inApp;
      if (inApp) info.textContent = `Version ${W.config?.web || '?'}`;
    }
    this.renderLegal();
  },
  async buyRemoveAds() {
    const r = await window.Werft?.removeAds.buy().catch(() => null);
    if (r?.owned) { this.toast(this.t('kit.removeAdsDone'), 'good'); this.emit('removeAds', true); }
    this.updateAppUi();
  },
  async restorePurchases() {
    const r = await window.Werft?.removeAds.restore().catch(() => null);
    this.toast(r?.owned ? this.t('kit.removeAdsDone') : this.t('kit.restoreNone'), r?.owned ? 'good' : '');
    this.updateAppUi();
  },

  loadCounter() {
    const gc = this.config.goatcounter;
    if (!gc) return;
    const id = this.config.id || 'game';
    if (window.Werft?.app || !/^(localhost|127\.|\[::1\])/.test(location.hostname)) { // in der App heißt der Host auch localhost
      // Gemeinsamer Zähler für alle Spiele: Aufrufe landen unter /<spiel-id>/…
      const sub = (CHANNELS[this.channel] || {}).countAs; const base = sub ? `/${id}/${sub}` : `/${id}`; // Aufrufe aus der Play-Store-App getrennt sehen
      window.goatcounter = { ...(window.goatcounter || {}), path: (p) => `${base}${p.startsWith('/') ? p : `/${p}`}` };
      const s = document.createElement('script');
      s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = gc;
      document.head.append(s);
    }
    // Klicks auf „Kaffee spendieren“ als Ereignis zählen: kofi/<spiel-id>/<footer|settings>
    document.addEventListener('click', (e) => {
      const a = e.target.closest?.('a[href*="ko-fi.com"]');
      if (!a) return;
      const where = a.dataset.kofi || 'link';
      try {
        window.goatcounter?.count?.({ path: `kofi/${id}/${where}`, title: `Ko-fi: ${this.config.name || this.config.id} (${where})`, event: true });
      } catch {}
    }, true);
  },
};

function toggleHtml(key, labelKey, hintKey) {
  return `<label class="kit-row kit-toggle"><span><span data-i18n="${labelKey}"></span>${hintKey ? `<small data-i18n="${hintKey}"></small>` : ''}</span><input type="checkbox" role="switch" data-kit-setting="${key}" id="kit-set-${key}"><i aria-hidden="true"></i></label>`;
}
function gearSvg() {
  return '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
}

// Animationen aus Streifen (siehe sprite.js); braucht kein init, liest reducedMotion live
Kit.sprite = createSprites(() => Kit);

export { Kit };
export default Kit;
