// game.js

// ===== Elementos principales del DOM =====
const container = document.getElementById('container');
const wrapper = document.getElementById('gameWrapper');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const floorInfo = document.getElementById('floorInfo');
const restartBtn = document.getElementById('restartBtn');
const overlay = document.getElementById('overlay');
const winModal = document.getElementById('winModal');

// ===== Recursos gráficos (sprites e imágenes) =====
const floorTexture = new Image();
floorTexture.src = "https://i.postimg.cc/TP1tk6rd/grass.jpg";
let floorPattern = null;
floorTexture.onload = () => {
  floorPattern = ctx.createPattern(floorTexture, 'repeat');
};

// Jugador
const playerImg = new Image();
playerImg.src = "https://i.postimg.cc/L8L9ncqs/cr7.png";

// Enemigos terrestres y voladores
const groundEnemyImg = new Image();
groundEnemyImg.src = "https://i.postimg.cc/bJXBVvpx/mepsi.png";

const flyingEnemyImg = new Image();
flyingEnemyImg.src = "https://i.postimg.cc/Xqs4d5dN/fuera-de-juego.png";

// Meta (portería)
const goalImg = new Image();
goalImg.src = "https://i.postimg.cc/0NmsyFNC/porteria.png";

// ===== Constantes de configuración =====
const GRAVITY = 0.55;       // Gravedad que afecta al jugador
const JUMP_FORCE = -12;     // Fuerza del salto
const SPEED = 2.5;          // Velocidad lateral del jugador
const TOTAL_FLOORS = 5;     // Número total de pisos
const START_Y = 180;        // Altura inicial del primer piso
const SIDE_MARGIN = 2 * 20; // Márgenes laterales de los huecos
const GAME_WIDTH = 1920;    // Ancho fijo del juego
const GAME_HEIGHT = 1080;   // Alto fijo del juego
const FLOOR_THICKNESS = 40; // Grosor de cada piso

// Distancia vertical entre pisos
const FLOOR_GAP = (GAME_HEIGHT - START_Y - FLOOR_THICKNESS) / (TOTAL_FLOORS - 1);

// ===== Estado del juego =====
let currentFloor = 1;
let cameraY = 0;
let floors = [];   // Lista de pisos
let enemies = [];  // Lista de enemigos
let goal = null;   // Meta (portería)
let gameWon = false;

// ===== Definición del jugador =====
const player = {
  x: 0,
  y: 0,
  w: 48,              // ancho
  h: 48,              // alto
  vy: 0,              // velocidad vertical
  onGround: false,    // si está en el suelo
  hitboxPadding: 6    // margen para la colisión (hitbox más pequeña)
};

// ===== Tamaño de huecos =====
const GAP_WIDTH = player.w * 3; // Huecos de caída (3 veces el ancho del jugador)

