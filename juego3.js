// juego3.js - Juego 3: Monta los tacos en orden

// ===== Canvas y contexto =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Dimensiones fijas como otros juegos
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 800;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
canvas.style.width = '100%';
canvas.style.height = '100%';

// ===== Pantalla de inicio =====
const startModal = document.getElementById('startModal');
const startBtn = document.getElementById('startBtn');

// Modales
const winModal = document.getElementById('winModal');
const gameOverModal = document.getElementById('gameOverModal');
const winBackBtn = document.getElementById('winBackBtn');
const winRestartBtn = document.getElementById('winRestartBtn');
const overBackBtn = document.getElementById('overBackBtn');
const overRestartBtn = document.getElementById('overRestartBtn');

// ===== Estado del juego =====
const ORDER = [
  { type: 'tortilla' },
  { type: 'carnitas' },
  { type: 'queso' }
];

// Imágenes
const IMAGES = {
  tortilla: new Image(),
  queso: new Image(),
  carnitas: new Image(),
  tomate: new Image(),
  lechuga: new Image(),
  player: new Image(),
  xokas: new Image()
};
IMAGES.tortilla.src = 'https://i.postimg.cc/Xqc1JZpV/tortillas.webp';
IMAGES.queso.src = 'https://i.postimg.cc/gJcffFsS/585e8fc6cb11b227491c34cf-1.png';
IMAGES.carnitas.src = 'https://i.postimg.cc/TY0HvWz0/carnitas.avif';
IMAGES.tomate.src = 'https://i.postimg.cc/QxhnzqyV/tomate.webp';
IMAGES.lechuga.src = 'https://i.postimg.cc/KYk9TpRp/lechuga.webp';
IMAGES.player.src = 'https://i.postimg.cc/YS5dzNFr/oso.png';
IMAGES.xokas.src = 'https://i.postimg.cc/sDFRg8gX/xokas-cocinando-69-Photoroom.png';

let player;
let items; // objetos cayendo
let keys = {};
let tacosMade;
let targetTacos = 3;
let nextIndex; // índice del siguiente ingrediente requerido
let spawnTimer;
let spawnInterval;
let running = true;
let firstStart = true;
let XOKAS_MODE = false;

// ===== Utilidades =====
function resetGame() {
  player = {
    x: GAME_WIDTH / 2 - 55,
    y: GAME_HEIGHT - 120,
    w: 120,
    h: 100,
    speed: 6
  };
  items = [];
  tacosMade = 0;
  nextIndex = 0;
  spawnTimer = 0;
  spawnInterval = 900; // ms entre spawns
  running = true;
  hideModals();
  updatePanelStats();
}

function setXokasMode(active) {
  XOKAS_MODE = !!active;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function hideModals() {
  if (winModal) winModal.classList.add('hidden');
  if (gameOverModal) gameOverModal.classList.add('hidden');
}

function gameOver() {
  running = false;
  if (gameOverModal) gameOverModal.classList.remove('hidden');
  updatePanelStats();
}

function winGame() {
  running = false;
  if (winModal) winModal.classList.remove('hidden');
  if (window.GameStorage) {
    window.GameStorage.onJuego3Complete();
  }
  updatePanelStats();
}

// ===== Side panel stats =====
function updatePanelStats() {
  if (!window.SidePanel) return;
  const required = ORDER[nextIndex];
  const status = running
    ? `Siguiente: ${capitalize(required.type)} | Tacos ${tacosMade}/${targetTacos}`
    : (winModal && !winModal.classList.contains('hidden'))
      ? '✅ Completado'
      : '❌ Orden incorrecto';
  window.SidePanel.updateSidePanelStats({
    score: tacosMade,
    level: Math.max(1, tacosMade + 1),
    status
  });
}

// ===== Entrada =====
document.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Control por ratón/táctil (mover al x del puntero)
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const relX = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
  player.x = Math.max(0, Math.min(GAME_WIDTH - player.w, relX - player.w / 2));
});
canvas.addEventListener('touchmove', (e) => {
  if (!e.touches || !e.touches[0]) return;
  const rect = canvas.getBoundingClientRect();
  const relX = ((e.touches[0].clientX - rect.left) / rect.width) * GAME_WIDTH;
  player.x = Math.max(0, Math.min(GAME_WIDTH - player.w, relX - player.w / 2));
});

// Botones de modales e inicio
if (winBackBtn) winBackBtn.addEventListener('click', () => (window.location.href = 'index.html'));
if (overBackBtn) overBackBtn.addEventListener('click', () => (window.location.href = 'index.html'));
if (winRestartBtn) winRestartBtn.addEventListener('click', resetGame);
if (overRestartBtn) overRestartBtn.addEventListener('click', resetGame);
if (startBtn) startBtn.addEventListener('click', () => {
  running = true;
  firstStart = false;
  if (startModal) startModal.classList.add('hidden');
});

