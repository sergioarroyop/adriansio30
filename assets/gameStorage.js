// gameStorage.js - Sistema de guardado de puntuaciones y progreso de juegos

// ===== Configuración del localStorage =====
// Clave de almacenamiento diferenciada por carpeta principal (adriansito, bongo, colibrix)
const STORAGE_NS = (() => {
  try {
    const p = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
    if (p.includes('/bongo/')) return 'bongo';
    if (p.includes('/colibrix/')) return 'colibrix';
    if (p.includes('/adriansito/')) return 'adriansito';
  } catch {}
  // Por defecto, agrupar como 'adriansito' si no se detecta ruta
  return 'adriansito';
})();
// Nuevo prefijo de clave unificado
const STORAGE_KEY = `birthdayGameData:${STORAGE_NS}`;
// Clave legacy para migración transparente
const LEGACY_KEY = `adrianBirthdayGameData:${STORAGE_NS}`;

// ===== Estructura de datos por defecto =====
const GAMES_BY_NS = {
  adriansito: ['alcantara-en-apuros','shempions-league','pesadilla-cocina'],
  bongo:      ['alcantara-en-apuros','cheetos-pandilla','wake-up-bongo'],
  colibrix:   ['rescate-waifu','zafineta-vu','caballas-de-mierda']
};

function buildDefaultData(ns) {
  const ids = GAMES_BY_NS[ns] || [];
  const scores = {}; const completed = {};
  ids.forEach(id => { scores[id] = 0; completed[id] = false; });
  return {
    scores,
    completed,
    // Monedero por juego (para apuestas u otros usos)
    coins: (function(){
      const c = {};
      // Saldo inicial por juego (si aplica)
      if (ns === 'colibrix') {
        c['caballas-de-mierda'] = 50; // saldo inicial
      }
      return c;
    })(),
    options: { immortalMode: false, soundEnabled: true, difficulty: 'normal' },
    lastPlayed: null,
    totalPlayTime: 0
  };
}

const defaultGameData = buildDefaultData(STORAGE_NS);

// ===== Funciones de gestión del localStorage =====

/**
 * Obtiene los datos del juego desde localStorage
 * @returns {Object} Datos del juego o datos por defecto si no existen
 */
function getGameData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Asegurar que todos los campos requeridos existen
      const baseline = buildDefaultData(STORAGE_NS);
      return {
        ...baseline,
        ...data,
        scores: { ...baseline.scores, ...data.scores },
        completed: { ...baseline.completed, ...data.completed },
        options: { ...baseline.options, ...data.options },
        coins: { ...baseline.coins, ...(data.coins || {}) }
      };
    }
  } catch (error) {
    console.error('Error al cargar datos del localStorage:', error);
  }
  return { ...defaultGameData };
}

/**
 * Guarda los datos del juego en localStorage
 * @param {Object} data - Datos a guardar
 */
function saveGameData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('Datos guardados correctamente:', data);
  } catch (error) {
    console.error('Error al guardar datos en localStorage:', error);
  }
}

/**
 * Actualiza la puntuación de un juego específico
 * @param {string} gameId - ID del juego (juego1, juego2, juego3)
 * @param {number} score - Nueva puntuación
 */
function updateGameScore(gameId, score) {
  const data = getGameData();
  data.scores[gameId] = Math.max(data.scores[gameId] || 0, score);
  data.lastPlayed = gameId;
  saveGameData(data);
  return data;
}

/**
 * Marca un juego como completado
 * @param {string} gameId - ID del juego (juego1, juego2, juego3)
 */
function markGameCompleted(gameId) {
  const data = getGameData();
  data.completed[gameId] = true;
  data.lastPlayed = gameId;
  saveGameData(data);
  console.log(`Juego ${gameId} marcado como completado`);
  return data;
}

/**
 * Actualiza las opciones del juego
 * @param {Object} options - Nuevas opciones
 */
function updateGameOptions(options) {
  const data = getGameData();
  data.options = { ...data.options, ...options };
  saveGameData(data);
  return data;
}

/**
 * Verifica si todos los juegos han sido completados
 * @returns {boolean} True si todos los juegos están completados
 */
function areAllGamesCompleted() {
  const data = getGameData();
  const ids = Object.keys(data.completed);
  return ids.length > 0 && ids.every(k => !!data.completed[k]);
}

/**
 * Obtiene el progreso general de los juegos
 * @returns {Object} Objeto con estadísticas de progreso
 */
function getGameProgress() {
  const data = getGameData();
  const completedCount = Object.values(data.completed).filter(Boolean).length;
  const totalGames = Object.keys(data.completed).length;
  
  return {
    completed: completedCount,
    total: totalGames,
    percentage: Math.round((completedCount / totalGames) * 100),
    allCompleted: areAllGamesCompleted(),
    scores: data.scores,
    lastPlayed: data.lastPlayed
  };
}

/**
 * Resetea todos los datos del juego
 */
function resetAllGameData() {
  localStorage.removeItem(STORAGE_KEY);
  console.log('Todos los datos del juego han sido reseteados');
}

// ===== Monedero =====
function getCoins(gameId) {
  const data = getGameData();
  return Math.max(0, Math.floor((data.coins && data.coins[gameId]) || 0));
}
function setCoins(gameId, amount) {
  const data = getGameData();
  data.coins = data.coins || {};
  data.coins[gameId] = Math.max(0, Math.floor(amount || 0));
  saveGameData(data);
  return data.coins[gameId];
}
function addCoins(gameId, delta) {
  return setCoins(gameId, getCoins(gameId) + Math.floor(delta || 0));
}

