# Kit (nicht bearbeiten)

Gemeinsame Bausteine aller Spiele aus der Games Factory. Der Ordner wird bei einem Kit-Update komplett ersetzt. Spielspezifisches gehört in `js/`, `css/` und `i18n/`.

## Einbinden

```html
<link rel="stylesheet" href="kit/kit.css">
<link rel="stylesheet" href="css/style.css">
...
<button class="kit-gear" data-kit="settings" data-i18n-aria="kit.settings"></button>
...
<footer data-kit-footer></footer>
<script type="module" src="js/game.js"></script>
```

```js
import Kit from '../kit/kit.js';
await Kit.init({
  id: 'mein-spiel',            // Slug, trennt den Speicher von anderen Spielen
  name: 'Mein Spiel',
  languages: ['de', 'en'],     // je eine Datei i18n/<lang>.json
  // goatcounter: false,       // Standard: gemeinsamer Zähler karakurigames (Aufrufe unter /<id>/, Ko-fi-Klicks als kofi/<id>/…); false schaltet ab
  music: { bpm: 104, scale: 'pentatonic', root: 60, mood: 'happy' }, // oder ein Song, siehe Audio
  sounds: { jump: { wave: 'square', f: 320, f2: 760, d: 0.2 } },     // → Kit.audio.sfx.jump()
  extraSettings: [{ key: 'hints', label: { de: 'Tipps', en: 'Hints' }, default: true }],
  colorblind: true,            // false, wenn Farbe im Spiel nichts bedeutet: Schalter entfällt
  reduceMotion: true,          // false, wenn es kaum Bewegung gibt: Schalter entfällt
  onReset: () => { /* Spielstand neu laden */ },
});
```

## API

| Was | Wofür |
|---|---|
| `Kit.t(key, vars)` | Text in aktueller Sprache, `{name}` = Spielname |
| `data-i18n="key"` (auch `-html`, `-aria`, `-title`, `-placeholder`) | Automatisch übersetzte Elemente |
| `Kit.translate(root)` | Nach dynamisch erzeugtem HTML aufrufen |
| `Kit.on('lang', fn)` | Sprache gewechselt: dynamische Texte neu zeichnen |
| `Kit.on('settings', fn)` | Irgendeine Einstellung geändert (`{key, value}`) |
| `Kit.on('pause', paused => …)` | Dialog offen: Spiel pausieren |
| `Kit.on('reset', fn)` | Fortschritt wurde gelöscht |
| `Kit.store.get(k, def)` / `.set(k, v)` | localStorage mit Spiel-Präfix |
| `Kit.reducedMotion` / `Kit.motion` | `true`/`false` bzw. `1` oder `0.15`: Partikel, Wackeln, Kamerafahrten damit skalieren |
| `html.kit-reduce-motion` | CSS-Klasse bei reduzierten Animationen (CSS-Animationen stoppt das Kit automatisch; mit `.kit-keep-motion` ausnehmen) |
| `Kit.colorblind` / `html.kit-colorblind` | Farbenblind-Modus aktiv |
| `Kit.color(i, palette)` | Farbe i aus deiner Palette oder der farbenblind-sicheren Palette |
| `Kit.symbol(i)` | Symbol zur Farbe i: im Farbenblind-Modus zusätzlich zeichnen |
| `.kit-pattern-N`, `.kit-cb-only` | CSS-Muster / nur im Farbenblind-Modus sichtbar |
| `Kit.audio.sfx.click/toggle(on)/pop(p)/good/bad/whoosh/combo(n)/win/lose()` | Fertige Effekte |
| `Kit.audio.sfx.<name>(opts)` | Eigene Effekte aus `Kit.init({ sounds })` oder `Kit.audio.sfx.add({...})` |
| `Kit.audio.fx(params, {pitch, delay, vol, pan})` | Effekt aus Parametern spielen (siehe Audio) |
| `Kit.audio.preset(art, seed)` | Effekt-Parameter würfeln: `coin jump hit hurt laser explosion powerup blip select bounce whoosh thud` |
| `Kit.audio.play(inst, {note, dur, vel, delay, pan})` | Instrument spielen, `note` als `'C4'` oder MIDI-Zahl |
| `Kit.audio.instrument(name, def)` | Eigenes Instrument registrieren (auch `{ extends: 'pluck', … }`) |
| `Kit.audio.music.song(def)` / `.section(name)` / `.intensity(0–1)` / `.layer(spur, 0–1)` / `.tempo(bpm)` | Musik steuern (siehe Audio) |
| `Kit.audio.music.start/stop/configure({bpm,scale,root,mood,seed})` | Generierte Hintergrundmusik |
| `Kit.audio.music.track(url, {loop, fade, vol, loopStart, loopEnd})` | Musikdatei (z.B. Titelthema `assets/music/title.m4a`) statt Synth-Musik, mit Überblendung; mit `loopStart`/`loopEnd` nahtlose Schleife; `track(null)` zurück zum Synth |
| `Kit.audio.duck(menge, sek)` | Musik kurz leiser für große Momente |
| `Kit.audio.tone({f,f2,dur,type,vol,delay,verb})`, `Kit.audio.noise({...})` | Einfache Töne (laufen über den Effekt-Bus) |
| `Kit.audio.musicBus` / `sfxBus` | Eigene WebAudio-Knoten anschließen, Lautstärke regelt das Kit |
| `Kit.sprite.load(src)` | Gemalte Animationen einer Figur laden und abspielen (siehe Sprites) |
| `Kit.vibrate(ms)` | Vibration, respektiert die Einstellung |
| `Kit.toast(text, 'good'|'bad')` | Kurze Meldung |
| `Kit.openSettings()` | Einstellungen öffnen |

