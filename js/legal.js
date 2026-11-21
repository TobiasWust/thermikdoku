// Datenschutz und Impressum, zweisprachig. Übernommen aus kit/legal.js (games-factory),
// mit kleinen Anpassungen für Thermikdoku (Rätselspiel, Statistik, Abschnittsverweise).
const MAIL = 'kontakt@tobiaswust.de';
const mail = `<a href="mailto:${MAIL}">${MAIL}</a>`;
const STAND = { de: 'November 2026', en: 'November 2026' };

export function legalHtml(lang, name, counter) {
  const de = lang === 'de';
  const n = escapeHtml(name);
  const sec = [];
  if (de) {
    sec.push(['Verantwortlicher', `<p>Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p><p>Tobias Wust<br>E-Mail: ${mail}</p>`]);
    sec.push(['Überblick', `<p>${n} ist ein Rätselspiel, das komplett in deinem Browser läuft. Es gibt <strong>keine Konten, keine Cookies, keine Werbung und kein Tracking</strong>. Beteiligt ${counter ? 'sind nur zwei externe Dienste' : 'ist nur ein externer Dienst'}:</p><ul><li><strong>Netlify</strong> stellt die Dateien des Spiels bereit (Abschnitt 4).</li>${counter ? '<li><strong>GoatCounter</strong> zählt Aufrufe anonym und ohne Cookies (Abschnitt 5).</li>' : ''}</ul><p>Der Link „Kaffee spendieren“ führt zu <strong>Ko-fi</strong> (ko-fi.com). Es wird nichts von Ko-fi in diese Seite geladen. Daten verarbeitet Ko-fi erst, wenn du den Link öffnest. Dann gilt die Datenschutzerklärung von Ko-fi.</p>`]);
    sec.push(['Daten auf deinem Gerät', `<p>Spielstand, Statistik, Punkte und Einstellungen werden im lokalen Speicher deines Browsers (Local Storage) abgelegt. Damit das Spiel auch offline funktioniert, speichert ein Service Worker die App-Dateien im Browser-Cache.</p><ul><li>Diese Daten verlassen dein Gerät nie und sind für uns nicht einsehbar.</li><li>Du kannst sie jederzeit löschen: über „Fortschritt löschen“ in den Einstellungen oder indem du die Website-Daten in deinem Browser entfernst.</li></ul><p>Die Speicherung ist technisch erforderlich, um das von dir genutzte Spiel bereitzustellen (Art. 6 Abs. 1 lit. b DSGVO, § 25 Abs. 2 TDDDG).</p>`]);
    sec.push(['Hosting und Server-Logs (Netlify)', `<p>Diese Website wird von <strong>Netlify, Inc.</strong> gehostet. Beim Aufruf verarbeitet Netlify automatisch technische Daten, die zur Auslieferung nötig sind, etwa IP-Adresse, Browsertyp und -version, Datum und Uhrzeit der Anfrage, die angefragte Datei und die übertragene Datenmenge. Wir nutzen diese Daten nicht für Tracking oder Analysen.</p><p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO – unser berechtigtes Interesse an einer sicheren und funktionierenden Website.</p><p>Netlify ist unser Auftragsverarbeiter auf Grundlage eines Auftragsverarbeitungsvertrags. Soweit Daten außerhalb der EU/des EWR verarbeitet werden, ist dies durch Standardvertragsklauseln abgesichert.</p>`]);
    if (counter) sec.push(['Anonyme Besucherzählung (GoatCounter)', `<p>Um ungefähr zu wissen, wie viele Menschen ${n} spielen, werden Aufrufe mit GoatCounter (goatcounter.com) gezählt. GoatCounter setzt keine Cookies und speichert keine personenbezogenen Daten: Erfasst werden die aufgerufene Seite, die verweisende Seite, Browser, Bildschirmgröße und das Land, das aus der Anfrage abgeleitet wird. Die IP-Adresse wird nicht gespeichert. Ebenso anonym wird gezählt, wie oft der Link „Kaffee spendieren“ angeklickt wird, damit wir sehen, welches Spiel zu Spenden führt. Spielstände und Eingaben werden nie übertragen.</p><p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO – unser berechtigtes Interesse daran, in zusammengefasster Form zu verstehen, wie viel das Spiel genutzt wird.</p>`]);
    sec.push(['Speicherdauer', `<ul><li>Daten auf deinem Gerät bleiben dort, bis du sie löschst.</li><li>Server-Logs werden von Netlify nur so lange gespeichert, wie es technisch nötig ist.</li></ul>`]);
    sec.push(['Deine Rechte', `<p>Nach der DSGVO hast du das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21).</p><p>Wende dich dafür an ${mail}. Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.</p>`]);
    sec.push(['Änderungen', `<p>Wir passen diese Erklärung an, wenn sich das Spiel oder die rechtlichen Anforderungen ändern. Es gilt die jeweils aktuelle Fassung.</p>`]);
    return {
      privacy: `<h2>Datenschutz</h2><p class="legal-meta">${n} · Stand: ${STAND.de}</p>${sections(sec)}`,
      imprint: `<h2>Impressum</h2><p class="legal-meta">Angaben gemäß § 5 DDG</p>
        <section><h3>Kontakt</h3><p>Tobias Wust<br>Vor den Kämpen 20<br>30851 Langenhagen<br>Deutschland</p><p>E-Mail: ${mail}</p></section>
        <section><h3>Verantwortlich für den Inhalt</h3><p>Tobias Wust (Anschrift wie oben)</p></section>
        <section><h3>Über dieses Projekt</h3><p>${n} ist ein privates, nicht-kommerzielles Projekt. Wie mit Daten umgegangen wird, steht in der <strong>Datenschutzerklärung</strong>.</p></section>`,
    };
  }
  sec.push(['Controller', `<p>Responsible for data processing on this website within the meaning of the General Data Protection Regulation (GDPR):</p><p>Tobias Wust<br>Email: ${mail}</p>`]);
  sec.push(['Overview', `<p>${n} is a puzzle game that runs entirely in your browser. There are <strong>no accounts, no cookies, no ads and no tracking</strong>. Only ${counter ? 'two external services are' : 'one external service is'} involved:</p><ul><li><strong>Netlify</strong> delivers the game's files (section 4).</li>${counter ? '<li><strong>GoatCounter</strong> counts visits anonymously and without cookies (section 5).</li>' : ''}</ul><p>The link “Buy me a coffee” leads to <strong>Ko-fi</strong> (ko-fi.com). Nothing from Ko-fi is loaded into this page. Ko-fi only processes data once you open the link; Ko-fi's own privacy policy then applies.</p>`]);
  sec.push(['Data on your device', `<p>Your progress, statistics, points and settings are stored in your browser's local storage. So that the game also works offline, a service worker keeps the app files in the browser cache.</p><ul><li>This data never leaves your device and is not visible to us.</li><li>You can delete it at any time: via “Delete progress” in the settings, or by removing the website data in your browser.</li></ul><p>This storage is technically necessary to provide the game you are using (Art. 6(1)(b) GDPR, § 25(2) TDDDG).</p>`]);
  sec.push(['Hosting and server logs (Netlify)', `<p>This website is hosted by <strong>Netlify, Inc.</strong> When you open it, Netlify automatically processes technical data needed for delivery, such as IP address, browser type and version, date and time of the request, the requested file and the amount of data transferred. We do not use this data for tracking or analysis.</p><p><strong>Legal basis:</strong> Art. 6(1)(f) GDPR – our legitimate interest in a secure, working website.</p><p>Netlify acts as our processor under a data processing agreement. Where data is processed outside the EU/EEA, this is safeguarded by standard contractual clauses.</p>`]);
  if (counter) sec.push(['Anonymous visitor counting (GoatCounter)', `<p>To know roughly how many people play ${n}, visits are counted with GoatCounter (goatcounter.com). GoatCounter sets no cookies and stores no personal data: it records the page opened, the referring page, browser, screen size and the country derived from the request. The IP address is not stored. Clicks on the “Buy me a coffee” link are counted just as anonymously, so we can see which game leads to donations. Your progress and your moves are never transmitted.</p><p><strong>Legal basis:</strong> Art. 6(1)(f) GDPR – our legitimate interest in understanding, in aggregated form, how much the game is used.</p>`]);
  sec.push(['Storage period', `<ul><li>Data on your device stays there until you delete it.</li><li>Server logs are kept by Netlify only for as long as technically necessary.</li></ul>`]);
  sec.push(['Your rights', `<p>Under the GDPR you have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and the right to object to processing based on legitimate interests (Art. 21).</p><p>To exercise them, write to ${mail}. You also have the right to lodge a complaint with a data protection supervisory authority.</p>`]);
  sec.push(['Changes', `<p>We update this notice when the game or the legal requirements change. The current version always applies.</p>`]);
  return {
    privacy: `<h2>Privacy</h2><p class="legal-meta">${n} · Last updated: ${STAND.en}</p>${sections(sec)}`,
    imprint: `<h2>Legal notice</h2><p class="legal-meta">Impressum · Information according to § 5 DDG</p>
      <section><h3>Contact</h3><p>Tobias Wust<br>Vor den Kämpen 20<br>30851 Langenhagen<br>Germany</p><p>Email: ${mail}</p></section>
      <section><h3>Responsible for the content</h3><p>Tobias Wust (address as above)</p></section>
      <section><h3>About this project</h3><p>${n} is a private, non-commercial project. How data is handled is described in the <strong>privacy notice</strong>.</p></section>`,
  };
}

function sections(list) {
  return list.map(([h, body], i) => `<section><h3>${i + 1}. ${h}</h3>${body}</section>`).join('');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
