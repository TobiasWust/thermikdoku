// Texte über das Kit (Kit.t, Kit.translate). Hier nur, was das Kit nicht mitbringt:
// Zahlen in der Landesschreibweise, Mehrzahl über "<key>.one" / "<key>.other" und Aufzählungen.
import Kit from '../kit/kit.js';

export const getLang = () => Kit.lang;
export const translate = (root) => Kit.translate(root);
export const onLang = (fn) => Kit.on('lang', fn);

const nf = {};
/** Zahl in der aktuellen Sprache, z. B. 1,4 (de) und 1.4 (en) */
export function fmtNum(n, opts) {
  const k = Kit.lang + JSON.stringify(opts || {});
  return (nf[k] ||= new Intl.NumberFormat(Kit.lang, opts)).format(n);
}
/** Aufzählung in der aktuellen Sprache: „A, B und C“ / “A, B and C” */
export function fmtList(items) {
  try { return new Intl.ListFormat(Kit.lang, { type: 'conjunction' }).format(items); } catch { return items.join(', '); }
}

/** Text holen, {platzhalter} werden ersetzt (Zahlen in der Landesschreibweise) */
export function t(key, vars = {}) {
  const v = {};
  for (const [k, x] of Object.entries(vars)) v[k] = typeof x === 'number' ? fmtNum(x) : x;
  return Kit.t(key, v);
}
/** Mehrzahl: nutzt "<key>.one" / "<key>.other" (Intl.PluralRules), {n} ist die Zahl */
export function tp(key, n, vars = {}) {
  const cat = new Intl.PluralRules(Kit.lang).select(n);
  const k = Kit.strings[`${key}.${cat}`] != null ? `${key}.${cat}` : `${key}.other`;
  return t(k, { n, ...vars });
}
