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
  const modeDescription = document.getElementById('modeDescription');
  const timerContainer = document.getElementById('timerContainer');
  const timerFill = document.getElementById('timerFill');
  const timerText = document.getElementById('timerText');
  const ariaLive = document.getElementById('ariaLive');
  
  // Custom dropdown elements
  const gameModeDropdown = document.getElementById('gameModeDropdown');
  const dropdownSelected = document.getElementById('dropdownSelected');
  const dropdownOptions = document.getElementById('dropdownOptions');
  
  // Notification elements
  const notificationOverlay = document.getElementById('notificationOverlay');
  const notificationModal = document.getElementById('notificationModal');
  const notificationIcon = document.getElementById('notificationIcon');
  const notificationTitle = document.getElementById('notificationTitle');
  const notificationBody = document.getElementById('notificationBody');
  const notificationConfirm = document.getElementById('notificationConfirm');
  const notificationCancel = document.getElementById('notificationCancel');

  // game state
  const game = {
    round: 0,
    target: 0,
    lastScore: 0,
    totalScore: 0,
    roundsPlayed: 0,
    locked: false,
    mode: 'normal',
    barRect: null,
    timerInterval: null,
    timeLeft: 0,
    gameOver: false,
    lives: 3
  };

  const modeDescriptions = {
    normal: 'Shade stays visible until you click.',
    flash: 'Shade flashes for 800ms, then you guess from memory.',
    blink: 'Shade appears twice with a pause, then you guess.',
    'sudden-death': 'Shade appears for 500ms, 5s to guess, wrong guess ends run.'
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
    targetSample.textContent = value;
  }

  function startTimer(seconds) {
    if (game.timerInterval) clearInterval(game.timerInterval);
    
    game.timeLeft = seconds;
    timerContainer.style.display = 'flex';
    updateTimer();
    
    game.timerInterval = setInterval(() => {
      game.timeLeft -= 0.1;
      updateTimer();
      
      if (game.timeLeft <= 0) {
        clearInterval(game.timerInterval);
        if (game.mode === 'sudden-death') {
          endGame('Time\'s up!');
        }
      }
    }, 100);
  }

  function updateTimer() {
    const totalTime = game.mode === 'sudden-death' ? 5 : 5;
    const progress = game.timeLeft / totalTime;
    timerFill.style.width = `${Math.max(0, progress * 100)}%`;
    timerText.textContent = `${Math.max(0, game.timeLeft).toFixed(1)}s`;
  }

  function stopTimer() {
    if (game.timerInterval) {
      clearInterval(game.timerInterval);
      game.timerInterval = null;
    }
    timerContainer.style.display = 'none';
  }

  async function endGame(reason) {
    game.gameOver = true;
    game.locked = true;
    stopTimer();
    announce(`Game Over: ${reason}`);
    
    setTimeout(async () => {
      const average = game.roundsPlayed > 0 ? Math.round(game.totalScore / game.roundsPlayed) : 0;
      const message = `${reason}\n\nFinal Score: ${game.totalScore}\nRounds: ${game.roundsPlayed}\nAverage: ${average}`;
      
      const restart = await showNotification('Game Over', message, '💀', 'New Game', 'Close');
      if (restart) {
        resetGame();
      }
    }, 1000);
  }

  function announce(msg) {
    if (ariaLive) ariaLive.textContent = msg;
  }

  // Custom Dropdown Functions
  function toggleDropdown() {
    const isOpen = dropdownOptions.classList.contains('show');
    
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function openDropdown() {
    dropdownSelected.classList.add('active');
    dropdownOptions.classList.add('show');
    updateSelectedOption();
  }

  function closeDropdown() {
    dropdownSelected.classList.remove('active');
    dropdownOptions.classList.remove('show');
  }

  function updateSelectedOption() {
    const options = dropdownOptions.querySelectorAll('.dropdown-option');
    options.forEach(option => {
      option.classList.toggle('selected', option.dataset.value === game.mode);
    });
  }

  function selectMode(value) {
    const modeNames = {
      normal: 'Normal',
      flash: 'Flash',
      blink: 'Blink',
      'sudden-death': 'Sudden Death'
    };
    
    game.mode = value;
    dropdownSelected.querySelector('.selected-text').textContent = modeNames[value];
    modeDescription.textContent = modeDescriptions[value];
    closeDropdown();
    
    if (!game.locked) {
      executeMode();
    }
  }

  // Custom Notification System
  function showNotification(title, body, icon = '🎮', confirmText = 'OK', cancelText = 'Close') {
    return new Promise((resolve) => {
      notificationTitle.textContent = title;
      notificationBody.textContent = body;
      notificationIcon.textContent = icon;
      notificationConfirm.textContent = confirmText;
      notificationCancel.textContent = cancelText;
      
      notificationOverlay.classList.add('show');
      
      const handleConfirm = () => {
        notificationOverlay.classList.remove('show');
        notificationConfirm.removeEventListener('click', handleConfirm);
        notificationCancel.removeEventListener('click', handleCancel);
        notificationOverlay.removeEventListener('click', handleOverlayClick);
        resolve(true);
      };
      
      const handleCancel = () => {
        notificationOverlay.classList.remove('show');
        notificationConfirm.removeEventListener('click', handleConfirm);
        notificationCancel.removeEventListener('click', handleCancel);
        notificationOverlay.removeEventListener('click', handleOverlayClick);
        resolve(false);
      };
      
      const handleOverlayClick = (e) => {
        if (e.target === notificationOverlay) {
          handleCancel();
        }
      };
      
      notificationConfirm.addEventListener('click', handleConfirm);
      notificationCancel.addEventListener('click', handleCancel);
      notificationOverlay.addEventListener('click', handleOverlayClick);
    });
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

  function clearTicks() {
    ticks.innerHTML = '';
  }

  function commitGuess(v) {
    if (game.locked || game.gameOver) return;
    
    game.locked = true;
    stopTimer();
    guessBar.style.pointerEvents = 'none';

    clearTicks();
    ticks.appendChild(makeTick(v, 'guess'));
    ticks.appendChild(makeTick(game.target, 'target'));

    guessSample.textContent = v;
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

    const scorePill = document.getElementById('score-pill');
    if (scorePill) {
      scorePill.classList.remove('green', 'red');
      setTimeout(() => {
        scorePill.classList.toggle('green', score >= 85);
        scorePill.classList.toggle('red', score <= 30);
      }, 50);
    }

    announce(`Score ${score}. Delta ${delta}.`);
    showTarget(game.target);

    // Check for sudden death game over
    if (game.mode === 'sudden-death' && delta > 15) {
      endGame(`Wrong guess! Delta: ${delta}`);
      return;
    }

    setTimeout(nextRound, 2000);
  }

  function nextRound() {
    if (game.gameOver) return;
    
    clearTicks();
    stopTimer();
    game.round++;
    game.barRect = null;
    updateBarRect();
    game.target = rand255();

    guessSample.textContent = 'Guess';
    guessSample.style.background = '#FF6600';
    deltaVal.textContent = '0';
    lastScoreEl.textContent = '0';
    guessBar.style.pointerEvents = 'auto';
    game.locked = false;
    
    updateBarGradient();
    executeMode();
  }

  function executeMode() {
    switch (game.mode) {
      case 'normal':
        showTarget(game.target);
        break;
        
      case 'flash':
        showTarget(game.target);
        setTimeout(() => {
          hideTarget();
        }, 800);
        break;
        
      case 'blink':
        showTarget(game.target);
        setTimeout(() => {
          hideTarget();
          setTimeout(() => {
            showTarget(game.target);
            setTimeout(() => {
              hideTarget();
            }, 500);
          }, 300);
        }, 500);
        break;
        
      case 'sudden-death':
        showTarget(game.target);
        setTimeout(() => {
          hideTarget();
          startTimer(5);
        }, 500);
        break;
        
      default:
        hideTarget();
    }
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

  // keyboard support: Enter => center guess
  guessBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
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
  function resetGame() {
    game.round = 0;
    game.totalScore = 0;
    game.roundsPlayed = 0;
    game.gameOver = false;
    game.lives = 3;
    stopTimer();
    updateBarRect();
    nextRound();
  }

  newRoundBtn.addEventListener('click', resetGame);

  // Custom dropdown event listeners
  dropdownSelected.addEventListener('click', toggleDropdown);
  
  dropdownOptions.addEventListener('click', (e) => {
    const option = e.target.closest('.dropdown-option');
    if (option) {
      selectMode(option.dataset.value);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!gameModeDropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // Keyboard support for dropdown
  dropdownSelected.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  // init
  updateBarRect();
  updateBarGradient();
  game.mode = 'normal';
  modeDescription.textContent = modeDescriptions[game.mode];
  dropdownSelected.setAttribute('tabindex', '0'); // Make dropdown focusable
  nextRound();

  // Simple test suite for helper functions
  function runTests() {
    const tests = [
      {
        name: 'clamp - normal case',
        test: () => clamp(150, 0, 255) === 150
      },
      {
        name: 'clamp - below minimum',
        test: () => clamp(-10, 0, 255) === 0
      },
      {
        name: 'clamp - above maximum',  
        test: () => clamp(300, 0, 255) === 255
      },
      {
        name: 'scoreFromDelta - perfect score',
        test: () => scoreFromDelta(0) === 100
      },
      {
        name: 'scoreFromDelta - worst score',
        test: () => scoreFromDelta(255) === 0
      },
      {
        name: 'scoreFromDelta - mid range',
        test: () => {
          const score = scoreFromDelta(128);
          return score >= 5 && score <= 15; // approximately 10
        }
      },
      {
        name: 'valueFromPos - left edge',
        test: () => {
          const rect = { left: 0, width: 255 };
          return valueFromPos(0, rect) === 0;
        }
      },
      {
        name: 'valueFromPos - right edge',
        test: () => {
          const rect = { left: 0, width: 255 };
          return valueFromPos(255, rect) === 255;
        }
      },
      {
        name: 'valueFromPos - middle',
        test: () => {
          const rect = { left: 0, width: 200 };
          return valueFromPos(100, rect) === 128; // 100/200 * 255 rounded
        }
      }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(({ name, test }) => {
      try {
        if (test()) {
          console.log(`✓ ${name}`);
          passed++;
        } else {
          console.log(`✗ ${name}`);
          failed++;
        }
      } catch (e) {
        console.log(`✗ ${name} - Error: ${e.message}`);
        failed++;
      }
    });

    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
  }

  // Run tests on load (can be commented out for production)
  if (location.search.includes('test=true') || location.hostname === 'localhost') {
    runTests();
  }

  // expose helpers for tests if required
  if (typeof module !== 'undefined') {
    module.exports = { clamp, scoreFromDelta, valueFromPos, runTests };
  }
})();
