import './styles/app.css';
import { socket } from './socket.js';
import { state } from './state.js';
import { api } from './api.js';
import { showToast, showModal, showConfirm, fmtTime, fmtDuration } from './utils.js';
import { AvatarEngine } from './avatar/AvatarEngine.js';
import { RuleEngine } from './gift/RuleEngine.js';
import { MockGiftProvider } from './gift/MockGiftProvider.js';

// ══════════════════════════════════════════════════════════
// MAIN APP — Nemo Studio
// ══════════════════════════════════════════════════════════

let liveSecs = 0;
let _currentNavIndex = 3; // Track which nav tab is active (default: TikTok LIVE)

// ─── AVATAR ENGINE (singleton) ───────────────────────────
const avatarEngine = new AvatarEngine();
let ruleEngine = null;
let mockGiftProvider = null;
const liveLog = []; // Live event log entries

// ─── RENDER ──────────────────────────────────────────────
function render() {
  const accounts = state.get('accounts');
  const rules = state.get('rules');
  const dances = state.get('dances');
  const settings = state.get('settings');
  const engine = state.get('engine');
  const giftFeed = state.get('giftFeed');
  const danceTab = state.get('danceTab');
  const conn = state.get('connection');
  const metrics = state.get('systemMetrics');
  const selectedAcc = accounts.find(a => a.selected) || accounts[0];

  // ── Preserve WebGL canvas across re-renders ──────────────
  const _savedCanvas = document.getElementById('avatar-canvas-container');
  if (_savedCanvas) _savedCanvas.remove(); // detach from DOM temporarily

  document.getElementById('app').innerHTML = `
<div class="app">
  <!-- SIDEBAR -->
  <aside class="sb">
    <div class="sb-logo">
      <div class="sb-logo-ic"><svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>
      <span class="sb-logo-tx" style="letter-spacing:1px;font-size:18px">Nemo Studio</span>
    </div>
    <nav class="sb-nav">
      ${[
        {ic:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg>',l:'Bảng điều khiển'},
        {ic:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2L18 7v6l-8 5-8-5V7z"/><path d="M10 13V2M10 13l8-6M10 13l-8-6"/></svg>',l:'Avatar Studio'},
        {ic:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="14" height="10" rx="2"/><path d="M6 5V3h8v2"/><path d="M10 9v4M8 11h4"/></svg>',l:'Ví'},
        {ic:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h3l2-2h4l2 2h3v12H3z"/><circle cx="10" cy="10" r="3"/></svg>',l:'TikTok LIVE'},
        {ic:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2l2.5 5H18l-4 3.5 1.5 5.5L10 13l-5.5 3 1.5-5.5L2 7h5.5z"/></svg>',l:'Kích hoạt quà'},
        {ic:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h12M4 8h12M4 12h8M4 16h6"/></svg>',l:'Nhật ký LIVE'},
        {ic:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.66 4.34l-1.42 1.42M5.76 14.24l-1.42 1.42M15.66 15.66l-1.42-1.42M5.76 5.76L4.34 4.34"/></svg>',l:'Cài đặt'}
      ].map((item,i)=>
        `<div class="sb-ni${i===_currentNavIndex?' act':''}" data-nav="${i}"><span class="sb-ni-ic">${item.ic}</span><span>${item.l}</span></div>`
      ).join('')}
    </nav>
    <div class="sb-ft">
      <div class="sb-pm">
        <div class="sb-pm-l"><span style="font-size:16px;margin-right:4px">💎</span><span>Premium Plan</span><span class="sb-pm-bd">Pro</span></div>
        <div class="sb-pm-ex">Hết hạn: 25/08/2026</div>
        <button class="sb-pm-btn">Nâng cấp ngay</button>
      </div>
      <div class="sb-ver" style="flex-direction:column;align-items:flex-start;gap:8px">
        <div class="tb-str" style="background:transparent;border:none;padding:0">
          <div class="tb-str-av" style="width:28px;height:28px;font-size:12px">N</div>
          <div class="tb-str-inf"><span class="tb-str-nm">Nemo Studio</span><span class="tb-str-on" style="color:var(--tm)">v1.2.0</span></div>
        </div>
        <div class="sb-ver-inf" style="opacity:0.5">© 2024 All rights reserved</div>
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <div class="mn">
    <!-- TOPBAR -->
    <header class="tb">
      <div class="tb-l">
        <h1 class="tb-t">TikTok LIVE Studio</h1>
        <div class="tb-st ${conn.server ? 'ok' : 'er'}"><span class="sd ${conn.server ? 'sd-ok' : 'sd-er'}"></span>${conn.server ? 'Đã kết nối' : 'Mất kết nối'}</div>
      </div>
      <div class="tb-c">
        <div class="tb-m"><span class="tb-ml">FPS</span><span class="tb-mv" id="m-fps">${metrics.fps}</span></div>
        <div class="tb-m"><span class="tb-ml">CPU</span><span class="tb-mv" id="m-cpu">${metrics.cpu}%</span></div>
        <div class="tb-m"><span class="tb-ml">RAM</span><span class="tb-mv" id="m-ram">${metrics.ram}%</span></div>
        <div class="tb-m"><span class="tb-ml">Mạng</span><span class="tb-mv">${conn.server ? 'Tốt' : 'Lỗi'}</span></div>
      </div>
      <div class="tb-r">
        <!-- Theme toggle -->
        <button id="btn-theme-toggle" title="Chuyển chế độ sáng/tối"
          style="width:34px;height:34px;border-radius:10px;background:var(--bg-ps);border:1px solid var(--bd-l);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0"
          onmouseenter="this.style.background='var(--pk-bg)';this.style.borderColor='var(--pk)'"
          onmouseleave="this.style.background='var(--bg-ps)';this.style.borderColor='var(--bd-l)'">
          <span id="theme-icon" style="font-size:16px;line-height:1">🌙</span>
        </button>
        <div class="tb-str">
          <div class="tb-str-av">${selectedAcc?.avatarEmoji || 'N'}</div>
          <div class="tb-str-inf"><span class="tb-str-nm">${selectedAcc?.displayName || 'Chưa có tài khoản'}</span><span class="tb-str-on">${selectedAcc?.status === 'live' ? 'Trực tuyến' : 'Ngoại tuyến'}</span></div>
        </div>
      </div>
    </header>

    <!-- CONTENT -->
    <div class="ct">

      <!-- ══════ VIEW: COMING SOON ══════ -->
      <div id="view-coming-soon" class="view-page" style="display:none">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:24px;padding:40px">
          <!-- Animated icon -->
          <div style="position:relative;width:96px;height:96px">
            <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,var(--pk-bg),transparent);animation:pulse 2s ease-in-out infinite"></div>
            <div style="position:absolute;inset:8px;border-radius:50%;border:2px solid var(--pk);opacity:0.3;animation:spin 4s linear infinite"></div>
            <div style="position:absolute;inset:16px;border-radius:50%;border:2px dashed var(--pp);opacity:0.4;animation:spin 3s linear infinite reverse"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:36px" id="cs-icon">🚧</div>
          </div>

          <!-- Title -->
          <div style="text-align:center;max-width:420px">
            <div style="font-size:11px;font-weight:600;color:var(--pk);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Tính năng đang phát triển</div>
            <div style="font-size:22px;font-weight:800;color:var(--t1);letter-spacing:-0.5px;margin-bottom:10px" id="cs-title">Bảng điều khiển</div>
            <div style="font-size:13px;color:var(--tm);line-height:1.6">Tính năng này đang được xây dựng và sẽ sớm ra mắt.<br>Hãy quay lại sau nhé! 🎉</div>
          </div>

          <!-- Progress bar -->
          <div style="width:240px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:10px;color:var(--td)">Tiến độ phát triển</span>
              <span style="font-size:10px;font-weight:600;color:var(--pk)" id="cs-pct">0%</span>
            </div>
            <div style="height:4px;background:var(--bg-ps);border-radius:4px;overflow:hidden">
              <div id="cs-bar" style="height:100%;background:linear-gradient(90deg,var(--pk),var(--pp));border-radius:4px;width:0%;transition:width 1s ease"></div>
            </div>
          </div>

          <!-- Back button -->
          <button class="bt bt-sc" style="gap:8px;padding:10px 24px" onclick="switchView('3')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Về TikTok LIVE
          </button>
        </div>
      </div>

      <!-- ══════ VIEW: TIKTOK LIVE (index 3) ══════ -->
      <div id="view-live" class="view-page">
      <div class="ws">
        <!-- LEFT: LIVE ACCOUNTS -->
        <div class="pn" style="height:100%">
          <div class="pn-h"><span class="pn-t">TÀI KHOẢN LIVE</span><div class="pn-a"><button class="bt bt-gh bt-is" id="btn-add-acc">+</button></div></div>
          <div class="pn-b" id="accounts-list" style="padding:8px">${renderAccounts(accounts)}</div>
          <div class="pn-f"><button class="bt-add" id="btn-add-acc2">+ Thêm tài khoản</button></div>
        </div>

        <!-- CENTER: LIVE PREVIEW (inner split 8:4) -->
        <div class="pn" style="height:100%;display:flex;flex-direction:column">
          <div class="pn-h">
            <div style="display:flex;align-items:center;gap:8px"><span class="pn-t">LIVE: ${selectedAcc?.displayName || '---'}</span></div>
            <div style="display:flex;align-items:center;gap:8px">
              ${selectedAcc?.status === 'live' ? '<span class="sd sd-lv"></span><span style="font-size:12px;font-weight:600;color:var(--er)">LIVE</span>' : '<span style="font-size:12px;color:var(--tm)">Ngoại tuyến</span>'}
              <span id="live-dur" style="font-size:12px;font-weight:600;color:var(--t2);font-variant-numeric:tabular-nums">${fmtDuration(liveSecs)}</span>
            </div>
          </div>
          <!-- Inner 8:4 split -->
          <div style="flex:1;display:grid;grid-template-columns:8fr 4fr;min-height:0;overflow:hidden">
            <!-- Video area (8) -->
            <div style="position:relative;background:linear-gradient(135deg,#1a0825 0%,#0f0a1a 30%,#0a0612 60%,#120a20 100%);border-radius:var(--r-l);overflow:hidden;display:flex;flex-direction:column;justify-content:center;align-items:center">
              <div style="position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:6px;z-index:1">
                <span style="font-size:16px">♪</span><span style="font-size:13px;font-weight:700;color:#fff">TikTok</span><span style="font-size:9px;font-weight:700;background:#EF4444;color:#fff;padding:1px 5px;border-radius:3px">LIVE</span>
              </div>
              <div style="position:absolute;top:12px;left:12px;display:flex;flex-direction:column;gap:4px;padding:8px;z-index:1;margin-top:28px">
                <div style="display:flex;align-items:center;gap:6px">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span id="lv-view" style="font-size:13px;font-weight:700;color:#fff">${selectedAcc?.viewers || '0'}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EF4444"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span id="lv-like" style="font-size:13px;font-weight:700;color:#fff">${selectedAcc?.likes || '0'}</span>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.7">
                <div style="width:80px;height:110px;border-radius:12px;background:linear-gradient(135deg,#E91E8C33,#7C3AED33);border:1px solid #E91E8C44;display:flex;align-items:center;justify-content:center;font-size:40px">👩‍🎤</div>
                <span style="font-size:10px;color:var(--tm)">${selectedAcc?.status === 'live' ? 'Đang phát trực tiếp...' : 'Chưa kết nối LIVE'}</span>
              </div>
            </div>
            <!-- Gift Feed (4) -->
            <div style="border-left:1px solid var(--bd-l);display:flex;flex-direction:column;min-height:0;overflow:hidden">
              <div style="padding:8px 10px;border-bottom:1px solid var(--bd-l);font-size:10px;font-weight:600;color:var(--tm);text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0">Quà nhận được</div>
              <div id="gift-feed" style="flex:1;overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:6px">${renderGiftFeed(giftFeed)}</div>
            </div>
          </div>
          <!-- Controls bar -->
          <div class="lpv-ct" style="border-top:1px solid var(--bd-l)">
            <div class="lpv-vol"><span style="font-size:14px;color:var(--tm)">🔊</span><input type="range" min="0" max="100" value="${settings.volume}" id="vol-slider"/></div>
            <div class="lpv-cb">
              <button class="bt bt-sc bt-sm">Mute</button>
              <button class="bt bt-sc bt-sm">Pause</button>
              <button class="bt bt-sc bt-sm">Full HD</button>
              <button class="bt bt-sc bt-sm">Pop-out</button>
              <button class="bt bt-dn bt-sm" id="btn-connect-tiktok" style="background:var(--pk);color:#fff;border:none">${selectedAcc?.isConnected ? 'Disconnect' : 'Connect'}</button>
            </div>
          </div>
        </div>


        <!-- RIGHT: AVATAR + CONTROL -->
        <div style="display:flex;gap:16px;min-width:0;overflow:hidden">
          <!-- AVATAR PREVIEW -->
          <div style="flex:1.2;display:flex;flex-direction:column;min-width:0">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:0 4px">
              <span style="font-size:12px;font-weight:600;color:var(--t1);text-transform:uppercase;letter-spacing:0.04em">AVATAR PREVIEW</span>
              <div style="display:flex;align-items:center;gap:6px"><span class="sd sd-ok"></span><span style="font-size:11px;color:var(--ok);font-weight:600">${engine.isRunning ? 'Live' : 'Stopped'}</span></div>
            </div>
            <div class="avd" id="avatar-display" style="flex:1">
              <!-- Real WebGL canvas moved here by switchView() -->
              <div id="live-canvas-slot" style="position:absolute;inset:0;background:linear-gradient(180deg,#1a0a2e 0%,#0d0618 40%,#080420 100%);display:flex;align-items:center;justify-content:center"><div style="font-size:50px;opacity:0.3;pointer-events:none" id="live-canvas-placeholder">💃</div></div>
              <div id="av-badge" style="display:${engine.current ? 'flex' : 'none'};position:absolute;top:8px;left:50%;transform:translateX(-50%);align-items:center;gap:4px;padding:2px 8px;background:rgba(233,30,140,0.2);border:1px solid rgba(233,30,140,0.3);border-radius:var(--r-f);font-size:9px;font-weight:600;color:var(--pk);z-index:5">▶ ĐANG PHÁT</div>
              <div class="avd-ai">
                <div class="avd-an" id="av-name-live">${engine.current?.action || 'Chờ sự kiện...'}</div>
                <div class="avd-at"><span id="av-cur-live">${fmtTime(engine.progress)}</span><span>/</span><span id="av-tot-live">${fmtTime(engine.current?.durationSec || 0)}</span></div>
                <div class="pb"><div class="pb-f" id="av-prog-live" style="width:${engine.current ? (engine.progress / engine.current.durationSec * 100) : 0}%"></div></div>
              </div>
            </div>
            <!-- CHỌN AVATAR -->
            <select id="live-vrm-select" style="width:100%;margin-top:8px;background:var(--bg-ps);border:1px solid var(--bd-l);border-radius:8px;padding:7px 10px;font-size:12px;color:var(--t2);cursor:pointer">
              <option value="">-- Chưa có avatar --</option>
            </select>
          </div>

          <!-- CONTROLS COLUMN -->
          <div style="flex:1;display:flex;flex-direction:column;gap:20px;min-width:0;padding-right:8px">

            <!-- LIVE CONTROL -->
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--t1);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px">LIVE CONTROL</div>
              <div style="display:flex;flex-direction:column;gap:10px">
                <button class="lc-b lc-st" id="btn-engine-start" style="height:44px;border-radius:12px;justify-content:flex-start;padding-left:20px;gap:16px;border:none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> 
                  ${engine.isRunning ? 'Tạm dừng' : 'Bắt đầu Avatar'}
                </button>
                <button class="lc-b lc-sc" id="btn-engine-stop" style="height:44px;border-radius:12px;justify-content:flex-start;padding-left:20px;gap:16px;background:var(--bg-p);border:1px solid var(--bd-l)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  Tạm dừng
                </button>
                <button class="lc-b lc-sc" id="btn-engine-skip" style="height:44px;border-radius:12px;justify-content:flex-start;padding-left:20px;gap:16px;background:var(--bg-p);border:1px solid var(--bd-l)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                  Dừng
                </button>
                <button class="lc-b lc-sc" id="btn-engine-reset" style="height:44px;border-radius:12px;justify-content:flex-start;padding-left:20px;gap:16px;background:var(--bg-p);border:1px solid var(--bd-l)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-9-9c2.5 0 4.8 1 6.4 2.6L21 8"/><path d="M21 3v5h-5"/></svg>
                  Reset Avatar
                </button>
              </div>
            </div>

            <!-- QUICK SETTINGS -->
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--t1);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px">TÙY CHỈNH NHANH</div>
              <div style="display:flex;flex-direction:column;gap:12px">
                <div class="qs-i" style="background:transparent;border:none;padding:0;box-shadow:none;height:auto"><span class="qs-l">Tự động nhảy</span><div class="tg${settings.autoDance ? ' on' : ''}" data-setting="autoDance"></div></div>
                <div class="qs-i" style="background:transparent;border:none;padding:0;box-shadow:none;height:auto"><span class="qs-l">Nhận quà</span><div class="tg${settings.receiveGifts ? ' on' : ''}" data-setting="receiveGifts"></div></div>
                <div class="qs-i" style="background:transparent;border:none;padding:0;box-shadow:none;height:auto"><span class="qs-l">Hiệu ứng sân khấu</span><div class="tg${settings.stageEffects ? ' on' : ''}" data-setting="stageEffects"></div></div>
                <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
                  <span class="qs-l" style="font-size:12px;color:var(--t2)">Âm thanh</span>
                  <div class="qs-v" style="background:transparent;border:none;padding:0;box-shadow:none;height:auto">
                    <input type="range" min="0" max="100" value="${settings.volume}" data-setting-vol style="flex:1;accent-color:var(--pk);height:4px"/><span class="qs-vv" id="vol-v" style="width:30px;text-align:right">${settings.volume}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- LOWER PANELS (3 columns) -->
      <div class="lp">
        <!-- GIFT TRIGGER RULES -->
        <div class="pn" style="height:100%">
          <div class="pn-h"><span class="pn-t">QUY TẮC KÍCH HOẠT QUÀ</span><div class="pn-a"><button class="bt bt-sc bt-sm" id="btn-add-rule">+ Thêm quy tắc</button></div></div>
          <div class="pn-b pn-b0" style="overflow-x:auto">
            <table class="tt"><thead><tr><th>Quà</th><th>Tên</th><th>Hành động</th><th>Thời gian</th><th>Ưu tiên</th><th>Trạng thái</th></tr></thead>
            <tbody id="rules-body">${renderRules(rules)}</tbody></table>
          </div>
          <div class="pn-f" style="padding:6px 12px"><span style="font-size:10px;color:var(--tm)">↕ Kéo thả để thay đổi thứ tự ưu tiên</span></div>
        </div>

        <!-- GIFT QUEUE -->
        <div class="pn" style="height:100%">
          <div class="pn-h"><span class="pn-t">HÀNG ĐỢI QUÀ TẶNG</span><div class="pn-a"><button class="bt bt-gh bt-sm" id="btn-clear-queue">Xóa hàng đợi</button></div></div>
          <div class="pn-b" id="queue-body" style="padding:8px">${renderQueue(engine)}</div>
          <div class="qc" id="queue-current">${renderQueueCurrent(engine)}</div>
        </div>

        <!-- DANCE LIBRARY -->
        <div class="pn" style="height:100%">
          <div class="pn-h"><span class="pn-t">THƯ VIỆN NHẢY</span><div class="pn-a"><button class="bt bt-sc bt-sm" id="btn-add-dance">+ Thêm</button></div></div>
          <div class="pn-b pn-b0" style="padding-top:10px">
            <div class="dt" id="dance-tabs">${renderDanceTabs(danceTab)}</div>
            <div class="dg" id="dance-grid">${renderDanceCards(dances, danceTab, settings.selectedDanceId)}</div>
            <div style="padding:10px 12px"><button class="bt-add" id="btn-add-dance2">+ Thêm chuyển động</button></div>
          </div>
        </div>
      </div>
      </div><!-- /view-live -->

      <!-- ══════ VIEW: AVATAR STUDIO (index 2) ══════ -->
      <div id="view-avatar-studio" class="view-page" style="display:none">
        <div style="display:grid;grid-template-columns:7fr 5fr;gap:14px;height:100%">

          <!-- LEFT: 3D AVATAR PREVIEW -->
          <div class="pn" style="display:flex;flex-direction:column;min-height:0">
            <div class="pn-h" style="padding:10px 14px">
              <span class="pn-t">AVATAR PREVIEW</span>
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:11px;color:var(--tm)" id="av-fps">FPS 0</span>
                <span class="sd" id="av-status-dot"></span>
                <span style="font-size:11px;font-weight:600" id="av-status-text">EMPTY</span>
              </div>
            </div>
            <div class="pn-b pn-b0" style="flex:1;display:flex;flex-direction:column;padding:0">
              <!-- 3D Canvas -->
              <div id="av-studio-canvas-slot" style="flex:1;min-height:200px;position:relative;overflow:hidden">
              <div id="avatar-canvas-container" style="position:absolute;inset:0;overflow:hidden;background:linear-gradient(180deg,#1a0a2e 0%,#0d0618 40%,#080420 100%)">
                <div id="avatar-empty-state" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:2;pointer-events:none">
                  <div style="font-size:48px;opacity:0.3">🎭</div>
                  <span style="font-size:13px;color:var(--tm);opacity:0.6" id="avatar-empty-label">Chưa có Avatar</span>
                  <span style="font-size:11px;color:var(--tm);opacity:0.4">Bấm "Import VRM" để bắt đầu</span>
                </div>
              </div>
              </div>
              <!-- Info + Progress -->
              <div style="padding:8px 14px;border-top:1px solid var(--bd-l)">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;font-weight:600;color:var(--t1)" id="av-name">Chưa có Avatar</div>
                    <div style="font-size:11px;color:var(--tm)" id="av-anim-name">—</div>
                  </div>
                  <div style="font-size:11px;color:var(--tm);font-variant-numeric:tabular-nums">
                    <span id="av-cur">00:00</span> / <span id="av-tot">00:00</span>
                  </div>
                </div>
                <div class="pb" style="height:4px"><div class="pb-f" id="av-prog" style="width:0%"></div></div>
              </div>

              <!-- ANIMATION CONTROL (moved here below import buttons) -->
              <div style="border-top:1px solid var(--bd-l);padding:10px 14px">
                <div style="font-size:10px;font-weight:700;color:var(--tm);letter-spacing:0.5px;margin-bottom:8px">ANIMATION CONTROL</div>
                <div style="display:flex;gap:6px;margin-bottom:8px">
                  <button class="bt bt-pk bt-sm" id="btn-av-play" style="flex:1">▶ Play</button>
                  <button class="bt bt-sc bt-sm" id="btn-av-pause" style="flex:1">⏸ Pause</button>
                  <button class="bt bt-sc bt-sm" id="btn-av-stop" style="flex:1">⏹ Stop</button>
                  <button class="bt bt-sc bt-sm" id="btn-av-reset">↻</button>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:11px;color:var(--tm)">Tốc độ:</span>
                  <div style="display:flex;gap:4px">
                    ${[0.5, 1, 1.5, 2].map(s => `<button class="bt bt-sc" style="font-size:10px;padding:3px 10px;min-width:0;border-radius:6px" data-speed="${s}">${s}x</button>`).join('')}
                  </div>
                  <span style="font-size:11px;color:var(--tm);margin-left:auto">Loop:</span>
                  <div class="tg" id="av-loop-toggle" data-av-loop></div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT: AVATAR LIBRARY + VRMA LIBRARY (50/50 split) -->
          <div style="display:flex;flex-direction:column;gap:14px;overflow:hidden;min-height:0">


            <!-- THƯ VIỆN AVATAR (top) -->
            <div class="pn" style="flex:1 1 0;min-height:0;display:flex;flex-direction:column;overflow:hidden">
              <!-- Header -->
              <div class="pn-h" style="padding:8px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0">
                <span class="pn-t" style="flex-shrink:0">THƯ VIỆN AVATAR</span>
                <span style="font-size:10px;color:var(--tm)">Tổng:</span>
                <span id="av-studio-vrm-count" style="font-size:11px;font-weight:700;color:var(--pk)">0</span>
                <span style="font-size:10px;color:var(--tm);margin-left:4px">Đang dùng:</span>
                <span id="av-studio-vrm-active" style="font-size:10px;font-weight:600;color:var(--pp);max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">—</span>
                <button id="btn-av-studio-import-vrm" class="bt bt-pk bt-sm" style="margin-left:auto;font-size:10px;padding:4px 10px;flex-shrink:0">＋ Import VRM</button>
              </div>
              <!-- Body -->
              <div style="flex:1;min-height:0;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px">
                <!-- Drop zone (empty state) -->
                <div id="av-studio-vrm-dropzone" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px 10px;border:2px dashed var(--bd-l);border-radius:10px;cursor:pointer;transition:border-color 0.2s,background 0.2s;min-height:80px">
                  <span style="font-size:28px">🧊</span>
                  <div style="text-align:center">
                    <div style="font-size:11px;font-weight:600;color:var(--t1);margin-bottom:2px">Kéo thả file .vrm</div>
                    <div style="font-size:10px;color:var(--tm)">hoặc bấm <strong style="color:var(--pk)">Import VRM</strong></div>
                  </div>
                </div>
                <!-- Avatar list (shown when has items) -->
                <div id="av-studio-vrm-list" style="display:none;flex-direction:column;gap:5px">
                  <!-- Items injected by JS -->
                </div>
              </div>
            </div>

            <!-- THƯ VIỆN ANIMATION VRMA (bottom) -->
            <div class="pn" style="flex:1 1 0;min-height:0;display:flex;flex-direction:column;overflow:hidden">
              <!-- Header row: title + stats + import -->
              <div class="pn-h" style="padding:8px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0">
                <span class="pn-t" style="flex-shrink:0">THƯ VIỆN ANIMATION (VRMA)</span>
                <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
                  <span style="font-size:10px;color:var(--tm)">Tổng:</span>
                  <span id="av-lib-count" style="font-size:11px;font-weight:700;color:var(--pk)">0</span>
                  <span style="font-size:10px;color:var(--td)">|</span>
                  <span style="font-size:10px;color:var(--tm)">💃</span>
                  <span id="av-lib-cat-dance" style="font-size:11px;color:var(--pk)">0</span>
                  <span style="font-size:10px;color:var(--td)">|</span>
                  <span style="font-size:10px;color:var(--tm)">🎭</span>
                  <span id="av-lib-cat-anim" style="font-size:11px;color:var(--pp)">0</span>
                  <span style="font-size:10px;color:var(--td)">|</span>
                  <span style="font-size:10px;color:var(--tm)">✨</span>
                  <span id="av-lib-cat-special" style="font-size:11px;color:var(--wn)">0</span>
                </div>
                <button id="btn-av-lib-import" class="bt bt-pk bt-sm" style="font-size:10px;padding:4px 12px;flex-shrink:0">＋ Import VRMA</button>
              </div>
              <!-- Search + filter bar -->
              <div style="display:flex;gap:8px;padding:6px 14px;flex-shrink:0;border-top:1px solid var(--bd-l)">
                <input id="av-lib-search" class="dv-inp" type="text" placeholder="🔍 Tìm animation..." style="flex:1;font-size:11px;padding:5px 10px;min-width:0"/>
                <select id="av-lib-filter-cat" class="dv-sel" style="font-size:11px;padding:5px 10px;min-width:100px">
                  <option value="all">Tất cả</option>
                  <option value="dance">💃 Dance</option>
                  <option value="animation">🎭 Animation</option>
                  <option value="special">✨ Special</option>
                </select>
                <button id="btn-av-lib-clear-all" class="bt bt-gh bt-sm" style="font-size:10px;padding:4px 10px;display:none" title="Xóa tất cả">🗑</button>
              </div>
              <!-- Body -->
              <div style="flex:1;min-height:0;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:10px">
                <!-- VRM pending warning -->
                <div id="av-lib-vrm-warning" style="display:none;padding:8px 12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:8px;font-size:11px;color:var(--wn);display:flex;align-items:center;gap:8px">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Animations đang <strong>⏳ Chờ VRM</strong> — import VRM ở trên để kích hoạt tất cả.
                </div>
                <!-- Empty drop zone -->
                <div id="av-lib-dropzone" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:30px 20px;border:2px dashed var(--bd-l);border-radius:12px;cursor:pointer;transition:border-color 0.2s,background 0.2s;min-height:120px">
                  <span style="font-size:32px">🎬</span>
                  <div style="text-align:center">
                    <div style="font-size:12px;font-weight:600;color:var(--t1);margin-bottom:4px">Kéo thả file .vrma vào đây</div>
                    <div style="font-size:11px;color:var(--tm)">Hoặc bấm <strong style="color:var(--pk)">Import VRMA</strong></div>
                  </div>
                </div>
                <!-- Animation grid (shown when has items) -->
                <div id="av-lib-grid-wrapper" style="display:none;flex-direction:column;gap:8px">
                  <div id="av-lib-anim-grid" style="display:grid;grid-template-columns:1fr;gap:8px;align-content:start">
                    <!-- Cards injected by JS -->
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div><!-- /right-col -->
      </div><!-- /view-avatar-studio -->




    </div>

    <!-- STATUS BAR -->
    <footer class="stb">
      <div class="stb-l">
        <div class="stb-i"><span class="stb-il">Hệ thống</span><span class="sd ${conn.server ? 'sd-ok' : 'sd-er'}"></span><span class="stb-iv" style="color:var(${conn.server ? '--ok' : '--er'})">${conn.server ? 'Tốt' : 'Lỗi'}</span></div>
        <div class="stb-i"><span class="stb-il">TikTok</span><span class="stb-iv" style="color:var(${selectedAcc?.isConnected ? '--ok' : '--tm'})">${selectedAcc?.isConnected ? 'Đã kết nối' : 'Chưa kết nối'}</span></div>
        <div class="stb-i"><span class="stb-il">Lắng nghe quà</span><span class="stb-iv" style="color:var(${settings.receiveGifts ? '--info' : '--tm'})">${settings.receiveGifts ? 'Hoạt động' : 'Tắt'}</span></div>
        <div class="stb-i"><span class="stb-il">Động cơ Avatar</span><span class="stb-iv" style="color:var(${engine.isRunning ? '--pk' : '--tm'})">${engine.isRunning ? 'Đang chạy' : 'Dừng'}</span></div>
      </div>
      <div class="stb-r">
        <div class="stb-lt"><span>Độ trễ:</span><span class="stb-ltv" id="s-lat">${metrics.latency}ms</span></div>
        <div class="stb-nw"><div class="stb-nwb" style="height:6px"></div><div class="stb-nwb" style="height:9px"></div><div class="stb-nwb" style="height:12px"></div><div class="stb-nwb" style="height:15px"></div></div>
        <button class="stb-lb">Mở nhật ký</button>
      </div>
    </footer>
  </div>
</div>

<!-- DEVTOOLS -->
<div class="dv">
  <div class="dv-pn${state.get('devToolsOpen') ? ' open' : ''}" id="dv-panel">
    <div class="dv-ti">🛠 Công cụ phát triển</div>
    <div class="dv-fl"><label class="dv-lb">Quà tặng</label><select class="dv-sel" id="dv-gift">${rules.filter(r=>r.active).map(r => `<option value="${r.giftName}">${r.giftEmoji} ${r.giftName}</option>`).join('')}</select></div>
    <div class="dv-fl"><label class="dv-lb">Số lượng</label><input class="dv-inp" type="number" id="dv-qty" value="1" min="1" max="100"/></div>
    <div class="dv-fl"><label class="dv-lb">Tên người dùng</label><input class="dv-inp" type="text" id="dv-user" placeholder="NguoiDung"/></div>
    <button class="dv-sb" id="btn-send-gift">🎁 Gửi quà</button>
  </div>
  <button class="dv-tg" id="btn-devtools">🛠</button>
</div>`;

  bindEvents();
  _bindThemeToggle();

  // ── Restore WebGL canvas into correct slot after re-render ─
  if (_savedCanvas) {
    const slot = document.getElementById('av-studio-canvas-slot');
    if (slot && !slot.contains(_savedCanvas)) slot.appendChild(_savedCanvas);
    // If live view is currently active, move canvas to live slot
    const liveView = document.getElementById('view-live');
    if (liveView && liveView.style.display !== 'none') {
      setTimeout(() => _moveCanvasToSlot('live-canvas-slot'), 0);
    } else {
      setTimeout(() => avatarEngine.runtime?.resize?.(), 0);
    }
  }

  // Restore libraries from IndexedDB
  setTimeout(() => {
    _initVrmStore();
    _initVrmaStore();
  }, 200);

  // Bind live VRM dropdown immediately (không cần chờ DB)
  _renderLiveVrmList();
}


