# Kawaii-Grafiken für Thermikdoku – Prompts für ChatGPT

Alle Prompts **im selben Chat** nacheinander verwenden, damit Figur und Stil gleich bleiben.
Fertige PNGs mit den angegebenen Dateinamen hier in `assets/` ablegen.

Tipp: Kommt ein Schachbrettmuster statt echter Transparenz, nachschieben:
> Please give me a real transparent background (alpha channel), not a checkerboard pattern.

---

## 1. Grundfigur → `glider-1.png`

```text
Cute kawaii illustration of a tiny paraglider pilot flying under a paraglider wing, as a sprite for a mobile puzzle game.

Front view, centered, symmetrical. The wing is a wide, puffy, rounded crescent arc at the top, made of 5 soft vertical cells alternating coral red (#FF5A36) and sunny yellow (#FFD23F), with a subtle highlight on top. A few thin dark lines connect the wing to the pilot.

The pilot is a chibi character: a huge round head (about half of the character), a rounded helmet in the same coral red, big shiny black eyes with white sparkles, a tiny happy smile, rosy pink cheeks, sitting in a small round harness with short stubby legs dangling.

Style: thick, clean, dark navy outlines (#2B3A55), flat pastel colors with soft subtle shading, no text, no background elements.

It must stay readable when shrunk to 48×48 pixels: simple shapes, bold silhouette, no fine details.

Transparent background, PNG, square 1024×1024. The whole glider fits inside with about 5% margin; the wing fills the top ~40%, the pilot sits in the lower half.
```

## 2. Farbvarianten → `glider-2.png` bis `glider-6.png`

Jeweils einzeln senden:

```text
Exactly the same image again: identical character, pose, size and framing, transparent background. Only change the wing (and helmet) colors to royal blue (#1F7AFF) and white.
```

Danach dieselbe Nachricht mit diesen Farben:

| Datei | Farben |
|---|---|
| `glider-2.png` | royal blue (#1F7AFF) and white |
| `glider-3.png` | raspberry pink (#E83E8C) and orange (#FF9F1C) |
| `glider-4.png` | emerald green (#14A37F) and lemon yellow (#F9E04B) |
| `glider-5.png` | violet (#7B2FF7) and cyan (#00D4FF) |
| `glider-6.png` | tangerine orange (#FF8C00) and navy (#2B3A55) |

## 3. Jubelnd (Sieg) → `glider-happy.png`

```text
Same character with the coral red and yellow wing, same framing and transparent background, but now cheering: both little arms raised high, eyes closed in happy ^ ^ shapes, big open-mouth smile, a few small sparkle stars around the pilot.
```

## 4. Erschrocken (Zusammenstoß) → `glider-scared.png`

```text
Same character with the coral red and yellow wing, same framing and transparent background, but now startled: wide round eyes, tiny "o" mouth, one sweat drop on the helmet, wing tilted slightly to one side, legs kicking.
```

## 5. Wolke (Hintergrund, optional) → `cloud.png`

```text
A cute kawaii cloud in the same style: fluffy white cloud with light blue shading, the same dark navy outline, a sleepy smiling face with rosy cheeks. Transparent background, PNG, 1024×512, cloud fills the image with a small margin.
```

## 6. App-Icon (optional) → `icon.png`

```text
App icon: the same coral red and yellow paraglider character flying happily in front of a soft blue gradient sky, with two small kawaii clouds and rounded green mountains at the bottom. Square 1024×1024, no transparency, no text, the character large and centered, friendly and rounded.
```
