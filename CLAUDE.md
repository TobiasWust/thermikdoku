<!-- Von der Games Factory gepflegt, wird beim Kit-Update überschrieben -->
# Regeln für Spiele aus der Games Factory

Diese Regeln gelten für jedes Spiel. Die Factory prüft sie nach jeder Änderung automatisch (`node /Users/wust/Documents/dev/vibecode/games-factory/app/cli-check.js .`). Ein Spiel ist erst fertig, wenn der Check grün ist. Führe ihn selbst aus, bevor du fertig meldest, und behebe alle Fehler.

## Technik

- **Statisches HTML, CSS und Vanilla-JavaScript (ES-Module), kein Build-Schritt, keine CDNs.** Alles liegt im Spielordner, damit das Spiel offline läuft. npm-Pakete und Phaser nur als Ausnahme mit Rückfrage (siehe „Ausnahme: npm-Pakete und Phaser“).
- Einstieg ist `index.html`, Spiellogik in `js/`, Stil in `css/style.css`, Texte in `i18n/<sprache>.json`.
- Nur relative Pfade (`css/style.css`, nicht `/css/style.css`): Die Factory zeigt Spiele unter einem Unterpfad an.
- **Der Ordner `kit/` ist tabu.** Er wird bei Kit-Updates überschrieben. Nutze seine API (siehe `kit/README.md`), statt Footer, Einstellungen, Rechtliches, Audio-Lautstärke oder Speicher selbst zu bauen.
- `sw.js` bindet nur `kit/sw-core.js` ein. Größere Dateien (Bilder, Worker) in `self.PRECACHE` eintragen.
- `game.json` beschreibt das Spiel für die Factory. Halte `name`, `description` (1–2 Sätze, Deutsch) und `tags` (3–6 kurze Schlagworte, Deutsch, klein) aktuell. Gibt es `en` (`{ "description", "tags" }`, die englische Fassung für games.wust.dev), ändere sie inhaltlich gleich mit. `slug`, `kitVersion`, `deploy`, `categories` und `createdAt` nicht ändern.
- Jedes Spiel ist als App installierbar (PWA, wie Thermikdoku). `manifest.webmanifest` mit Name, Kurzname, Beschreibung, Farben (`background_color`, `theme_color`) und `display: standalone`, passend zum Spiel.
- Das Icon zeichnest du nur als `icons/icon.svg` (quadratisch, kräftig, erkennbar auch klein, Motiv nicht bis an den Rand). Die PNG-Icons (`icon-64`, `icon-180` für iOS, `icon-192`, `icon-512`, `icon-maskable-512`) erzeugt Karakuri vor jedem Check daraus, ebenso die Einträge in Manifest und `index.html`. Diese PNGs nicht von Hand ändern oder löschen. Hat das Spiel gemalte KI-Grafik, passt ein gezeichnetes SVG-Icon oft nicht dazu: Dann erzeuge `icons/icon-source.png` mit dem Bild-Generator (er hat dafür ein eigenes Preset für App-Icons; immer im Stil des Spiels; das Motiv ist frei: was der Nutzer sich wünscht, sonst was das Spiel auf einen Blick erkennbar macht, nicht zwingend die Hauptfigur); Karakuri baut die PNGs dann daraus, `icon.svg` bleibt als Rückfall.
- **Schrift:** Ohne eigene Schrift nutzt das Spiel die Systemschrift des Geräts, die auf iPhone und Android verschieden aussieht. Hat das Spiel einen eigenen Look (gemalte Grafik, ein klares Thema), bekommt es eine passende Schrift als Datei: mit dem Schrift-Werkzeug des Bild-Generators aussuchen und einbauen (kostenlos, nur offene Lizenzen), sonst eine frei lizenzierte `.woff2` samt Lizenztext nach `assets/fonts/` legen. Schriften ungeklärter Herkunft oder mit „free for personal use“ kommen nicht ins Spiel; der Check verlangt den Lizenztext neben jeder Schriftdatei. Nie von fremden Servern laden. Die `@font-face`-Regeln kommen in `css/style.css` (Pfad von dort: `../assets/fonts/…`), die Schrift wird über `--kit-font` in `:root` gesetzt, dann nutzen sie auch die Kit-Dialoge. Eine Schmuckschrift nur für den Titel bekommt eine eigene Variable und bleibt aus Fließtext und Zahlen heraus. Die Dateien in `self.PRECACHE` eintragen. Text auf dem Canvas nimmt die Schrift erst, wenn sie geladen ist: vor dem ersten Zeichnen `await document.fonts.load('700 16px "Name"')`.
- Speicher nur über `Kit.store`, nie direkt `localStorage`.
- Keine Fehler oder Warnungen in der Konsole. Keine Endlosschleifen ohne `requestAnimationFrame`.