// ─── RENDER HELPERS ──────────────────────────────────────
function renderAccounts(accounts) {
  if (!accounts.length) return `<div class="qe"><span style="font-size:20px;opacity:0.4">👤</span><span>Chưa có tài khoản</span></div>`;
  return accounts.map(a => {
    const badge = a.status === 'live' ? '<span class="bg bg-lv">LIVE</span>' :
                  a.status === 'connecting' ? '<span class="bg bg-cn">...</span>' :
                  '<span style="font-size:11px;color:var(--tm)">Ngoại tuyến</span>';
    return `<div class="ac${a.selected ? ' sel' : ''}" data-acc-id="${a.id}">
      <div class="ac-av" style="background:${a.avatarColor}20">${a.avatarEmoji}</div>
      <div class="ac-inf"><div class="ac-nm">${a.displayName} ${badge}</div><div class="ac-fl"><span>👤</span>${a.followers}</div></div>
      <div class="ac-acts">
        ${a.isConnected ? `<button class="bt bt-gh bt-is" data-disconnect="${a.id}" title="Ngắt kết nối">⏏</button>` : `<button class="bt bt-gh bt-is" data-connect="${a.id}" title="Kết nối LIVE">▶</button>`}
        <button class="bt bt-gh bt-is tt-del" data-del-acc="${a.id}" title="Xóa">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderGiftFeed(feed) {
  if (!feed || !feed.length) return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;opacity:0.4"><span style="font-size:24px">🎁</span><span style="font-size:11px;color:var(--tm)">Đang chờ quà...</span></div>`;
  const colors = ['#E91E8C','#7C3AED','#F59E0B','#3B82F6','#10B981','#EF4444'];
  return feed.slice(-8).reverse().map((g, i) => {
    const bg = colors[i % colors.length];
    const initial = (g.user || '?').charAt(0).toUpperCase();
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;background:rgba(255,255,255,0.04);margin-bottom:4px;animation:fi 0.3s ease">
      <div style="width:34px;height:34px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;border:2px solid ${bg}44">${initial}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.user}</div>
        <div style="font-size:11px;color:var(--tm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">đã gửi ${g.giftName || 'quà'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        <span style="font-size:18px">${g.emoji || '🎁'}</span>
        <span style="font-size:11px;font-weight:700;color:#fff;background:rgba(233,30,140,0.8);padding:2px 6px;border-radius:20px;min-width:22px;text-align:center">x${g.qty}</span>
      </div>
    </div>`;
  }).join('');
}

// ── Real TikTok Gifts catalog ─────────────────────────────
const TIKTOK_GIFTS = [
  { name: 'Rose',          emoji: '🌹', coins: 1,     category: 'common'  },
  { name: 'TikTok',        emoji: '🎵', coins: 1,     category: 'common'  },
  { name: 'Finger Heart',  emoji: '🤞', coins: 5,     category: 'common'  },
  { name: 'Sunglasses',    emoji: '😎', coins: 5,     category: 'common'  },
  { name: 'Perfume',       emoji: '💎', coins: 20,    category: 'common'  },
  { name: 'Headphones',    emoji: '🎧', coins: 20,    category: 'common'  },
  { name: 'Rainbow Puke',  emoji: '🌈', coins: 30,    category: 'common'  },
  { name: 'Mishka Bear',   emoji: '🧸', coins: 69,    category: 'special' },
  { name: 'Flower',        emoji: '💐', coins: 88,    category: 'common'  },
  { name: 'Butterfly',     emoji: '🦋', coins: 88,    category: 'special' },
  { name: 'Football',      emoji: '⚽', coins: 100,   category: 'common'  },
  { name: 'Galaxy',        emoji: '🌌', coins: 150,   category: 'special' },
  { name: 'Ice Cream',     emoji: '🍦', coins: 200,   category: 'common'  },
  { name: 'Trophy',        emoji: '🏆', coins: 500,   category: 'special' },
  { name: 'Piano',         emoji: '🎹', coins: 800,   category: 'special' },
  { name: 'Rocket',        emoji: '🚀', coins: 1000,  category: 'special' },
  { name: 'Lion',          emoji: '🦁', coins: 1000,  category: 'special' },
  { name: 'Fireworks',     emoji: '🎆', coins: 1000,  category: 'special' },
  { name: 'Star',          emoji: '⭐', coins: 1499,  category: 'special' },
  { name: 'Crown',         emoji: '👑', coins: 1500,  category: 'luxury'  },
  { name: 'Yacht',         emoji: '🛥️', coins: 5000,  category: 'luxury'  },
  { name: 'Universe',      emoji: '🌠', coins: 10000, category: 'luxury'  },
  { name: 'Interstellar',  emoji: '🌟', coins: 15000, category: 'luxury'  },
  { name: 'Drama Queen',   emoji: '💃', coins: 500,   category: 'special' },
  { name: 'Boxing Gloves', emoji: '🥊', coins: 100,   category: 'common'  },
  { name: 'Hands',         emoji: '👐', coins: 10,    category: 'common'  },
  { name: 'Tiny Diny',     emoji: '🦕', coins: 99,    category: 'special' },
  { name: 'Birthday Cake', emoji: '🎂', coins: 699,   category: 'special' },
  { name: 'GG',            emoji: '🎮', coins: 1,     category: 'common'  },
  { name: 'Concert',       emoji: '🎤', coins: 500,   category: 'special' },
];

// In-memory rules store (survives within session, UI-managed)
let _giftRules = [];

try {
  const saved = localStorage.getItem('sherin-gift-rules');
  if (saved) _giftRules = JSON.parse(saved);
} catch (_) {}

function _saveGiftRules() {
  try { localStorage.setItem('sherin-gift-rules', JSON.stringify(_giftRules)); } catch (_) {}
  // Also sync to state for RuleEngine
  state.set('rules', _giftRules.map(r => ({
    id: r.id, giftName: r.giftName, giftEmoji: r.giftEmoji,
    action: r.animationName, durationSec: r.durationSec || 0,
    priority: r.minQty || 1, active: r.active
  })));
}

function renderRules(rules) {
  // Legacy compat — now handled by _renderGiftRules()
  return '';
}

function _renderGiftRules() {
  const container = document.getElementById('rules-body');
  const panel     = document.getElementById('rules-panel-wrap');
  if (!container) return;

  const rules = _giftRules;

  if (rules.length === 0) {
    container.innerHTML = `
      <tr><td colspan="6">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;gap:10px;opacity:0.6">
          <span style="font-size:32px">🎁</span>
          <span style="font-size:12px;color:var(--tm)">Chưa có quy tắc nào. Bấm <strong style="color:var(--pk)">+ Thêm quy tắc</strong> để bắt đầu.</span>
        </div>
      </td></tr>`;
    return;
  }

  container.innerHTML = rules.map((r, idx) => {
    const catColor = r.minCoins >= 1000 ? 'var(--wn)' : r.minCoins >= 100 ? 'var(--pp)' : 'var(--pk)';
    const catLabel = r.minCoins >= 1000 ? '💎 Luxury' : r.minCoins >= 100 ? '⭐ Special' : '🌹 Common';
    return `
    <tr data-rule-id="${r.id}" style="transition:background 0.2s;${!r.active ? 'opacity:0.45' : ''}">
      <td style="text-align:center">
        <span style="font-size:22px;filter:${r.active ? 'none' : 'grayscale(1)'}">${r.giftEmoji}</span>
      </td>
      <td>
        <div style="font-weight:600;font-size:12px;color:var(--t1)">${r.giftName}</div>
        <div style="font-size:10px;color:var(--td)">x${r.minQty}+ quà • ${r.minCoins} coins</div>
      </td>
      <td>
        <span style="padding:2px 8px;background:var(--pp-bg);border:1px solid var(--pp)33;border-radius:10px;font-size:10px;font-weight:600;color:var(--pp)">
          🎬 ${r.animationName || '—'}
        </span>
      </td>
      <td style="font-variant-numeric:tabular-nums;font-size:11px;color:var(--tm)">${r.durationSec || 'Auto'}s</td>
      <td>
        <span style="font-size:10px;font-weight:600;color:${catColor};background:${catColor}15;padding:1px 7px;border-radius:10px">${catLabel}</span>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div class="tg${r.active ? ' on' : ''}" data-toggle-rule="${r.id}" title="${r.active ? 'Tắt' : 'Bật'}" style="cursor:pointer"></div>
          <button class="bt bt-sc bt-sm" style="height:24px;padding:0 8px;font-size:10px" data-edit-rule="${r.id}" title="Sửa">✎</button>
          <button class="bt bt-gh bt-sm" style="height:24px;padding:0 8px;font-size:10px" data-del-rule="${r.id}" title="Xóa">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Bind toggle
  container.querySelectorAll('[data-toggle-rule]').forEach(el => el.addEventListener('click', () => {
    const r = _giftRules.find(x => x.id === el.getAttribute('data-toggle-rule'));
    if (r) { r.active = !r.active; _saveGiftRules(); _renderGiftRules(); }
  }));
  // Bind delete
  container.querySelectorAll('[data-del-rule]').forEach(el => el.addEventListener('click', () => {
    const id = el.getAttribute('data-del-rule');
    const r = _giftRules.find(x => x.id === id);
    showConfirm(`Xóa quy tắc "${r?.giftEmoji} ${r?.giftName}"?`, () => {
      _giftRules = _giftRules.filter(x => x.id !== id);
      _saveGiftRules(); _renderGiftRules();
      showToast('Đã xóa quy tắc', 'success');
    });
  }));
  // Bind edit
  container.querySelectorAll('[data-edit-rule]').forEach(el => el.addEventListener('click', () => {
    const id = el.getAttribute('data-edit-rule');
    const r  = _giftRules.find(x => x.id === id);
    if (r) _showAddRuleModal(r);
  }));
}

function _showAddRuleModal(editRule = null) {
  const animations = avatarEngine.animationRegistry.getAll();
  const isEdit     = !!editRule;

  const giftOptions = TIKTOK_GIFTS.map(g =>
    `<option value="${g.name}" data-emoji="${g.emoji}" data-coins="${g.coins}" ${isEdit && editRule.giftName === g.name ? 'selected' : ''}>
      ${g.emoji} ${g.name} (${g.coins} coins)
    </option>`
  ).join('');

  const animOptions = animations.length === 0
    ? `<option value="">⚠️ Chưa có animation — Import VRMA trước</option>`
    : animations.map(a =>
        `<option value="${a.name}" ${isEdit && editRule.animationName === a.name ? 'selected' : ''}>${a.name}</option>`
      ).join('');

  const modalContent = `
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Gift picker -->
      <div>
        <label style="font-size:11px;font-weight:600;color:var(--tm);text-transform:uppercase;letter-spacing:0.05em">Chọn Quà TikTok</label>
        <div style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;max-height:200px;overflow-y:auto;padding:4px" id="gift-picker-grid">
          ${TIKTOK_GIFTS.map(g => `
            <div class="gift-pick-card ${isEdit && editRule.giftName === g.name ? 'selected' : ''}"
              data-gift="${g.name}" data-emoji="${g.emoji}" data-coins="${g.coins}"
              style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 6px;border-radius:10px;background:var(--bg-ps);border:1.5px solid ${isEdit && editRule.giftName === g.name ? 'var(--pk)' : 'var(--bd-l)'};cursor:pointer;transition:all 0.15s;text-align:center"
              onmouseenter="this.style.borderColor='var(--pk)';this.style.background='var(--pk-bg)'"
              onmouseleave="if(!this.classList.contains('selected')){this.style.borderColor='var(--bd-l)';this.style.background='var(--bg-ps)'}">
              <span style="font-size:22px">${g.emoji}</span>
              <span style="font-size:9px;font-weight:600;color:var(--t2);line-height:1.2">${g.name}</span>
              <span style="font-size:9px;color:var(--td)">${g.coins}💰</span>
            </div>`).join('')}
        </div>
        <input type="hidden" id="rule-gift-name" value="${isEdit ? editRule.giftName : ''}">
        <input type="hidden" id="rule-gift-emoji" value="${isEdit ? editRule.giftEmoji : ''}">
        <input type="hidden" id="rule-gift-coins" value="${isEdit ? editRule.minCoins : ''}">
      </div>

      <!-- Animation select -->
      <div>
        <label style="font-size:11px;font-weight:600;color:var(--tm);text-transform:uppercase;letter-spacing:0.05em">Animation phát khi nhận quà</label>
        <select id="rule-anim-name" style="width:100%;margin-top:8px;background:var(--bg-p);border:1px solid var(--bd-l);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--t2)">
          <option value="">-- Chọn animation --</option>
          ${animOptions}
        </select>
      </div>

      <!-- Min qty + duration -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--tm);text-transform:uppercase;letter-spacing:0.05em">Số lượng quà tối thiểu</label>
          <input type="number" id="rule-min-qty" min="1" value="${isEdit ? editRule.minQty : 1}"
            style="width:100%;margin-top:8px;background:var(--bg-p);border:1px solid var(--bd-l);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--t2)">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--tm);text-transform:uppercase;letter-spacing:0.05em">Thời gian phát (giây)</label>
          <input type="number" id="rule-duration" min="0" placeholder="Auto"
            value="${isEdit && editRule.durationSec ? editRule.durationSec : ''}"
            style="width:100%;margin-top:8px;background:var(--bg-p);border:1px solid var(--bd-l);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--t2)">
        </div>
      </div>

    </div>
  `;

  showModal({
    title: isEdit ? `✎ Sửa quy tắc: ${editRule.giftEmoji} ${editRule.giftName}` : '+ Thêm Quy Tắc Kích Hoạt Quà',
    customContent: modalContent,
    submitLabel: isEdit ? 'Lưu thay đổi' : 'Thêm quy tắc',
    onSubmit: () => {
      const giftName  = document.getElementById('rule-gift-name')?.value;
      const giftEmoji = document.getElementById('rule-gift-emoji')?.value;
      const minCoins  = parseInt(document.getElementById('rule-gift-coins')?.value) || 0;
      const animName  = document.getElementById('rule-anim-name')?.value;
      const minQty    = parseInt(document.getElementById('rule-min-qty')?.value) || 1;
      const duration  = parseInt(document.getElementById('rule-duration')?.value) || 0;

      if (!giftName) { showToast('⚠️ Chưa chọn quà!', 'error'); return false; }
      if (!animName) { showToast('⚠️ Chưa chọn animation!', 'error'); return false; }

      if (isEdit) {
        const r = _giftRules.find(x => x.id === editRule.id);
        if (r) { r.giftName = giftName; r.giftEmoji = giftEmoji; r.minCoins = minCoins; r.animationName = animName; r.minQty = minQty; r.durationSec = duration || 0; }
      } else {
        _giftRules.push({
          id: 'rule_' + Date.now().toString(36),
          giftName, giftEmoji, minCoins, animationName: animName,
          minQty, durationSec: duration || 0, active: true
        });
      }
      _saveGiftRules();
      _renderGiftRules();
      showToast(`✅ ${isEdit ? 'Đã cập nhật' : 'Đã thêm'} quy tắc "${giftEmoji} ${giftName}"`, 'success');
    }
  });

  // Bind gift picker cards after modal opens
  setTimeout(() => {
    document.querySelectorAll('.gift-pick-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.gift-pick-card').forEach(c => {
          c.classList.remove('selected');
          c.style.borderColor = 'var(--bd-l)';
          c.style.background = 'var(--bg-ps)';
        });
        card.classList.add('selected');
        card.style.borderColor = 'var(--pk)';
        card.style.background = 'var(--pk-bg)';
        document.getElementById('rule-gift-name').value  = card.dataset.gift;
        document.getElementById('rule-gift-emoji').value = card.dataset.emoji;
        document.getElementById('rule-gift-coins').value = card.dataset.coins;
      });
    });
  }, 50);
}


