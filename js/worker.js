// Rätsel im Hintergrund erzeugen, damit die Oberfläche flüssig bleibt
import { generateForDifficulty } from './puzzle.js';

self.onmessage = (e) => {
  const { id, difficulty, seed } = e.data;
  try {
    const puzzle = generateForDifficulty(difficulty, seed);
    self.postMessage({ id, puzzle });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
