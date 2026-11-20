// Intentionally minimal: the renderer does not receive Node.js or filesystem access.
window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.desktopApp = 'true';
});
