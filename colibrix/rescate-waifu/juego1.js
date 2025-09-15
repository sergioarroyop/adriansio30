// game.js

// ===== Elementos principales del DOM =====
const container = document.getElementById('container');
const wrapper = document.getElementById('gameWrapper');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const floorInfo = document.getElementById('floorInfo');
// const restartBtn = document.getElementById('restartBtn'); // Removido - ahora se controla desde el panel lateral
const winModal = document.getElementById('winModal');

// ===== Recursos gráficos (sprites e imágenes) =====
const floorTexture = new Image();
floorTexture.src = "https://i.postimg.cc/3J5vBSW0/terrazo.jpg";
let floorPattern = null;
floorTexture.onload = () => {
  floorPattern = ctx.createPattern(floorTexture, 'repeat');
};

// Jugador
const playerImg = new Image();
playerImg.src = "https://i.postimg.cc/d0HCjJTJ/antonio-alcantara.png";

// Enemigos terrestres y voladores
const groundEnemyImg = new Image();
groundEnemyImg.src = "https://i.postimg.cc/2Sd32rMP/coche-Photoroom.png";

const flyingEnemyImg = new Image();
flyingEnemyImg.src = "https://i.postimg.cc/ZKSW3WDr/avion.webp";

// Meta (portería)
const goalImg = new Image();
goalImg.src = "https://i.postimg.cc/g2K8rVzX/merche-Photoroom.png";

// Imagen de fondo para los pisos
const floorBackgroundImg = new Image();
floorBackgroundImg.src = "https://i.postimg.cc/GmZw8yXR/fondo.jpg";

// ===== Constantes de configuración =====
const GRAVITY = 0.55;        // Gravedad que afecta al jugador - ajustada para 1000px
const JUMP_FORCE = -9;     // Fuerza del salto - escalada
const SPEED = 2.5;          // Velocidad lateral del jugador - escalada
const TOTAL_FLOORS = 5;     // Número total de pisos
const START_Y = 130;        // Altura inicial del primer piso - mejor distribución
const SIDE_MARGIN = 2 * 25; // Márgenes laterales de los huecos - escalado
let GAME_WIDTH = 1000;    // Ancho del juego - Ajustable dinámicamente
let GAME_HEIGHT = 800;   // Alto del juego - Ajustable dinámicamente
const FLOOR_THICKNESS = 40; // Grosor de cada piso - tamaño apropiado

// Distancia vertical entre pisos - se recalcula dinámicamente
let FLOOR_GAP = (GAME_HEIGHT - START_Y - FLOOR_THICKNESS) / (TOTAL_FLOORS - 1);

// ===== Estado del juego =====
let currentFloor = 1;
let cameraY = 0;
let floors = [];   // Lista de pisos
let enemies = [];  // Lista de enemigos
let goal = null;
let gameWon = false;

// ===== Definición del jugador =====
const player = {
  x: 0,
  y: 0,
  w: 30,              // ancho - tamaño apropiado para 1000px
  h: 60,              // alto - tamaño apropiado para 1000px
  vy: 0,              // velocidad vertical
  onGround: false,    // si está en el suelo
  hitboxPadding: 4    // margen para la colisión (hitbox más pequeña)
};

