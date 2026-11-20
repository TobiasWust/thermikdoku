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
- **Prozedural erzeugt**: jedes Rätsel ist neu, hat genau eine Lösung und ist **ohne Raten** lösbar
- **4 Schwierigkeitsstufen**, bewertet nach den nötigen Denkschritten:
  | Stufe | Feld | Techniken |
  |---|---|---|
  | Leicht | 5×5 / 6×6 | Einzelplatz, Eingesperrt |
  | Mittel | 6×6 / 7×7 | + Blockade |
  | Schwer | 8×8 | + Gruppen (ggf. Probeflug) |
  | Experte | 9×9 / 10×10 | Gruppen + Probeflug, viele harte Schritte |
- Tipps nutzen denselben Logik-Löser und erklären den nächsten Schritt
- Täglicher „Tagesflug“ (Stufe je nach Wochentag) mit Serienzähler
- Statistik pro Stufe (gelöst, Bestzeit), Spielstand wird gespeichert
- Erzeugung im Web Worker mit Vorrat, damit neue Rätsel sofort da sind
- Animationen: einfliegende Schirme, Thermik-Welle, Kollisions-Wackeln, Abheben und Konfetti beim Sieg
- Synth-Sounds per WebAudio, Vibration (Android)

## Lokal starten
```bash
python3 -m http.server 8765
```
Dann http://localhost:8765 öffnen. Für Offline/Installieren auf dem Handy auf einen HTTPS-Host legen
(z. B. GitHub Pages, Netlify) und im Browser „Zum Home-Bildschirm“ wählen.

## Aufbau
- `js/puzzle.js`: Generator (Zonen wachsen lassen, Eindeutigkeit erzwingen), Logik-Löser und Schwierigkeitsbewertung
- `js/worker.js`: erzeugt Rätsel im Hintergrund
- `js/app.js`: Spiel-Logik, UI, Tipps, Animationen
- `js/audio.js`: Sounds
- `css/style.css`: Styles und Animationen
- `sw.js`, `manifest.webmanifest`: PWA/Offline