function renderQueue(engine) {
  const { queue, current } = engine;
  const all = current ? [current, ...queue] : queue;
  if (!all.length) return `<div class="qe"><span style="font-size:24px;opacity:0.4">📭</span><span>Hàng đợi trống</span><span style="font-size:11px">Đang chờ quà tặng...</span></div>`;
  return `<div class="ql">${all.map((q, i) => {
    const isCurrent = current && q.id === current.id;
    return `<div class="qi${isCurrent ? ' act' : ''}" id="qi-${q.id}"><span class="qi-no">${i + 1}</span><span class="qi-gi">${q.giftEmoji || '🎁'}</span><div class="qi-av">${q.userAvatar ? `<img src="${q.userAvatar}" alt=""/>` : '👤'}</div><div class="qi-inf"><div class="qi-gn">${q.giftName}<span class="qi-gq">x${q.quantity}</span></div><div class="qi-ac">${q.action}</div></div><span class="qi-tm">${fmtTime(q.durationSec)}</span>${!isCurrent ? `<button class="qi-rm" data-rm-queue="${q.id}">✕</button>` : ''}</div>`;
  }).join('')}</div>`;
}

function renderQueueCurrent(engine) {
  const { current, progress } = engine;
  if (!current) return `<div class="qc-l" style="text-align:center;padding:8px;color:var(--tm);font-size:11px">Không có sự kiện đang thực hiện</div>`;
  const pct = (progress / current.durationSec) * 100;
  return `<div class="qc-l">Đang thực hiện:</div><div class="qc-i"><span class="qc-g">${current.giftEmoji || '🎁'} ${current.giftName} x${current.quantity}</span><span class="qc-t">${fmtTime(progress)} / ${fmtTime(current.durationSec)}</span></div><div class="pb"><div class="pb-f" style="width:${pct}%"></div></div>`;
}

