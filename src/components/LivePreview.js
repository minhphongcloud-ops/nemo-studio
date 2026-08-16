/* ==============================
   Live Preview Component
   ============================== */

import { LIVE_STREAM, INITIAL_GIFT_FEED, GIFTS } from '../data/mockData.js';

let giftFeed = [...INITIAL_GIFT_FEED];

export function renderLivePreview() {
  const giftsHtml = giftFeed.map(g => {
    const gift = GIFTS[g.giftId];
    return `
      <div class="live-preview__gift">
        <div class="live-preview__gift-avatar">${gift ? gift.emoji : '🎁'}</div>
        <div class="live-preview__gift-text">
          <span class="live-preview__gift-user">${g.user}</span>
          <span class="live-preview__gift-desc">${g.desc}</span>
        </div>
        <span class="live-preview__gift-qty">x${g.quantity}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="panel" style="height:100%;">
      <div class="panel__header">
        <div style="display:flex;align-items:center;gap:var(--space-8);">
          <span class="panel__title">LIVE: ${LIVE_STREAM.username}</span>
          <span style="font-size:13px;color:var(--text-muted);cursor:pointer;" title="Open external">↗</span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-8);">
          <span class="status-dot status-dot--live"></span>
          <span style="font-size:12px;font-weight:600;color:var(--error);">LIVE</span>
          <span id="live-duration" style="font-size:12px;font-weight:600;color:var(--text-secondary);font-variant-numeric:tabular-nums;">${LIVE_STREAM.duration}</span>
        </div>
      </div>
      <div class="panel__body panel__body--no-pad" style="display:flex;flex-direction:column;">
        <div class="live-preview" id="live-preview-area">
          <!-- Video preview background -->
          <div style="position:absolute;inset:0;background:linear-gradient(135deg,#1a0825 0%,#0f0a1a 30%,#0a0612 60%,#120a20 100%);display:flex;align-items:center;justify-content:center;">
            <!-- TikTok branding -->
            <div style="position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:6px;">
              <span style="font-size:16px;">♪</span>
              <span style="font-size:13px;font-weight:700;color:white;">TikTok</span>
              <span style="font-size:9px;font-weight:700;background:#EF4444;color:white;padding:1px 5px;border-radius:3px;">LIVE</span>
            </div>

            <!-- Simulated VTuber streamer preview -->
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.7;">
              <div style="width:120px;height:160px;border-radius:16px;background:linear-gradient(135deg,#E91E8C33,#7C3AED33);border:1px solid #E91E8C44;display:flex;align-items:center;justify-content:center;font-size:60px;">
                👩‍🎤
              </div>
              <span style="font-size:10px;color:var(--text-muted);">Live streaming...</span>
            </div>
          </div>

          <!-- Stats overlay -->
          <div class="live-preview__overlay">
            <div class="live-preview__stats">
              <div class="live-preview__stat">
                <span class="live-preview__stat-icon">👁</span>
                <span id="live-viewers">${LIVE_STREAM.viewers}</span>
              </div>
              <div class="live-preview__stat">
                <span class="live-preview__stat-icon">♥</span>
                <span id="live-likes">${LIVE_STREAM.likes}</span>
              </div>
            </div>
          </div>

          <!-- Gift feed overlay -->
          <div class="live-preview__gifts" id="live-gift-feed">
            ${giftsHtml}
          </div>
        </div>

        <!-- Controls -->
        <div class="live-preview__controls">
          <div class="live-preview__volume">
            <span style="font-size:14px;color:var(--text-muted);">🔊</span>
            <input type="range" min="0" max="100" value="70" />
            <span style="font-size:11px;color:var(--text-muted);cursor:pointer;">•••</span>
          </div>
          <div class="live-preview__control-btns">
            <button class="btn btn--ghost btn--sm">Mute</button>
            <button class="btn btn--ghost btn--sm">Pause</button>
            <button class="btn btn--ghost btn--sm">Full HD</button>
            <button class="btn btn--ghost btn--sm">Pop-out</button>
            <button class="btn btn--danger btn--sm" id="disconnect-btn">Disconnect</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function addGiftToFeed(giftEvent) {
  const gift = GIFTS[giftEvent.giftId];
  if (!gift) return;

  const feedEl = document.getElementById('live-gift-feed');
  if (!feedEl) return;

  const newGift = document.createElement('div');
  newGift.className = 'live-preview__gift animate-slide-in';
  newGift.innerHTML = `
    <div class="live-preview__gift-avatar">${gift.emoji}</div>
    <div class="live-preview__gift-text">
      <span class="live-preview__gift-user">${giftEvent.user}</span>
      <span class="live-preview__gift-desc">đã gửi ${gift.name}</span>
    </div>
    <span class="live-preview__gift-qty">x${giftEvent.quantity}</span>
  `;

  feedEl.appendChild(newGift);

  // Keep max 6 items
  while (feedEl.children.length > 6) {
    feedEl.removeChild(feedEl.firstChild);
  }

  // Remove animation class after
  setTimeout(() => newGift.classList.remove('animate-slide-in'), 500);
}

let durationSeconds = 5136; // 01:25:36
export function initLivePreview() {
  setInterval(() => {
    durationSeconds++;
    const h = String(Math.floor(durationSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((durationSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(durationSeconds % 60).padStart(2, '0');
    const el = document.getElementById('live-duration');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }, 1000);
}