## Ausnahme: npm-Pakete und Phaser

Standard ist Vanilla-JavaScript ohne fremde Bibliotheken. Das reicht für Rätsel-, Karten-, Brett- und Logikspiele und schont den Akku am besten.

**Nur nach Rückfrage.** Ein npm-Paket darf nur hinein, wenn der Spieler vorher zugestimmt hat. Frag mit AskUserQuestion, bevor du etwas installierst: welches Paket, wofür, wie groß, und was die Alternative ohne Paket wäre. Sind Rückfragen aus (volle Automatik), gibt es kein npm: Bau es ohne Paket. Ein „Nein“ gilt für das ganze Spiel, frag nicht erneut.

**Wann es sich lohnt:** Nur wenn das Paket viel eigenen Code erspart, den man sonst schlechter selbst schreibt. Vor allem **Phaser** (Version 3) für actionlastige Spiele mit Physik, Kollisionen, vielen Sprites, Tilemaps oder Kamerafahrten (Plattformer, Shooter, Arcade-Runner). Nicht für Spiele, die mit DOM oder einem Canvas gut auskommen.

**Wie es eingebunden wird:**

- Mit `npm install --save-exact <paket>` installieren, damit `package.json` die genaue Version festhält. `node_modules/` wird nicht eingecheckt und nicht veröffentlicht.
- Kein Build-Schritt: Die fertige, minifizierte Datei aus `node_modules/` nach `vendor/` im Spielordner kopieren (z.B. `vendor/phaser.min.js`) und von dort relativ laden. In `self.PRECACHE` in `sw.js` eintragen, damit das Spiel offline läuft.
- Das Paket kommt nicht an `kit/` vorbei: Speicher, Ton, Musik, Einstellungen, Sprachen, Pause und Vibration laufen weiter über das Kit.
- Lizenz muss freie Nutzung erlauben (MIT, BSD, Apache o.ä.). Im README nennen, welches Paket in welcher Version wofür genutzt wird.

**Regeln für Phaser:**

- Ton nur über `Kit.audio`: Phaser-Sound abschalten (`audio: { noAudio: true }`), keine Phaser-Musik.
- Menüs, Startbildschirm, Dialoge, Footer und Zahnrad bleiben HTML mit `data-i18n`. Phaser zeichnet nur das Spielfeld. Texte im Canvas über `Kit.t()` und bei `Kit.on('lang')` neu setzen.
- **Akku:** Phaser rendert sonst ununterbrochen. Bei `Kit.on('pause')`, `visibilitychange`, im Menü und auf dem Ergebnisbildschirm `game.loop.sleep()` aufrufen, beim Weiterspielen `game.loop.wake()`. Läuft nur der Startbildschirm, gibt es noch kein Phaser-Spiel oder es schläft.
- `resolution` bzw. Pixeldichte auf höchstens 2 begrenzen, mit „Akku schonen“ auf 1 und `fps: { target: 30 }`.
- Objekte über Gruppen mit `maxSize` wiederverwenden statt pro Treffer neu anlegen. Physik nur so viel wie nötig (Arcade statt Matter, wenn es reicht).
- Größe und Skalierung über `scale: { mode: Phaser.Scale.FIT }` bzw. `RESIZE`, Safe-Areas weiter im HTML-Rahmen beachten.

## Pflichtbausteine (liefert das Kit)

- `Kit.init({...})` als Erstes in `js/game.js`, mit `id` = Slug aus `game.json` und `name`.
- Footer: `<footer data-kit-footer></footer>` auf dem Startbildschirm sichtbar.
- Zahnrad: ein Button mit `data-kit="settings"` auf dem Start- **und** Spielbildschirm gut erreichbar (oben rechts).
- Einstellungen enthalten automatisch: Sprache, Musik, Effekte, Vibration, Farbenblind-Modus und Animationen reduzieren (nur wo sinnvoll, siehe unten), Installieren, Fortschritt löschen, Footer-Links. Spielspezifische Schalter über `extraSettings`.
- Öffnet sich ein Kit-Dialog, sendet das Kit `pause`: Das Spiel pausiert (Timer, Gegner, Musik-Effekte).