function renderDanceTabs(tab) {
  return [{id:'all',l:'Tất cả'},{id:'dance',l:'Nhảy'},{id:'animation',l:'Chuyển động'},{id:'special',l:'Đặc biệt'}].map(t => `<button class="dti${t.id === tab ? ' act' : ''}" data-dance-tab="${t.id}">${t.l}</button>`).join('');
}

function renderDanceCards(dances, tab, selectedId) {
  const filtered = tab === 'all' ? dances : dances.filter(d => d.category === tab);
  return filtered.map(d => `<div class="dc${d.id === selectedId ? ' sel' : ''}" data-dance-id="${d.id}"><div class="dc-th"><span class="dc-ti">${d.emoji}</span>${d.id === selectedId ? '<div class="dc-ck">✓</div>' : ''}<button class="dc-del" data-del-dance="${d.id}">✕</button></div><div class="dc-inf"><span class="dc-nm">${d.name}</span><span class="dc-dur">${d.duration}</span></div></div>`).join('');
}

// ─── EVENT BINDING ───────────────────────────────────────
function bindEvents() {
  // Sidebar nav — view switching
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', () => {
    document.querySelectorAll('.sb-ni').forEach(n => n.classList.remove('act'));
    el.classList.add('act');
    const navIndex = el.dataset.nav;
    _currentNavIndex = parseInt(navIndex);
    switchView(navIndex);
  }));

  // ── ACCOUNT MANAGEMENT (local) ───────────────────────────

  function _saveAccounts() {
    try { localStorage.setItem('nemo-accounts', JSON.stringify(state.get('accounts'))); } catch {}
  }

  function _addAccount() {
    const colors = ['#E91E8C','#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#06B6D4','#8B5CF6'];
    const emojis = ['😊','🎵','🌟','💫','🦋','🎭','🌈','✨','💎','🔥','🎪','🎨'];
    showModal({
      title: '➕ Thêm tài khoản TikTok LIVE',
      fields: [
        { key: 'username',    label: 'Username TikTok', placeholder: 'Nhập username (không cần @)', type: 'text' },
        { key: 'displayName', label: 'Tên hiển thị',    placeholder: 'Tên bạn muốn hiển thị', type: 'text' },
        { key: 'avatarEmoji', label: 'Emoji đại diện',  value: emojis[Math.floor(Math.random() * emojis.length)], type: 'text' },
      ],
      onSubmit: (data) => {
        const username = (data.username || '').trim().replace(/^@/, '');
        if (!username) { showToast('❌ Vui lòng nhập username', 'error'); return false; }
        const accounts = state.get('accounts');
        if (accounts.find(a => a.username === username)) {
          showToast('⚠️ Tài khoản này đã tồn tại', 'error'); return false;
        }
        const newAcc = {
          id:          Date.now().toString(),
          username,
          displayName: (data.displayName || '').trim() || username,
          avatarEmoji: (data.avatarEmoji || '👤').trim(),
          avatarColor: colors[accounts.length % colors.length],
          status:      'offline',
          isConnected: false,
          selected:    !accounts.length, // auto-select if first account
          followers:   '0',
          viewers:     '0',
          likes:       '0',
        };
        const updated = [...accounts, newAcc];
        state.set('accounts', updated);
        _saveAccounts();
        render();
        showToast(`✅ Đã thêm @${username}`, 'success');
      },
    });
  }

  function _selectAccount(id) {
    const accounts = state.get('accounts').map(a => ({ ...a, selected: a.id === id }));
    state.set('accounts', accounts);
    _saveAccounts();
    render();
  }

  function _deleteAccount(id) {
    showConfirm('Bạn có chắc muốn xóa tài khoản này?', () => {
      let accounts = state.get('accounts').filter(a => a.id !== id);
      // If deleted was selected, select first remaining
      if (accounts.length && !accounts.find(a => a.selected)) {
        accounts[0].selected = true;
      }
      state.set('accounts', accounts);
      _saveAccounts();
      render();
      showToast('Đã xóa tài khoản', 'success');
    });
  }

  document.getElementById('btn-add-acc')?.addEventListener('click', _addAccount);
  document.getElementById('btn-add-acc2')?.addEventListener('click', _addAccount);

  // Click to select account
  document.querySelectorAll('[data-acc-id]').forEach(el => el.addEventListener('click', (e) => {
    if (e.target.closest('[data-connect]') || e.target.closest('[data-disconnect]') || e.target.closest('[data-del-acc]')) return;
    _selectAccount(el.dataset.accId);
  }));

  // Delete account
  document.querySelectorAll('[data-del-acc]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    _deleteAccount(el.dataset.delAcc);
  }));

  // Connect/disconnect TikTok LIVE
  document.querySelectorAll('[data-connect]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    const accounts = state.get('accounts');
    const acc = accounts.find(a => a.id === el.dataset.connect);
    if (!acc) return;
    if (socket?.connected) {
      socket.emit('tiktok:connect', { accountId: acc.id, username: acc.username });
      showToast(`Đang kết nối @${acc.username}...`);
    } else {
      // Local mock connect
      const updated = accounts.map(a => a.id === acc.id ? { ...a, isConnected: true, status: 'live' } : a);
      state.set('accounts', updated);
      _saveAccounts();
      render();
      showToast(`✅ @${acc.username} đã kết nối LIVE`, 'success');
    }
  }));

  document.querySelectorAll('[data-disconnect]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    const accounts = state.get('accounts');
    if (socket?.connected) {
      socket.emit('tiktok:disconnect', { accountId: el.dataset.disconnect });
    } else {
      const updated = accounts.map(a => a.id === el.dataset.disconnect ? { ...a, isConnected: false, status: 'offline' } : a);
      state.set('accounts', updated);
      _saveAccounts();
      render();
    }
    showToast('Đã ngắt kết nối');
  }));

  // Connect button in preview panel
  document.getElementById('btn-connect-tiktok')?.addEventListener('click', () => {
    const acc = state.get('accounts').find(a => a.selected);
    if (!acc) return showToast('Chưa chọn tài khoản', 'error');
    if (acc.isConnected) {
      const updated = state.get('accounts').map(a => a.id === acc.id ? { ...a, isConnected: false, status: 'offline' } : a);
      state.set('accounts', updated);
      _saveAccounts();
      render();
      if (socket?.connected) socket.emit('tiktok:disconnect', { accountId: acc.id });
    } else {
      if (socket?.connected) {
        socket.emit('tiktok:connect', { accountId: acc.id, username: acc.username });
        showToast(`Đang kết nối @${acc.username}...`);
      } else {
        const updated = state.get('accounts').map(a => a.id === acc.id ? { ...a, isConnected: true, status: 'live' } : a);
        state.set('accounts', updated);
        _saveAccounts();
        render();
        showToast(`✅ @${acc.username} đã kết nối LIVE`, 'success');
      }
    }
  });

  // Engine controls
  document.getElementById('btn-engine-start')?.addEventListener('click', () => {
    const eng = state.get('engine');
    if (socket?.connected) socket.emit(eng.isRunning ? 'engine:pause' : 'engine:start');
    else showToast('Server chưa kết nối', 'error');
  });
  document.getElementById('btn-engine-stop')?.addEventListener('click', () => { if (socket?.connected) socket.emit('engine:stop'); });
  document.getElementById('btn-engine-skip')?.addEventListener('click', () => { if (socket?.connected) socket.emit('engine:skip'); });
  document.getElementById('btn-engine-reset')?.addEventListener('click', () => { if (socket?.connected) socket.emit('engine:reset'); });

  // Settings toggles
  document.querySelectorAll('[data-setting]').forEach(el => el.addEventListener('click', () => {
    el.classList.toggle('on');
    const key = el.dataset.setting;
    socket.emit('settings:update', { [key]: el.classList.contains('on') });
  }));
  document.querySelector('[data-setting-vol]')?.addEventListener('input', (e) => {
    const v = e.target.value;
    document.getElementById('vol-v').textContent = v + '%';
    socket.emit('settings:update', { volume: Number(v) });
  });

  // Volume slider in preview
  document.getElementById('vol-slider')?.addEventListener('input', (e) => {
    socket.emit('settings:update', { volume: Number(e.target.value) });
  });

  // ── Gift Rules — use new system ──────────────────────────
  document.getElementById('btn-add-rule')?.addEventListener('click', () => _showAddRuleModal());
  // Initial render
  _renderGiftRules();


  // Clear queue
  document.getElementById('btn-clear-queue')?.addEventListener('click', () => socket.emit('queue:clear'));

  // Remove queue item
  document.querySelectorAll('[data-rm-queue]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    socket.emit('queue:remove', { itemId: el.dataset.rmQueue });
  }));

  // Dance tabs
  document.querySelectorAll('[data-dance-tab]').forEach(el => el.addEventListener('click', () => {
    state.set('danceTab', el.dataset.danceTab);
    updateDancePanel();
  }));

  // Select dance
  document.querySelectorAll('[data-dance-id]').forEach(el => el.addEventListener('click', (e) => {
    if (e.target.closest('[data-del-dance]')) return;
    socket.emit('settings:update', { selectedDanceId: el.dataset.danceId });
  }));

  // Delete dance
  document.querySelectorAll('[data-del-dance]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    showConfirm('Xóa chuyển động này?', async () => {
      await api.deleteDance(el.dataset.delDance);
      showToast('Đã xóa', 'success');
    });
  }));

  // Add dance
  const addDanceFn = () => showModal({
    title: 'Thêm chuyển động mới',
    fields: [
      { key: 'name', label: 'Tên', placeholder: 'Dance - Custom', type: 'text' },
      { key: 'emoji', label: 'Emoji', value: '💃', type: 'text' },
      { key: 'durationSec', label: 'Thời gian (giây)', value: '8', type: 'number' },
      { key: 'category', label: 'Danh mục', type: 'select', value: 'dance', options: [{ value: 'dance', label: 'Nhảy' }, { value: 'animation', label: 'Chuyển động' }, { value: 'special', label: 'Đặc biệt' }] },
    ],
    onSubmit: async (data) => {
      await api.addDance(data);
      showToast('Đã thêm chuyển động', 'success');
    },
  });
  document.getElementById('btn-add-dance')?.addEventListener('click', addDanceFn);
  document.getElementById('btn-add-dance2')?.addEventListener('click', addDanceFn);

  // DevTools
  document.getElementById('btn-devtools')?.addEventListener('click', () => {
    state.set('devToolsOpen', !state.get('devToolsOpen'));
    document.getElementById('dv-panel')?.classList.toggle('open');
  });
  document.getElementById('btn-send-gift')?.addEventListener('click', () => {
    const giftName = document.getElementById('dv-gift')?.value;
    const quantity = parseInt(document.getElementById('dv-qty')?.value) || 1;
    const username = document.getElementById('dv-user')?.value || 'Người dùng thử';
    if (giftName) socket.emit('devtools:gift', { giftName, quantity, username });
  });

  // ─── AVATAR ENGINE EVENTS ──────────────────────────────
  // Import VRM
  document.getElementById('btn-import-vrm')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vrm';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const emptyLabel = document.getElementById('avatar-empty-label');
        if (emptyLabel) emptyLabel.textContent = 'Đang tải...';
        const result = await avatarEngine.loadVRM(file);
        const emptyState = document.getElementById('avatar-empty-state');
        if (emptyState) emptyState.style.display = 'none';
        showToast(`✅ Avatar loaded: ${result.name}`, 'success');
      } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
        const emptyLabel = document.getElementById('avatar-empty-label');
        if (emptyLabel) emptyLabel.textContent = 'Lỗi tải Avatar';
      }
    };
    input.click();
  });

  // Import VRMA
  document.getElementById('btn-import-vrma')?.addEventListener('click', () => {
    if (!avatarEngine.vrm) {
      showToast('Cần import Avatar trước', 'error');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vrma';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const result = await avatarEngine.loadAnimation(file);
        showToast(`✅ Animation loaded: ${result.name} (${result.duration.toFixed(1)}s)`, 'success');
      } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
      }
    };
    input.click();
  });

  // Animation controls
  document.getElementById('btn-av-play')?.addEventListener('click', () => {
    const anims = avatarEngine.animationRegistry.getAll();
    if (anims.length > 0) {
      avatarEngine.playAnimation(anims[0].id);
    } else {
      showToast('Chưa có animation nào', 'error');
    }
  });
  document.getElementById('btn-av-pause')?.addEventListener('click', () => avatarEngine.pauseAnimation());
  document.getElementById('btn-av-stop')?.addEventListener('click', () => avatarEngine.stopAnimation());
  document.getElementById('btn-av-reset')?.addEventListener('click', () => avatarEngine.resetAnimation());

  // Speed buttons
  document.querySelectorAll('[data-speed]').forEach(el => el.addEventListener('click', () => {
    const speed = parseFloat(el.dataset.speed);
    avatarEngine.setSpeed(speed);
    document.querySelectorAll('[data-speed]').forEach(b => b.style.background = '');
    el.style.background = 'var(--pk)';
    el.style.color = '#fff';
  }));

  // Loop toggle
  document.getElementById('av-loop-toggle')?.addEventListener('click', (e) => {
    const el = e.currentTarget;
    el.classList.toggle('on');
    avatarEngine.setLoop(el.classList.contains('on'));
  });

  // Test Gift
  document.getElementById('btn-send-test-gift')?.addEventListener('click', () => {
    if (!mockGiftProvider) {
      showToast('Avatar Engine chưa khởi tạo', 'error');
      return;
    }
    const giftName = document.getElementById('test-gift-select')?.value;
    const quantity = parseInt(document.getElementById('test-gift-qty')?.value) || 1;
    const userName = document.getElementById('test-gift-user')?.value || 'TestUser';
    const giftId = giftName?.toLowerCase().replace(/\s+/g, '_');
    mockGiftProvider.sendTestGift({ giftId, giftName, quantity, userName });
  });
}

