/* ==============================
   Dev Tools Component
   ============================== */

import { GIFTS } from '../data/mockData.js';
import { eventProvider } from '../data/mockEventProvider.js';

let isOpen = false;

export function renderDevTools() {
  const giftOptions = Object.values(GIFTS).map(g =>
    `<option value="${g.id}">${g.emoji} ${g.name}</option>`
  ).join('');

  return `
    <div class="devtools" id="devtools">
      <div class="devtools__panel ${isOpen ? 'open' : ''}" id="devtools-panel">
        <div class="devtools__title">
          🛠 Developer Tools
        </div>

        <div class="devtools__field">
          <label class="devtools__label">Gift</label>
          <select class="devtools__select" id="dev-gift-select">
            ${giftOptions}
          </select>
        </div>

        <div class="devtools__field">
          <label class="devtools__label">Quantity</label>
          <input class="devtools__input" type="number" id="dev-gift-qty" value="1" min="1" max="100" />
        </div>

        <div class="devtools__field">
          <label class="devtools__label">Username</label>
          <input class="devtools__input" type="text" id="dev-gift-user" placeholder="TestUser" />
        </div>

        <button class="devtools__send-btn" id="dev-send-gift">
          🎁 Send Gift
        </button>

        <div style="margin-top:var(--space-12);padding-top:var(--space-10);border-top:1px solid var(--border-light);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-8);">
            <span style="font-size:11px;color:var(--text-secondary);font-weight:600;">Auto Gifts</span>
            <div class="toggle" id="dev-auto-toggle"></div>
          </div>
          <div class="devtools__field" style="margin-bottom:0;">
            <label class="devtools__label">Interval (ms)</label>
            <input class="devtools__input" type="number" id="dev-auto-interval" value="5000" min="1000" max="30000" step="1000" />
          </div>
        </div>
      </div>

      <button class="devtools__toggle" id="devtools-toggle" title="Developer Tools">
        🛠
      </button>
    </div>
  `;
}

export function initDevTools() {
  const toggleBtn = document.getElementById('devtools-toggle');
  const panel = document.getElementById('devtools-panel');
  const sendBtn = document.getElementById('dev-send-gift');
  const autoToggle = document.getElementById('dev-auto-toggle');

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const giftId = document.getElementById('dev-gift-select').value;
      const qty = parseInt(document.getElementById('dev-gift-qty').value) || 1;
      const user = document.getElementById('dev-gift-user').value || 'TestUser';
      eventProvider.sendGift(giftId, qty, user);
    });
  }

  if (autoToggle) {
    autoToggle.addEventListener('click', () => {
      autoToggle.classList.toggle('active');
      if (autoToggle.classList.contains('active')) {
        const interval = parseInt(document.getElementById('dev-auto-interval').value) || 5000;
        eventProvider.startAutoGifts(interval);
      } else {
        eventProvider.stopAutoGifts();
      }
    });
  }
}