## Audio

Alles entsteht live mit WebAudio, ohne Dateien. Effekte und Musik laufen über eigene Busse, deren Lautstärke die Einstellungen regeln. Beide Busse haben Hall und Echo. Anhören lässt sich alles in der Factory unter **Klangprobe** (`/klangprobe.html`).

### Effekte

`Kit.audio.fx(params)` ist ein Effekt-Generator im Stil von sfxr. Alle Angaben sind optional:

| Parameter | Bedeutung |
|---|---|
| `wave` | `square`, `sine`, `triangle`, `sawtooth`, `pulse25`, `pulse12` (Chiptune), `noise` |
| `f`, `f2`, `slide` | Start- und Zielfrequenz in Hz, Verlauf `'exp'` (Standard) oder `'lin'` |
| `a`, `s`, `d` | Einschwingen, Halten, Abklingen in Sekunden |
| `punch` | 0–1, kurzer Lautstärke-Kick am Anfang |
| `arp` | `{ t, mult }` oder Liste davon: Tonhöhe springt nach `t` Sekunden um Faktor `mult` (Münzklang) |
| `vib` | `{ rate, depth }` Vibrato, `depth` in Halbtönen |
| `harm` | 0–1, zweiter Oszillator eine Oktave höher |
| `lp`, `hp`, `q` | Tiefpass/Hochpass `{ f, f2, q }` mit optionalem Verlauf; `q` für Rauschen |
| `drive`, `crush` | 0–1, Sättigung bzw. Bitcrusher |
| `repeat` | `{ n, every, step }` wiederholt den Klang, `step` in Halbtönen (Power-up) |
| `vary` | Zufällige Tonhöhe ± Halbtöne, damit Wiederholungen nicht gleich klingen |
| `vol`, `verb`, `echo`, `pan`, `duck` | Lautstärke (etwa 0,05–0,15), Hall, Echo, Panorama, Musik kurz leiser |

`Kit.audio.preset('coin', 42)` würfelt passende Parameter, gleicher Seed bedeutet gleicher Klang. Das ist ein guter Ausgangspunkt: Parameter übernehmen und anpassen. Eigene Effekte am besten in `Kit.init({ sounds: { name: params } })` sammeln und als `Kit.audio.sfx.name({ pitch })` abspielen. Ein Name eines fertigen Effekts (`click`, `pop`, `good`, `bad`, `whoosh`, `combo`, `win`, `lose`, `toggle`) ersetzt diesen im ganzen Spiel (Kit 1.9): `sounds: { click: { wave: 'noise', f: 2400, … } }` macht jedes `Kit.audio.sfx.click()` zum eigenen Klang. Die alten Argumente wirken weiter: `pop(pitch)` als Tonhöhe, `combo(n)` steigt mit n, `toggle(false)` klingt tiefer.

### Instrumente

`Kit.audio.play(name, { note: 'E5', dur: 0.2 })` spielt eine Note. Mitgeliefert sind melodische Instrumente (`pluck bell kalimba marimba epiano organ pad strings lead flute chip chipLead bass subBass chipBass`) und Drums (`kick snare clap hat openHat shaker tom block`). Eigene Instrumente: `Kit.audio.instrument('meinBass', { extends: 'bass', filter: { f: 400, env: 1200, d: 0.1, q: 8 } })`. Die Felder stehen oben in `audio.js`.