// ─── PARTIAL UPDATES (avoid full re-render) ──────────────
function updateQueue() {
  const engine = state.get('engine');
  const el = document.getElementById('queue-body');
  const cel = document.getElementById('queue-current');
  if (el) el.innerHTML = renderQueue(engine);
  if (cel) cel.innerHTML = renderQueueCurrent(engine);
  // Rebind queue events
  document.querySelectorAll('[data-rm-queue]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    socket.emit('queue:remove', { itemId: el.dataset.rmQueue });
  }));
}

function updateAvatar() {
  const engine = state.get('engine');
  const nameEl = document.getElementById('av-name-live');
  const curEl = document.getElementById('av-cur-live');
  const totEl = document.getElementById('av-tot-live');
  const progEl = document.getElementById('av-prog-live');
  const badgeEl = document.getElementById('av-badge');
  if (nameEl) nameEl.textContent = engine.current?.action || 'Chờ sự kiện...';
  if (curEl) curEl.textContent = fmtTime(engine.progress);
  if (totEl) totEl.textContent = fmtTime(engine.current?.durationSec || 0);
  if (progEl) progEl.style.width = engine.current ? `${(engine.progress / engine.current.durationSec * 100)}%` : '0%';
  if (badgeEl) badgeEl.style.display = engine.current ? 'flex' : 'none';
}

function updateGiftFeed() {
  const el = document.getElementById('gift-feed');
  if (el) el.innerHTML = renderGiftFeed(state.get('giftFeed'));
}

function updateDancePanel() {
  const tab = state.get('danceTab');
  const dances = state.get('dances');
  const settings = state.get('settings');
  const tabsEl = document.getElementById('dance-tabs');
  const gridEl = document.getElementById('dance-grid');
  if (tabsEl) tabsEl.innerHTML = renderDanceTabs(tab);
  if (gridEl) gridEl.innerHTML = renderDanceCards(dances, tab, settings.selectedDanceId);
  // Rebind
  document.querySelectorAll('[data-dance-tab]').forEach(el => el.addEventListener('click', () => {
    state.set('danceTab', el.dataset.danceTab);
    updateDancePanel();
  }));
  document.querySelectorAll('[data-dance-id]').forEach(el => el.addEventListener('click', (e) => {
    if (e.target.closest('[data-del-dance]')) return;
    socket.emit('settings:update', { selectedDanceId: el.dataset.danceId });
  }));
  document.querySelectorAll('[data-del-dance]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    showConfirm('Xóa chuyển động này?', async () => {
      await api.deleteDance(el.dataset.delDance);
      showToast('Đã xóa', 'success');
    });
  }));
}

// ─── SOCKET EVENTS ───────────────────────────────────────
function setupSocket() {
  socket.connect();

  socket.on('init', (data) => {
    state.merge({
      accounts: data.accounts,
      rules: data.rules,
      dances: data.dances,
      settings: data.settings,
      engine: data.engine,
      connection: { ...state.get('connection'), server: true },
    });
    render();
  });

  socket.on('_connected', () => {
    state.set('connection.server', true);
    render();
  });

  socket.on('_disconnected', () => {
    state.set('connection.server', false);
    render();
  });

  socket.on('accounts:updated', (accounts) => {
    state.set('accounts', accounts);
    render(); // Full re-render for account changes
  });

  socket.on('rules:updated', (rules) => {
    state.set('rules', rules);
    const tbody = document.getElementById('rules-body');
    if (tbody) {
      tbody.innerHTML = renderRules(rules);
      // Rebind rule events
      document.querySelectorAll('[data-toggle-rule]').forEach(el => el.addEventListener('click', async () => {
        el.classList.toggle('on');
        await api.updateRule(el.dataset.toggleRule, { active: el.classList.contains('on') });
      }));
      document.querySelectorAll('[data-edit-rule]').forEach(el => el.addEventListener('click', () => {
        const rule = state.get('rules').find(r => r.id === el.dataset.editRule);
        if (!rule) return;
        const dances = state.get('dances');
        showModal({
          title: 'Sửa quy tắc',
          fields: [
            { key: 'giftName', label: 'Tên quà tặng', value: rule.giftName, type: 'text' },
            { key: 'giftEmoji', label: 'Emoji', value: rule.giftEmoji, type: 'text' },
            { key: 'action', label: 'Hành động', type: 'select', value: rule.action, options: dances.map(d => ({ value: d.name, label: `${d.emoji} ${d.name}` })) },
            { key: 'durationSec', label: 'Thời gian (giây)', value: String(rule.durationSec), type: 'number' },
            { key: 'priority', label: 'Ưu tiên (1-20)', value: String(rule.priority), type: 'number' },
          ],
          onSubmit: async (data) => { await api.updateRule(rule.id, data); showToast('Đã cập nhật', 'success'); },
        });
      }));
      document.querySelectorAll('[data-del-rule]').forEach(el => el.addEventListener('click', () => {
        showConfirm('Xóa quy tắc này?', async () => { await api.deleteRule(el.dataset.delRule); showToast('Đã xóa', 'success'); });
      }));
    }
  });

  socket.on('dances:updated', (dances) => {
    state.set('dances', dances);
    updateDancePanel();
  });

  socket.on('settings:updated', (settings) => {
    state.set('settings', settings);
    // Only partial update for settings
  });

  // TikTok events
  socket.on('tiktok:gift', (data) => {
    const rule = state.get('rules').find(r => r.active && r.giftName.toLowerCase().includes((data.giftName || '').toLowerCase()));
    state.update('giftFeed', (feed) => {
      const newFeed = [...(feed || []), { user: data.nickname || data.uniqueId, giftName: data.giftName, emoji: rule?.giftEmoji || '🎁', qty: data.repeatCount || 1 }];
      return newFeed.slice(-6);
    });
    updateGiftFeed();
    showToast(`🎁 ${data.nickname || data.uniqueId} đã gửi ${data.giftName} x${data.repeatCount || 1}`, 'gift');
  });

  socket.on('tiktok:roomUser', (data) => {
    const viewEl = document.getElementById('lv-view');
    if (viewEl) viewEl.textContent = String(data.viewerCount);
  });

  socket.on('tiktok:error', (data) => {
    showToast(`❌ ${data.message}`, 'error');
  });

  // Engine events
  socket.on('engine:queueUpdate', (data) => {
    state.set('engine.queue', data.queue);
    state.set('engine.current', data.current);
    state.set('engine.progress', data.progress);
    updateQueue();
  });

  socket.on('engine:animationStart', (data) => {
    state.set('engine.current', data.item);
    state.set('engine.progress', 0);
    updateAvatar();
    updateQueue();
  });

  socket.on('engine:animationUpdate', (data) => {
    state.set('engine.progress', data.progress);
    updateAvatar();
    // Update queue current progress
    const qcTime = document.querySelector('.qc-t');
    const qcProg = document.querySelector('.qc .pb-f');
    if (qcTime) qcTime.textContent = `${fmtTime(data.progress)} / ${fmtTime(data.totalSec)}`;
    if (qcProg) qcProg.style.width = `${data.percentage}%`;
  });

  socket.on('engine:animationEnd', () => {
    updateAvatar();
  });

  socket.on('engine:state', (data) => {
    state.set('engine.isRunning', data.running);
    const btn = document.getElementById('btn-engine-start');
    if (btn) {
      btn.innerHTML = `<span class="lc-ic">${data.running ? '⏸' : '▶'}</span>${data.running ? 'Tạm dừng' : 'Bắt đầu Avatar'}`;
    }
  });

  socket.on('engine:ruleMatched', (data) => {
    const row = document.getElementById('rule-' + data.rule.id);
    if (row) { row.classList.add('a-gh'); setTimeout(() => row.classList.remove('a-gh'), 1000); }
  });

  socket.on('gift:matched', () => {
    updateQueue();
  });
}

// ─── TIMERS ──────────────────────────────────────────────
function startTimers() {
  // Live duration
  setInterval(() => {
    const acc = state.get('accounts')?.find(a => a.selected && a.isConnected);
    if (acc) { liveSecs++; const el = document.getElementById('live-dur'); if (el) el.textContent = fmtDuration(liveSecs); }
  }, 1000);

  // System metrics
  setInterval(() => {
    const f = document.getElementById('m-fps'); if (f) f.textContent = 58 + Math.floor(Math.random() * 3);
    const c = document.getElementById('m-cpu'); if (c) c.textContent = (10 + Math.floor(Math.random() * 6)) + '%';
    const r = document.getElementById('m-ram'); if (r) r.textContent = (26 + Math.floor(Math.random() * 5)) + '%';
    const l = document.getElementById('s-lat'); if (l) l.textContent = (25 + Math.floor(Math.random() * 10)) + 'ms';
  }, 3000);
}

// ─── VIEW SWITCHING ─────────────────────────────────────
// Coming soon page data
const _NAV_META = [
  { label: 'Bảng điều khiển', icon: '📊', pct: 15 },
  { label: 'Avatar Studio',   icon: '🧊', pct: 80 },
  { label: 'Ví',              icon: '💳', pct: 20 },
  { label: 'TikTok LIVE',     icon: '📡', pct: 90 },
  { label: 'Kích hoạt quà',   icon: '🎁', pct: 60 },
  { label: 'Nhật ký LIVE',    icon: '📋', pct: 35 },
  { label: 'Cài đặt',         icon: '⚙️', pct: 25 },
];

