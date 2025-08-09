# Shades Off

Tiny browser game guessing grayscale values.

## Run
Open `index.html` in any browser.

## Controls
- Click or tap the bar to guess.
- Press **Enter** while the bar is focused to guess the middle value (128).
- **New Game** resets scores.
- Toggle **Peek (hard mode)** to hide the target; hold **Space** to peek.

## Scoring
```
function scoreFromDelta(d) {
  const n = d / 255;
  const s = Math.max(0, 100 * Math.pow(1 - n, 2.2));
  return Math.round(s);
}
```