// ===== Tamaño de huecos =====
const GAP_WIDTH = player.w * 1.5; // Huecos de caída (3 veces el ancho del jugador)

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

  // Recalcular FLOOR_GAP con las dimensiones actuales
  FLOOR_GAP = (GAME_HEIGHT - START_Y - FLOOR_THICKNESS) / (TOTAL_FLOORS - 1);
  console.log('FLOOR_GAP recalculado:', FLOOR_GAP, 'GAME_HEIGHT:', GAME_HEIGHT);

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
      // Para el piso 5, posicionar la meta en la parte inferior del canvas
      const floor5Y = GAME_HEIGHT - FLOOR_THICKNESS/2;
      goal = { x: GAME_WIDTH - 60, y: floor5Y - FLOOR_THICKNESS/2 - 50, w: 50, h: 50 };
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

    // === Enemigos por piso - Enemigos terrestres aleatorios ===
    if (i === 0) {
      // Piso 1: un terrestre aleatorio + un volador
      const groundX1 = Math.random() * (GAME_WIDTH - 50) + 25; // Posición aleatoria entre 25 y GAME_WIDTH-25
      enemies.push({ x: groundX1, y: y - FLOOR_THICKNESS/2 - 25, w: 25, h: 25, vx: Math.random() > 0.5 ? 2 : -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/2, y: y - FLOOR_THICKNESS/1 - player.h - 10, w: 25, h: 20, vx: 2, floorIndex: i, type: 'flying' });
    } else if (i === 1) {
      // Piso 2: un terrestre aleatorio + dos voladores
      const groundX1 = Math.random() * (GAME_WIDTH - 50) + 25;
      enemies.push({ x: groundX1, y: y - FLOOR_THICKNESS/2 - 25, w: 25, h: 25, vx: Math.random() > 0.5 ? 2 : -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/4, y: y - FLOOR_THICKNESS/0.75 - player.h - 10, w: 25, h: 20, vx: 2, floorIndex: i, type: 'flying' });
      enemies.push({ x: (3*GAME_WIDTH)/4, y: y - FLOOR_THICKNESS/0.75 - player.h - 10, w: 25, h: 20, vx: -2, floorIndex: i, type: 'flying' });
    } else if (i === 2) {
      // Piso 3: un terrestre aleatorio + tres voladores
      const groundX1 = Math.random() * (GAME_WIDTH - 50) + 25;
      enemies.push({ x: groundX1, y: y - FLOOR_THICKNESS/2 - 25, w: 25, h: 25, vx: Math.random() > 0.5 ? 2 : -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/4, y: y - FLOOR_THICKNESS/0.75 - player.h - 10, w: 25, h: 20, vx: 2, floorIndex: i, type: 'flying' });
      enemies.push({ x: GAME_WIDTH/2, y: y - FLOOR_THICKNESS/0.75 - player.h - 10, w: 25, h: 20, vx: -2, floorIndex: i, type: 'flying' });
      enemies.push({ x: (3*GAME_WIDTH)/4, y: y - FLOOR_THICKNESS/0.75 - player.h - 10, w: 25, h: 20, vx: 2, floorIndex: i, type: 'flying' });
    } else if (i === 3) {
      // Piso 4: dos terrestres aleatorios + un volador
      const groundX1 = Math.random() * (GAME_WIDTH - 100) + 25; // Primer enemigo
      const groundX2 = Math.random() * (GAME_WIDTH - 100) + 25; // Segundo enemigo
      enemies.push({ x: groundX1, y: y - FLOOR_THICKNESS/2 - 25, w: 25, h: 25, vx: Math.random() > 0.5 ? 2 : -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: groundX2, y: y - FLOOR_THICKNESS/2 - 25, w: 25, h: 25, vx: Math.random() > 0.5 ? 2 : -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/2, y: y - FLOOR_THICKNESS/0.5 - player.h - 10, w: 25, h: 20, vx: 2, floorIndex: i, type: 'flying' });
    } else if (i === 4) {
      // Piso 5: dos terrestres aleatorios + dos voladores
      const groundX1 = Math.random() * (GAME_WIDTH - 100) + 25; // Primer enemigo
      const groundX2 = Math.random() * (GAME_WIDTH - 100) + 25; // Segundo enemigo
      enemies.push({ x: groundX1, y: y - FLOOR_THICKNESS/2 - 25, w: 25, h: 25, vx: Math.random() > 0.5 ? 2 : -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: groundX2, y: y - FLOOR_THICKNESS/2 - 25, w: 25, h: 25, vx: Math.random() > 0.5 ? 2 : -2, floorIndex: i, type: 'ground' });
      enemies.push({ x: GAME_WIDTH/4, y: y - FLOOR_THICKNESS/0.5 - player.h - 10, w: 25, h: 20, vx: 2, floorIndex: i, type: 'flying' });
      enemies.push({ x: (3*GAME_WIDTH)/4, y: y - FLOOR_THICKNESS/0.5 - player.h - 10, w: 25, h: 20, vx: 2, floorIndex: i, type: 'flying' });
      console.log(`Enemigos piso 5 creados con posiciones aleatorias`);
    }
  }
}