## Sprachen

- Jedes Spiel gibt es in den **zwanzig Kit-Sprachen**: Englisch, Deutsch, Spanisch, Französisch, Portugiesisch (Brasilien), Italienisch, Japanisch, Koreanisch, Türkisch, Indonesisch, Russisch, Polnisch, Niederländisch, Chinesisch in Langzeichen (`zh`, Taiwan/Hongkong), Vietnamesisch, Thai, Arabisch, Hindi, Ukrainisch, Schwedisch (`en de es fr pt it ja ko tr id ru pl nl zh vi th ar hi uk sv`), je eine Datei `i18n/<code>.json`. `Kit.init` ohne `languages` nimmt alle zwanzig; `game.json` führt sie unter `languages`.
- Das Kit wählt die Sprache selbst nach dem Browser, Englisch ist der Rückfall. Wählt jemand in den Einstellungen eine Sprache, bleibt sie.
- **Kein sichtbarer Text im HTML oder JS fest verdrahtet.** Alles über `data-i18n` oder `Kit.t()`. Alle Sprachdateien haben exakt dieselben Schlüssel.
- **Neue oder geänderte Texte in allen zwanzig Sprachdateien** eintragen, gleich mit übersetzt (natürlich und kurz, wie ein Muttersprachler es auf einem Handy-Knopf schreiben würde; Platzhalter wie `{n}` und HTML bleiben). Englisch ist die Vorlage für alle anderen.
- `meta.title` und `meta.description` in jeder Sprache.
- Bei `Kit.on('lang')` alles Dynamische neu beschriften (Canvas-Texte, Buttons, Ergebnisse).
- Platz für längere Wörter (Deutsch, Französisch, Türkisch) und andere Schriften (Japanisch, Koreanisch, Chinesisch, Thai, Hindi, Arabisch, Kyrillisch): Knöpfe und Schilder wachsen mit oder brechen um, nichts läuft über. Das Layout bleibt auch auf Arabisch links nach rechts. Eine eigene Schrift ohne diese Zeichen ist in Ordnung, wenn die `font-family` mit `system-ui, sans-serif` endet (dann springt die Systemschrift ein); Canvas-Texte genauso.
- Beschriftungen von `extraSettings` haben `label: { de, en }`; für die übrigen Sprachen die Schlüssel `extra.<key>` (und `extra.<key>.hint`) in die Sprachdateien.
- Deutsch: natürlich, du-Form, keine Anglizismen, wo es ein gutes deutsches Wort gibt. Englisch: britische Schreibweise.

## Showcase (Bilder und Videos)

`tools/showcase.js` zeigt das Spiel von seiner besten Seite: Daraus nimmt Karakuri die Store-Screenshots, die Bilder auf games.wust.dev und Gameplay-Videos für TikTok, Reels und Shorts auf. Den Vertrag beschreibt `/Users/wust/Documents/dev/vibecode/games-factory/app/lib/showcase.js`; ausprobieren mit `node /Users/wust/Documents/dev/vibecode/games-factory/app/cli-showcase.js .`.

- Gibt es die Datei, halte sie aktuell: Ändern sich Leveldaten, Steuerung, Testzugang oder Bildschirme, passe `list()` und `play()` mit an und probiere sie aus.
- Ein Testzugang für den Showcase (z.B. `window.XY = {…}` nur bei `location.hash === '#debug'`) bleibt erhalten.

## Animation und Gefühl (wichtig!)

Spiele sollen **sehr lebendig** sein. Jede Aktion bekommt sichtbares und hörbares Feedback.

