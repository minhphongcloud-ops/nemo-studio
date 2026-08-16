/* ==============================
   Avatar Preview Component
   ============================== */

let currentAnimation = { name: 'Dance - Cute', current: '00:03', total: '00:08', progress: 37.5 };
let isPlaying = true;

export function renderAvatarPreview() {
  return `
    <div class="panel" style="flex:1;">
      <div class="panel__header" style="padding:var(--space-8) var(--space-12);">
        <span class="panel__title" style="font-size:12px;">AVATAR PREVIEW</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="status-dot status-dot--pink"></span>
          <span style="font-size:11px;color:var(--primary);font-weight:600;">Live</span>
        </div>
      </div>
      <div class="panel__body panel__body--no-pad" style="display:flex;flex-direction:column;">
        <div class="avatar-display" id="avatar-display">
          <!-- Avatar placeholder - VTuber silhouette -->
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,#1a0a2e 0%,#0d0618 40%,#080420 100%);display:flex;align-items:center;justify-content:center;">
            <!-- Stage lights effect -->
            <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:60%;height:40%;background:radial-gradient(ellipse,rgba(233,30,140,0.08) 0%,transparent 70%);"></div>
            <div style="position:absolute;bottom:0;left:0;right:0;height:30%;background:radial-gradient(ellipse at center bottom,rgba(124,58,237,0.1) 0%,transparent 70%);"></div>

            <!-- Avatar figure -->
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;">
              <div style="font-size:80px;filter:drop-shadow(0 0 20px rgba(233,30,140,0.3));" id="avatar-character">💃</div>
              <div id="avatar-playing-badge" style="display:${isPlaying ? 'flex' : 'none'};align-items:center;gap:4px;padding:2px 8px;background:rgba(233,30,140,0.2);border:1px solid rgba(233,30,140,0.3);border-radius:var(--radius-full);font-size:9px;font-weight:600;color:var(--primary);">
                ▶ PLAYING
              </div>
            </div>
          </div>

          <!-- Animation info overlay -->
          <div class="avatar-display__animation-info" id="avatar-animation-info">
            <div class="avatar-display__animation-name" id="avatar-anim-name">${currentAnimation.name}</div>
            <div class="avatar-display__animation-time">
              <span id="avatar-anim-current">${currentAnimation.current}</span>
              <span>/</span>
              <span id="avatar-anim-total">${currentAnimation.total}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill" id="avatar-progress" style="width:${currentAnimation.progress}%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function updateAvatarAnimation(animName, durationStr) {
  currentAnimation.name = animName;
  currentAnimation.total = durationStr;
  currentAnimation.current = '00:00';
  currentAnimation.progress = 0;
  isPlaying = true;

  const nameEl = document.getElementById('avatar-anim-name');
  const totalEl = document.getElementById('avatar-anim-total');
  const currentEl = document.getElementById('avatar-anim-current');
  const progressEl = document.getElementById('avatar-progress');
  const badgeEl = document.getElementById('avatar-playing-badge');

  if (nameEl) nameEl.textContent = animName;
  if (totalEl) totalEl.textContent = durationStr;
  if (currentEl) currentEl.textContent = '00:00';
  if (progressEl) progressEl.style.width = '0%';
  if (badgeEl) badgeEl.style.display = 'flex';

  // Parse total seconds
  const parts = durationStr.split(':');
  const totalSecs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  let elapsed = 0;

  const interval = setInterval(() => {
    elapsed++;
    const pct = Math.min((elapsed / totalSecs) * 100, 100);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');

    if (currentEl) currentEl.textContent = `${m}:${s}`;
    if (progressEl) progressEl.style.width = pct + '%';

    if (elapsed >= totalSecs) {
      clearInterval(interval);
      isPlaying = false;
      if (badgeEl) badgeEl.style.display = 'none';
    }
  }, 1000);
}

let avatarProgressInterval = null;

export function initAvatarPreview() {
  // Start the initial animation progress simulation
  const totalSecs = 8;
  let elapsed = 3;

  avatarProgressInterval = setInterval(() => {
    elapsed++;
    if (elapsed > totalSecs) elapsed = 0;

    const pct = (elapsed / totalSecs) * 100;
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');

    const currentEl = document.getElementById('avatar-anim-current');
    const progressEl = document.getElementById('avatar-progress');

    if (currentEl) currentEl.textContent = `${m}:${s}`;
    if (progressEl) progressEl.style.width = pct + '%';
  }, 1000);
}