// ===== Ajuste del tamaño del canvas =====
function resizeWrapper(){
  // Tamaño fijo del juego: 1000px de ancho y 800px de alto
  const FIXED_GAME_WIDTH = 1000;
  const FIXED_GAME_HEIGHT = 800;
  
  // Configurar el canvas con tamaño fijo
  canvas.width = FIXED_GAME_WIDTH;
  canvas.height = FIXED_GAME_HEIGHT;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  
  // Actualizar las dimensiones del juego para el escalado
  GAME_WIDTH = FIXED_GAME_WIDTH;
  GAME_HEIGHT = FIXED_GAME_HEIGHT;
  
  // Recrear los pisos con las nuevas dimensiones
  createFloors();
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
      
      // Guardar progreso en localStorage
      if (window.GameStorage) {
        window.GameStorage.onJuego1Complete(currentFloor);
        console.log(`Juego 1 completado: Piso ${currentFloor} alcanzado`);
      }
    }
  }
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

// restartBtn.addEventListener('click', resetGame); // Removido - ahora se controla desde el panel lateral

// ===== Escalado de coordenadas =====
function scaleX(x) {
  return (x / 1000) * canvas.width;
}

function scaleY(y) {
  return (y / 800) * canvas.height;
}

function scaleSize(size) {
  return (size / 1000) * canvas.width;
}

