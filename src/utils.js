/**
 * Toast notification utility
 */
const container = () => {
  let el = document.getElementById('toast-ct');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-ct';
    el.className = 'tst';
    document.body.appendChild(el);
  }
  return el;
};

export function showToast(msg, type = '') {
  const ct = container();
  const t = document.createElement('div');
  const cls = type === 'gift' ? ' tst-g' : type === 'error' ? ' tst-e' : type === 'success' ? ' tst-s' : '';
  t.className = 'tst-i' + cls;
  t.textContent = msg;
  ct.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
}

/**
 * Modal utility
 */
export function showModal({ title, fields, customContent, onSubmit, submitText, submitLabel, cancelText = 'Hủy' }) {
  const btnLabel = submitLabel || submitText || 'Lưu';
  const ov = document.createElement('div');
  ov.className = 'modal-ov';

  let bodyHTML = '';
  if (customContent) {
    bodyHTML = `<div style="padding:0 0 4px">${customContent}</div>`;
  } else if (fields) {
    bodyHTML = fields.map(f => {
      if (f.type === 'select') {
        const opts = f.options.map(o => `<option value="${o.value}"${o.value === f.value ? ' selected' : ''}>${o.label}</option>`).join('');
        return `<div class="modal-fl"><label>${f.label}</label><select data-field="${f.key}">${opts}</select></div>`;
      }
      return `<div class="modal-fl"><label>${f.label}</label><input type="${f.type || 'text'}" data-field="${f.key}" value="${f.value || ''}" placeholder="${f.placeholder || ''}"/></div>`;
    }).join('');
  }

  ov.innerHTML = `
    <div class="modal-box" style="max-width:560px;width:90vw">
      <div class="modal-ti"><span>${title}</span><button class="modal-cl" data-close>✕</button></div>
      ${bodyHTML}
      <div class="modal-acts">
        <button class="bt bt-sc bt-sm" data-close>${cancelText}</button>
        <button class="bt bt-pk bt-sm" data-submit>${btnLabel}</button>
      </div>
    </div>`;

  const close = () => { if (ov.parentNode) ov.parentNode.removeChild(ov); };

  ov.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });

  ov.querySelector('[data-submit]').addEventListener('click', () => {
    const data = {};
    ov.querySelectorAll('[data-field]').forEach(el => {
      const key = el.dataset.field;
      const val = el.value;
      data[key] = el.type === 'number' ? Number(val) : val;
    });
    const result = onSubmit(data);
    // Allow onSubmit to return false to cancel close (e.g. for validation)
    if (result !== false) close();
  });

  document.body.appendChild(ov);
  const firstInput = ov.querySelector('input:not([type="hidden"]), select');
  if (firstInput) firstInput.focus();
}


/**
 * Confirm dialog
 */
export function showConfirm(message, onConfirm) {
  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = `
    <div class="modal-box" style="width:340px">
      <div class="modal-ti"><span>Xác nhận</span><button class="modal-cl" data-close>✕</button></div>
      <p style="color:var(--t2);font-size:13px;margin-bottom:20px">${message}</p>
      <div class="modal-acts">
        <button class="bt bt-sc bt-sm" data-close>Hủy</button>
        <button class="bt bt-dn bt-sm" data-confirm>Xóa</button>
      </div>
    </div>`;

  const close = () => { if (ov.parentNode) ov.parentNode.removeChild(ov); };
  ov.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  ov.querySelector('[data-confirm]').addEventListener('click', () => { onConfirm(); close(); });
  document.body.appendChild(ov);
}

/**
 * Format seconds to MM:SS
 */
export function fmtTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Format seconds to HH:MM:SS
 */
export function fmtDuration(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
