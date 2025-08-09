(() => {
  'use strict';

  // helpers
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  function scoreFromDelta(d) {
    const n = d / 255;
    const s = Math.max(0, 100 * Math.pow(1 - n, 2.2));
    return Math.round(s);
  }
  function valueFromPos(x, rect) {
    const t = clamp((x - rect.left) / rect.width, 0, 1);
    return Math.round(t * 255);
  }

  // DOM
  const guessBar = document.getElementById('guess-bar');
  const ticks = document.getElementById('ticks');
  const targetSample = document.getElementById('target-sample');
  const guessSample = document.getElementById('guess-sample');
  const deltaVal = document.getElementById('delta-val');
  const lastScoreEl = document.getElementById('last-score');
  const avgScoreEl = document.getElementById('avg-score');
  const roundsEl = document.getElementById('rounds');
  const totalScoreEl = document.getElementById('total-score');
  const newRoundBtn = document.getElementById('new-round');
  const peekBtn = document.getElementById('peekToggle');
  const ariaLive = document.getElementById('ariaLive');

  // game state
  const game = {
    round: 0,
    target: 0,
    lastScore: 0,
    totalScore: 0,
    roundsPlayed: 0,
    locked: false,
    hardPeek: false,
    barRect: null
  };

  function updateBarRect() {
    game.barRect = guessBar.getBoundingClientRect();
  }
  window.addEventListener('resize', updateBarRect);
  window.addEventListener('orientationchange', updateBarRect);

  function rand255() { return Math.floor(Math.random() * 256); }

  function setSwatch(el, v, hideText = false) {
    el.style.background = `rgb(${v},${v},${v})`;
    if (hideText) {
      el.textContent = '';
      el.classList.remove('hidden');
    } else {
      // show label
      el.textContent = el.id === 'target-sample' && game.hardPeek ? '' : (hideText ? '' : el.textContent);
    }
  }

  function hideTarget() {
    targetSample.textContent = 'Hidden';
    targetSample.classList.add('hidden');
    targetSample.style.background = '#333';
  }
  function showTarget(value) {
    targetSample.classList.remove('hidden');
    setSwatch(targetSample, value, true);
  }

  function announce(msg) {
    if (ariaLive) ariaLive.textContent = msg;
  }

  function makeTick(value, type) {
    const t = value / 255;
    const tick = document.createElement('div');
    tick.className = `tick ${type}`;
    tick.style.left = `${t * 100}%`;
    return tick;
  }

  function clearTicks() {
    ticks.innerHTML = '';
  }

  function commitGuess(v) {
    if (game.locked) return;
    game.locked = true;
    // freeze input
    guessBar.style.pointerEvents = 'none';

    clearTicks();
    // add guess and target ticks (guess first so it stands out)
    ticks.appendChild(makeTick(v, 'guess'));
    ticks.appendChild(makeTick(game.target, 'target'));

    // update guess swatch
    guessSample.textContent = '';
    guessSample.style.background = `rgb(${v},${v},${v})`;

    const delta = Math.abs(v - game.target);
    const score = scoreFromDelta(delta);

    game.lastScore = score;
    game.totalScore += score;
    game.roundsPlayed++;

    lastScoreEl.textContent = score;
    avgScoreEl.textContent = Math.round(game.totalScore / game.roundsPlayed);
    deltaVal.textContent = delta;
    roundsEl.textContent = game.round;
    totalScoreEl.textContent = game.totalScore;

    // visual pill coloring
    const scorePill = document.getElementById('score-pill');
    if (scorePill) {
      scorePill.classList.toggle('green', score >= 85);
      scorePill.classList.toggle('red', score <= 30);
    }

    announce(`Score ${score}. Delta ${delta}.`);
    // reveal target
    showTarget(game.target);

    // next round after short delay
    setTimeout(nextRound, 900);
  }

  function nextRound() {
    clearTicks();
    game.round++;
    game.barRect = null;
    updateBarRect();
    game.target = rand255();

    // hide/reveal UI
    hideTarget();
    guessSample.textContent = 'Guess';
    guessSample.style.background = '#555';
    deltaVal.textContent = '0';
    lastScoreEl.textContent = '0';
    // keep avg and totals as-is
    guessBar.style.pointerEvents = 'auto';
    game.locked = false;
    if (game.hardPeek) showTarget(game.target);
    updateBarGradient();
  }

  function updateBarGradient() {
    guessBar.style.background = `linear-gradient(90deg, #000, #fff)`;
  }

  // Input handling (pointer works across mouse/touch/stylus)
  function handlePointer(e) {
    if (game.locked) return;
    // ensure up-to-date rect
    updateBarRect();
    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX :
      (e.clientX !== undefined ? e.clientX :
        (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientX));
    if (clientX === undefined) return;
    const val = valueFromPos(clientX, game.barRect);
    commitGuess(val);
  }

  // keyboard support: Enter or Space => center guess
  guessBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commitGuess(128);
    }
  });

  // pointer events
  guessBar.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    handlePointer(e);
  });

  // fallbacks
  guessBar.addEventListener('mousedown', handlePointer);
  guessBar.addEventListener('touchstart', handlePointer, { passive: true });

  // controls
  newRoundBtn.addEventListener('click', () => {
    // reset totals
    game.round = 0;
    game.totalScore = 0;
    game.roundsPlayed = 0;
    updateBarRect();
    nextRound();
  });

  peekBtn.addEventListener('click', () => {
    game.hardPeek = !game.hardPeek;
    peekBtn.setAttribute('aria-pressed', String(game.hardPeek));
    if (game.hardPeek) showTarget(game.target);
    else hideTarget();
  });

  // init
  updateBarRect();
  updateBarGradient();
  nextRound();

  // expose helpers for tests if required
  if (typeof module !== 'undefined') {
    module.exports = { clamp, scoreFromDelta, valueFromPos };
  }
})();