- Idle-Animationen auf dem Startbildschirm (schwebende Elemente, animierter Titel, Hintergrund in Bewegung).
- Übergänge zwischen Bildschirmen, Einblenden von Dialogen, Punkte zählen hoch.
- Treffer, Combos, Erfolge: Partikel, Squash & Stretch, kurzer Screenshake, Farbblitze, Konfetti beim Sieg.
- Easing mit Charakter (Overshoot, Bounce) statt linear. 60 fps, `requestAnimationFrame`, `transform`/`opacity` statt Layout-Eigenschaften.
- Sound zu jeder Interaktion über `Kit.audio`. Hintergrundmusik passend zur Stimmung (`music` in `Kit.init` oder eigene Musik am `musicBus`).
- **Eigener Klang statt Standard:** Die fertigen `Kit.audio.sfx.*` sind nur Notlösung. Jedes Spiel bekommt eigene Effekte, die zu Thema und Material passen (Holz klackert, Magie glitzert, Metall klingt nach). Lege sie in `Kit.init({ sounds })` an, mit `Kit.audio.preset(art, seed)` als Ausgangspunkt und dann angepasst. Häufige Klänge bekommen `vary`, damit sie nicht eintönig werden. Ruft der Code `Kit.audio.sfx.click()`, `pop()`, `good()` usw. auf, ersetze diese unter ihrem Namen in `sounds` (Kit 1.9), statt die Aufrufe umzuschreiben; so bleiben sie im Sound-Tab der Factory einzeln einstellbar. Effekte spielt das Kit live aus diesen Parametern: Erzeuge dafür keine Sounddateien, außer ein Klang muss ausdrücklich eine Datei sein.
- **Musikdateien** (echte Aufnahmen, z.B. vom Musik-Werkzeug des Bild-Generators) sind für ein Titelthema oder große Momente da. Im Spiel bleibt normalerweise die Kit-Musik, weil sie aufs Geschehen reagiert. Abspielen mit `Kit.audio.music.track('assets/music/<name>.m4a')` (blendet über), zurück zur Kit-Musik mit `track(null)`; die Datei in `self.PRECACHE` eintragen.
- **Musikdateien endlos?** Läuft eine Musikdatei (z.B. von Lyria) in einem Level oder Menü länger, als sie dauert, hört man den Übergang. Hältst du nahtlose Wiederholung dort für sinnvoll, frag nach (wenn Rückfragen erlaubt sind), ob sie nahtlos laufen soll; dann lass sie vom Musik-Werkzeug des Bild-Generators nahtlos machen (für vorhandene Dateien kostenlos) und übernimm die Werte aus `assets/music/<name>.json` als `{ loopStart, loopEnd }` in `Kit.audio.music.track()` (Kit 1.7). Ein Titelthema, das einmal durchläuft, braucht das nicht.
- **Musik mit Absicht:** Wähle `mood`, `scale`, `bpm` und Instrumente bewusst passend zum Spiel, oder komponiere einen eigenen Song (`tracks`, `patterns`, `sections`, siehe `kit/README.md`). Kopple die Musik ans Geschehen: `Kit.audio.music.intensity()` ruhig auf dem Startbildschirm, voller im Spiel, `section()` für Bosse, Endspurt oder Menüs, `Kit.audio.duck()` bei großen Momenten.
- Vibration bei wichtigen Momenten über `Kit.vibrate()`.
- **Gemalte Animationen** (Streifen + JSON, z.B. vom Bild-Generator) immer mit `Kit.sprite` abspielen, nicht selbst Frames rechnen: eine Übersicht pro Figur (`assets/anim/<figur>.json`), `play()` für Bewegungswechsel, `seek()` für Bewegungen nach Fortschritt (Sprung), `draw()` am Fußpunkt.

**Animationen reduzieren:** Nur anbieten, wenn das Spiel spürbare Bewegung hat (Wackeln, Kamerafahrten, Parallax, Partikel, schnelles Blinken). Sonst `Kit.init({ reduceMotion: false })`, dann entfällt der Schalter. Wird er angeboten, muss er sichtbar etwas ändern. Ist `Kit.reducedMotion` aktiv, entfallen Screenshake, Kamerafahrten, Parallax, blinkende und schnelle Bewegungen. Partikelzahl mit `Kit.motion` skalieren. Das Spiel bleibt voll spielbar, Zustandswechsel sind weiter erkennbar (z.B. Einblenden statt Fliegen). CSS-Animationen stoppt das Kit automatisch; nötige Bewegung mit `.kit-keep-motion` ausnehmen. Reagiere live auf `Kit.on('settings')`.

## Farbenblind-Modus

- Nur anbieten, wenn Farbe im Spiel Information trägt (Farben zuordnen, Teams, Zustände). Trägt Farbe nichts (z.B. einfarbiger Stil, Unterschiede über Form oder Länge), `Kit.init({ colorblind: false })`, dann entfällt der Schalter. Wird er angeboten, muss er sichtbar etwas ändern.
- **Keine Information nur über Farbe.** Ist `Kit.colorblind` aktiv, bekommt jede spielrelevante Farbe zusätzlich Symbol (`Kit.symbol(i)`), Muster (`.kit-pattern-N`) oder Form.
- Spielfarben über `Kit.color(i, eigenePalette)` holen: Im Farbenblind-Modus kommt automatisch die sichere Okabe-Ito-Palette.
- Text und wichtige Elemente mit ausreichend Kontrast (mind. 4.5:1 für Text).
- Live auf `Kit.on('settings')` reagieren und neu zeichnen.

