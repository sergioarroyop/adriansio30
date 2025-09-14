// resolution.js - Sistema de verificación de resolución global

/**
 * Verifica si la resolución de pantalla es suficiente para los juegos
 * @returns {boolean} True si la resolución es suficiente
 */
function checkResolution() {
  return window.innerWidth >= 1920 && window.innerHeight >= 1080;
}

/**
 * Muestra u oculta el overlay de resolución según corresponda
 * @param {HTMLElement} overlay - Elemento overlay a mostrar/ocultar
 */
function updateResolutionOverlay(overlay) {
  if (!overlay) return;
  
  // Actualizar resolución actual en el overlay
  const resolutionSpan = overlay.querySelector('#currentResolution');
  if (resolutionSpan) {
    resolutionSpan.textContent = `${window.innerWidth}x${window.innerHeight}`;
  }
  
  if (!checkResolution()) {
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}

/**
 * Inicializa el sistema de verificación de resolución global
 * @param {HTMLElement} overlay - Elemento overlay (opcional)
 */
function initResolutionCheck(overlay = null) {
  // Buscar overlay automáticamente si no se proporciona
  if (!overlay) {
    overlay = document.getElementById('overlay');
  }
  
  // Función de verificación
  function checkAndUpdate() {
    updateResolutionOverlay(overlay);
  }
  
  // Verificar al cargar y redimensionar
  window.addEventListener('load', checkAndUpdate);
  window.addEventListener('resize', checkAndUpdate);
  
  // Verificación inicial
  checkAndUpdate();
  
  return checkAndUpdate;
}

// Exportar funciones para uso global
window.Resolution = {
  checkResolution,
  updateResolutionOverlay,
  initResolutionCheck
};

// Inicialización automática
document.addEventListener('DOMContentLoaded', function() {
  initResolutionCheck();
});