// ===== Control de teclas =====
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'w') { // Salto con W
    if (player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
    }
  }
});
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// ===== Creación del campo, pisos y enemigos =====
function createFloors(){
  floors = [];
  enemies = [];
  goal = null;
  gameWon = false;
  winModal.classList.add("hidden");

  for(let i=0;i<TOTAL_FLOORS;i++){
    let y;
    // Posición vertical del piso
    if (i === TOTAL_FLOORS - 1) {
      y = GAME_HEIGHT - FLOOR_THICKNESS/2;
    } else {
      y = START_Y + i*FLOOR_GAP;
    }

    // Último piso sin hueco + meta
    if (i === TOTAL_FLOORS - 1) {
      floors.push({ y, gapX: -1, gapWidth: 0 });
      goal = { x: GAME_WIDTH - 80, y: y - FLOOR_THICKNESS/2 - 80, w: 60, h: 60 };
    } else {
      // Alternar huecos izquierda/derecha
      let gapX;
      if (i % 2 === 0) {
        gapX = GAME_WIDTH - GAP_WIDTH - SIDE_MARGIN;
      } else {
        gapX = SIDE_MARGIN;
      }
      floors.push({ y, gapX, gapWidth: GAP_WIDTH });
    }

    // === Enemigos por piso ===
    if (i === 0) {
      // Piso 1: un terrestre + un volador
      enemies.push({ x: GAME_WIDTH/3, y: y - FLOOR_THICKNESS/2 - 40, w: 40, h: 40, vx: 2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/2, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: 2, floorIndex: i, type: 'flying' });
    } else if (i === 1) {
      // Piso 2: un terrestre + dos voladores
      enemies.push({ x: GAME_WIDTH/3, y: y - FLOOR_THICKNESS/2 - 40, w: 40, h: 40, vx: 2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/4, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: 2, floorIndex: i, type: 'flying' });
      enemies.push({ x: (3*GAME_WIDTH)/4, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: -2, floorIndex: i, type: 'flying' });
    } else if (i === 2) {
      // Piso 3: un terrestre + tres voladores
      enemies.push({ x: GAME_WIDTH/2, y: y - FLOOR_THICKNESS/2 - 40, w: 40, h: 40, vx: -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/4, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: 2, floorIndex: i, type: 'flying' });
      enemies.push({ x: GAME_WIDTH/2, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: -2, floorIndex: i, type: 'flying' });
      enemies.push({ x: (3*GAME_WIDTH)/4, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: 2, floorIndex: i, type: 'flying' });
    } else if (i === 3) {
      // Piso 4: dos terrestres + un volador
      enemies.push({ x: GAME_WIDTH/3, y: y - FLOOR_THICKNESS/2 - 40, w: 40, h: 40, vx: 2, floorIndex: i, type: 'ground' });
      enemies.push({ x: (2*GAME_WIDTH)/3, y: y - FLOOR_THICKNESS/2 - 40, w: 40, h: 40, vx: -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/2, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: 2, floorIndex: i, type: 'flying' });
    } else if (i === 4) {
      // Piso 5: dos terrestres + dos voladores
      enemies.push({ x: GAME_WIDTH/3, y: y - FLOOR_THICKNESS/2 - 40, w: 40, h: 40, vx: 2, floorIndex: i, type: 'ground' });
      enemies.push({ x: (2*GAME_WIDTH)/3, y: y - FLOOR_THICKNESS/2 - 40, w: 40, h: 40, vx: -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/4, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: 2, floorIndex: i, type: 'flying' });
      enemies.push({ x: (3*GAME_WIDTH)/4, y: y - FLOOR_GAP/2, w: 40, h: 30, vx: -2, floorIndex: i, type: 'flying' });
    }
  }
}

