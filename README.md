# Thermikdoku 🪂

Ein Logikrätsel mit Gleitschirmen: kostenlos, ohne Werbung, fürs Handy gemacht und offline spielbar.

**▶ Jetzt spielen: [thermikdoku.de](https://thermikdoku.de)**

Auf dem Handy lässt sich Thermikdoku über „Zum Home-Bildschirm“ wie eine App installieren.

## Regeln

- Jede **Reihe**, jede **Spalte** und jede **Farbzone** braucht genau einen Gleitschirm.
- Schirme dürfen sich **nicht berühren**, auch nicht schräg.

## Steuerung

| Geste | Wirkung |
|---|---|
| Tippen | × setzen oder entfernen (auf einem Schirm: Schirm entfernen) |
| Doppeltippen | Schirm setzen |
| Wischen | viele × auf einmal setzen |

## Features

- **Unendlich viele Rätsel:** jedes wird neu erzeugt, hat genau eine Lösung und ist ohne Raten lösbar
- **Vier Schwierigkeitsstufen** von Leicht (5×5) bis Experte (10×10), bewertet nach den nötigen Denkschritten und nach und nach mit den Pilotenrängen freigeschaltet, genau wie Zeitflug, Expedition und Extras
- **Tipps**, die den nächsten logischen Schritt erklären
- **Zeitflug:** so viele Rätsel wie möglich in 5 Minuten
- **Expedition:** riesige Rätsel mit 11×11 und 12×12 Feldern
- **Extras** für mehr Punkte: Ohne Tipps, Wolkenflug (ohne Kreuze), Gegenwind (Zeitlimit)
- **Farbenblind-Modus:** jede Zonenfarbe bekommt zusätzlich ein eigenes Symbol
- **Himmel nach Tageszeit:** Morgenrot, Tag, Abendrot und Sternennacht passend zur echten Uhrzeit
- **Combos, Punkte und Pilotenränge**
- **Kawaii-Grafiken**, Animationen und Sounds
- **Deutsch und Englisch:** umschaltbar in den Einstellungen; neue Spieler bekommen die Sprache ihres Browsers, bestehende Spielstände bleiben auf Deutsch
- **Datenschutzfreundlich:** keine Konten, keine Cookies, nur eine anonyme Besucherzählung; der Spielstand bleibt im Browser

## Lokal starten

Keine Abhängigkeiten, kein Build-Schritt:

```bash
python3 -m http.server 8765
```

Dann http://localhost:8765 öffnen.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `js/puzzle.js` | Rätsel-Generator, Logik-Löser und Schwierigkeitsbewertung |
| `js/worker.js` | Erzeugt Rätsel im Hintergrund |
| `js/game.js` | Spiel, Oberfläche, Tipps und Belohnungen |
| `js/audio.js` | Musik und Klänge (laufen über `Kit.audio`) |
| `js/i18n.js`, `i18n/*.json` | Übersetzungen über das Kit, dazu Zahlen, Mehrzahl und Aufzählungen |
| `kit/` | Karakuri-Kit (nicht bearbeiten, kommt per Kit-Update): Footer, Einstellungen, Datenschutz, Impressum, Installieren, Offline, Audio, Speicher, Werbepausen in der Store-App |
| `scripts/check-i18n.mjs` | Prüft, dass `de.json` und `en.json` dieselben Schlüssel haben und alle benutzten Schlüssel existieren |
| `css/style.css` | Stil und Animationen |
| `assets/` | Grafiken (Originale in `assets/src/`) |
| `sw.js`, `manifest.webmanifest` | Offline-Modus (über `kit/sw-core.js`) und Installation |

---

Made with ❤️ by [Wust](https://wust.dev/)