// Canvas slot teleport helper
function _moveCanvasToSlot(slotId) {
  const canvas = document.getElementById('avatar-canvas-container');
  const slot   = document.getElementById(slotId);
  if (canvas && slot && slot !== canvas.parentElement) {
    slot.appendChild(canvas);
    // Restore full size
    canvas.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;overflow:hidden;background:linear-gradient(180deg,#1a0a2e 0%,#0d0618 40%,#080420 100%)';
    // Hide placeholder emoji when real canvas arrives
    const ph = slot.querySelector('#live-canvas-placeholder');
    if (ph) ph.style.display = 'none';
    avatarEngine.runtime?.resize?.();
  }
}

function switchView(navIndex) {
  const viewLive       = document.getElementById('view-live');
  const viewAvatar     = document.getElementById('view-avatar-studio');
  const viewComingSoon = document.getElementById('view-coming-soon');
  const idx = parseInt(navIndex);

  // Hide all
  [viewLive, viewAvatar, viewComingSoon].forEach(v => { if (v) v.style.display = 'none'; });

  if (navIndex === '1') {
    if (viewAvatar) viewAvatar.style.display = 'block';
    // Move canvas into Avatar Studio slot
    setTimeout(() => {
      _moveCanvasToSlot('av-studio-canvas-slot');
      refreshAvLib();
      _bindAvStudioVrmEvents();
      _renderAvStudioVrmList();
    }, 50);
  } else if (navIndex === '3') {
    if (viewLive) viewLive.style.display = '';
    // Move canvas into Live page slot
    setTimeout(() => _moveCanvasToSlot('live-canvas-slot'), 50);
  } else {
    // Coming soon
    if (viewComingSoon) viewComingSoon.style.display = '';
    const meta = _NAV_META[idx] || { label: 'Tính năng', icon: '🚧', pct: 0 };
    const titleEl = document.getElementById('cs-title');
    const iconEl  = document.getElementById('cs-icon');
    const barEl   = document.getElementById('cs-bar');
    const pctEl   = document.getElementById('cs-pct');
    if (titleEl) titleEl.textContent = meta.label;
    if (iconEl)  iconEl.textContent  = meta.icon;
    if (pctEl)   pctEl.textContent   = meta.pct + '%';
    if (barEl) { barEl.style.width = '0%'; setTimeout(() => { barEl.style.width = meta.pct + '%'; }, 80); }
  }
}

// ─── BOOT ────────────────────────────────────────────────
// ─── THEME SYSTEM ───────────────────────────────────────
function _applyTheme(isLight) {
  if (isLight) {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  // Update icon (button is re-rendered each render(), so bind via event delegation)
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = isLight ? '☀️' : '🌙';
}

function _toggleTheme() {
  const isLight = !document.documentElement.classList.contains('light');
  localStorage.setItem('sherin-theme', isLight ? 'light' : 'dark');
  _applyTheme(isLight);
}

// Bind theme toggle (called after each render since button is inside innerHTML)
function _bindThemeToggle() {
  document.getElementById('btn-theme-toggle')?.addEventListener('click', _toggleTheme);
  // Sync icon state
  const isLight = document.documentElement.classList.contains('light');
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = isLight ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', () => {
  // Restore saved theme before first render
  const savedTheme = localStorage.getItem('sherin-theme');
  if (savedTheme === 'light') _applyTheme(true);

  // Load accounts from localStorage BEFORE first render
  try {
    const savedAccounts = JSON.parse(localStorage.getItem('nemo-accounts') || '[]');
    if (savedAccounts.length) state.set('accounts', savedAccounts);
  } catch {}

  render();
  setupSocket();
  startTimers();
  initAvatarEngine();
});


// ─── AVATAR ENGINE INIT ─────────────────────────────────
function initAvatarEngine() {
  const container = document.getElementById('avatar-canvas-container');
  if (!container) {
    console.warn('[Boot] avatar-canvas-container not found');
    return;
  }

  // Init engine
  avatarEngine.init(container);

  // Init gift pipeline (client-side)
  ruleEngine = new RuleEngine(
    () => state.get('rules') || [],
    avatarEngine.animationRegistry
  );
  mockGiftProvider = new MockGiftProvider(ruleEngine, avatarEngine);

  // FPS updates
  avatarEngine.onFpsUpdate((fps) => {
    const el = document.getElementById('av-fps');
    if (el) el.textContent = `FPS ${fps}`;
  });

  // State changes
  avatarEngine.onStateChange((newState) => {
    const dotEl = document.getElementById('av-status-dot');
    const textEl = document.getElementById('av-status-text');
    const nameEl = document.getElementById('av-name');
    if (textEl) textEl.textContent = newState;
    if (dotEl) {
      dotEl.className = 'sd';
      if (newState === 'PLAYING') dotEl.classList.add('sd-lv');
      else if (newState === 'IDLE' || newState === 'READY') dotEl.classList.add('sd-ok');
      else if (newState === 'ERROR') dotEl.classList.add('sd-er');
    }
    if (nameEl && avatarEngine.vrmName) {
      nameEl.textContent = avatarEngine.vrmName;
    }
  });

  // Animation events
  avatarEngine.onAnimationEvent((event, ...args) => {
    if (event === 'progress') {
      const [id, time, total, pct] = args;
      // Avatar Studio playback progress bar (top)
      const curEl  = document.getElementById('av-cur');
      const totEl  = document.getElementById('av-tot');
      const progEl = document.getElementById('av-prog');
      const animEl = document.getElementById('av-anim-name');
      if (curEl)  curEl.textContent  = fmtTime(Math.floor(time));
      if (totEl)  totEl.textContent  = fmtTime(Math.floor(total));
      if (progEl) progEl.style.width = `${pct}%`;
      if (animEl) animEl.textContent = id;
      // Thư viện nhảy now-playing bar
      const libCur  = document.getElementById('lib-np-cur');
      const libProg = document.getElementById('lib-np-prog');
      if (libCur)  libCur.textContent  = fmtTime(Math.floor(time));
      if (libProg) libProg.style.width = `${pct}%`;
      // Avatar Studio VRMA panel now-playing bar
      const avCur  = document.getElementById('av-lib-np-cur');
      const avProg = document.getElementById('av-lib-np-prog');
      if (avCur)  avCur.textContent  = fmtTime(Math.floor(time));
      if (avProg) avProg.style.width = `${pct}%`;
    } else if (event === 'start') {
      const animEl = document.getElementById('av-anim-name');
      if (animEl) animEl.textContent = `▶ ${args[0]}`;
    } else if (event === 'end') {
      const animEl = document.getElementById('av-anim-name');
      const progEl = document.getElementById('av-prog');
      if (animEl)  animEl.textContent  = '—';
      if (progEl)  progEl.style.width  = '0%';
      // Hide both now-playing bars
      _libCurrentAnimId = null;
      _avLibCurrentAnimId = null;
      _hideNowPlayingFor('lib');
      _hideNowPlayingFor('av-lib');
    }
  });

  // Live log
  avatarEngine.onLog((entry) => addLogEntry(entry));
  mockGiftProvider.onLog((entry) => addLogEntry(entry));
  ruleEngine.onMatch((result) => {
    addLogEntry({
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('vi-VN'),
      type: 'rule_matched',
      message: `Rule matched: ${result.rule.giftName} → ${result.rule.action}`,
    });
  });

  // Update VRMA dance list when animations change
  avatarEngine.animationRegistry.onChange((animations) => {
    // Update Avatar Studio VRMA list panel
    const listEl = document.getElementById('vrma-dance-list');
    if (listEl) {
      if (animations.length === 0) {
        listEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;opacity:0.4"><span style="font-size:24px">🎬</span><span style="font-size:11px;color:var(--tm)">Chưa có animation</span><span style="font-size:10px;color:var(--tm)">Import VRMA để thêm</span></div>`;
      } else {
        listEl.innerHTML = animations.map(a => `
          <div class="dc" style="cursor:pointer;margin-bottom:6px;padding:10px;border-radius:8px;background:var(--bg-p);border:1px solid var(--bd-l);transition:border-color 0.15s" data-play-anim="${a.id}">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:20px">🎬</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;color:var(--t1)">${a.name}</div>
                <div style="font-size:10px;color:var(--tm)">${a.duration.toFixed(1)}s • ${a.category} • ${a.fileName}</div>
              </div>
              <button class="bt bt-pk bt-sm" style="font-size:10px;padding:4px 10px" data-play-anim="${a.id}">▶ Play</button>
            </div>
          </div>
        `).join('');
        listEl.querySelectorAll('[data-play-anim]').forEach(el => el.addEventListener('click', (e) => {
          e.stopPropagation();
          avatarEngine.playAnimation(el.dataset.playAnim);
        }));
      }
    }
    // Auto-refresh Animation Library page if currently active
    if (document.getElementById('view-anim-library')?.style.display !== 'none') {
      _renderGrid(_libCfg, animations);
    }
    // Auto-refresh Avatar Studio VRMA panel if currently active
    if (document.getElementById('view-avatar-studio')?.style.display !== 'none') {
      _renderGrid(_avLibCfg, animations);
    }
  });

  console.log('[Nemo Studio] Avatar Engine initialized');
}

// ─── ANIMATION LIBRARY (shared helpers) ─────────────────
let _libCurrentAnimId   = null;  // Thư viện nhảy page
let _avLibCurrentAnimId = null;  // Avatar Studio panel

// ── Shared card HTML builder ─────────────────────────────
function _buildAnimCard(a, currentId, prefix) {
  const isSelected = currentId === a.id;
  const isPending  = !a.ready;
  const catColors = { dance: 'var(--pk)', animation: 'var(--pp)', special: 'var(--wn)' };
  const catEmojis = { dance: '💃', animation: '🎭', special: '✨' };
  const catLabels = { dance: 'Nhảy', animation: 'Animation', special: 'Đặc biệt' };
  const color  = catColors[a.category] || 'var(--info)';
  const emoji  = catEmojis[a.category] || '🎵';
  const label  = catLabels[a.category] || a.category;

  const checkIcon = isSelected
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/>
        <path d="M7 12.5l3.5 3.5 6.5-7" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : isPending
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="rgba(245,158,11,0.5)" stroke-width="1.5" stroke-dasharray="4 2"/>
         </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="var(--bd-l)" stroke-width="1.5"/>
         </svg>`;

  return `
  <div class="pn" style="position:relative;padding:0;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;cursor:${isPending ? 'default' : 'pointer'};
    ${isSelected ? `border-color:${color};box-shadow:0 0 0 1px ${color}33;background:${color}08` : isPending ? 'border-color:rgba(245,158,11,0.25)' : ''}
  " data-${prefix}-play="${a.id}">

    <!-- Left color stripe -->
    <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${isPending ? 'rgba(245,158,11,0.5)' : color};border-radius:8px 0 0 8px"></div>

    <!-- Content -->
    <div style="padding:10px 10px 10px 14px;display:flex;align-items:center;gap:10px">

      <!-- Check circle button -->
      <button data-${prefix}-play="${a.id}" ${isPending ? 'disabled' : ''}
        style="flex-shrink:0;width:28px;height:28px;border:none;background:transparent;cursor:${isPending ? 'not-allowed' : 'pointer'};padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background 0.15s"
        title="${isPending ? 'Cần import VRM để chọn' : isSelected ? 'Bỏ chọn' : 'Chọn animation này'}"
        onmouseenter="if(!this.disabled)this.style.background='${color}20'"
        onmouseleave="this.style.background='transparent'">
        ${checkIcon}
      </button>

      <!-- Emoji icon -->
      <div style="width:34px;height:34px;flex-shrink:0;border-radius:8px;background:${isPending ? 'rgba(245,158,11,0.1)' : color+'15'};display:flex;align-items:center;justify-content:center;font-size:17px">
        ${isPending ? '⏳' : emoji}
      </div>

      <!-- Info -->
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:${isSelected ? color : 'var(--t1)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color 0.2s">${a.name}</div>
        <div style="display:flex;align-items:center;gap:5px;margin-top:3px;flex-wrap:wrap">
          <span style="font-size:9px;font-weight:600;color:${isPending ? 'var(--wn)' : color};background:${isPending ? 'rgba(245,158,11,0.1)' : color+'15'};padding:1px 6px;border-radius:10px">
            ${isPending ? '⏳ Chờ VRM' : label}
          </span>
          ${a.duration > 0 ? `<span style="font-size:9px;color:var(--td)">⏱ ${a.duration.toFixed(1)}s</span>` : ''}
        </div>
      </div>

      <!-- Delete -->
      <button data-${prefix}-delete="${a.id}"
        style="flex-shrink:0;width:26px;height:26px;border:none;background:transparent;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;border-radius:6px;opacity:0.45;transition:opacity 0.15s,background 0.15s;font-size:13px"
        title="Xóa animation"
        onmouseenter="this.style.opacity='1';this.style.background='rgba(239,68,68,0.12)'"
        onmouseleave="this.style.opacity='0.45';this.style.background='transparent'">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tm)" stroke-width="2" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>

    </div>
  </div>`;
}


// ── Shared grid renderer ─────────────────────────────────
function _renderGrid(cfg, animations) {
  const { prefix, gridId, countId, danceId, animId, specialId,
          dropzoneId, gridWrapperId, clearBtnId, warnId, searchId, filterId } = cfg;
  // Always read live currentId from cfg so re-renders show correct check state
  const currentId = cfg.getCurrentId();

  const countEl   = document.getElementById(countId);
  const danceEl   = document.getElementById(danceId);
  const animEl    = document.getElementById(animId);
  const specialEl = document.getElementById(specialId);
  const dropzone  = document.getElementById(dropzoneId);
  const gridWrap  = document.getElementById(gridWrapperId);
  const clearBtn  = document.getElementById(clearBtnId);
  const warnEl    = document.getElementById(warnId);

  const filter = document.getElementById(filterId)?.value || 'all';
  const search = (document.getElementById(searchId)?.value || '').toLowerCase();

  // Stats
  const dance   = animations.filter(a => a.category === 'dance').length;
  const anim    = animations.filter(a => a.category === 'animation').length;
  const special = animations.filter(a => a.category === 'special').length;
  if (countEl)   countEl.textContent   = animations.length;
  if (danceEl)   danceEl.textContent   = dance;
  if (animEl)    animEl.textContent    = anim;
  if (specialEl) specialEl.textContent = special;

  // Show/hide zones
  const isEmpty = animations.length === 0;
  if (dropzone)  dropzone.style.display  = isEmpty ? 'flex' : 'none';
  if (gridWrap)  gridWrap.style.display  = isEmpty ? 'none' : 'flex';
  if (clearBtn)  clearBtn.style.display  = isEmpty ? 'none' : '';
  if (warnEl)    warnEl.style.display    = (!isEmpty && !avatarEngine.vrm) ? 'flex' : 'none';

  // Filter + search
  const filtered = animations.filter(a => {
    if (filter !== 'all' && a.category !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search) && !a.fileName.toLowerCase().includes(search)) return false;
    return true;
  });

  const gridEl = document.getElementById(gridId);
  if (!gridEl) return;

  if (filtered.length === 0 && !isEmpty) {
    gridEl.innerHTML = `<div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:30px;opacity:0.5">
      <span style="font-size:24px">🔍</span>
      <span style="font-size:12px;color:var(--tm)">Không tìm thấy animation</span>
    </div>`;
    return;
  }

  gridEl.innerHTML = filtered.map(a => _buildAnimCard(a, currentId, prefix)).join('');

  // ── Select (Chọn) — load into engine but don't auto-play
  gridEl.querySelectorAll(`[data-${prefix}-play]`).forEach(el => el.addEventListener('click', (e) => {
    // Ignore clicks on child buttons (delete)
    if (e.target.closest(`[data-${prefix}-delete]`)) return;
    const id = el.dataset[prefix + 'Play'] || el.getAttribute(`data-${prefix}-play`);
    if (!id) return;
    const entry = avatarEngine.animationRegistry.get(id);
    if (!entry || !entry.ready) {
      showToast('⚠️ Cần import VRM trước để kích hoạt animation này', 'info');
      return;
    }
    // Toggle: re-click deselects
    if (cfg.getCurrentId() === id) {
      avatarEngine.stopAnimation();
      cfg.setCurrentId(null);
      cfg.hideNowPlaying();
      // Clear preview name
      const animNameEl = document.getElementById('av-anim-name');
      if (animNameEl) animNameEl.textContent = '—';
    } else {
      // Select: queue animation. Call playAnimation so engine loads clip, then pause immediately.
      avatarEngine.playAnimation(id);
      cfg.setCurrentId(id);
      // Update Avatar Preview info bar
      const animNameEl = document.getElementById('av-anim-name');
      if (animNameEl) animNameEl.textContent = `🎬 ${entry.name}`;
      const totEl = document.getElementById('av-tot');
      if (totEl) totEl.textContent = entry.duration > 0 ? fmtTime(Math.floor(entry.duration)) : '00:00';
      cfg.showNowPlaying(entry.name, entry.duration || 0);
      showToast(`✔ Đã chọn "${entry.name}" — bấm ▶ Play trên AVATAR PREVIEW`, 'success');
    }
    _renderGrid(cfg, avatarEngine.animationRegistry.getAll());
  }));

  // ── Delete
  gridEl.querySelectorAll(`[data-${prefix}-delete]`).forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = btn.dataset[prefix + 'Delete'] || btn.getAttribute(`data-${prefix}-delete`);
    const entry = avatarEngine.animationRegistry.get(id);
    showConfirm(`Xóa animation "${entry?.name || id}"?`, () => {
      if (cfg.getCurrentId() === id) { avatarEngine.stopAnimation(); cfg.setCurrentId(null); cfg.hideNowPlaying(); }
      avatarEngine.animationRegistry.remove(id);
      _vrmaDB.remove(id).catch(e => console.warn('[VrmaDB] remove error:', e));
      showToast('Đã xóa animation', 'success');
    });
  }));
}

// ── Shared bind dropzone ─────────────────────────────────
function _bindDropzone(dropzoneId) {
  const dz = document.getElementById(dropzoneId);
  if (!dz || dz._dzBound) return;
  dz._dzBound = true;
  dz.addEventListener('click', _openVRMAFilePicker);
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor = 'var(--pk)'; dz.style.background = 'var(--pk-bg)'; });
  dz.addEventListener('dragleave', () => { dz.style.borderColor = ''; dz.style.background = ''; });
  dz.addEventListener('drop', async e => {
    e.preventDefault(); dz.style.borderColor = ''; dz.style.background = '';
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.vrma'));
    if (!files.length) { showToast('Chỉ hỗ trợ file .vrma', 'error'); return; }
    await _importVRMAFiles(files);
  });
}

// ═══════════════════════════════════════════════════════════
// THƯ VIỆN NHẢY PAGE  (prefix: lib)
// ═══════════════════════════════════════════════════════════
const _libCfg = {
  prefix: 'lib',
  gridId: 'lib-anim-grid', countId: 'lib-anim-count',
  danceId: 'lib-cat-dance', animId: 'lib-cat-anim', specialId: 'lib-cat-special',
  dropzoneId: 'lib-dropzone', gridWrapperId: 'lib-grid-wrapper',
  clearBtnId: 'btn-lib-clear-all', warnId: 'lib-vrm-warning',
  searchId: 'lib-search', filterId: 'lib-filter-cat',
  getCurrentId: () => _libCurrentAnimId,
  setCurrentId: (id) => { _libCurrentAnimId = id; },
  showNowPlaying: (name, dur) => { _showNowPlayingFor('lib', name, dur); },
  hideNowPlaying: () => { _hideNowPlayingFor('lib'); },
};

function refreshAnimLib() {
  _bindLibPageEvents();
  _bindVrmLibEvents();
  // Show the currently active tab
  switchLibTab(_libCurrentTab);
}

// ── Tab switching ─────────────────────────────────────────
let _libCurrentTab = 'avatar';   // 'avatar' | 'anim'

function switchLibTab(tab) {
  _libCurrentTab = tab;
  const panelAvatar = document.getElementById('lib-panel-avatar');
  const panelAnim   = document.getElementById('lib-panel-anim');
  const tabAvatar   = document.getElementById('lib-tab-avatar');
  const tabAnim     = document.getElementById('lib-tab-anim');
  if (!panelAvatar || !panelAnim) return;

  if (tab === 'avatar') {
    panelAvatar.style.display = 'flex';
    panelAnim.style.display   = 'none';
    if (tabAvatar) { tabAvatar.style.background = 'var(--pk)'; tabAvatar.style.color = '#fff'; }
    if (tabAnim)   { tabAnim.style.background = 'transparent'; tabAnim.style.color = 'var(--tm)'; }
    _renderVrmGrid();
  } else {
    panelAvatar.style.display = 'none';
    panelAnim.style.display   = 'flex';
    if (tabAnim)    { tabAnim.style.background = 'var(--pk)'; tabAnim.style.color = '#fff'; }
    if (tabAvatar)  { tabAvatar.style.background = 'transparent'; tabAvatar.style.color = 'var(--tm)'; }
    _renderGrid(_libCfg, avatarEngine.animationRegistry.getAll());
  }
}

// ══════════════════════════════════════════════════════
// VRM STORE — IndexedDB persistence (survives reload)
// ══════════════════════════════════════════════════════
const _vrmDB = (() => {
  const DB_NAME  = 'sherin-vrm-store';
  const DB_VER   = 1;
  const STORE    = 'vrms';
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function save(entry) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const buf = entry._buffer;   // ArrayBuffer saved separately
      const rec = {
        id: entry.id, name: entry.name, fileName: entry.fileName,
        isActive: entry.isActive, loadedAt: entry.loadedAt, buffer: buf
      };
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(rec);
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }

  async function remove(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }

  async function saveAll(entries) {
    // Persist active flags update (e.g. after set-active)
    for (const entry of entries) await save(entry);
  }

  async function loadAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = e => {
        const recs = e.target.result || [];
        // Re-create File objects from saved ArrayBuffers
        const entries = recs.map(r => ({
          id: r.id, name: r.name, fileName: r.fileName,
          isActive: r.isActive, loadedAt: r.loadedAt,
          _buffer: r.buffer,
          _fileRef: new File([r.buffer], r.fileName, { type: 'application/octet-stream' })
        }));
        entries.sort((a, b) => a.loadedAt - b.loadedAt);
        resolve(entries);
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function clearAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }

  return { save, remove, saveAll, loadAll, clearAll };
})();

// ══════════════════════════════════════════════════════
// VRMA STORE — IndexedDB persistence (survives reload)
// ══════════════════════════════════════════════════════
const _vrmaDB = (() => {
  const DB_NAME = 'sherin-vrma-store';
  const DB_VER  = 1;
  const STORE   = 'vrmas';
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE))
          db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function save(id, fileName, buffer) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id, fileName, buffer, savedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }

  async function remove(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }

  async function loadAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = e => {
        const recs = (e.target.result || []).sort((a, b) => a.savedAt - b.savedAt);
        resolve(recs.map(r => ({
          id: r.id,
          fileName: r.fileName,
          file: new File([r.buffer], r.fileName, { type: 'application/octet-stream' })
        })));
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function clearAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }

  return { save, remove, loadAll, clearAll };
})();

// Restore VRMA animations from IndexedDB on startup
let _vrmaStoreInited = false;
async function _initVrmaStore() {
  if (_vrmaStoreInited) return;
  _vrmaStoreInited = true;
  try {
    const saved = await _vrmaDB.loadAll();
    if (!saved.length) return;
    let count = 0;
    for (const { file } of saved) {
      try {
        await avatarEngine.loadAnimation(file);
        count++;
      } catch (_) {}
    }
    if (count > 0) showToast(`✅ Đã khôi phục ${count} animation`, 'success');
  } catch (e) {
    console.warn('[VrmaStore] Không thể khôi phục từ IndexedDB:', e);
  }
}

// ── Avatar (VRM) Library in-memory store ─────────────────
const _vrmStore = [];  // [{ id, name, fileName, isActive, loadedAt, _fileRef, _buffer }]

// Load persisted VRM library on startup
let _vrmStoreInited = false;
async function _initVrmStore() {
  if (_vrmStoreInited) return;
  _vrmStoreInited = true;
  try {
    const saved = await _vrmDB.loadAll();
    if (!saved.length) return;
    _vrmStore.push(...saved);
    // Restore active avatar into engine
    const active = saved.find(v => v.isActive);
    if (active?._fileRef) {
      avatarEngine.loadVRM(active._fileRef)
        .then(() => showToast(`✅ Đã khôi phục avatar "${active.name}"`, 'success'))
        .catch(() => {});
    }
    _refreshAllVrmUIs();
  } catch (e) {
    console.warn('[VrmStore] Không thể khôi phục từ IndexedDB:', e);
  }
}


function _renderVrmGrid() {
  const countEl  = document.getElementById('lib-vrm-count');
  const activeEl = document.getElementById('lib-active-vrm-name');
  const dz       = document.getElementById('lib-vrm-dropzone');
  const wrapper  = document.getElementById('lib-vrm-grid-wrapper');
  const gridEl   = document.getElementById('lib-vrm-grid');

  const active = _vrmStore.find(v => v.isActive);
  if (countEl)  countEl.textContent  = _vrmStore.length;
  if (activeEl) activeEl.textContent = active?.name || '—';

  if (!gridEl) return;

  if (_vrmStore.length === 0) {
    if (dz)      dz.style.display      = 'flex';
    if (wrapper) wrapper.style.display = 'none';
    return;
  }

  if (dz)      dz.style.display      = 'none';
  if (wrapper) wrapper.style.display = 'flex';

  gridEl.innerHTML = _vrmStore.map(v => {
    const isActive = v.isActive;
    return `
    <div class="pn" style="position:relative;padding:0;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s;${isActive ? 'border-color:var(--pk);box-shadow:0 0 0 1px var(--pk)44' : ''}">
      <div style="height:3px;background:${isActive ? 'var(--pk)' : 'var(--bd-l)'};width:100%"></div>
      <div style="padding:14px 16px 12px">
        <!-- Thumbnail area -->
        <div style="width:100%;height:100px;border-radius:10px;background:var(--bg-ps);border:1px solid var(--bd-l);display:flex;align-items:center;justify-content:center;font-size:48px;margin-bottom:12px;position:relative;overflow:hidden">
          🧊
          ${isActive ? '<div style="position:absolute;top:6px;right:6px;background:var(--pk);color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px">● ĐANG DÙNG</div>' : ''}
        </div>
        <!-- Info -->
        <div style="margin-bottom:10px">
          <div style="font-size:13px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${v.name}</div>
          <div style="font-size:10px;color:var(--tm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.fileName}</div>
          <div style="font-size:10px;color:var(--td);margin-top:2px">🕐 ${new Date(v.loadedAt).toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}</div>
        </div>
        <!-- Actions -->
        <div style="display:flex;gap:6px">
          <button class="bt ${isActive ? 'bt-sc' : 'bt-pk'} bt-sm" style="flex:1;font-size:11px;height:30px;${isActive ? 'opacity:0.5;cursor:default' : ''}" data-vrm-activate="${v.id}" ${isActive ? 'disabled' : ''}>
            ${isActive ? '✓ Đang dùng' : '▶ Dùng avatar này'}
          </button>
          <button class="bt bt-sc bt-sm" style="height:30px;padding:0 10px;font-size:11px" data-vrm-load-studio="${v.id}" title="Mở trong Avatar Studio">
            🎬
          </button>
          <button class="bt bt-gh bt-sm" style="height:30px;padding:0 10px;font-size:11px" data-vrm-delete="${v.id}" title="Xóa" ${isActive ? 'disabled style="opacity:0.4"' : ''}>
            🗑
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Bind buttons
  gridEl.querySelectorAll('[data-vrm-activate]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-vrm-activate');
    _setActiveVrm(id);
  }));
  gridEl.querySelectorAll('[data-vrm-load-studio]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-vrm-load-studio');
    const v = _vrmStore.find(x => x.id === id);
    if (v) {
      avatarEngine.loadVRM(v._fileRef).catch(e => showToast(`❌ ${e.message}`, 'error'));
      switchView('1');  // switch to Avatar Studio
      showToast(`🎬 Đang tải ${v.name} vào Avatar Studio...`, 'success');
    }
  }));
  gridEl.querySelectorAll('[data-vrm-delete]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-vrm-delete');
    const v = _vrmStore.find(x => x.id === id);
    showConfirm(`Xóa avatar "${v?.name}"?`, () => {
      const idx = _vrmStore.findIndex(x => x.id === id);
      if (idx !== -1) _vrmStore.splice(idx, 1);
      _vrmDB.remove(id).catch(e => console.warn('[VrmDB] remove error:', e));
      showToast('Đã xóa avatar', 'success');
      _refreshAllVrmUIs();
    });
  }));
}