/**
 * Obtiene las estadísticas detalladas de un juego específico
 * @param {string} gameId - ID del juego
 * @returns {Object} Estadísticas del juego
 */
function getGameStats(gameId) {
  const data = getGameData();
  return {
    score: data.scores[gameId] || 0,
    completed: data.completed[gameId] || false,
    lastPlayed: data.lastPlayed === gameId
  };
}

// ===== Funciones de utilidad para la interfaz =====

/**
 * Actualiza el estado de los enlaces de juegos en el menú principal
 */
function updateGameLinks() {
  // Actualiza estado de cada enlace leyendo la carpeta/slug del href
  const links = Array.from(document.querySelectorAll('.gameLink'));
  let total = 0, done = 0;
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.endsWith('fiesta.html')) return;
    const parts = href.split('/');
    const id = parts[parts.length - (href.endsWith('.html') ? 2 : 1)] || '';
    if (!id) return;
    total++;
    const stats = getGameStats(id);
    if (stats.completed) { done++; link.classList.add('completed'); link.innerHTML = link.innerHTML.replace('🎮','✅'); }
    else { link.classList.remove('completed'); link.innerHTML = link.innerHTML.replace('✅','🎮'); }
  });
  // Fiesta
  const fiestaLink = document.querySelector('.gameLink[href$="fiesta.html"]');
  if (fiestaLink) {
    const allCompleted = total > 0 && done === total;
    if (allCompleted) {
      fiestaLink.classList.remove('locked');
      fiestaLink.style.opacity = '1';
      fiestaLink.style.pointerEvents = 'auto';
      fiestaLink.title = '¡Fiesta desbloqueada! 🎉';
    } else {
      fiestaLink.classList.add('locked');
      fiestaLink.style.opacity = '0.5';
      fiestaLink.style.pointerEvents = 'none';
      fiestaLink.title = `Completa todos los juegos para desbloquear la fiesta (${done}/${total})`;
    }
  }
}

/**
 * Muestra un mensaje de progreso en el menú principal
 */
function showProgressMessage() {
  const progress = getGameProgress();
  const statusElement = document.getElementById('partyStatus');

  if (!statusElement) return;

  // Conservar el texto base propio de cada página (bongo/colibrix/adriansito)
  // Se guarda en data-base la primera vez para no perderlo en refrescos
  const baseMsg = statusElement.dataset.base || statusElement.innerHTML;
  statusElement.dataset.base = baseMsg;

  const progressLine = `Progreso: ${progress.completed}/${progress.total} juegos completados (${progress.percentage}%)`;

  if (progress.allCompleted) {
    statusElement.innerHTML = `🎉 ¡Fiesta DESBLOQUEADA! 🎉<br>${progressLine}`;
    statusElement.style.color = '#4CAF50';
  } else {
    statusElement.innerHTML = `${baseMsg}<br>${progressLine}`;
    statusElement.style.color = '';
  }
}

// ===== Funciones para integración con juegos específicos =====

/**
 * Función para ser llamada cuando se completa el Juego 1 (Descenso 5 Pisos)
 * @param {number} floor - Piso alcanzado (1-5)
 */
function onJuego1Complete(floor) {
  const ids = GAMES_BY_NS[STORAGE_NS] || [];
  const id = ids[0] || 'juego1';
  markGameCompleted(id);
  updateGameScore(id, floor || 1);
}

/**
 * Función para ser llamada cuando se completa el Juego 2 (T-Rex Runner)
 * @param {number} score - Puntuación final
 */
function onJuego2Complete(score) {
  const ids = GAMES_BY_NS[STORAGE_NS] || [];
  const id = ids[1] || 'juego2';
  updateGameScore(id, score || 0);
  markGameCompleted(id);
}

/**
 * Función para ser llamada cuando se completa el Juego 3 (Aventura Épica)
 */
function onJuego3Complete(score=100) {
  const ids = GAMES_BY_NS[STORAGE_NS] || [];
  const id = ids[2] || 'juego3';
  markGameCompleted(id);
  updateGameScore(id, score);
}

// ===== Inicialización automática =====

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar storage si no existe al entrar en los index principales
  try {
    const path = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
    const isIndex = path.endsWith('/index.html') || path === '/' || path.endsWith('/');
    if (isIndex && (path.includes('/adriansito/') || path.includes('/bongo/') || path.includes('/colibrix/') || path === '/')) {
      // Migración desde la clave antigua si existe
      if (!localStorage.getItem(STORAGE_KEY)) {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          try { localStorage.setItem(STORAGE_KEY, legacy); } catch (e) {}
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultGameData));
        }
      }
      updateGameLinks();
      showProgressMessage();
    }
  } catch (e) {
    console.error('Init storage error:', e);
  }
});

// Exportar funciones para uso global
window.GameStorage = {
  getGameData,
  saveGameData,
  updateGameScore,
  markGameCompleted,
  updateGameOptions,
  areAllGamesCompleted,
  getGameProgress,
  resetAllGameData,
  getGameStats,
  updateGameLinks,
  showProgressMessage,
  // Monedero
  getCoins,
  setCoins,
  addCoins,
  onJuego1Complete,
  onJuego2Complete,
  onJuego3Complete
};
