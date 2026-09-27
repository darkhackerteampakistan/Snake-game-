const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const startBtn = document.getElementById('startBtn');

const CELL = 12;
const COLS = canvas.width / CELL;   // 20
const ROWS = canvas.height / CELL;  // 20

const BG = '#9bbc0f';
const GRID = '#8aa80d';
const SNAKE_HEAD = '#0f380f';
const SNAKE_BODY = '#306230';
const FOOD = '#0f380f';
const TEXT = '#0f380f';

let snake, dir, nextDir, food, score, alive, started, tickInterval, lastTick;

function resetGame() {
  snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
  dir = {x: 1, y: 0};
  nextDir = {x: 1, y: 0};
  score = 0;
  alive = true;
  placeFood();
  updateScore();
}

function placeFood() {
  while (true) {
    const f = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) {
      food = f;
      return;
    }
  }
}

function updateScore() {
  scoreEl.textContent = String(score).padStart(3, '0');
}

function drawGrid() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? SNAKE_HEAD : SNAKE_BODY;
    ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function drawFood() {
  ctx.fillStyle = FOOD;
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL / 2 - 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function tick() {
  if (!alive) return;

  dir = nextDir;
  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

  // দেয়ালে ধাক্কা
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return gameOver();
  }
  // নিজের গায়ে ধাক্কা
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    updateScore();
    placeFood();
    // গতি একটু বাড়াও
    tickInterval = Math.max(60, tickInterval - 1);
  } else {
    snake.pop();
  }
}

function gameOver() {
  alive = false;
  overlayTitle.textContent = 'GAME OVER';
  overlayText.textContent = `Score: ${score}`;
  startBtn.textContent = 'RETRY';
  overlay.classList.remove('hidden');
}

function loop(timestamp) {
  if (started && alive) {
    if (timestamp - lastTick >= tickInterval) {
      tick();
      lastTick = timestamp;
    }
    drawGrid();
    drawFood();
    drawSnake();
  }
  requestAnimationFrame(loop);
}

function startGame() {
  resetGame();
  overlay.classList.add('hidden');
  started = true;
  alive = true;
  tickInterval = 150;
  lastTick = performance.now();
}

function setDirection(d) {
  const dirs = {
    up:    {x: 0, y: -1},
    down:  {x: 0, y: 1},
    left:  {x: -1, y: 0},
    right: {x: 1, y: 0}
  };
  const nd = dirs[d];
  if (!nd) return;
  // উল্টো দিকে ঘুরতে দেব না
  if (nd.x === -dir.x && nd.y === -dir.y) return;
  nextDir = nd;
}

// কীবোর্ড
document.addEventListener('keydown', e => {
  const keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };
  if (keyMap[e.key]) {
    e.preventDefault();
    setDirection(keyMap[e.key]);
  }
  if (e.key === ' ' && !alive) {
    e.preventDefault();
    startGame();
  }
  if (e.key === ' ' && !started) {
    startGame();
  }
});

// D-Pad বাটন
document.querySelectorAll('.dpad[data-dir]').forEach(btn => {
  const fire = e => {
    e.preventDefault();
    setDirection(btn.dataset.dir);
  };
  btn.addEventListener('touchstart', fire, {passive: false});
  btn.addEventListener('mousedown', fire);
});

// ট্যাপ করে শুরু
startBtn.addEventListener('click', startGame);

// Swipe (মোবাইলে)
let touchStart = null;
canvas.addEventListener('touchstart', e => {
  touchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
}, {passive: true});

canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(dx > 0 ? 'right' : 'left');
  } else {
    setDirection(dy > 0 ? 'down' : 'up');
  }
  touchStart = null;
}, {passive: true});

// শুরু করো
resetGame();
requestAnimationFrame(loop);

// PWA service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
