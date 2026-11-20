# Thermikdoku 🪂

Logikrätsel mit Gleitschirmen – fürs Handy optimiert, ohne Werbung, offline spielbar (PWA).

## Regeln
- Genau **ein Gleitschirm pro Reihe**, **pro Spalte** und **pro farbiger Thermik-Zone**.
- Schirme dürfen sich **nicht berühren**, auch nicht diagonal.

## Steuerung
- **Tippen**: leer → × → Schirm → leer
- **Wischen**: viele × auf einmal setzen (oder löschen, wenn auf einem × begonnen)
- **Lange drücken**: Schirm direkt setzen/entfernen
- **Tipp**: logischer Hinweis (unbegrenzt), **Zurück**: Undo, **Neu**: Brett leeren (per Undo rückholbar)

## Features
- Unendlich viele Level mit wachsender Größe (5×5 bis 10×10), jedes eindeutig lösbar
- Täglicher „Tagesflug“ mit Serienzähler
- Sterne, Bestzeiten und Spielstand werden lokal gespeichert
- Animationen: einfliegende Schirme, Thermik-Welle, Kollisions-Wackeln, Abheben und Konfetti beim Sieg
- Synth-Sounds per WebAudio, Vibration (Android)

## Lokal starten
```bash
python3 -m http.server 8765
```
Dann http://localhost:8765 öffnen. Für Offline/Installieren auf dem Handy auf einen HTTPS-Host legen
(z. B. GitHub Pages, Netlify) und im Browser „Zum Home-Bildschirm“ wählen.

## Aufbau
- `js/puzzle.js`: Generator (zufällige Platzierung, Zonen wachsen lassen, Eindeutigkeit per Solver erzwingen)
- `js/app.js`: Spiel-Logik, UI, Tipps, Animationen
- `js/audio.js`: Sounds
- `css/style.css`: Styles und Animationen
- `sw.js`, `manifest.webmanifest`: PWA/Offline
