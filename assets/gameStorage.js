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
const defaultGameData = {
  scores: {
    juego1: 0,
    juego2: 0,
    juego3: 0
  },
  completed: {
    juego1: false,
    juego2: false,
    juego3: false
  },
  options: {
    immortalMode: false,
    soundEnabled: true,
    difficulty: 'normal'
  },
  lastPlayed: null,
  totalPlayTime: 0
};

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
      return {
        ...defaultGameData,
        ...data,
        scores: { ...defaultGameData.scores, ...data.scores },
        completed: { ...defaultGameData.completed, ...data.completed },
        options: { ...defaultGameData.options, ...data.options }
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
  return data.completed.juego1 && data.completed.juego2 && data.completed.juego3;
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
  const progress = getGameProgress();
  const fiestaLink = document.querySelector('.gameLink[href$="fiesta.html"]');
  
  if (fiestaLink) {
    if (progress.allCompleted) {
      // Desbloquear fiesta
      fiestaLink.classList.remove('locked');
      fiestaLink.style.opacity = '1';
      fiestaLink.style.pointerEvents = 'auto';
      fiestaLink.title = '¡Fiesta desbloqueada! 🎉';
    } else {
      // Bloquear fiesta
      fiestaLink.classList.add('locked');
      fiestaLink.style.opacity = '0.5';
      fiestaLink.style.pointerEvents = 'none';
      fiestaLink.title = `Completa todos los juegos para desbloquear la fiesta (${progress.completed}/${progress.total})`;
    }
  }
  
  // Actualizar indicadores de progreso en otros enlaces
  const gameLinks = Array.from(document.querySelectorAll('.gameLink'))
    .filter(link => !(link.getAttribute('href') || '').endsWith('fiesta.html'));
  gameLinks.forEach((link, index) => {
    const gameId = `juego${index + 1}`;
    const stats = getGameStats(gameId);
    
    if (stats.completed) {
      link.classList.add('completed');
      link.innerHTML = link.innerHTML.replace('🎮', '✅');
    } else {
      link.classList.remove('completed');
      link.innerHTML = link.innerHTML.replace('✅', '🎮');
    }
  });
}

/**
 * Muestra un mensaje de progreso en el menú principal
 */
function showProgressMessage() {
  const progress = getGameProgress();
  const statusElement = document.getElementById('partyStatus');
  
  if (statusElement) {
    if (progress.allCompleted) {
      statusElement.innerHTML = '🎉 ¡Fiesta DESBLOQUEADA! 🎉';
      statusElement.style.color = '#4CAF50';
    } else {
      statusElement.innerHTML = `🚨 Estado de la Fiesta: ¡Necesitamos un milagro en el 93! 🚨<br>
      Progreso: ${progress.completed}/${progress.total} juegos completados (${progress.percentage}%)
      `;
    }
  }
}

// ===== Funciones para integración con juegos específicos =====

/**
 * Función para ser llamada cuando se completa el Juego 1 (Descenso 5 Pisos)
 * @param {number} floor - Piso alcanzado (1-5)
 */
function onJuego1Complete(floor) {
  if (floor >= 5) {
    markGameCompleted('juego1');
    updateGameScore('juego1', floor);
    console.log('Juego 1 completado: Descenso 5 Pisos');
  }
}

/**
 * Función para ser llamada cuando se completa el Juego 2 (T-Rex Runner)
 * @param {number} score - Puntuación final
 */
function onJuego2Complete(score) {
  updateGameScore('juego2', score);
  markGameCompleted('juego2');
  console.log(`Juego 2 completado: T-Rex Runner con ${score} puntos`);
}

/**
 * Función para ser llamada cuando se completa el Juego 3 (Aventura Épica)
 */
function onJuego3Complete() {
  markGameCompleted('juego3');
  updateGameScore('juego3', 100); // Puntuación fija para juego 3
  console.log('Juego 3 completado: Aventura Épica');
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
  onJuego1Complete,
  onJuego2Complete,
  onJuego3Complete
};
