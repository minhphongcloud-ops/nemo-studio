/* ==============================
   Gift Queue Component
   ============================== */

import { INITIAL_QUEUE, GIFTS } from '../data/mockData.js';

let queue = [...INITIAL_QUEUE];
let currentItemIndex = 0;

export function renderGiftQueue() {
  return `
    <div class="panel" style="height:100%;">
      <div class="panel__header">
        <span class="panel__title">LIVE GIFT QUEUE</span>
        <div class="panel__actions">
          <button class="btn btn--sm btn--ghost" id="clear-queue-btn">Clear queue</button>
        </div>
      </div>
      <div class="panel__body" id="gift-queue-body" style="padding:var(--space-8);">
        ${renderQueueItems()}
      </div>
      <div class="queue-current" id="queue-current-section">
        ${renderCurrentItem()}
      </div>
    </div>
  `;
}

function renderQueueItems() {
  if (queue.length === 0) {
    return `
      <div class="queue-empty">
        <span class="queue-empty__icon">📭</span>
        <span>Queue empty</span>
        <span style="font-size:11px;">Waiting for gift...</span>
      </div>
    `;
  }

  return `
    <div class="queue-list">
      ${queue.map((item, idx) => {
        const gift = GIFTS[item.giftId];
        return `
          <div class="queue-item ${idx === 0 ? 'active' : ''}" data-queue-id="${item.id}">
            <span class="queue-item__number">${idx + 1}</span>
            <span class="queue-item__gift-icon">${gift ? gift.emoji : '🎁'}</span>
            <div class="queue-item__avatar">${item.userAvatar}</div>
            <div class="queue-item__info">
              <div class="queue-item__gift-name">
                ${gift ? gift.name : 'Gift'}
                <span class="queue-item__gift-qty">x${item.quantity}</span>
              </div>
              <div class="queue-item__action">${item.action}</div>
            </div>
            <span class="queue-item__time">${item.time}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderCurrentItem() {
  if (queue.length === 0) {
    return `
      <div class="queue-current__label" style="text-align:center;padding:var(--space-8);color:var(--text-muted);font-size:11px;">
        Không có sự kiện đang thực hiện
      </div>
    `;
  }

  const current = queue[0];
  const gift = GIFTS[current.giftId];

  return `
    <div class="queue-current__label">Đang thực hiện:</div>
    <div class="queue-current__info">
      <span class="queue-current__gift">
        ${gift ? gift.emoji : '🎁'}
        ${gift ? gift.name : 'Gift'} x${current.quantity}
      </span>
      <span class="queue-current__time" id="queue-current-time">00:03 / ${current.time}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-bar__fill" id="queue-progress" style="width:37.5%"></div>
    </div>
  `;
}

export function addToQueue(queueItem) {
  queue.push(queueItem);
  refreshQueue();
}

export function refreshQueue() {
  const body = document.getElementById('gift-queue-body');
  const currentSection = document.getElementById('queue-current-section');
  if (body) body.innerHTML = renderQueueItems();
  if (currentSection) currentSection.innerHTML = renderCurrentItem();
}

export function initGiftQueue() {
  const clearBtn = document.getElementById('clear-queue-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      queue = [];
      refreshQueue();
    });
  }

  // Simulate queue progress
  let progressSecs = 3;
  const totalSecs = 8;

  setInterval(() => {
    if (queue.length === 0) return;

    progressSecs++;
    const current = queue[0];
    const timeParts = current.time.split(':');
    const total = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);

    if (progressSecs >= total) {
      // Item complete, move to next
      queue.shift();
      progressSecs = 0;
      refreshQueue();
      return;
    }

    const pct = (progressSecs / total) * 100;
    const m = String(Math.floor(progressSecs / 60)).padStart(2, '0');
    const s = String(progressSecs % 60).padStart(2, '0');

    const timeEl = document.getElementById('queue-current-time');
    const progEl = document.getElementById('queue-progress');

    if (timeEl) timeEl.textContent = `${m}:${s} / ${current.time}`;
    if (progEl) progEl.style.width = pct + '%';
  }, 1000);
}
