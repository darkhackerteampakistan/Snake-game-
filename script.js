// ===== সব এলিমেন্ট চেক করে নেয় — কোনোটা না থাকলে error দেয় না =====
(function() {
  'use strict';

  // ===== DOM এলিমেন্ট সেফলি নেয়ার হেল্পার =====
  function $(id) {
    return document.getElementById(id);
  }

  const canvas = $('game');
  if (!canvas) {
    console.error('❌ Canvas এলিমেন্ট পাওয়া যায়নি');
    return;
  }
  const ctx = canvas.getContext('2d');

  const menuScreen = $('menuScreen');
  const customScreen = $('customScreen');
  const gameScreen = $('gameScreen');
  const scoreEl = $('score');
  const hiscoreEl = $('hiscore');
  const statusText = $('statusText');

  // ===== সেটিংস =====
  const CELL = 15;
  const COLS = canvas.width / CELL;
  const ROWS = canvas.height / CELL;

  // ===== থিম =====
  const THEMES = {
    nokia:  { bg:'#9bbc0f', grid:'#8aa80d', text:'#0f380f' },
    dark:   { bg:'#1a1a1a', grid:'#252525', text:'#9bbc0f' },
    ocean:  { bg:'#0f2a4a', grid:'#1a3a5a', text:'#7ec8ff' },
    sunset: { bg:'#4a1a2a', grid:'#5a2535', text:'#ffb088' },
    forest: { bg:'#1a3a1a', grid:'#254a25', text:'#a0e060' },
    purple: { bg:'#2a1a4a', grid:'#3a2a5a', text:'#c8a0ff' }
  };

  const SNAKE_COLORS = [
    { head:'#0f380f', body:'#306230', name:'Classic' },
    { head:'#000000', body:'#444444', name:'Black'   },
    { head:'#8B0000', body:'#dc143c', name:'Red'     },
    { head:'#006400', body:'#32CD32', name:'Green'   },
    { head:'#00008B', body:'#4169E1', name:'Blue'    },
    { head:'#4B0082', body:'#9370DB', name:'Purple'  },
    { head:'#8B4513', body:'#D2691E', name:'Orange'  },
    { head:'#FF1493', body:'#FF69B4', name:'Pink'    }
  ];

  const FOOD_COLORS = ['#0f380f','#dc143c','#FFD700','#4169E1','#FF69B4','#00CED1'];

  const SNAKE_STYLES = [
    { id:'block', name:'Block' },
    { id:'round', name:'Round' },
    { id:'small', name:'Small' }
  ];

  const DIFFICULTIES = {
    easy:     { speed:180, name:'Easy' },
    hard:     { speed:120, name:'Hard' },
    veryhard: { speed:70,  name:'Very Hard' }
  };

  // ===== State =====
  let config = {
    theme: 'nokia',
    snakeColor: 0,
    foodColor: 0,
    snakeStyle: 'block',
    difficulty: 'easy'
  };

  let snake = [];
  let dir = {x:1,y:0};
  let nextDir = {x:1,y:0};
  let food = {x:5,y:5};
  let score = 0;
  let alive = true;
  let paused = false;
  let started = false;
  let tickInterval = 180;
  let lastTick = 0;
  let animationId = null;
  let statusTimeout = null;

  // ===== সাউন্ড (সেফ) =====
  let audioCtx = null;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) {
    console.warn('⚠️ Audio context তৈরি হয়নি:', e);
  }

  function playSound(freq, duration, type = 'square', volume = 0.08) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
  }

  function eatSound() {
    playSound(880, 0.08, 'square', 0.06);
    setTimeout(() => playSound(1320, 0.08, 'square', 0.06), 60);
  }

  function gameOverSound() {
    playSound(400, 0.15, 'sawtooth', 0.08);
    setTimeout(() => playSound(300, 0.15, 'sawtooth', 0.08), 130);
    setTimeout(() => playSound(200, 0.3,  'sawtooth', 0.08), 260);
  }

  function clickSound() {
    playSound(600, 0.05, 'square', 0.04);
  }

  // ===== localStorage (সেফ) =====
  function loadConfig() {
    try {
      const saved = localStorage.getItem('snakeConfig');
      if (saved) config = Object.assign({}, config, JSON.parse(saved));
    } catch(e) {}
  }

  function saveConfig() {
    try {
      localStorage.setItem('snakeConfig', JSON.stringify(config));
    } catch(e) {}
  }

  function getHiScore() {
    try {
      return parseInt(localStorage.getItem('snakeHi_' + config.difficulty) || '0');
    } catch(e) { return 0; }
  }

  function setHiScore(v) {
    try {
      localStorage.setItem('snakeHi_' + config.difficulty, v);
    } catch(e) {}
  }

  // ===== কাস্টমাইজ UI =====
  function buildCustomUI() {
    // Theme
    const themeRow = $('themeRow');
    if (themeRow) {
      themeRow.innerHTML = '';
      Object.keys(THEMES).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'chip' + (config.theme === key ? ' active' : '');
        btn.textContent = key.toUpperCase();
        btn.onclick = () => {
          config.theme = key; saveConfig(); buildCustomUI(); clickSound();
        };
        themeRow.appendChild(btn);
      });
    }

    // Snake Color
    const scRow = $('snakeColorRow');
    if (scRow) {
      scRow.innerHTML = '';
      SNAKE_COLORS.forEach((c, i) => {
        const sw = document.createElement('div');
        sw.className = 'swatch' + (config.snakeColor === i ? ' active' : '');
        sw.style.background = 'linear-gradient(135deg, ' + c.head + ', ' + c.body + ')';
        sw.title = c.name;
        sw.onclick = () => {
          config.snakeColor = i; saveConfig(); buildCustomUI(); clickSound();
        };
        scRow.appendChild(sw);
      });
    }

    // Food Color
    const fcRow = $('foodColorRow');
    if (fcRow) {
      fcRow.innerHTML = '';
      FOOD_COLORS.forEach((c, i) => {
        const sw = document.createElement('div');
        sw.className = 'swatch' + (config.foodColor === i ? ' active' : '');
        sw.style.background = c;
        sw.onclick = () => {
          config.foodColor = i; saveConfig(); buildCustomUI(); clickSound();
        };
        fcRow.appendChild(sw);
      });
    }

    // Snake Style
    const stRow = $('snakeStyleRow');
    if (stRow) {
      stRow.innerHTML = '';
      SNAKE_STYLES.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'chip' + (config.snakeStyle === s.id ? ' active' : '');
        btn.textContent = s.name;
        btn.onclick = () => {
          config.snakeStyle = s.id; saveConfig(); buildCustomUI(); clickSound();
        };
        stRow.appendChild(btn);
      });
    }

    // Difficulty
    const dRow = $('diffRow');
    if (dRow) {
      dRow.innerHTML = '';
      Object.keys(DIFFICULTIES).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'chip' + (config.difficulty === key ? ' active' : '');
        btn.textContent = DIFFICULTIES[key].name;
        btn.onclick = () => {
          config.difficulty = key; saveConfig(); buildCustomUI(); clickSound();
        };
        dRow.appendChild(btn);
      });
    }
  }

  // ===== গেম লজিক =====
  function resetGame() {
    snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir = {x:1,y:0};
    nextDir = {x:1,y:0};
    score = 0;
    alive = true;
    paused = false;
    placeFood();
    updateScore();
    if (hiscoreEl) hiscoreEl.textContent = String(getHiScore()).padStart(3,'0');
  }

  function placeFood() {
    let attempts = 0;
    while (attempts < 100) {
      const f = {
        x: Math.floor(Math.random()*COLS),
        y: Math.floor(Math.random()*ROWS)
      };
      if (!snake.some(s => s.x===f.x && s.y===f.y)) {
        food = f;
        return;
      }
      attempts++;
    }
  }

  function updateScore() {
    if (scoreEl) scoreEl.textContent = String(score).padStart(3,'0');
  }

  function showStatus(text, color) {
    if (!statusText) return;
    statusText.textContent = text;
    statusText.className = 'status-text' + (color === 'green' ? ' playing' : '');
    statusText.classList.remove('hidden');
    if (statusTimeout) clearTimeout(statusTimeout);
  }

  function hideStatusLater(ms) {
    if (statusTimeout) clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      if (statusText) statusText.classList.add('hidden');
    }, ms);
  }

  function drawGrid() {
    const th = THEMES[config.theme] || THEMES.nokia;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = th.grid;
    ctx.lineWidth = 1;
    for (let x=0; x<=COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x*CELL,0); ctx.lineTo(x*CELL,canvas.height); ctx.stroke();
    }
    for (let y=0; y<=ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0,y*CELL); ctx.lineTo(canvas.width,y*CELL); ctx.stroke();
    }
  }

  function drawSnake() {
    const colorSet = SNAKE_COLORS[config.snakeColor] || SNAKE_COLORS[0];
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? colorSet.head : colorSet.body;
      const x = seg.x*CELL, y = seg.y*CELL;

      if (config.snakeStyle === 'round') {
        ctx.beginPath();
        ctx.arc(x+CELL/2, y+CELL/2, CELL/2-1.5, 0, Math.PI*2);
        ctx.fill();
      } else if (config.snakeStyle === 'small') {
        ctx.fillRect(x+3, y+3, CELL-6, CELL-6);
      } else {
        ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
      }
    });
  }

  function drawFood() {
    const color = FOOD_COLORS[config.foodColor] || FOOD_COLORS[0];
    ctx.fillStyle = color;
    const cx = food.x*CELL + CELL/2;
    const cy = food.y*CELL + CELL/2;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL/2-2, 0, Math.PI*2);
    ctx.fill();
  }

  function tick() {
    if (!alive || paused) return;
    dir = nextDir;
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

    if (head.x<0 || head.x>=COLS || head.y<0 || head.y>=ROWS) {
      return gameOver();
    }
    if (snake.some(s => s.x===head.x && s.y===head.y)) {
      return gameOver();
    }

    snake.unshift(head);

    if (head.x===food.x && head.y===food.y) {
      score += 1;
      updateScore();
      eatSound();
      placeFood();
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    alive = false;
    gameOverSound();
    if (score > getHiScore()) setHiScore(score);
    if (hiscoreEl) hiscoreEl.textContent = String(getHiScore()).padStart(3,'0');

    showStatus('GAME OVER', 'red');
  }

  function togglePause() {
    if (!started || !alive) return;
    paused = !paused;
    clickSound();

    if (paused) {
      showStatus('GAME PAUSED', 'red');
    } else {
      showStatus('PLAYING', 'green');
      hideStatusLater(1500);
      lastTick = performance.now();
    }
  }

  function loop(ts) {
    if (started && alive && !paused) {
      if (ts - lastTick >= tickInterval) {
        tick();
        lastTick = ts;
      }
      drawGrid();
      drawFood();
      drawSnake();
    }
    animationId = requestAnimationFrame(loop);
  }

  function startGame() {
    resetGame();
    started = true;
    paused = false;
    tickInterval = DIFFICULTIES[config.difficulty] ? DIFFICULTIES[config.difficulty].speed : 180;
    lastTick = performance.now();

    showStatus('GAME STARTING...', 'green');
    hideStatusLater(1500);

    if (!animationId) animationId = requestAnimationFrame(loop);
  }

  // ===== স্ক্রিন নেভিগেশন =====
  function showScreen(name) {
    if (menuScreen) menuScreen.classList.add('hidden');
    if (customScreen) customScreen.classList.add('hidden');
    if (gameScreen) gameScreen.classList.add('hidden');

    if (name === 'menu' && menuScreen) menuScreen.classList.remove('hidden');
    if (name === 'custom' && customScreen) customScreen.classList.remove('hidden');
    if (name === 'game' && gameScreen) gameScreen.classList.remove('hidden');
  }

  // ===== বাটন হ্যান্ডলার (সেফ) =====
  const playBtn = $('playBtn');
  if (playBtn) {
    playBtn.onclick = () => {
      clickSound();
      showScreen('game');
      startGame();
    };
  }

  const customBtn = $('customBtn');
  if (customBtn) {
    customBtn.onclick = () => {
      clickSound();
      buildCustomUI();
      showScreen('custom');
    };
  }

  const howBtn = $('howBtn');
  if (howBtn) {
    howBtn.onclick = () => {
      clickSound();
      alert(
        "🎮 কিভাবে খেলবেন:\n\n" +
        "• তীর চিহ্ন (Arrow keys) বা WASD দিয়ে সাপ চালান\n" +
        "• মোবাইলে D-Pad বা Swipe ব্যবহার করুন\n" +
        "• মাঝখানে ক্লিক = Pause / Resume\n" +
        "• গেম ওভার হলে মাঝখানে ক্লিক = নতুন গেম\n" +
        "• প্রতিটি খাবারে +১ পয়েন্ট\n" +
        "• দেয়াল বা নিজের গায়ে ধাক্কা = Game Over"
      );
    };
  }

  const customPlayBtn = $('customPlayBtn');
  if (customPlayBtn) {
    customPlayBtn.onclick = () => {
      clickSound();
      showScreen('game');
      startGame();
    };
  }

  const gameSettingsBtn = $('gameSettingsBtn');
  if (gameSettingsBtn) {
    gameSettingsBtn.onclick = () => {
      clickSound();
      if (started && alive) {
        paused = true;
        showStatus('GAME PAUSED', 'red');
      }
      buildCustomUI();
      showScreen('custom');
    };
  }

  const pauseCenter = $('pauseCenter');
  if (pauseCenter) {
    pauseCenter.addEventListener('click', () => {
      if (started && !alive) {
        startGame();
        return;
      }
      if (started && alive) {
        togglePause();
        return;
      }
      if (!started) {
        startGame();
      }
    });
  }

  // ===== কন্ট্রোল =====
  function setDirection(d) {
    const dirs = {
      up:{x:0,y:-1}, down:{x:0,y:1},
      left:{x:-1,y:0}, right:{x:1,y:0}
    };
    const nd = dirs[d];
    if (!nd) return;
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
  }

  // কীবোর্ড
  document.addEventListener('keydown', e => {
    const map = {
      ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
      w:'up', s:'down', a:'left', d:'right',
      W:'up', S:'down', A:'left', D:'right'
    };
    if (map[e.key]) { e.preventDefault(); setDirection(map[e.key]); }

    if (e.key === ' ') {
      e.preventDefault();
      if (started && !alive) {
        startGame();
      } else if (started && alive) {
        togglePause();
      } else {
        startGame();
      }
    }
  });

  // D-Pad
  document.querySelectorAll('.dpad[data-dir]').forEach(btn => {
    const fire = e => {
      if (e) e.preventDefault();
      setDirection(btn.dataset.dir);
    };
    btn.addEventListener('touchstart', fire, {passive:false});
    btn.addEventListener('mousedown', fire);
  });

  // Canvas tap / swipe
  let ts = null;

  canvas.addEventListener('touchstart', e => {
    ts = {x:e.touches[0].clientX, y:e.touches[0].clientY};
  }, {passive:true});

  canvas.addEventListener('touchend', e => {
    if (!ts) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ts.x, dy = t.clientY - ts.y;

    if (Math.abs(dx)<20 && Math.abs(dy)<20) {
      if (started && !alive) startGame();
      ts = null;
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx>0?'right':'left');
    else setDirection(dy>0?'down':'up');
    ts = null;
  }, {passive:true});

  canvas.addEventListener('click', () => {
    if (started && !alive) startGame();
  });

  // ===== PWA Install Button =====
  let deferredPrompt = null;
  const installBtn = $('installBtn');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.classList.remove('hidden');
    console.log('✅ ইনস্টল প্রম্পট তৈরি');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        alert(
          "📲 ইনস্টল করার নিয়ম:\n\n" +
          "• Android Chrome: মেনু (⋮) → 'Install app' বা 'Add to Home screen'\n" +
          "• iPhone Safari: Share (□↑) → 'Add to Home Screen'"
        );
        return;
      }

      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log('ইনস্টল ফলাফল:', result.outcome);

      deferredPrompt = null;
      installBtn.classList.add('hidden');
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
    console.log('✅ অ্যাপ ইনস্টল হয়েছে!');
    playSound(1000, 0.1, 'square', 0.05);
    setTimeout(() => playSound(1500, 0.15, 'square', 0.05), 100);
  });

  // standalone mode এ থাকলে বাটন লুকাও
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      if (installBtn) installBtn.classList.add('hidden');
    }
  } catch(e) {}

  // ===== ইনিশিয়ালাইজ =====
  loadConfig();
  resetGame();
  showScreen('menu');

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

})();