## Bedienung und Layout

- **Handy zuerst** (Hochformat 360–430 px breit), funktioniert aber auch am Desktop. Kein horizontales Scrollen, Safe-Areas beachten (`env(safe-area-inset-*)`).
- Touch, Maus und Tastatur. Tippflächen mindestens 44×44 px. Keine Abhängigkeit von Hover.
- Klare Regeln: Ein kurzes „So geht's“ beim ersten Start oder über einen Hilfe-Button.
- Fortschritt (Highscore, Level, Sterne) wird gespeichert und ist sichtbar.
- Startbildschirm mit Titel, Spielen-Button, Zahnrad und Footer.
- Keine Konten, keine externen Requests außer GoatCounter (vom Kit). Keine eigene Werbung und keine eigenen Spenden- oder Kauf-Links: Beides regelt das Kit (in der Play-Store-App blendet es Ko-fi aus).
- **Werbepausen:** An natürlichen Pausen `await Kit.ads.break('name')` aufrufen, z.B. nach einem geschafften Level vor dem nächsten oder nach Game Over vor dem Neustart. Nie beim Start, nie mitten im Spiel, nie direkt nach einem Tipp, der etwas anderes auslösen soll. Auf der Website passiert dabei nichts, in der App nur, wenn Werbung eingeschaltet ist; das Kit hält Abstände ein und pausiert Ton und Spiel (`Kit.on('pause')`).

## Leistung und Akku

Die Spiele laufen vor allem auf Handys. Der Code soll schlank und optimiert sein und den Akku schonen, ohne dass das Spiel an Lebendigkeit verliert.

- **Nur rendern, wenn sich etwas bewegt.** Steht alles still (Menü ohne Animation, wartendes Rätsel, Pause), läuft keine `requestAnimationFrame`-Schleife weiter. Bei Eingabe oder Zustandswechsel wieder anstoßen.
- Bei `Kit.on('pause')` und wenn der Tab unsichtbar wird (`visibilitychange`) Schleife, Timer, Intervalle und Musik anhalten.
- Kein Arbeiten im Leerlauf: kein `setInterval` zum Abfragen, keine Dauer-Timer für Dinge, die ein Ereignis melden kann.
- Pro Frame keine neuen Objekte, Arrays oder Strings anlegen, wo es sich vermeiden lässt (Partikel und Gegner aus einem Pool wiederverwenden). Das spart Garbage Collection und Ruckler.
- Canvas: Statisches (Hintergrund, Spielfeld) einmal in einen Offscreen-Canvas zeichnen und nur noch kopieren. `devicePixelRatio` auf höchstens 2 begrenzen. Teure Effekte (`shadowBlur`, `filter`, große Verläufe) sparsam und nicht pro Objekt und Frame.
- Partikelzahl begrenzen und mit `Kit.motion` skalieren. CSS-Animationen nur auf `transform` und `opacity`, keine Dauer-Animationen von `box-shadow`, `filter` oder `backdrop-filter`.
- Bilder in passender Größe und als WebP, Audio kurz halten. Nichts nachladen, was nicht gebraucht wird.

**Akku-Schalter:** Bei aufwändigen Spielen (viele Partikel, Shader-artige Effekte, große Canvas-Szenen, 3D) bekommt das Menü über `extraSettings` einen Schalter „Akku schonen“ (aus = volle Qualität). Nur anbieten, wenn das Spiel davon spürbar profitiert und es sich sinnvoll umsetzen lässt; bei schlichten Spielen entfällt er. Wird er angeboten, muss er sichtbar etwas ändern, zum Beispiel weniger Partikel, `devicePixelRatio` auf 1, 30 statt 60 fps, keine teuren Effekte. Das Spiel bleibt voll spielbar. Die Wahl wird gespeichert, und das Spiel reagiert live auf `Kit.on('settings')`.

## Qualität

- Das Spiel macht nach 10 Sekunden Spaß. Schwierigkeit steigt sanft.
- Kein Text, der überläuft oder abgeschnitten wird – in allen Sprachen (der Check schaltet sie durch).
- Code lesbar, kommentiert auf Deutsch, in sinnvolle Module aufgeteilt.
- README.md: Was ist das Spiel, Regeln, Steuerung, lokal starten.