function _setActiveVrm(id) {
  _vrmStore.forEach(v => v.isActive = (v.id === id));
  const v = _vrmStore.find(x => x.id === id);
  // Persist new active flags
  _vrmDB.saveAll(_vrmStore).catch(e => console.warn('[VrmDB] save error:', e));
  if (v && v._fileRef) {
    avatarEngine.loadVRM(v._fileRef)
      .then(() => { showToast(`✅ Avatar "${v.name}" đã được kích hoạt`, 'success'); _refreshAllVrmUIs(); })
      .catch(e => showToast(`❌ ${e.message}`, 'error'));
  }
  _refreshAllVrmUIs();
}

let _vrmLibEventsBound = false;
function _bindVrmLibEvents() {
  if (_vrmLibEventsBound) return;
  _vrmLibEventsBound = true;

  document.getElementById('btn-lib-vrm-import')?.addEventListener('click', _openVRMFilePicker);
  _bindVrmDropzone('lib-vrm-dropzone');
}

function _bindVrmDropzone(id) {
  const dz = document.getElementById(id);
  if (!dz || dz._dzBound) return;
  dz._dzBound = true;
  dz.addEventListener('click', _openVRMFilePicker);
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor = 'var(--pk)'; dz.style.background = 'var(--pk-bg)'; });
  dz.addEventListener('dragleave', () => { dz.style.borderColor = ''; dz.style.background = ''; });
  dz.addEventListener('drop', async e => {
    e.preventDefault(); dz.style.borderColor = ''; dz.style.background = '';
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.vrm'));
    if (!files.length) { showToast('Chỉ hỗ trợ file .vrm', 'error'); return; }
    await _importVRMFiles(files);
  });
}

async function _openVRMFilePicker() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.vrm'; input.multiple = true;
  input.onchange = async e => { await _importVRMFiles(Array.from(e.target.files || [])); };
  input.click();
}