### Musik

**Generiert:** `music: { bpm, scale, root, mood, seed }` erzeugt ein Stück mit Akkordfolge, Bass, Flächen, wiederkehrendem Motiv und Drums. Mögliche Werte für `mood`: `happy calm tense epic dreamy chip`. Für `scale`: `major minor pentatonic minorPentatonic dorian lydian harmonicMinor`. Mit `seed` klingt es bei jedem Laden gleich.

**Komponiert:** Ein Song in `Kit.init({ music: song })` oder `Kit.audio.music.song(song)`:

```js
{
  bpm: 118, swing: 0.1,                    // swing 0–0.5
  tracks: {                                // Spuren: Instrument, Lautstärke, Hall, Echo, Panorama
    bass: { inst: 'bass' },
    lead: { inst: 'pluck', echo: 0.25, level: 0.5 },   // level: erst ab dieser Intensität hörbar
    pad:  { inst: 'pad', verb: 0.3 },
    kick: { inst: 'kick', level: 0.3 }, snare: { inst: 'snare', level: 0.3 }, hat: { inst: 'hat', level: 0.3 },
  },
  patterns: {                              // ein Takt = 16 Sechzehntel (länger geht auch)
    beat: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...xx' },
    A:    { bass: 'C2 - . C2 . . G1 - C2 - . C2 . . E2 .', lead: 'E5 . G5 . C6 - - . B5 . G5 . E5 - . .',
            pad:  'C4,E4,G4 - - - - - - - - - - - - - - -' },
  },
  sections: {                              // Takte, 'A+beat' = beide Muster gleichzeitig
    intro: { bars: ['A', 'A'], next: 'main' },
    main:  ['A+beat', 'B+beat'],           // Liste = Endlosschleife
  },
  start: 'intro',
}
```

Notation für melodische Spuren (mit Leerzeichen getrennt): `C4` Note, `F#3`/`Bb2` mit Vorzeichen, `C4,E4,G4` Akkord, `-` vorige Note halten, `.` Pause, `!` betont, `?` leise. Drum-Spuren haben ein Zeichen pro Schritt: `x` Schlag, `X` betont, `o` leise, `.` Pause.

**Musikdateien:** Für ein Titelthema oder große Momente kann statt der Synth-Musik eine echte Aufnahme laufen (z.B. von imagegen `create_music`, als `.m4a`, das spielt auch Safari). `Kit.audio.music.track('assets/music/title.m4a')` blendet über, die Synth-Musik pausiert solange (spart Akku); `Kit.audio.music.track(null)` blendet zurück. Lautstärke-Einstellung und `duck()` gelten auch für die Datei. Die Datei in `self.PRECACHE` in `sw.js` eintragen. Soll ein Stück endlos laufen, ohne dass man den Übergang hört: von assetgen nahtlos machen lassen (`create_music` mit `loop`, oder `loop_music` für eine vorhandene Datei); die Schleifenpunkte stehen dann in `assets/music/<name>.json` und kommen als `{ loopStart, loopEnd }` in `track()`, der Teil davor läuft einmal als Intro. Im Spiel selbst bleibt meist die Synth-Musik, weil sie auf `section()` und `intensity()` reagiert.

Steuerung im Spiel:
- `music.section('boss')` wechselt am Taktende, `music.current` ist der aktuelle Abschnitt.
- `music.intensity(0–1)` blendet Spuren nach ihrem `level` ein und aus. Beim generierten Stück kommt die Kick ab 0.25, die übrigen Drums ab 0.4, die Melodie ab 0.5 und das Arpeggio ab 0.8 dazu. Gut für ruhigen Startbildschirm und mehr Druck im Spiel.
- `music.layer('lead', 0)` blendet eine Spur gezielt aus. `music.tempo(140)` ändert das Tempo.

## Sprites

Gemalte Animationen (zum Beispiel vom Bild-Generator imagegen) sind Streifen: gleich große Frames waagerecht nebeneinander in `<name>.webp`, dazu `<name>.json` mit `frames`, `frameWidth`, `frameHeight`, `fps` und dem Fußpunkt `anchorX`/`anchorY` (Pixel im Frame, auf der Bodenlinie). Eine Figur fasst ihre Bewegungen in einer Übersicht zusammen, z.B. `assets/anim/samuel.json`:

```json
{ "character": "samuel", "default": "stand",
  "moves": {
    "run":  { "src": "samuel-run.webp", "frames": 10, "frameWidth": 205, "frameHeight": 256, "fps": 12, "anchorX": 106, "anchorY": 255, "loop": true },
    "fall": { "src": "samuel-fall.webp", "frames": 12, "frameWidth": 231, "frameHeight": 256, "fps": 12, "anchorX": 114, "anchorY": 255, "loop": false } } }
```

```js
const sam = await Kit.sprite.load('assets/anim/samuel.json');
// oder ohne Übersicht: Kit.sprite.load({ run: 'assets/anim/samuel-run', fall: { src: 'assets/anim/samuel-fall', loop: false } }, { default: 'run' })

sam.play('run', { speed: 1.4 });          // Schleife; gleiche Bewegung erneut = läuft weiter, { restart: true } = von vorn
sam.play('fall', { onEnd: () => … });     // einmalige Bewegung (loop: false) meldet ihr Ende
sam.seek(jumpProgress);                    // Frame nach Fortschritt 0–1, z.B. dem Sprungverlauf; hält die Uhr an
sam.update(dt);                            // in requestAnimationFrame, dt in Sekunden (auch bei Pause einfach nicht aufrufen)
sam.draw(ctx, x, groundY, { height: 112, flip, alpha, rotate, squash }); // x/groundY = Fußpunkt
sam.width(112);                            // gezeichnete Breite, z.B. für Kollisionen
menu.append(sam.el('stand', { height: 90 })); // als DOM-Element per CSS, für Startbildschirm und Dialoge
```

| Was | Wofür |
|---|---|
| `sam.current`, `sam.frame`, `sam.done`, `sam.names` | Aktuelle Bewegung, Frame, ob eine einmalige Bewegung fertig ist, alle Bewegungen |
| `sam.speed` | Tempo-Faktor, z.B. an die Laufgeschwindigkeit koppeln |
| `"reduce": "still"` in der Übersicht | Bei „Animationen reduzieren“ das erste Frame zeigen (Standard: halbes Tempo) |
| `"baseHeight"` in der Übersicht (Kit 1.8) | Fester Maßstab pro Figur (assetgen mit `fit: "character"`): `height` beim Zeichnen meint dann den Standard-Frame, Bewegungen mit höheren Frames (Sprung, Schwert) werden passend größer. Ohne `baseHeight` wird jede Bewegung auf `height` gebracht |
| `Kit.sprite.files(src)` | Alle Dateien einer Übersicht, z.B. zum Prüfen der `sw.js`-Liste |

Die Bewegung steckt in den Frames: zusätzliches Wippen, Kippen oder Stauchen im Code nur dezent. Übersicht und Streifen in `self.PRECACHE` in `sw.js` eintragen.

## Android-App, Werbepausen und „Werbung entfernen“ (Kit 1.11)

Die **Werft** (`../werft`) baut ein Spiel als Android-App (Capacitor): Die Spieldateien liegen in der App, dazu `werft.js` (AdMob, Google-Play-Kauf, Einwilligung, Live-Updates). Das Kit erkennt die App an `window.Werft.app` (`Kit.app === 'play'`, Klasse `kit-app` am `<html>`) und

- blendet Ko-fi, „Als App installieren“ und den Wust-Link aus (Klasse `kit-no-app`),
- zeigt in den Einstellungen „Werbung entfernen – {Preis}“, „Käufe wiederherstellen“ und „Datenschutz-Einstellungen (Werbung)“, sobald die App das anbietet,
- zeigt einen Datenschutztext mit AdMob und Kauf, registriert keinen Service Worker und zählt Aufrufe unter `/<id>/app/…`.
- zeigt unten in den Einstellungen die Version (Live-Update); Antippen zeigt Build, Werft- und Kit-Version und das Werft-Protokoll (`Werft.log`: Start, Live-Updates, Werbepausen), Kit 1.11.2/1.11.3.

Im Browser (Website, games.wust.dev) passiert nichts davon. `?app=play#privacy` zeigt im Browser den vollständigen App-Datenschutztext, das ist die Datenschutz-URL für Google Play und AdMob.

**Werbepausen:** An natürlichen Pausen

```js
await Kit.ads.break('level-done'); // danach geht es weiter
```

Nie beim Start, nie mitten im Spiel. Außerhalb der App, ohne AdMob-Einstellung oder nach dem Kauf von „Werbung entfernen“ kommt sofort `{ shown: false }` zurück. Abstände, Pause von Ton und Spiel (`Kit.on('pause')`) übernehmen Kit und Werft. `Kit.on('removeAds', …)` meldet einen Kauf.
