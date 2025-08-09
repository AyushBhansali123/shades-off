<!-- Banner -->
>[!TIP]
>To toggle difficulty, press the Peak button.

<!-- Header -->
<div align="center">
  <img width="1197" height="119" alt="ShadesOffBanner" src="https://github.com/user-attachments/assets/bef2f53c-ac98-40eb-9c83-e8c14bd9756a" />
  <h3>Guess the correct shade on the grayscale bar.</h3>
</div>

<!-- Scoring Info -->
## Scoring
```js
function endRound(guess) {
  const delta = Math.abs(guess - targetValue); // difference in slider units
  const score = Math.max(0, 100 - delta); // higher score for smaller delta

  document.getElementById("deltaPill").textContent = `Δ ${delta}`;
  document.getElementById("scorePill").textContent = `${score} pts`;

  totalScore += score;
  round++;
  document.getElementById("roundNum").textContent = round;
  document.getElementById("lastScore").textContent = score;
  document.getElementById("avgScore").textContent = Math.round(totalScore / round);
}
```
