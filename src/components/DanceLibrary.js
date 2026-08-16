/* ==============================
   Dance Library Component
   ============================== */

import { DANCES } from '../data/mockData.js';

let dances = [...DANCES];
let activeTab = 'all';

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'dance', label: 'Dance' },
  { id: 'animation', label: 'Animation' },
  { id: 'special', label: 'Special' },
];

const DANCE_EMOJIS = {
  'Dance - Cute': '💕',
  'Dance - Love': '❤️',
  'Dance - Happy': '😊',
  'Dance - Powerful': '💪',
  'Dance - Special': '✨',
  'Animation - Wave': '👋',
};

export function renderDanceLibrary() {
  return `
    <div class="panel" style="height:100%;">
      <div class="panel__header">
        <span class="panel__title">DANCE LIBRARY</span>
        <div class="panel__actions">
          <button class="btn btn--sm btn--secondary">+ Thêm animation</button>
        </div>
      </div>
      <div class="panel__body panel__body--no-pad" style="padding-top:var(--space-10);">
        <div class="dance-tabs" id="dance-tabs">
          ${TABS.map(tab => `
            <button class="dance-tab ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}">
              ${tab.label}
            </button>
          `).join('')}
        </div>
        <div class="dance-grid" id="dance-grid">
          ${renderDanceCards()}
        </div>
        <div style="padding:var(--space-10) var(--space-12);">
          <button class="btn btn--add">+ Thêm animation</button>
        </div>
      </div>
    </div>
  `;
}

function renderDanceCards() {
  const filtered = activeTab === 'all' ? dances : dances.filter(d => d.category === activeTab);

  return filtered.map(dance => `
    <div class="dance-card ${dance.selected ? 'selected' : ''}" data-dance-id="${dance.id}">
      <div class="dance-card__thumb">
        <span class="dance-card__thumb-icon">${DANCE_EMOJIS[dance.name] || '🎵'}</span>
        ${dance.selected ? '<div class="dance-card__check">✓</div>' : ''}
      </div>
      <div class="dance-card__info">
        <span class="dance-card__name">${dance.name}</span>
        <span class="dance-card__duration">${dance.duration}</span>
      </div>
    </div>
  `).join('');
}

export function initDanceLibrary() {
  // Tab switching
  document.querySelectorAll('.dance-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      document.querySelectorAll('.dance-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const grid = document.getElementById('dance-grid');
      if (grid) grid.innerHTML = renderDanceCards();
      bindDanceCards();
    });
  });

  bindDanceCards();
}

function bindDanceCards() {
  document.querySelectorAll('.dance-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.danceId;
      dances.forEach(d => d.selected = d.id === id);
      const grid = document.getElementById('dance-grid');
      if (grid) grid.innerHTML = renderDanceCards();
      bindDanceCards();
    });
  });
}