async function _importVRMFiles(files) {
  for (const file of files) {
    const id      = 'vrm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const name    = file.name.replace(/\.vrm$/i, '');
    const isFirst = _vrmStore.length === 0;

    // Read file as ArrayBuffer for persistence
    const buffer = await file.arrayBuffer();

    // Add to store immediately (with loading state)
    const entry = { id, name, fileName: file.name, isActive: isFirst, loadedAt: Date.now(), _fileRef: file, _buffer: buffer, _loading: isFirst };
    _vrmStore.push(entry);
    _refreshAllVrmUIs();   // show item instantly

    if (isFirst) {
      try {
        await avatarEngine.loadVRM(file);
        entry._loading = false;
        showToast(`✅ Avatar "${name}" đã được import và kích hoạt`, 'success');
        await _vrmDB.save(entry);   // persist only after success
      } catch (e) {
        // Remove failed entry
        const idx = _vrmStore.findIndex(x => x.id === id);
        if (idx !== -1) _vrmStore.splice(idx, 1);
        showToast(`❌ Không thể tải "${name}": ${e.message}`, 'error');
      }
    } else {
      await _vrmDB.save(entry);   // persist immediately
      showToast(`✅ Avatar "${name}" đã được thêm vào thư viện`, 'success');
    }

    _refreshAllVrmUIs();
  }
}

// Refresh all panels showing VRM data
function _refreshAllVrmUIs() {
  _renderAvStudioVrmList();   // Avatar Studio right panel
  _renderVrmGrid();           // Thư viện page
  _renderLiveVrmList();       // TikTok LIVE avatar picker
}

function _renderLiveVrmList() {
  const sel = document.getElementById('live-vrm-select');
  if (!sel) return;

  // Populate options
  sel.innerHTML = _vrmStore.length
    ? _vrmStore.map(v => `<option value="${v.id}" ${v.isActive ? 'selected' : ''}>🧊 ${v.name}</option>`).join('')
    : `<option value="">-- Chưa có avatar (Import ở Avatar Studio) --</option>`;

  // Use a single handler via onchange (avoids clone/replace leak)
  sel.onchange = async () => {
    const id = sel.value;
    if (!id) return;
    const entry = _vrmStore.find(v => v.id === id);
    if (!entry) return;
    try {
      sel.disabled = true;
      _vrmStore.forEach(v => v.isActive = (v.id === id));
      if (entry._fileRef) {
        await avatarEngine.loadVRM(entry._fileRef);
      } else if (entry._buffer) {
        const file = new File([new Blob([entry._buffer])], entry.fileName, { type: 'application/octet-stream' });
        await avatarEngine.loadVRM(file);
      }
      _vrmDB.saveAll(_vrmStore).catch(() => {});
      _refreshAllVrmUIs();
      showToast(`✅ Avatar "${entry.name}" đã được tải`, 'success');
    } catch (err) {
      showToast(`❌ Lỗi tải avatar: ${err.message}`, 'error');
    } finally {
      sel.disabled = false;
    }
  };
}


let _libPageEventsBound = false;
function _bindLibPageEvents() {
  if (_libPageEventsBound) return;
  _libPageEventsBound = true;
  document.getElementById('btn-lib-import')?.addEventListener('click', _openVRMAFilePicker);
  _bindDropzone('lib-dropzone');
  document.getElementById('lib-filter-cat')?.addEventListener('change', () => _renderGrid(_libCfg, avatarEngine.animationRegistry.getAll()));
  document.getElementById('lib-search')?.addEventListener('input', () => _renderGrid(_libCfg, avatarEngine.animationRegistry.getAll()));
  document.getElementById('btn-lib-clear-all')?.addEventListener('click', () => {
    showConfirm('Xóa toàn bộ animations?', () => {
      avatarEngine.stopAnimation(); _libCurrentAnimId = null; _hideNowPlayingFor('lib');
      avatarEngine.animationRegistry.clear(); showToast('Đã xóa toàn bộ', 'success');
    });
  });
  document.getElementById('lib-btn-pause')?.addEventListener('click', () => {
    avatarEngine.pauseAnimation(); _libCurrentAnimId = null; _hideNowPlayingFor('lib');
    _renderGrid(_libCfg, avatarEngine.animationRegistry.getAll());
  });
  document.getElementById('lib-btn-stop')?.addEventListener('click', () => {
    avatarEngine.stopAnimation(); _libCurrentAnimId = null; _hideNowPlayingFor('lib');
    _renderGrid(_libCfg, avatarEngine.animationRegistry.getAll());
  });
}

// ═══════════════════════════════════════════════════════════
// AVATAR STUDIO VRMA PANEL  (prefix: av-lib)
// ═══════════════════════════════════════════════════════════
const _avLibCfg = {
  prefix: 'av-lib',
  gridId: 'av-lib-anim-grid', countId: 'av-lib-count',
  danceId: 'av-lib-cat-dance', animId: 'av-lib-cat-anim', specialId: 'av-lib-cat-special',
  dropzoneId: 'av-lib-dropzone', gridWrapperId: 'av-lib-grid-wrapper',
  clearBtnId: 'btn-av-lib-clear-all', warnId: 'av-lib-vrm-warning',
  searchId: 'av-lib-search', filterId: 'av-lib-filter-cat',
  getCurrentId: () => _avLibCurrentAnimId,
  setCurrentId: (id) => { _avLibCurrentAnimId = id; },
  showNowPlaying: (name, dur) => { _showNowPlayingFor('av-lib', name, dur); },
  hideNowPlaying: () => { _hideNowPlayingFor('av-lib'); },
};

function refreshAvLib() {
  _renderGrid(_avLibCfg, avatarEngine.animationRegistry.getAll());
  _bindAvLibEvents();
}

let _avLibEventsBound = false;
function _bindAvLibEvents() {
  if (_avLibEventsBound) return;
  _avLibEventsBound = true;
  document.getElementById('btn-av-lib-import')?.addEventListener('click', _openVRMAFilePicker);
  _bindDropzone('av-lib-dropzone');
  document.getElementById('av-lib-filter-cat')?.addEventListener('change', () => _renderGrid(_avLibCfg, avatarEngine.animationRegistry.getAll()));
  document.getElementById('av-lib-search')?.addEventListener('input', () => _renderGrid(_avLibCfg, avatarEngine.animationRegistry.getAll()));
  document.getElementById('btn-av-lib-clear-all')?.addEventListener('click', () => {
    showConfirm('Xóa toàn bộ animations?', () => {
      avatarEngine.stopAnimation(); _avLibCurrentAnimId = null; _hideNowPlayingFor('av-lib');
      avatarEngine.animationRegistry.clear(); showToast('Đã xóa toàn bộ', 'success');
    });
  });
  document.getElementById('av-lib-btn-pause')?.addEventListener('click', () => {
    avatarEngine.pauseAnimation(); _avLibCurrentAnimId = null; _hideNowPlayingFor('av-lib');
    _renderGrid(_avLibCfg, avatarEngine.animationRegistry.getAll());
  });
  document.getElementById('av-lib-btn-stop')?.addEventListener('click', () => {
    avatarEngine.stopAnimation(); _avLibCurrentAnimId = null; _hideNowPlayingFor('av-lib');
    _renderGrid(_avLibCfg, avatarEngine.animationRegistry.getAll());
  });
}

// ═══════════════════════════════════════════════════════════
// AVATAR STUDIO — AVATAR LIBRARY PANEL
// ═══════════════════════════════════════════════════════════
function _renderAvStudioVrmList() {
  const countEl  = document.getElementById('av-studio-vrm-count');
  const activeEl = document.getElementById('av-studio-vrm-active');
  const dzEl     = document.getElementById('av-studio-vrm-dropzone');
  const listEl   = document.getElementById('av-studio-vrm-list');

  const active = _vrmStore.find(v => v.isActive);
  if (countEl)  countEl.textContent  = _vrmStore.length;
  if (activeEl) activeEl.textContent = active?.name || '—';

  if (!listEl) return;

  if (_vrmStore.length === 0) {
    if (dzEl)   dzEl.style.display   = 'flex';
    if (listEl) listEl.style.display = 'none';
    return;
  }

  if (dzEl)   dzEl.style.display   = 'none';
  if (listEl) listEl.style.display = 'flex';

  listEl.innerHTML = _vrmStore.map(v => {
    const isActive  = v.isActive;
    const isLoading = v._loading;
    return `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:${isActive ? 'rgba(232,33,140,0.08)' : 'var(--bg-ps)'};border:1px solid ${isActive ? 'var(--pk)' : 'var(--bd-l)'};transition:border-color 0.2s,background 0.2s">
      <!-- Icon -->
      <div style="width:32px;height:32px;border-radius:8px;background:${isActive ? 'var(--pk-bg)' : 'var(--bg-p)'};border:1px solid ${isActive ? 'rgba(232,33,140,0.3)' : 'var(--bd-l)'};display:flex;align-items:center;justify-content:center;font-size:${isLoading ? '12px' : '16px'};flex-shrink:0">
        ${isLoading ? '<span style="animation:spin 1s linear infinite;display:inline-block">⏳</span>' : '🧊'}
      </div>
      <!-- Info -->
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.name}</div>
        <div style="font-size:9px;color:${isLoading ? 'var(--pk)' : 'var(--td)'}">
          ${isLoading ? '⏳ Đang tải vào engine...' : v.fileName}
        </div>
      </div>
      <!-- Active badge -->
      ${isActive && !isLoading ? '<span style="font-size:8px;font-weight:700;color:var(--pk);background:var(--pk-bg);padding:2px 6px;border-radius:20px;flex-shrink:0;white-space:nowrap">● ACTIVE</span>' : ''}
      <!-- Actions -->
      <div style="display:flex;gap:4px;flex-shrink:0">
        ${!isActive && !isLoading ? `<button class="bt bt-pk bt-sm" style="height:24px;padding:0 8px;font-size:9px" data-av-studio-vrm-use="${v.id}" title="Dùng avatar này">▶</button>` : ''}
        <button class="bt bt-gh bt-sm" style="height:24px;padding:0 8px;font-size:9px" data-av-studio-vrm-del="${v.id}" title="Xóa" ${isActive || isLoading ? 'disabled style="opacity:0.3"' : ''}>🗑</button>
      </div>
    </div>`;
  }).join('');

  // Bind: Use
  listEl.querySelectorAll('[data-av-studio-vrm-use]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-av-studio-vrm-use');
    _setActiveVrm(id);
    _renderAvStudioVrmList();
  }));

  // Bind: Delete
  listEl.querySelectorAll('[data-av-studio-vrm-del]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-av-studio-vrm-del');
    const v = _vrmStore.find(x => x.id === id);
    showConfirm(`Xóa avatar "${v?.name}"?`, () => {
      const idx = _vrmStore.findIndex(x => x.id === id);
      if (idx !== -1) _vrmStore.splice(idx, 1);
      _vrmDB.remove(id).catch(e => console.warn('[VrmDB] remove error:', e));
      showToast('Đã xóa avatar', 'success');
      _refreshAllVrmUIs();
    });
  }));
}

let _avStudioVrmEventsBound = false;
function _bindAvStudioVrmEvents() {
  if (_avStudioVrmEventsBound) return;
  _avStudioVrmEventsBound = true;
  document.getElementById('btn-av-studio-import-vrm')?.addEventListener('click', _openVRMFilePicker);
  // Dropzone
  const dz = document.getElementById('av-studio-vrm-dropzone');
  if (dz && !dz._dzBound) {
    dz._dzBound = true;
    dz.addEventListener('click', _openVRMFilePicker);
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor = 'var(--pk)'; dz.style.background = 'var(--pk-bg)'; });
    dz.addEventListener('dragleave', () => { dz.style.borderColor = ''; dz.style.background = ''; });
    dz.addEventListener('drop', async e => {
      e.preventDefault(); dz.style.borderColor = ''; dz.style.background = '';
      const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.vrm'));
      if (!files.length) { showToast('Chỉ hỗ trợ file .vrm', 'error'); return; }
      await _importVRMFiles(files);
      _renderAvStudioVrmList();
    });
  }
}


// ═══════════════════════════════════════════════════════════
// SHARED IMPORT + NOW PLAYING HELPERS
// ═══════════════════════════════════════════════════════════
async function _openVRMAFilePicker() {
  if (!avatarEngine.vrm) showToast('ℹ️ Animation sẽ được kích hoạt sau khi import VRM', 'info');
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.vrma'; input.multiple = true;
  input.onchange = async (e) => { await _importVRMAFiles(Array.from(e.target.files || [])); };
  input.click();
}

async function _importVRMAFiles(files) {
  if (!files.length) return;
  let success = 0;
  for (const file of files) {
    try {
      // Read buffer before loading (loadAnimation may consume the file stream)
      const buffer = await file.arrayBuffer();
      const result = await avatarEngine.loadAnimation(file);
      // Persist to IndexedDB using the ID assigned by the engine
      await _vrmaDB.save(result.id, file.name, buffer);
      success++;
    } catch (err) {
      showToast(`❌ ${file.name}: ${err.message}`, 'error');
    }
  }
  if (success > 0) showToast(`✅ Đã import ${success} animation${success > 1 ? 's' : ''}`, 'success');
}

function _showNowPlayingFor(prefix, name, duration) {
  const bar    = document.getElementById(`${prefix}-now-playing`);
  const nameEl = document.getElementById(`${prefix}-np-name`);
  const totEl  = document.getElementById(`${prefix}-np-tot`);
  if (bar)    bar.style.display = 'block';
  if (nameEl) nameEl.textContent = name;
  if (totEl)  totEl.textContent  = fmtTime(Math.floor(duration));
}

function _hideNowPlayingFor(prefix) {
  const bar  = document.getElementById(`${prefix}-now-playing`);
  const prog = document.getElementById(`${prefix}-np-prog`);
  const cur  = document.getElementById(`${prefix}-np-cur`);
  if (bar)  bar.style.display = 'none';
  if (prog) prog.style.width  = '0%';
  if (cur)  cur.textContent   = '00:00';
}

// Legacy wrappers (kept for backward compat with animation event handler)
function _showNowPlaying(name, dur) { _showNowPlayingFor('lib', name, dur); }
function _hideNowPlaying()          { _hideNowPlayingFor('lib'); }

function addLogEntry(entry) {
  liveLog.push(entry);
  if (liveLog.length > 50) liveLog.shift();

  const container = document.getElementById('live-log-container');
  if (!container) return;

  const colors = {
    gift_received: '#E91E8C',
    rule_matched: '#7C3AED',
    rule_no_match: '#F59E0B',
    avatar_command: '#3B82F6',
    animation_start: '#10B981',
    animation_end: '#6B7280',
    animation_loading: '#F59E0B',
    animation_loaded: '#10B981',
    animation_error: '#EF4444',
    vrm_loading: '#F59E0B',
    vrm_loaded: '#10B981',
    vrm_error: '#EF4444',
    engine_init: '#3B82F6',
    command_error: '#EF4444',
  };

  const color = colors[entry.type] || '#6B7280';
  const div = document.createElement('div');
  div.style.cssText = `padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;gap:6px;align-items:flex-start`;
  div.innerHTML = `<span style="color:var(--tm);flex-shrink:0;font-variant-numeric:tabular-nums">${entry.time}</span><span style="color:${color};word-break:break-word">${entry.message}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