// ===== Ajuste del tamaño del canvas =====
function resizeWrapper(){
  if (window.innerWidth < 1600 || window.innerHeight < 900) {
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  wrapper.style.width = GAME_WIDTH + "px";
  wrapper.style.height = GAME_HEIGHT + "px";
}

window.addEventListener('resize', resizeWrapper);
resizeWrapper();
createFloors();

// ===== Actualización de la lógica del juego =====
function update(){
  if (gameWon) return;

  // Movimiento horizontal del jugador
  if(keys['a']) player.x -= SPEED;
  else if(keys['d']) player.x += SPEED;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  // Movimiento vertical con gravedad
  const oldBottom = player.y + player.h;
  player.vy += GRAVITY;
  let newY = player.y + player.vy;
  let landed = false;

  // Comprobación de colisiones con pisos
  const newBottom = newY + player.h;
  const firstIdx = Math.max(0, Math.floor((oldBottom - START_Y) / FLOOR_GAP) - 2);
  const lastIdx  = Math.min(floors.length-1, Math.floor((newBottom - START_Y) / FLOOR_GAP) + 2);

  for(let i=firstIdx;i<=lastIdx;i++){
    const f = floors[i];
    if (!f) continue;
    const floorTop = f.y - FLOOR_THICKNESS/2;
    if(oldBottom <= floorTop && newBottom >= floorTop){
      let inGap = false;
      if (f.gapX >= 0 && f.gapWidth > 0) {
        inGap = (player.x + player.w > f.gapX) && (player.x < f.gapX + f.gapWidth);
      }
      if(!inGap){
        newY = floorTop - player.h;
        player.vy = 0;
        landed = true;
        currentFloor = i + 1;
        break;
      }
    }
  }

  player.y = newY;
  player.onGround = landed;

  // Último piso (jugador no cae más abajo)
  const lastFloor = floors[floors.length-1];
  cameraY = 0;
  if(player.y > lastFloor.y - FLOOR_THICKNESS/2 - player.h){
    player.y = lastFloor.y - FLOOR_THICKNESS/2 - player.h;
    player.vy = 0;
    currentFloor = TOTAL_FLOORS;
  }

  // Movimiento de enemigos y colisiones
  for (const e of enemies) {
    e.x += e.vx;

    // Rebote en los bordes de la pantalla
    if (e.x < 0) {
      e.vx = Math.abs(e.vx);
      e.x = 0;
    }
    if (e.x + e.w > GAME_WIDTH) {
      e.vx = -Math.abs(e.vx);
      e.x = GAME_WIDTH - e.w;
    }

    // Rebote en huecos (solo terrestres)
    if (e.type === 'ground') {
      const f = floors[e.floorIndex];
      if (f.gapX >= 0 && f.gapWidth > 0) {
        if (e.x < f.gapX + f.gapWidth && e.x + e.w > f.gapX) {
          if (e.vx > 0) {
            e.vx = -Math.abs(e.vx);
            e.x = f.gapX - e.w;
          } else if (e.vx < 0) {
            e.vx = Math.abs(e.vx);
            e.x = f.gapX + f.gapWidth;
          }
        }
      }
    }

    // Colisión jugador-enemigo (si no es inmortal)
    if (!window.IMMORTAL_MODE) {
      const pad = player.hitboxPadding;
      if ((player.x + pad) < (e.x + e.w) &&
          (player.x + player.w - pad) > e.x &&
          (player.y + pad) < (e.y + e.h) &&
          (player.y + player.h - pad) > e.y) {
        resetGame();
      }
    }
  }

  // Colisión con la portería (meta)
  if (goal) {
    if (player.x < goal.x + goal.w &&
        player.x + player.w > goal.x &&
        player.y < goal.y + goal.h &&
        player.y + player.h > goal.y) {
      gameWon = true;
      winModal.classList.remove("hidden");
    }
  }

  // Actualizar HUD
  floorInfo.textContent = `Piso: ${currentFloor} / ${TOTAL_FLOORS}`;
}

// ===== Reinicio del juego =====
function resetGame(){
  currentFloor = 1;
  player.x = 0;
  player.y = 0;
  player.vy = 0;
  cameraY = 0;
  createFloors();
}

restartBtn.addEventListener('click', resetGame);

// ===== Dibujo en el canvas =====
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Dibujar pisos con textura y huecos
  if (floorPattern) {
    ctx.fillStyle = floorPattern;
    for(const [i,f] of floors.entries()){
      const y = f.y - cameraY;
      if(y>-FLOOR_THICKNESS && y<canvas.height+FLOOR_THICKNESS){
        if (f.gapX < 0 || f.gapWidth === 0) {
          ctx.fillRect(0, y-FLOOR_THICKNESS/2, canvas.width, FLOOR_THICKNESS);
        } else {
          ctx.fillRect(0, y-FLOOR_THICKNESS/2, f.gapX, FLOOR_THICKNESS);
          ctx.fillRect(f.gapX+f.gapWidth, y-FLOOR_THICKNESS/2, canvas.width-(f.gapX+f.gapWidth), FLOOR_THICKNESS);
        }
      }
    }
  }

  // Dibujar jugador
  const screenY = player.y - cameraY;
  if (playerImg.complete) {
    ctx.drawImage(playerImg, player.x, screenY, player.w, player.h);
  } else {
    ctx.fillStyle = '#0f0';
    ctx.fillRect(player.x, screenY, player.w, player.h);
  }

  // Dibujar enemigos
  for (const e of enemies) {
    const ey = e.y - cameraY;
    if (e.type === 'ground') {
      if (groundEnemyImg.complete) {
        ctx.drawImage(groundEnemyImg, e.x, ey, e.w, e.h);
      } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x, ey, e.w, e.h);
      }
    } else {
      if (flyingEnemyImg.complete) {
        ctx.drawImage(flyingEnemyImg, e.x, ey, e.w, e.h);
      } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(e.x, ey, e.w, e.h);
      }
    }
  }

  // Dibujar portería (meta)
  if (goal) {
    if (goalImg.complete) {
      ctx.drawImage(goalImg, goal.x, goal.y, goal.w, goal.h);
    } else {
      ctx.fillStyle = 'yellow';
      ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    }
  }
}

// ===== Bucle principal =====
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

loop()