// ===== Spawning de objetos =====
function maybeSpawn(dt) {
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;

    // Aumentar dificultad: reducir intervalo y aumentar velocidad base
    spawnInterval = Math.max(450, spawnInterval - 10);

    // Probabilidad de forzar el siguiente ingrediente para que siempre haya opción válida
    const forceNext = Math.random() < 0.3; // 55%
    let chosenType;
    if (forceNext) {
      chosenType = ORDER[nextIndex].type;
    } else {
      // 70% ingredientes válidos, 30% saludables (peligro)
      const pool = Math.random() < 0.5
        ? ['tortilla','carnitas','queso']
        : ['tomate','lechuga'];
      chosenType = pool[Math.floor(Math.random() * pool.length)];
    }

    items.push({
      type: chosenType,
      hazard: chosenType === 'tomate' || chosenType === 'lechuga',
      x: Math.random() * (GAME_WIDTH - 64) + 32,
      y: -40,
      r: 28, // radio para colisión/dibujo y tamaño base
      // Velocidad base; el incremento por tacos se aplica en update() via multiplicador
      vy: 3.0 + Math.random() * 1.2
    });
  }
}

// ===== Actualización =====
function update(dt) {
  if (!running) return;

  // Movimiento jugador
  if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
  if (keys['d'] || keys['arrowright']) player.x += player.speed;
  player.x = Math.max(0, Math.min(GAME_WIDTH - player.w, player.x));

  // Spawning
  maybeSpawn(dt);

  // Movimiento objetos y colisiones
  let speedMult = tacosMade >= 2 ? 1.5 : (tacosMade >= 1 ? 1.25 : 1.0);
  if (XOKAS_MODE) speedMult *= 0.35; // Muy lento en modo xokas
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += it.vy * speedMult;

    // Colisión con jugador (AABB aproximado)
    const inX = it.x + it.r > player.x && it.x - it.r < player.x + player.w;
    const inY = it.y + it.r > player.y && it.y - it.r < player.y + player.h;
    if (inX && inY) {
      // Verificar peligro y orden
      if (it.hazard) {
        gameOver();
        return;
      }
      const required = ORDER[nextIndex].type;
      if (it.type === required) {
        // Correcto
        nextIndex++;
        if (nextIndex >= ORDER.length) {
          nextIndex = 0;
          tacosMade++;
          updatePanelStats();
          // Pequeño efecto: limpiar pantalla de sobrantes del mismo tipo anterior
          items.splice(i, 1);
          // ¿Victoria?
          if (tacosMade >= targetTacos) {
            winGame();
            return;
          }
        } else {
          // Avanza al siguiente ingrediente
          items.splice(i, 1);
          updatePanelStats();
        }
      } else {
        // Orden incorrecto -> Pierde
        gameOver();
        return;
      }
    } else if (it.y - it.r > GAME_HEIGHT + 40) {
      // Sale de pantalla -> eliminar
      items.splice(i, 1);
    }
  }
}

// ===== Dibujo =====
function draw() {
  // Fondo
  ctx.fillStyle = '#90EE90';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Zona inferior (plato/mesa)
  ctx.fillStyle = '#7CB342';
  ctx.fillRect(0, GAME_HEIGHT - 40, GAME_WIDTH, 40);

  // Jugador (Big Osito / Xokas)
  const playerImg = XOKAS_MODE ? IMAGES.xokas : IMAGES.player;
  if (playerImg && playerImg.complete) {
    ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  // Objetos (ingredientes y peligros)
  for (const it of items) {
    const img = IMAGES[it.type];
    const size = it.r * 2.2;
    const drawX = it.x - size / 2;
    const drawY = it.y - size / 2;
    if (img && img.complete) {
      ctx.drawImage(img, drawX, drawY, size, size);
    } else {
      // Fallback simple
      ctx.beginPath();
      ctx.fillStyle = it.hazard ? '#66BB6A' : '#FFD54F';
      ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ===== Bucle principal =====
let last = performance.now();
function loop(now) {
  const dt = Math.min(100, now - last); // ms
  last = now;
  update(dt);
  draw();
  updatePanelStats();
  requestAnimationFrame(loop);
}

// ===== Inicio =====
resetGame();
// Mostrar pantalla inicial y pausar hasta que el jugador comience
if (startModal) startModal.classList.remove('hidden');
running = false;
requestAnimationFrame(loop);