// ===== Dibujo en el canvas =====
function draw(){
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  ctx.clearRect(0,0,canvasWidth,canvasHeight);

  // Dibujar fondo blanco
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Dibujar pisos con textura y huecos
  for(const [i,f] of floors.entries()){
    const y = f.y - cameraY;
    const scaledY = scaleY(y);
    const scaledThickness = scaleSize(FLOOR_THICKNESS);
    
    // Para el piso 5 (último), asegurar que se dibuje en la parte inferior
    let drawY, drawThickness;
    if (i === TOTAL_FLOORS - 1) {
      // Piso 5: dibujar en la parte inferior del canvas
      drawY = canvasHeight - scaledThickness;
      drawThickness = scaledThickness;
      console.log(`Piso 5 especial: drawY=${drawY}, canvasHeight=${canvasHeight}, thickness=${drawThickness}`);
    } else {
      drawY = scaledY - scaledThickness/2;
      drawThickness = scaledThickness;
    }
    
    if(scaledY > -scaledThickness && scaledY < canvasHeight + scaledThickness){
      console.log(`Dibujando piso ${i}: y=${y}, scaledY=${scaledY}, drawY=${drawY}, thickness=${drawThickness}`);
      // Usar patrón de textura si está disponible, sino usar color sólido
      if (floorPattern) {
        ctx.fillStyle = floorPattern;
      } else {
        // Fallback: color verde oscuro para los pisos
        ctx.fillStyle = '#228B22';
      }
      
      if (f.gapX < 0 || f.gapWidth === 0) {
        ctx.fillRect(0, drawY, canvasWidth, drawThickness);
      } else {
        const scaledGapX = scaleX(f.gapX);
        const scaledGapWidth = scaleSize(f.gapWidth);
        ctx.fillRect(0, drawY, scaledGapX, drawThickness);
        ctx.fillRect(scaledGapX + scaledGapWidth, drawY, canvasWidth - (scaledGapX + scaledGapWidth), drawThickness);
      }
    }
  }

  // Dibujar jugador
  const screenY = player.y - cameraY;
  const scaledPlayerX = scaleX(player.x);
  const scaledPlayerY = scaleY(screenY);
  const scaledPlayerW = scaleSize(player.w);
  const scaledPlayerH = scaleSize(player.h);
  
  if (playerImg.complete) {
    ctx.drawImage(playerImg, scaledPlayerX, scaledPlayerY, scaledPlayerW, scaledPlayerH);
  } else {
    ctx.fillStyle = '#0f0';
    ctx.fillRect(scaledPlayerX, scaledPlayerY, scaledPlayerW, scaledPlayerH);
  }

  // Dibujar enemigos
  for (const e of enemies) {
    const ey = e.y - cameraY;
    const scaledEnemyX = scaleX(e.x);
    const scaledEnemyW = scaleSize(e.w);
    const scaledEnemyH = scaleSize(e.h);
    
    // Para enemigos del piso 5, posicionar directamente sobre el suelo visible
    let scaledEnemyY;
    if (e.floorIndex === 4) { // Piso 5 (índice 4)
      if (e.type === 'ground') {
        // Enemigos terrestres: sobre el suelo visible
        scaledEnemyY = canvasHeight - scaleSize(FLOOR_THICKNESS) - scaledEnemyH;
      } else {
        // Enemigos voladores: a media altura entre el suelo y el piso anterior
        const floorHeight = scaleSize(FLOOR_THICKNESS);
        scaledEnemyY = canvasHeight - floorHeight - scaleSize(FLOOR_GAP)/2 - scaledEnemyH/2;
      }
      console.log(`Enemigo piso 5: tipo=${e.type}, scaledY=${scaledEnemyY}, canvasHeight=${canvasHeight}`);
    } else {
      // Otros pisos: usar escalado normal
      scaledEnemyY = scaleY(ey);
    }
    
    if (e.type === 'ground') {
      if (groundEnemyImg.complete) {
        // Hacer la imagen más grande que el objeto (1.5x más grande)
        const imageScale = 3.5;
        const imageW = scaledEnemyW * imageScale;
        const imageH = scaledEnemyH * imageScale;
        const imageX = scaledEnemyX - (imageW - scaledEnemyW) / 2;
        const imageY = scaledEnemyY - (imageH - scaledEnemyH) / 2;
        ctx.drawImage(groundEnemyImg, imageX, imageY, imageW, imageH);
      } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(scaledEnemyX, scaledEnemyY, scaledEnemyW, scaledEnemyH);
      }
    } else {
      if (flyingEnemyImg.complete) {
        // Hacer la imagen más grande que el objeto (1.5x más grande)
        const imageScale = 2;
        const imageW = scaledEnemyW * imageScale;
        const imageH = scaledEnemyH * imageScale;
        const imageX = scaledEnemyX - (imageW - scaledEnemyW) / 2;
        const imageY = scaledEnemyY - (imageH - scaledEnemyH) / 2;
        ctx.drawImage(flyingEnemyImg, imageX, imageY, imageW, imageH);
      } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(scaledEnemyX, scaledEnemyY, scaledEnemyW, scaledEnemyH);
      }
    }
  }

  // Dibujar portería (meta)
  if (goal) {
    const scaledGoalX = scaleX(goal.x);
    const scaledGoalW = scaleSize(80);
    const scaledGoalH = scaleSize(150);
    
    // La meta está en el piso 5, posicionarla sobre el suelo visible
    const scaledGoalY = canvasHeight - 15 - scaledGoalH;
    
    if (goalImg.complete) {
      ctx.drawImage(goalImg, scaledGoalX, scaledGoalY, scaledGoalW, scaledGoalH);
    } else {
      ctx.fillStyle = 'yellow';
      ctx.fillRect(scaledGoalX, scaledGoalY, scaledGoalW, scaledGoalH);
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