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
- **Vier Schwierigkeitsstufen** von Leicht (5×5) bis Experte (10×10), bewertet nach den nötigen Denkschritten
- **Tipps**, die den nächsten logischen Schritt erklären
- **Tagesflug** mit Serienzähler
- **Combos, Flugmeilen und Pilotenränge**
- **Kawaii-Grafiken**, Animationen und Sounds
- **Datenschutzfreundlich:** keine Konten, keine Cookies, kein Tracking; der Spielstand bleibt im Browser

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
| `js/app.js` | Spiel, Oberfläche, Tipps und Belohnungen |
| `js/audio.js` | Sounds per WebAudio |
| `css/style.css` | Stil und Animationen |
| `assets/` | Grafiken (Originale in `assets/src/`) |
| `sw.js`, `manifest.webmanifest` | Offline-Modus und Installation |

---

Made with ❤️ by [Wust](https://wust.dev/)
