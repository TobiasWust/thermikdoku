// Kleine Übersetzung im Kit-Format: i18n/<lang>.json mit flachen Schlüsseln und {platzhaltern}.
// t(), translate() und die data-i18n-Attribute entsprechen dem gemeinsamen Kit.
export const LANGS = ['de', 'en'];

let lang = 'de';
let strings = {};
const listeners = [];

/** Sprache für neue Spieler aus den Browser-Sprachen: Deutsch, wenn Deutsch zuerst kommt, sonst Englisch */
export function pickLang() {
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])
    .map((l) => String(l).slice(0, 2).toLowerCase());
  const first = langs.find((l) => LANGS.includes(l));
  return first === 'de' ? 'de' : 'en';
}

async function loadStrings(l) {
  const res = await fetch(`i18n/${l}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`i18n/${l}.json: ${res.status}`);
  return res.json();
}

export function getLang() { return lang; }

/** Sprache laden und anwenden. Fehlt die Datei (z. B. offline ohne Cache), bleibt die alte Sprache. */
export async function setLang(l) {
  if (!LANGS.includes(l)) l = 'de';
  try { strings = await loadStrings(l); lang = l; }
  catch (e) { console.warn('[i18n]', e); if (!Object.keys(strings).length) { strings = await loadStrings('de').catch(() => ({})); lang = 'de'; } }
  document.documentElement.lang = lang;
  translate();
  listeners.forEach((fn) => { try { fn(lang); } catch (e) { console.error(e); } });
  return lang;
}
export function onLang(fn) { listeners.push(fn); }

const nf = {};
/** Zahl in der aktuellen Sprache, z. B. 1,4 (de) und 1.4 (en) */
export function fmtNum(n, opts) {
  const k = lang + JSON.stringify(opts || {});
  return (nf[k] ||= new Intl.NumberFormat(lang, opts)).format(n);
}
/** Aufzählung in der aktuellen Sprache: „A, B und C“ / “A, B and C” */
export function fmtList(items) {
  try { return new Intl.ListFormat(lang, { type: 'conjunction' }).format(items); } catch { return items.join(', '); }
}

/** Text holen, {platzhalter} werden ersetzt (Zahlen in der Landesschreibweise). Fehlt ein Schlüssel, kommt der Schlüssel zurück. */
export function t(key, vars = {}) {
  let s = strings[key];
  if (s == null) { console.warn(`[i18n] fehlender Text: ${key} (${lang})`); s = key; }
  return String(s).replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    if (v == null) return `{${k}}`;
    return typeof v === 'number' ? fmtNum(v) : v;
  });
}
/** Mehrzahl: nutzt "<key>.one" / "<key>.other" (Intl.PluralRules), {n} ist die Zahl */
export function tp(key, n, vars = {}) {
  const cat = new Intl.PluralRules(lang).select(n);
  const k = strings[`${key}.${cat}`] != null ? `${key}.${cat}` : `${key}.other`;
  return t(k, { n, ...vars });
}

const $$ = (s, root) => [...root.querySelectorAll(s)];
/** Übersetzt [data-i18n], [data-i18n-html], [data-i18n-aria], [data-i18n-title], [data-i18n-placeholder] */
export function translate(root = document) {
  $$('[data-i18n]', root).forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$('[data-i18n-html]', root).forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  $$('[data-i18n-aria]', root).forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  $$('[data-i18n-title]', root).forEach((el) => el.setAttribute('title', t(el.dataset.i18nTitle)));
  $$('[data-i18n-placeholder]', root).forEach((el) => el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)));
  if (strings['meta.title']) document.title = strings['meta.title'];
  const desc = document.querySelector('meta[name="description"]');
  if (desc && strings['meta.description']) desc.setAttribute('content', strings['meta.description']);
}
