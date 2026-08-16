/* ==============================
   Gift Trigger Rules Component
   ============================== */

import { TRIGGER_RULES, GIFTS } from '../data/mockData.js';

let rules = [...TRIGGER_RULES];

function getPriorityClass(p) {
  if (p >= 20) return 'badge--priority-critical';
  if (p >= 5) return 'badge--priority-medium';
  if (p >= 2) return 'badge--priority-high';
  return 'badge--priority-low';
}

export function renderGiftTriggerRules() {
  const rows = rules.map(rule => {
    const gift = GIFTS[rule.giftId];
    return `
      <tr data-rule-id="${rule.id}">
        <td>
          <div class="trigger-table__gift">
            <span class="trigger-table__gift-icon">${gift ? gift.emoji : '🎁'}</span>
          </div>
        </td>
        <td class="trigger-table__name">${rule.displayName}</td>
        <td>
          <div class="trigger-table__action">
            <span class="trigger-table__action-select">${rule.action} ▾</span>
          </div>
        </td>
        <td style="font-variant-numeric:tabular-nums;">${rule.duration}</td>
        <td>
          <span class="badge badge--priority ${getPriorityClass(rule.priority)}">${rule.priority}</span>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:var(--space-6);">
            <div class="toggle ${rule.active ? 'active' : ''}" data-rule-toggle="${rule.id}"></div>
            <button class="trigger-table__more-btn">•••</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="panel" style="height:100%;">
      <div class="panel__header">
        <span class="panel__title">GIFT TRIGGER RULES</span>
        <div class="panel__actions">
          <button class="btn btn--sm btn--secondary">+ Thêm rule</button>
        </div>
      </div>
      <div class="panel__body panel__body--no-pad" style="overflow-x:auto;">
        <table class="trigger-table">
          <thead>
            <tr>
              <th>Gift</th>
              <th>Tên hiển thị</th>
              <th>Hành động</th>
              <th>Thời gian</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody id="trigger-rules-body">
            ${rows}
          </tbody>
        </table>
      </div>
      <div class="panel__footer" style="padding:var(--space-6) var(--space-12);">
        <span style="font-size:10px;color:var(--text-muted);">↕ Kéo thả để thay đổi thứ tự ưu tiên</span>
      </div>
    </div>
  `;
}

export function initGiftTriggerRules() {
  document.querySelectorAll('.toggle[data-rule-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      const ruleId = toggle.dataset.ruleToggle;
      const rule = rules.find(r => r.id === ruleId);
      if (rule) rule.active = toggle.classList.contains('active');
    });
  });
}

export function highlightRule(giftId) {
  const tbody = document.getElementById('trigger-rules-body');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const ruleId = row.dataset.ruleId;
    const rule = rules.find(r => r.id === ruleId);
    if (rule && rule.giftId === giftId) {
      row.classList.add('animate-gift-highlight');
      setTimeout(() => row.classList.remove('animate-gift-highlight'), 1000);
    }
  });
}
