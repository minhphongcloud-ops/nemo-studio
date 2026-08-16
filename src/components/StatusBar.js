/* ==============================
   Status Bar Component
   ============================== */

export function renderStatusBar() {
  return `
    <footer class="statusbar">
      <div class="statusbar__left">
        <div class="statusbar__item">
          <span class="statusbar__item-label">System Status</span>
          <span class="status-dot status-dot--success"></span>
          <span class="statusbar__item-value statusbar__item-value--success">Good</span>
        </div>
        <div class="statusbar__item">
          <span class="statusbar__item-label">TikTok Connect</span>
          <span class="statusbar__item-value statusbar__item-value--success">Connected</span>
        </div>
        <div class="statusbar__item">
          <span class="statusbar__item-label">Gift Listener</span>
          <span class="statusbar__item-value statusbar__item-value--active">Active</span>
        </div>
        <div class="statusbar__item">
          <span class="statusbar__item-label">Avatar Engine</span>
          <span class="statusbar__item-value statusbar__item-value--running">Running</span>
        </div>
      </div>
      <div class="statusbar__right">
        <div class="statusbar__latency">
          <span>Latency:</span>
          <span class="statusbar__latency-value" id="status-latency">28ms</span>
        </div>
        <div class="statusbar__network" title="Network strength">
          <div class="statusbar__network-bar" style="height:6px"></div>
          <div class="statusbar__network-bar" style="height:9px"></div>
          <div class="statusbar__network-bar" style="height:12px"></div>
          <div class="statusbar__network-bar" style="height:15px"></div>
        </div>
        <button class="statusbar__log-btn" id="open-log-btn">Open Log</button>
      </div>
    </footer>
  `;
}

export function initStatusBar() {
  // Simulate latency fluctuation
  setInterval(() => {
    const el = document.getElementById('status-latency');
    if (el) {
      el.textContent = (25 + Math.floor(Math.random() * 10)) + 'ms';
    }
  }, 5000);
}
