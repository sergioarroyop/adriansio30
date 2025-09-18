// Caballas de mierda — mini juego de clics con SidePanel y modales
(function(){
  const gameId = 'caballas-de-mierda';

  // Estado de juego
  let score = 0;
  let misses = 0;
  let target = 10; // caballas para ganar
  let maxMisses = 5;
  let running = false;
  let spawnTimer = null;
  let speedBase = 90; // px/seg
  let immortal = false;
  let sound = true;
  let difficulty = 'normal';

  const area = document.getElementById('gameArea');
  const statusChip = document.getElementById('statusChip');

  function updateStatusChip() {
    if (statusChip) statusChip.textContent = `Caballas: ${score} · Fallos: ${misses}`;
    if (window.SidePanel) {
      window.SidePanel.updateSidePanelStats({ score, level: Math.max(1, Math.floor(score/3)+1), status: running ? '🔄 En Progreso' : '⏸️ Pausado' });
    }
  }

  function paramsByDifficulty() {
    switch(difficulty) {
      case 'easy':   return { spawnEvery: 1100, speed: 80, maxMisses: 7, fishProb: 0.8 };
      case 'hard':   return { spawnEvery: 700,  speed: 120, maxMisses: 4, fishProb: 0.7 };
      default:       return { spawnEvery: 900,  speed: 95, maxMisses: 5, fishProb: 0.75 };
    }
  }

  function applyDifficulty() {
    const p = paramsByDifficulty();
    speedBase = p.speed;
    maxMisses = p.maxMisses;
    restartSpawner(p.spawnEvery);
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawnEntity() {
    if (!running) return;
    const p = paramsByDifficulty();
    const isFish = Math.random() < p.fishProb;

    const el = document.createElement('div');
    el.className = `entity ${isFish ? 'fish' : 'poop'}`;
    el.style.left = `${rand(40, area.clientWidth - 110)}px`;
    el.style.top = `${-80}px`;
    el.textContent = isFish ? '🐟' : '💩';

    let y = -80;
    const velocity = (speedBase + rand(-10, 25)) / 60; // px por frame a ~60fps
    let killed = false;

    function tick() {
      if (!running) return;
      y += velocity * 16; // ~16ms por frame
      el.style.top = `${y}px`;
      if (y > area.clientHeight - 120) { // toca suelo
        try { area.removeChild(el); } catch {}
        if (isFish) {
          misses++;
          if (!immortal && misses >= maxMisses) return triggerGameOver();
          updateStatusChip();
        }
        return;
      }
      if (!killed) requestAnimationFrame(tick);
    }

    el.addEventListener('click', () => {
      if (killed) return;
      killed = true;
      try { area.removeChild(el); } catch {}
      if (isFish) {
        score++;
        updateStatusChip();
        if (score >= target) triggerWin();
      } else {
        if (!immortal) triggerGameOver();
      }
    });

    area.appendChild(el);
    requestAnimationFrame(tick);
  }

  function startSpawner(everyMs) {
    stopSpawner();
    spawnTimer = setInterval(spawnEntity, everyMs || paramsByDifficulty().spawnEvery);
  }
  function stopSpawner() { if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; } }
  function restartSpawner(everyMs) { if (running) startSpawner(everyMs); }

  // Modales
  function show(id) { const m = document.getElementById(id); if (m) m.classList.remove('hidden'); }
  function hide(id) { const m = document.getElementById(id); if (m) m.classList.add('hidden'); }

  function resetGame() {
    score = 0; misses = 0; running = false;
    // limpiar entidades
    Array.from(area.querySelectorAll('.entity')).forEach(n => n.remove());
    updateStatusChip();
  }

  function triggerWin() {
    running = false;
    stopSpawner();
    try {
      if (window.GameStorage) {
        window.GameStorage.markGameCompleted(gameId);
        window.GameStorage.updateGameScore(gameId, score);
      }
    } catch(e){}
    show('winModal');
  }

  function triggerGameOver() {
    running = false;
    stopSpawner();
    show('gameOverModal');
  }

  // Side panel
  function initSidePanel() {
    const options = { immortal, sound, difficulty };
    window.SidePanel && window.SidePanel.createSidePanel({
      gameName: 'Caballas de mierda',
      gameId,
      stats: { score, level: 1, status: '🔄 En Progreso' },
      options,
      onBack: () => window.location.href = '../index.html',
      onRestart: () => { hide('winModal'); hide('gameOverModal'); resetGame(); startGame(); },
      onOptionChange: (opts) => {
        if (typeof opts.immortal !== 'undefined') { immortal = !!opts.immortal; persistOptions(); }
        if (typeof opts.sound !== 'undefined') { sound = !!opts.sound; applySound(); persistOptions(); }
        if (opts.difficulty) { difficulty = opts.difficulty; applyDifficulty(); persistOptions(); }
      }
    });
  }

  function applySound() {
    const a = document.getElementById('bgBirthday');
    if (!a) return;
    a.muted = !sound;
  }

  function persistOptions() {
    try { window.GameStorage && window.GameStorage.updateGameOptions({ immortalMode: immortal, soundEnabled: sound, difficulty }); } catch(e){}
  }

  // Arranque
  function startGame() {
    running = true;
    applyDifficulty();
    startSpawner();
    updateStatusChip();
  }

  // Botonera de modales
  function initModals() {
    const startBtn = document.getElementById('startBtn');
    const winBackBtn = document.getElementById('winBackBtn');
    const winRestartBtn = document.getElementById('winRestartBtn');
    const overBackBtn = document.getElementById('overBackBtn');
    const overRestartBtn = document.getElementById('overRestartBtn');

    startBtn && startBtn.addEventListener('click', () => { hide('startModal'); resetGame(); startGame(); });
    winBackBtn && winBackBtn.addEventListener('click', () => (window.location.href = '../index.html'));
    overBackBtn && overBackBtn.addEventListener('click', () => (window.location.href = '../index.html'));
    winRestartBtn && winRestartBtn.addEventListener('click', () => { hide('winModal'); resetGame(); startGame(); });
    overRestartBtn && overRestartBtn.addEventListener('click', () => { hide('gameOverModal'); resetGame(); startGame(); });
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    initSidePanel();
    initModals();
    applySound();
    updateStatusChip();
  });
})();

