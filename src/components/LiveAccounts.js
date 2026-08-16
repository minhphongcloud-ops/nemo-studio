/* ==============================
   Live Accounts Panel
   ============================== */

import { ACCOUNTS, GIFTS } from '../data/mockData.js';

let accounts = [...ACCOUNTS];

export function renderLiveAccounts() {
  const accountCards = accounts.map(acc => {
    const statusBadge = acc.status === 'live'
      ? `<span class="badge badge--live">LIVE</span>`
      : `<span style="font-size:11px;color:var(--text-muted)">Offline</span>`;

    return `
      <div class="account-card ${acc.selected ? 'selected' : ''}" data-account-id="${acc.id}">
        <div class="account-card__avatar" style="background:${acc.avatarColor}20; font-size:20px;">
          ${acc.avatarInitial}
        </div>
        <div class="account-card__info">
          <div class="account-card__name">
            ${acc.username}
            ${statusBadge}
          </div>
          <div class="account-card__followers">
            <span>👤</span>
            ${acc.followers}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="panel" style="height:100%;">
      <div class="panel__header">
        <span class="panel__title">LIVE ACCOUNTS</span>
        <div class="panel__actions">
          <button class="btn btn--icon-sm btn--ghost" title="Add account">+</button>
        </div>
      </div>
      <div class="panel__body" id="live-accounts-list" style="padding:var(--space-8);">
        ${accountCards}
      </div>
      <div class="panel__footer">
        <button class="btn btn--add" id="add-account-btn">
          + Thêm tài khoản
        </button>
      </div>
    </div>
  `;
}

export function initLiveAccounts() {
  document.querySelectorAll('.account-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.account-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}
