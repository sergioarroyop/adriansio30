// juego2_trex.js - Runner estilo T-Rex con assets personalizados

(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Dimensiones fijas
  const GAME_WIDTH = 1000;
  const GAME_HEIGHT = 800;
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  // Modales
  const startModal = document.getElementById('startModal');
  const startBtn = document.getElementById('startBtn');
  const winModal = document.getElementById('winModal');
  const winBackBtn = document.getElementById('winBackBtn');
  const winRestartBtn = document.getElementById('winRestartBtn');
  const overModal = document.getElementById('gameOverModal');
  const overBackBtn = document.getElementById('overBackBtn');
  const overRestartBtn = document.getElementById('overRestartBtn');
  const distanceLabel = document.getElementById('distanceLabel');

  // Imágenes
  const IMG = {
    player: new Image(),
    ground: new Image(),
    messi: new Image(),
    offside: new Image(),
    goal: new Image()
  };
  IMG.player.src = 'https://i.postimg.cc/L8L9ncqs/cr7.png';
  IMG.ground.src = 'https://i.postimg.cc/TP1tk6rd/grass.jpg';
  IMG.messi.src = 'https://i.postimg.cc/bJXBVvpx/mepsi.png';
  IMG.offside.src = 'https://i.postimg.cc/Xqs4d5dN/fuera-de-juego.png';
  IMG.goal.src = 'https://i.postimg.cc/0NmsyFNC/porteria.png';

  // Estado
  const gravity = 0.0022; // px/ms^2
  const baseSpeed = 0.6; // px/ms
  let gameSpeed = baseSpeed;   // px/ms
  const speedPerPoint = 0.005; // incremento gradual en función de la puntuación
  let CR7_MODE = false;
  let running = false;
  let WIN_STATE = false;
  window.WIN_STATE = WIN_STATE; // para panel

  let score = 0; // puntos
  const targetScore = 93;
  const scoreRate = targetScore / 35000; // ~93 pts en 35s

  const groundY = GAME_HEIGHT - 120;

  const player = {
    x: 80, y: groundY - 80, w: 80, h: 80,
    vy: 0, onGround: true
  };

  const obstacles = [];
  let spawnTimer = 0;
  let spawnInterval = 1100; // ms
  let goalSpawned = false;
  let spawningEnabled = true;

  // Controles
  const keys = {};
  function getJumpImpulse(){
    return CR7_MODE ? -1.35 : -0.9;
  }

  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if ((e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && player.onGround && running) {
      player.vy = getJumpImpulse(); // impulso inicial
      player.onGround = false;
    }
  });
  document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

  // Funciones modales
  function show(el){ el && el.classList.remove('hidden'); }
  function hide(el){ el && el.classList.add('hidden'); }

  if (startBtn) startBtn.addEventListener('click', () => { running = true; hide(startModal); });
  if (winBackBtn) winBackBtn.addEventListener('click', () => (window.location.href = 'index.html'));
  if (overBackBtn) overBackBtn.addEventListener('click', () => (window.location.href = 'index.html'));
  if (winRestartBtn) winRestartBtn.addEventListener('click', resetGame);
  if (overRestartBtn) overRestartBtn.addEventListener('click', resetGame);

  function resetGame(){
    running = false; WIN_STATE = false; window.WIN_STATE = false;
    score = 0; gameSpeed = 0.45; spawnTimer = 0; spawnInterval = 1100;
    goalSpawned = false; spawningEnabled = true;
    obstacles.length = 0;
    player.x = 80; player.y = groundY - 80; player.vy = 0; player.onGround = true;
    hide(winModal); hide(overModal);
    show(startModal);
  }

  function spawnObstacle(){
    if (!spawningEnabled) return;
    const isAir = Math.random() < 0.3; // 30% pájaros (fuera de juego)
    if (isAir) {
      const size = 48;
      const marginAboveHead = 12 + Math.random() * 8; // 12-20 px por encima de la cabeza
      const y = (groundY - player.h) - marginAboveHead - size;
      obstacles.push({ type: 'offside', x: GAME_WIDTH + 20, y, w: size, h: size });
    } else {
      const w = 60, h = 64;
      // Crear grupos de Messi pegados (1-3) para saltar de una vez
      let cluster = 1;
      const r = Math.random();
      if (r < 0.2) cluster = 3; // 20% tres
      else if (r < 0.6) cluster = 2; // 40% dos
      const gap = 18 + Math.floor(Math.random() * 12); // 18-30px entre Messis
      const startX = GAME_WIDTH + 20;
      for (let i = 0; i < cluster; i++) {
        obstacles.push({ type: 'messi', x: startX + i * (w + gap), y: groundY - h, w, h });
      }
    }
  }

  function spawnGoal(){
    // Spawn único de portería
    goalSpawned = true; spawningEnabled = false;
    const w = 120, h = 160;
    obstacles.push({ type: 'goal', x: GAME_WIDTH + 40, y: groundY - h, w, h });
  }

  function update(dt){
    if (!running) return;

    // Aumentar velocidad gradualmente según la puntuación + Modo CR7
    gameSpeed = baseSpeed + score * speedPerPoint;
    const effectiveSpeed = gameSpeed * (CR7_MODE ? 2.2 : 1);

    // Score
    score += scoreRate * dt;
    if (score >= targetScore && !goalSpawned) {
      score = targetScore;
      spawnGoal();
    }
    if (distanceLabel) distanceLabel.textContent = `${Math.floor(score)} pts`;

    // Spawns
    spawnTimer += dt;
    const currentInterval = Math.max(650, spawnInterval - (effectiveSpeed*300));
    if (spawnTimer >= currentInterval && spawningEnabled) {
      spawnTimer = 0;
      spawnObstacle();
    }

    // Físicas jugador
    player.vy += gravity * dt;
    player.y += player.vy * dt;
    if (player.y + player.h >= groundY) {
      player.y = groundY - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    // Mover obstáculos y colisiones
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= effectiveSpeed * dt;
      if (o.x + o.w < -50) { obstacles.splice(i,1); continue; }

      // Colisión
      if (!window.IMMORTAL_MODE) {
        if (player.x < o.x + o.w && player.x + player.w > o.x && player.y < o.y + o.h && player.y + player.h > o.y) {
          if (o.type === 'goal') {
            running = false; WIN_STATE = true; window.WIN_STATE = true;
            show(winModal);
            if (window.GameStorage) {
              window.GameStorage.onJuego2Complete(Math.floor(score));
            }
          } else {
            running = false; show(overModal);
          }
        }
      }
    }
  }

  // Suelo en mosaico desplazable
  function drawGround(){
    const tileW = 128, tileH = 64;
    const y = groundY;
    if (IMG.ground.complete) {
      const pattern = ctx.createPattern(IMG.ground, 'repeat');
      ctx.save();
      ctx.translate(-((performance.now()/6) % tileW), 0);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, y, GAME_WIDTH + tileW, tileH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#6ab04c';
      ctx.fillRect(0, y, GAME_WIDTH, 64);
    }
  }

  function draw(){
    ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT);
    // Cielo
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);

    // Suelo
    drawGround();

    // Jugador
    if (IMG.player.complete) {
      ctx.drawImage(IMG.player, player.x, player.y, player.w, player.h);
    } else {
      ctx.fillStyle = '#222';
      ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // Obstáculos
    for (const o of obstacles) {
      let img = null;
      if (o.type === 'messi') img = IMG.messi;
      else if (o.type === 'offside') img = IMG.offside;
      else if (o.type === 'goal') img = IMG.goal;
      if (img && img.complete) {
        ctx.drawImage(img, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = o.type === 'goal' ? '#ffd600' : '#c0392b';
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    }
  }

  let last = performance.now();
  function loop(now){
    const dt = Math.min(50, now - last); last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Inicio
  if (startModal) startModal.classList.remove('hidden');
  running = false;
  requestAnimationFrame(loop);

  // Exponer utilidades para el panel
  window.resetGame = resetGame;
  window.getCurrentScore = () => score;
  window.setCR7Mode = (active) => { CR7_MODE = !!active; };
})();
