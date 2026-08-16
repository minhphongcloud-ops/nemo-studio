/* ==============================
   Top Bar Component
   ============================== */

import { SYSTEM_METRICS } from '../data/mockData.js';

export function renderTopBar() {
  return `
    <header class="topbar">
      <div class="topbar__left">
        <h1 class="topbar__title">TikTok LIVE Studio</h1>
        <div class="topbar__status">
          <span class="status-dot status-dot--success"></span>
          Connected
        </div>
      </div>

      <div class="topbar__center">
        <div class="topbar__metric">
          <span class="topbar__metric-label">FPS</span>
          <span class="topbar__metric-value" id="metric-fps">${SYSTEM_METRICS.fps}</span>
        </div>
        <div class="topbar__metric">
          <span class="topbar__metric-label">CPU</span>
          <span class="topbar__metric-value" id="metric-cpu">${SYSTEM_METRICS.cpu}%</span>
        </div>
        <div class="topbar__metric">
          <span class="topbar__metric-label">RAM</span>
          <span class="topbar__metric-value" id="metric-ram">${SYSTEM_METRICS.ram}%</span>
        </div>
        <div class="topbar__metric">
          <span class="topbar__metric-label">Network</span>
          <span class="topbar__metric-value" id="metric-network">${SYSTEM_METRICS.network}</span>
        </div>
      </div>

      <div class="topbar__right">
        <div class="topbar__streamer">
          <div class="topbar__streamer-avatar">S</div>
          <div class="topbar__streamer-info">
            <span class="topbar__streamer-name">Streamer</span>
            <span class="topbar__streamer-status">Online</span>
          </div>
          <span class="topbar__streamer-arrow">▾</span>
        </div>

        <div class="topbar__window-controls">
          <button class="topbar__window-btn topbar__window-btn--minimize" title="Minimize"></button>
          <button class="topbar__window-btn topbar__window-btn--maximize" title="Maximize"></button>
          <button class="topbar__window-btn topbar__window-btn--close" title="Close"></button>
        </div>
      </div>
    </header>
  `;
}

export function initTopBar() {
  // Simulate fluctuating metrics
  setInterval(() => {
    const fpsEl = document.getElementById('metric-fps');
    const cpuEl = document.getElementById('metric-cpu');
    const ramEl = document.getElementById('metric-ram');

    if (fpsEl) fpsEl.textContent = 58 + Math.floor(Math.random() * 3);
    if (cpuEl) cpuEl.textContent = (10 + Math.floor(Math.random() * 6)) + '%';
    if (ramEl) ramEl.textContent = (26 + Math.floor(Math.random() * 5)) + '%';
  }, 3000);
}
