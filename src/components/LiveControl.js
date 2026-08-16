/* ==============================
   Live Control Component
   ============================== */

let quickSettings = {
  autoDance: true,
  receiveGifts: true,
  stageEffects: true,
  audio: true,
  volume: 70,
};

export function renderLiveControl() {
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-12);">
      <!-- LIVE CONTROL -->
      <div class="panel" style="flex-shrink:0;">
        <div class="panel__header" style="padding:var(--space-8) var(--space-12);">
          <span class="panel__title" style="font-size:12px;">LIVE CONTROL</span>
        </div>
        <div class="panel__body" style="padding:var(--space-10);">
          <div class="live-control">
            <button class="live-control__btn live-control__btn--start" id="btn-start-avatar">
              <span class="live-control__btn-icon">▶</span>
              Bắt đầu Avatar
            </button>
            <button class="live-control__btn live-control__btn--secondary" id="btn-pause">
              <span class="live-control__btn-icon">⏸</span>
              Tạm dừng
            </button>
            <button class="live-control__btn live-control__btn--secondary" id="btn-stop">
              <span class="live-control__btn-icon">■</span>
              Dừng
            </button>
            <button class="live-control__btn live-control__btn--secondary" id="btn-reset">
              <span class="live-control__btn-icon">↻</span>
              Reset Avatar
            </button>
          </div>
        </div>
      </div>

      <!-- QUICK SETTINGS -->
      <div class="panel" style="flex-shrink:0;">
        <div class="panel__body" style="padding:var(--space-10) var(--space-12);">
          <div class="quick-settings">
            <div class="quick-settings__title">TÙY CHỈNH NHANH</div>

            <div class="quick-settings__item">
              <span class="quick-settings__label">Tự động nhảy</span>
              <div class="toggle ${quickSettings.autoDance ? 'active' : ''}" data-setting="autoDance"></div>
            </div>

            <div class="quick-settings__item">
              <span class="quick-settings__label">Nhận quà</span>
              <div class="toggle ${quickSettings.receiveGifts ? 'active' : ''}" data-setting="receiveGifts"></div>
            </div>

            <div class="quick-settings__item">
              <span class="quick-settings__label">Hiệu ứng sân khấu</span>
              <div class="toggle ${quickSettings.stageEffects ? 'active' : ''}" data-setting="stageEffects"></div>
            </div>

            <div class="quick-settings__item">
              <span class="quick-settings__label">Âm thanh</span>
              <div class="toggle ${quickSettings.audio ? 'active' : ''}" data-setting="audio"></div>
            </div>

            <div class="quick-settings__volume">
              <input type="range" min="0" max="100" value="${quickSettings.volume}" id="volume-slider" />
              <span class="quick-settings__volume-value" id="volume-value">${quickSettings.volume}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initLiveControl() {
  // Toggle switches
  document.querySelectorAll('.toggle[data-setting]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      const setting = toggle.dataset.setting;
      quickSettings[setting] = toggle.classList.contains('active');
    });
  });

  // Volume slider
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  if (volumeSlider && volumeValue) {
    volumeSlider.addEventListener('input', (e) => {
      volumeValue.textContent = e.target.value + '%';
      quickSettings.volume = parseInt(e.target.value);
    });
  }
}
