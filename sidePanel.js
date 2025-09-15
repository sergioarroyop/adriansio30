// sidePanel.js - Sistema de panel lateral para juegos

/**
 * Crea el panel lateral para los juegos
 * @param {Object} config - Configuración del panel
 * @param {string} config.gameName - Nombre del juego
 * @param {string} config.gameId - ID del juego (juego1, juego2, juego3)
 * @param {Object} config.stats - Estadísticas del juego
 * @param {Object} config.options - Opciones del juego
 * @param {Function} config.onBack - Función para volver al inicio
 * @param {Function} config.onRestart - Función para reiniciar juego
 * @param {Function} config.onOptionChange - Función para cambio de opciones
 */
function createSidePanel(config) {
  const {
    gameName = 'Juego',
    gameId = 'juego1',
    stats = {},
    options = {},
    onBack = () => window.location.href = 'index.html',
    onRestart = () => {},
    onOptionChange = () => {},
    optionsTemplate = null,
    initOptions = null
  } = config;

  // Crear panel si no existe
  let panel = document.getElementById('sidePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'sidePanel';
    document.body.appendChild(panel);
  }

  // Obtener datos del juego (usar GameStorage si está disponible)
  let gameData = {};
  let gameStats = {};
  let progress = {};

  if (window.GameStorage) {
    gameData = window.GameStorage.getGameData();
    gameStats = window.GameStorage.getGameStats(gameId);
    progress = window.GameStorage.getGameProgress();
  }

  // Preparar HTML de opciones (personalizable)
  const defaultOptionsHTML = `
    <div class="panel-section">
      <h4>⚙️ Opciones</h4>
      <div class="option-item">
        <span class="option-label">Modo Inmortal</span>
        <div class="toggle ${options.immortal ? 'active' : ''}" id="immortalToggle"></div>
      </div>
      <div class="option-item">
        <span class="option-label">Sonido</span>
        <div class="toggle ${options.sound ? 'active' : ''}" id="soundToggle"></div>
      </div>
      <div class="option-item">
        <span class="option-label">Dificultad</span>
        <select id="difficultySelect" style="background:#222;color:#fff;border:1px solid #555;border-radius:6px;padding:6px 8px;">
          <option value="easy" ${options.difficulty === 'easy' ? 'selected' : ''}>Fácil</option>
          <option value="normal" ${!options.difficulty || options.difficulty === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="hard" ${options.difficulty === 'hard' ? 'selected' : ''}>Difícil</option>
        </select>
      </div>
    </div>
  `;

  const optionsHTML = optionsTemplate || defaultOptionsHTML;

  // Generar HTML del panel
  panel.innerHTML = `
    <h3>🎮 ${gameName}</h3>
    
    <div class="panel-section">
      <h4>📊 Estadísticas</h4>
      <div class="stat-item">
        <span class="stat-label">Puntuación:</span>
        <span class="stat-value" id="currentScore">${stats.score || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Nivel:</span>
        <span class="stat-value" id="currentLevel">${stats.level || 1}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Mejor Puntuación:</span>
        <span class="stat-value">${gameStats.score || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Estado:</span>
        <span class="stat-value" id="gameStatus">${gameStats.completed ? '✅ Completado' : '🔄 En Progreso'}</span>
      </div>
    </div>


    ${optionsHTML}

    <div class="panel-section">
      <h4>🎮 Controles</h4>
      <div class="stat-item">
        <span class="stat-label">Movimiento:</span>
        <span class="stat-value">A/D</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Salto:</span>
        <span class="stat-value">W</span>
      </div>
    </div>

    <button class="btn" id="backBtn">🏠 Volver al Inicio</button>
    <button class="btn secondary" id="restartBtn">🔄 Reiniciar Juego</button>
    <button class="btn secondary" id="fullscreenBtn">⛶ Pantalla completa</button>
  `;

  // Event listeners
  document.getElementById('backBtn').addEventListener('click', onBack);
  document.getElementById('restartBtn').addEventListener('click', onRestart);
  
  // Toggle inmortal (si existe)
  const immortalToggle = document.getElementById('immortalToggle');
  if (immortalToggle) {
    immortalToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      const isActive = this.classList.contains('active');
      onOptionChange({ immortal: isActive });
    });
  }

  // Toggle sonido (si existe)
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      const isActive = this.classList.contains('active');
      onOptionChange({ sound: isActive });
    });
  }

  // Selector de dificultad (si existe)
  const diffSelect = document.getElementById('difficultySelect');
  if (diffSelect) {
    diffSelect.addEventListener('change', function() {
      onOptionChange({ difficulty: this.value });
    });
  }

  // Pantalla completa (si existe)
  const fsButton = document.getElementById('fullscreenBtn');
  if (fsButton) {
    fsButton.addEventListener('click', function() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
  }

  // Inicializar opciones personalizadas si se proporciona
  if (typeof initOptions === 'function') {
    try { initOptions(panel, onOptionChange); } catch (err) { console.error('initOptions error:', err); }
  }

  return panel;
}

/**
 * Actualiza las estadísticas del panel lateral
 * @param {Object} stats - Nuevas estadísticas
 */
function updateSidePanelStats(stats) {
  const scoreElement = document.getElementById('currentScore');
  const levelElement = document.getElementById('currentLevel');
  const statusElement = document.getElementById('gameStatus');

  if (scoreElement && stats.score !== undefined) {
    scoreElement.textContent = stats.score;
  }
  if (levelElement && stats.level !== undefined) {
    levelElement.textContent = stats.level;
  }
  if (statusElement && stats.status !== undefined) {
    statusElement.textContent = stats.status;
  }
}


/**
 * Destruye el panel lateral
 */
function destroySidePanel() {
  const panel = document.getElementById('sidePanel');
  if (panel) {
    panel.remove();
  }
}

// Exportar funciones para uso global
window.SidePanel = {
  createSidePanel,
  updateSidePanelStats,
  destroySidePanel
};
