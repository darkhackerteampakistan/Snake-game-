const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ===== এলিমেন্ট =====
const menuScreen = document.getElementById('menuScreen');
const customScreen = document.getElementById('customScreen');
const gameScreen = document.getElementById('gameScreen');
const scoreEl = document.getElementById('score');
const hiscoreEl = document.getElementById('hiscore');
const statusText = document.getElementById('statusText');

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

let snake, dir, nextDir, food, score, alive, paused, started;
let tickInterval, lastTick, animationId;

// ===== সাউন্ড =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, duration, type = 'square', volume = 0.08) {
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

// ===== localStorage =====
function loadConfig() {
  try {
    const saved = localStorage.getItem('snakeConfig');
    if (saved) config = { ...config, ...JSON.parse(saved) };
  } catch(e) {}
}

function saveConfig() {
  localStorage.setItem('snakeConfig', JSON.stringify(config));
}

function getHiScore() {
  return parseInt(localStorage.getItem('snakeHi_' + config.difficulty) || '0');
}

function setHiScore(v) {
  localStorage.setItem('snakeHi_' + config.difficulty, v);
}

// ===== কাস্টমাইজ UI =====
function buildCustomUI() {
  // Theme
  const themeRow = document.getElementById('themeRow');
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

  // Snake Color
  const scRow = document.getElementById('snakeColorRow');
  scRow.innerHTML = '';
  SNAKE_COLORS.forEach((c, i) => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (config.snakeColor === i ? ' active' : '');
    sw.style.background = `linear-gradient(135deg, ${c.head}, ${c.body})`;
    sw.title = c.name;
    sw.onclick = () => {
      config.snakeColor = i; saveConfig(); buildCustomUI(); clickSound();
    };
    scRow.appendChild(sw);
  });

  // Food Color
  const fcRow = document.getElementById('foodColorRow');
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

  // Snake Style
  const stRow = document.getElementById('snakeStyleRow');
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

  // Difficulty
  const dRow = document.getElementById('diffRow');
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
  hiscoreEl.textContent = String(getHiScore()).padStart(3,'0');
}

function placeFood() {
  while (true) {
    const f = {
      x: Math.floor(Math.random()*COLS),
      y: Math.floor(Math.random()*ROWS)
    };
    if (!snake.some(s => s.x===f.x && s.y===f.y)) { food = f; return; }
  }
}

function updateScore() {
  scoreEl.textContent = String(score).padStart(3,'0');
}

function drawGrid() {
  const th = THEMES[config.theme];
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
  const colorSet = SNAKE_COLORS[config.snakeColor];
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
  const color = FOOD_COLORS[config.foodColor];
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

  if (head.x<0 || head.x>=COLS || head.y<0 || head.y>=ROWS) return gameOver();
  if (snake.some(s => s.x===head.x && s.y===head.y)) return gameOver();

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

  statusText.textContent = 'GAME OVER';
  statusText.className = 'status-text';
  statusText.classList.remove('hidden');
}

function togglePause() {
  if (!started || !alive) return;
  paused = !paused;
  clickSound();
  
  if (paused) {
    statusText.textContent = 'GAME PAUSED';
    statusText.className = 'status-text';
    statusText.classList.remove('hidden');
  } else {
    statusText.textContent = 'PLAYING';
    statusText.className = 'status-text playing';
    setTimeout(() => {
      statusText.classList.add('hidden');
    }, 1500);
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
  tickInterval = DIFFICULTIES[config.difficulty].speed;
  lastTick = performance.now();
  
  statusText.textContent = 'GAME STARTING...';
  statusText.className = 'status-text playing';
  statusText.classList.remove('hidden');
  
  setTimeout(() => {
    statusText.classList.add('hidden');
  }, 1500);
  
  if (!animationId) animationId = requestAnimationFrame(loop);
}

// ===== স্ক্রিন নেভিগেশন =====
function showScreen(name) {
  menuScreen.classList.add('hidden');
  customScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  
  if (name === 'menu') menuScreen.classList.remove('hidden');
  if (name === 'custom') customScreen.classList.remove('hidden');
  if (name === 'game') gameScreen.classList.remove('hidden');
}

// ===== বাটন হ্যান্ডলার =====
document.getElementById('playBtn').onclick = () => {
  clickSound();
  showScreen('game');
  startGame();
};

document.getElementById('customBtn').onclick = () => {
  clickSound();
  buildCustomUI();
  showScreen('custom');
};

document.getElementById('howBtn').onclick = () => {
  clickSound();
  alert(
    "🎮 কিভাবে খেলবেন:\n\n" +
    "• তীর চিহ্ন (Arrow keys) বা WASD দিয়ে সাপ চালান\n" +
    "• মোবাইলে D-Pad বা Swipe ব্যবহার করুন\n" +
    "• মাঝখানে ক্লিক = Pause / Resume\n" +
    "• প্রতিটি খাবারে +১ পয়েন্ট\n" +
    "• দেয়াল বা নিজের গায়ে ধাক্কা = Game Over"
  );
};

document.getElementById('customPlayBtn').onclick = () => {
  clickSound();
  showScreen('game');
  startGame();
};

document.getElementById('gameSettingsBtn').onclick = () => {
  clickSound();
  if (started && alive) {
    paused = true;
    statusText.textContent = 'GAME PAUSED';
    statusText.className = 'status-text';
    statusText.classList.remove('hidden');
  }
  buildCustomUI();
  showScreen('custom');
};

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

document.addEventListener('keydown', e => {
  const map = {
    ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
    w:'up', s:'down', a:'left', d:'right',
    W:'up', S:'down', A:'left', D:'right'
  };
  if (map[e.key]) { e.preventDefault(); setDirection(map[e.key]); }
  if (e.key === ' ') { e.preventDefault(); togglePause(); }
});

document.querySelectorAll('.dpad[data-dir]').forEach(btn => {
  const fire = e => { e.preventDefault(); setDirection(btn.dataset.dir); };
  btn.addEventListener('touchstart', fire, {passive:false});
  btn.addEventListener('mousedown', fire);
});

document.getElementById('pauseCenter').addEventListener('click', togglePause);

// Swipe
let ts = null;
canvas.addEventListener('touchstart', e => {
  ts = {x:e.touches[0].clientX, y:e.touches[0].clientY};
}, {passive:true});

canvas.addEventListener('touchend', e => {
  if (!ts) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - ts.x, dy = t.clientY - ts.y;
  if (Math.abs(dx)<20 && Math.abs(dy)<20) return;
  if (Math.abs(dx) > Math.abs(dy)) setDirection(dx>0?'right':'left');
  else setDirection(dy>0?'down':'up');
  ts = null;
}, {passive:true});

// ===== ইনিশিয়ালাইজ =====
loadConfig();
resetGame();
showScreen('menu');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
