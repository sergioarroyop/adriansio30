// Rescate Waifu — Whac-a-mole
(function(){
  const GOAL_HITS = 10;
  const MAX_MISSES = 1;

  let appearMs = 1000; // base, se ajusta por dificultad
  let running = false;
  let spawnInterval = null;
  let lastIdx = -1;
  let hits = 0;
  let misses = 0;
  let locked = false; // para evitar doble click global (no se usará con múltiples)
  const active = new Map(); // idx -> { element, timeoutId }

  const grid = document.getElementById('grid');
  const statusChip = document.getElementById('statusChip');
  const gameArea = document.getElementById('gameArea');
  const gunAudioEl = document.getElementById('gunSound');

  // ===== Panel Lateral =====
  let gameStats = { score: 0, level: 1, status: '🔄 En Progreso' };
  let gameOptions = { difficulty: 'normal' };

  function difficultyToMs(diff) {
    switch(diff) {
      case 'easy': return 1400;  // más fácil: más tiempo visible
      case 'hard': return 500;   // mucho más exigente
      default: return 700;       // normal
    }
  }

  function updateChip() {
    if (statusChip) {
      statusChip.textContent = `Muertos: ${hits}`;
    }
  }

  function updatePanel() {
    gameStats.score = hits;
    gameStats.level = Math.max(1, Math.round(2000 / appearMs));
    if (window.SidePanel) window.SidePanel.updateSidePanelStats(gameStats);
  }

  function clearTargets() {
    // Retirar y limpiar todos los objetivos activos
    active.forEach(({ element, timeoutId }) => {
      try { clearTimeout(timeoutId); } catch(e){}
      if (element && element.isConnected) element.remove();
    });
    active.clear();
  }

  function randomIndex(excludeBusy = true) {
    // Elegir cualquier celda disponible; se permite reutilizar la última usada
    const available = [];
    if (excludeBusy) {
      for (let i = 0; i < 9; i++) if (!active.has(i)) available.push(i);
    } else {
      for (let i = 0; i < 9; i++) available.push(i);
    }
    const idx = available[Math.floor(Math.random() * available.length)] ?? Math.floor(Math.random() * 9);
    return idx;
  }

  function spawnOneAt(idx, forceColor) {
    if (!running || active.has(idx)) return;
    const cell = grid.querySelector(`.cell[data-idx="${idx}"]`);
    if (!cell) return;

    // Ratio de rojos mucho menor
    const isRed = forceColor ? (forceColor === 'red') : (Math.random() < 0.2);
    const target = document.createElement('div');
    target.className = `target ${isRed ? 'red' : 'green'}`;

    // Asignar imagen según tipo
    const redImg = 'https://i.postimg.cc/jdB2X2jq/secuestrador.png';
    const greenImgs = [
      'https://i.postimg.cc/dVd1SF72/waifu1.png',
      'https://i.postimg.cc/Gpxpdjx9/waifu2.png',
      'https://i.postimg.cc/XvbvRPFT/waifu3.png'
    ];
    const chosen = isRed ? redImg : greenImgs[Math.floor(Math.random()*greenImgs.length)];
    const img = document.createElement('img');
    img.src = chosen;
    img.alt = isRed ? 'Secuestrador' : 'Waifu';
    target.appendChild(img);

    // Duración de animación según velocidad actual
    target.style.animationDuration = `${appearMs}ms`;
    cell.appendChild(target);

    const onClick = () => {
      if (!running) return;
      if (isRed) { hits++; gameStats.status = '🔥 Buen golpe'; }
      else { misses++; gameStats.status = '⚠️ Fallo'; }
      updateChip();
      updatePanel();
      // Contador global de muertos se muestra en el chip superior, no en las celdas
      // Al hacer click, limpiamos y, si era rojo y el juego sigue, forzamos verde inmediato
      const wasRed = isRed;
      cleanup();
      if (hits >= GOAL_HITS) return win();
      if (misses >= MAX_MISSES) return gameOver();
      if (wasRed && running) spawnOneAt(idx, 'green');
    };
    target.addEventListener('click', onClick);

    const timeoutId = setTimeout(() => { 
      const wasRed = isRed; 
      cleanup(); 
      // Al desaparecer por tiempo, si era rojo y sigue el juego, aparece verde
      if (wasRed && running) spawnOneAt(idx, 'green');
    }, appearMs);

    function cleanup() {
      try { target.removeEventListener('click', onClick); } catch(e){}
      try { clearTimeout(timeoutId); } catch(e){}
      if (target && target.isConnected) target.remove();
      active.delete(idx);
    }

    active.set(idx, { element: target, timeoutId });
  }

  function spawnTick() {
    if (!running) return;
    const maxActive = 3; // cuántos simultáneos como máximo
    const freeSlots = Math.max(0, maxActive - active.size);
    if (freeSlots <= 0) return;
    const toSpawn = Math.min(freeSlots, 1 + Math.floor(Math.random() * 2)); // 1 o 2
    for (let i = 0; i < toSpawn; i++) {
      const idx = randomIndex(true);
      spawnOneAt(idx);
    }
  }

  function startGame() {
    stopTimers();
    running = true;
    hits = 0; misses = 0; lastIdx = -1; locked = false;
    gameStats.status = '🔄 En Progreso';
    updateChip();
    updatePanel();
    spawnTick();
    const base = Math.max(150, Math.round(appearMs * 0.45));
    spawnInterval = setInterval(spawnTick, base);
  }

  function stopTimers() {
    running = false;
    if (spawnInterval) { clearInterval(spawnInterval); spawnInterval = null; }
  }

  function resetGame() {
    stopTimers();
    clearTargets();
    hideModal('winModal');
    hideModal('gameOverModal');
    startGame();
  }

  function showModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }
  function hideModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function win() {
    stopTimers();
    gameStats.status = '✅ Completado';
    updatePanel();
    if (window.GameStorage) {
      try {
        window.GameStorage.updateGameScore('juego1', hits);
        window.GameStorage.markGameCompleted('juego1');
      } catch(e){}
    }
    showModal('winModal');
  }

  function gameOver() {
    stopTimers();
    gameStats.status = '❌ Game Over';
    updatePanel();
    showModal('gameOverModal');
  }

  // ===== Side Panel setup =====
  function initSidePanel() {
    if (!window.SidePanel) return;
    window.SidePanel.createSidePanel({
      gameName: 'Rescate Waifu',
      gameId: 'juego1',
      stats: gameStats,
      options: gameOptions,
      optionsTemplate: `
        <div class="panel-section">
          <h4>⚙️ Opciones</h4>
          <div class="option-item">
            <span class="option-label">Dificultad</span>
            <select id="difficultySelect" style="background:#222;color:#fff;border:1px solid #555;border-radius:6px;padding:6px 8px;">
              <option value="easy" ${gameOptions.difficulty === 'easy' ? 'selected' : ''}>Fácil</option>
              <option value="normal" ${!gameOptions.difficulty || gameOptions.difficulty === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="hard" ${gameOptions.difficulty === 'hard' ? 'selected' : ''}>Difícil</option>
            </select>
          </div>
        </div>
      `,
      onBack: () => window.location.href = '../index.html',
      onRestart: () => resetGame(),
      onOptionChange: (newOptions) => {
        gameOptions = { ...gameOptions, ...newOptions };
        if (window.GameStorage) {
          try { window.GameStorage.updateGameOptions(gameOptions); } catch(e){}
        }
        if (newOptions.difficulty) {
          appearMs = difficultyToMs(newOptions.difficulty);
        }
      }
    });
    // Inicializar velocidad desde dificultad por primera vez
    appearMs = difficultyToMs(gameOptions.difficulty || 'normal');
    updatePanel();
  }

  // ===== Modal buttons & start flow =====
  function bindUI() {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.addEventListener('click', () => { hideModal('startModal'); startGame(); });

    const winBackBtn = document.getElementById('winBackBtn');
    const winRestartBtn = document.getElementById('winRestartBtn');
    const overBackBtn = document.getElementById('overBackBtn');
    const overRestartBtn = document.getElementById('overRestartBtn');

    if (winBackBtn) winBackBtn.addEventListener('click', () => window.location.href = '../index.html');
    if (winRestartBtn) winRestartBtn.addEventListener('click', () => { hideModal('winModal'); startGame(); });
    if (overBackBtn) overBackBtn.addEventListener('click', () => window.location.href = '../index.html');
    if (overRestartBtn) overRestartBtn.addEventListener('click', () => { hideModal('gameOverModal'); startGame(); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    initSidePanel();
    bindUI();
    // Sonido de click dentro del área del juego
    if (gameArea) {
      gameArea.addEventListener('click', () => {
        try {
          if (gunAudioEl) {
            gunAudioEl.currentTime = 0;
            gunAudioEl.play().catch(()=>{});
          } else {
            const a = new Audio('../../sounds/gun.mp3');
            a.play().catch(()=>{});
          }
        } catch(e) {}
      });
    }
  });

  // Expose reset for sidePanel callbacks if needed
  window.resetGame = resetGame;
})();
