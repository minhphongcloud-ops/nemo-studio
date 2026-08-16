/* ==============================
   Sidebar Component
   ============================== */

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'companions', label: 'Companions', icon: 'users' },
  { id: 'gallery', label: 'Gallery', icon: 'image' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
  { id: 'tiktok-live', label: 'TikTok LIVE', icon: 'live', active: true },
  { id: 'dance-library', label: 'Dance Library', icon: 'music' },
  { id: 'gift-trigger', label: 'Gift Trigger', icon: 'gift' },
  { id: 'live-logs', label: 'Live Logs', icon: 'file-text' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function getIcon(name) {
  const icons = {
    grid: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    users: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    image: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    wallet: `<svg viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>`,
    live: `<svg viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    music: `<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    gift: `<svg viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
    'file-text': `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  };
  return icons[name] || '';
}

export function renderSidebar() {
  const navItems = NAV_ITEMS.map(item => `
    <div class="sidebar__nav-item ${item.active ? 'active' : ''}" data-nav="${item.id}">
      <span class="sidebar__nav-icon">${getIcon(item.icon)}</span>
      <span>${item.label}</span>
    </div>
  `).join('');

  return `
    <aside class="sidebar">
      <div class="sidebar__logo">
        <div class="sidebar__logo-icon">
          <svg viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <span class="sidebar__logo-text">Nemo Studio</span>
      </div>

      <nav class="sidebar__nav">
        ${navItems}
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__premium">
          <div class="sidebar__premium-label">
            <span>Premium Plan</span>
            <span class="sidebar__premium-badge">Pro</span>
          </div>
          <div class="sidebar__premium-expiry">Hết hạn: 25/08/2026</div>
          <button class="sidebar__premium-btn">Nâng cấp ngay</button>
        </div>

        <div class="sidebar__version">
          <div class="sidebar__version-info">
            <strong>Nemo Studio</strong> v1.2.0<br/>
            <span>© 2024 All rights reserved</span>
          </div>
          <div class="sidebar__version-actions">
            <button title="Info">ℹ</button>
            <button title="Settings">⚙</button>
            <button title="Help">?</button>
          </div>
        </div>
      </div>
    </aside>
  `;
}

export function initSidebar() {
  document.querySelectorAll('.sidebar__nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar__nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}
