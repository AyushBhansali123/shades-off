(() => {
  'use strict';

  // Helper functions
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  function scoreFromDelta(d) {
    const n = d / 255;
    const s = Math.max(0, 100 * Math.pow(1 - n, 2.2));
    return Math.round(s);
  }

  function valueFromPos(x, rect) {
    const t = clamp((x - rect.left) / rect.width, 0, 1);
    return Math.round(t * 255);
  }

  // Expose for tests
  if (typeof module !== 'undefined') {
    module.exports = { clamp, scoreFromDelta, valueFromPos };
  }

  function runTests() {
    const assert = (name, cond) => {
      if (!cond) throw new Error('Test failed: ' + name);
    };
    const fakeRect = { left: 0, width: 100 };
    assert('clamp inside', clamp(5, 0, 10) === 5);
    assert('clamp low', clamp(-5, 0, 10) === 0);
    assert('clamp high', clamp(15, 0, 10) === 10);
    assert('score zero', scoreFromDelta(0) === 100);
    assert('score max', scoreFromDelta(255) === 0);
    assert('value mid', valueFromPos(50, fakeRect) === 128);
    assert('value left', valueFromPos(0, fakeRect) === 0);
    assert('value right', valueFromPos(100, fakeRect) === 255);
    console.log('All tests passed');
  }

  if (typeof window === 'undefined') {
    runTests();
    return;
  }

  // DOM elements
  const bar = document.getElementById('bar');
  const ticks = document.getElementById('ticks');
  const targetSw = document.getElementById('targetSwatch');
  const guessSw = document.getElementById('guessSwatch');
  const deltaPill = document.getElementById('deltaPill');
  const scorePill = document.getElementById('scorePill');
  const roundNum = document.getElementById('roundNum');
  const lastScoreEl = document.getElementById('lastScore');
  const avgScoreEl = document.getElementById('avgScore');
  const newGameBtn = document.getElementById('newGame');
  const peekBtn = document.getElementById('peekToggle');
  const ariaLive = document.getElementById('ariaLive');

  const game = {
    round: 0,
    target: 0,
    locked: false,
    lastScore: 0,
    totalScore: 0,
    roundsPlayed: 0,
    hardPeek: false,
    barRect: null,
  };

  function updateBarRect() {
    game.barRect = bar.getBoundingClientRect();
  }

  window.addEventListener('resize', updateBarRect);

  function rand255() {
    return Math.floor(Math.random() * 256);
  }

  function setSwatch(el, v) {
    el.style.background = `rgb(${v},${v},${v})`;
  }

  function hideTarget() {
    targetSw.textContent = 'Hidden';
    targetSw.classList.add('hidden');
    targetSw.style.background = '#333';
  }

  function showTarget(value) {
    targetSw.textContent = '';
    targetSw.classList.remove('hidden');
    setSwatch(targetSw, value);
  }

  function nextRound() {
    ticks.innerHTML = '';
    game.round++;
    roundNum.textContent = game.round;
    game.target = rand255();
    showTarget(game.target);
    guessSw.removeAttribute('style');
    guessSw.textContent = '';
    deltaPill.textContent = '';
    scorePill.textContent = '';
    scorePill.classList.remove('green', 'red');
    bar.style.pointerEvents = 'auto';
    game.locked = false;
    if (game.hardPeek) hideTarget();
    updateBarRect();
  }

  function announce(msg) {
    ariaLive.textContent = msg;
  }

  function makeTick(value, type) {
    const t = value / 255;
    const tick = document.createElement('div');
    tick.className = `tick ${type}`;
    tick.style.left = `${t * 100}%`;
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = value;
    tick.appendChild(label);
    return tick;
  }

  function commitGuess(v) {
    if (game.locked) return;
    game.locked = true;
    bar.style.pointerEvents = 'none';

    setSwatch(guessSw, v);
    const guessTick = makeTick(v, 'guess');
    const targetTick = makeTick(game.target, 'target');
    ticks.appendChild(guessTick);
    ticks.appendChild(targetTick);

    const delta = Math.abs(v - game.target);
    const score = scoreFromDelta(delta);
    game.lastScore = score;
    game.totalScore += score;
    game.roundsPlayed++;

    lastScoreEl.textContent = score;
    avgScoreEl.textContent = Math.round(game.totalScore / game.roundsPlayed);
    deltaPill.textContent = `Δ: ${delta}`;
    scorePill.textContent = `Score: ${score}`;
    scorePill.classList.toggle('green', score >= 85);
    scorePill.classList.toggle('red', score <= 30);

    announce(`Score ${score}. Delta ${delta}.`);

    showTarget(game.target);
    setTimeout(nextRound, 900);
  }

  function handleInput(e) {
    if (game.locked) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const value = valueFromPos(x, game.barRect);
    commitGuess(value);
  }

  bar.addEventListener('mousedown', handleInput);
  bar.addEventListener('touchstart', handleInput);

  bar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitGuess(128);
    }
  });

  newGameBtn.addEventListener('click', () => {
    game.round = 0;
    game.totalScore = 0;
    game.roundsPlayed = 0;
    lastScoreEl.textContent = '0';
    avgScoreEl.textContent = '0';
    nextRound();
  });

  peekBtn.addEventListener('click', () => {
    game.hardPeek = !game.hardPeek;
    peekBtn.setAttribute('aria-pressed', game.hardPeek);
    if (game.hardPeek && !game.locked) hideTarget();
    else showTarget(game.target);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && game.hardPeek && !game.locked) {
      e.preventDefault();
      showTarget(game.target);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && game.hardPeek && !game.locked) {
      hideTarget();
    }
  });

  nextRound();
})();

