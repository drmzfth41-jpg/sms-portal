/* ============================================================
   SMS Portal — app.js  (shared utilities)
   ============================================================ */

const APP = {
  TOKEN_KEY: 'sms_portal_token',

  // ─── Auth ─────────────────────────────────────────────────
  getToken()       { return localStorage.getItem(this.TOKEN_KEY); },
  setToken(t)      { localStorage.setItem(this.TOKEN_KEY, t); },
  clearToken()     { localStorage.removeItem(this.TOKEN_KEY); },
  isLoggedIn()     { return !!this.getToken(); },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
    }
  },

  logout() {
    this.clearToken();
    window.location.href = '/login.html';
  },

  // ─── Toast ────────────────────────────────────────────────
  toast(message, type = 'info', title = null) {
    const icons = {
      success: '<i class="bi bi-check-circle-fill text-success"></i>',
      error:   '<i class="bi bi-x-circle-fill text-danger"></i>',
      warning: '<i class="bi bi-exclamation-triangle-fill text-warning"></i>',
      info:    '<i class="bi bi-info-circle-fill" style="color:var(--accent-1)"></i>',
    };
    const titles = {
      success: 'Başarılı',
      error:   'Hata',
      warning: 'Uyarı',
      info:    'Bilgi',
    };

    const container = document.getElementById('toast-container');
    if (!container) return;

    const id   = 'toast-' + Date.now();
    const html = `
      <div id="${id}" class="toast toast-custom toast-${type}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
          ${icons[type] || icons.info}
          <strong class="ms-2 me-auto">${title || titles[type] || 'Bilgi'}</strong>
          <button type="button" class="btn-close ms-2" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">${message}</div>
      </div>`;

    container.insertAdjacentHTML('beforeend', html);
    const el    = document.getElementById(id);
    const toast = new bootstrap.Toast(el, { delay: 4000 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  },

  // ─── Sidebar ──────────────────────────────────────────────
  initSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const toggle   = document.getElementById('sidebarToggle');
    const overlay  = document.getElementById('sidebarOverlay');

    if (!sidebar || !toggle) return;

    const isMobile = () => window.innerWidth < 768;

    toggle.addEventListener('click', () => {
      if (isMobile()) {
        sidebar.classList.toggle('mobile-open');
        overlay && overlay.classList.toggle('show');
      } else {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
      }
    });

    overlay && overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('show');
    });

    // Restore state on desktop
    if (!isMobile() && localStorage.getItem('sidebar_collapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }
  },

  // ─── Credit badge ─────────────────────────────────────────
  async loadCredit() {
    const el = document.getElementById('creditValue');
    if (!el) return;
    try {
      const res = await API.get('/api/credit');
      if (res.credit !== undefined) {
        el.textContent = Number(res.credit).toLocaleString('tr-TR');
      }
    } catch { /* silent */ }
  },

  // ─── Shared init ──────────────────────────────────────────
  init() {
    this.requireAuth();
    this.initSidebar();
    this.loadCredit();

    // Logout button
    document.querySelectorAll('[data-logout]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); this.logout(); });
    });
  },
};

// ─── Result box helper ─────────────────────────────────────────────────────
function showResult(boxId, data, isError = false) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.textContent = JSON.stringify(data, null, 2);
  box.className   = 'result-box show ' + (isError ? 'error' : 'success');
}

// ─── SMS character counter ─────────────────────────────────────────────────
function initSmsCounter(textareaId, counterId) {
  const ta  = document.getElementById(textareaId);
  const cnt = document.getElementById(counterId);
  if (!ta || !cnt) return;

  const hasTurkish = (s) => /[çğışöüÇĞİŞÖÜ]/.test(s);
  const update = () => {
    const len    = ta.value.length;
    const isTR   = hasTurkish(ta.value);
    const limit  = isTR ? 70 : 160;
    const parts  = len === 0 ? 1 : Math.ceil(len / limit);
    cnt.textContent = `${len} karakter · ${parts} SMS${isTR ? ' (Türkçe)' : ''}`;
    cnt.className   = 'sms-counter' + (parts > 1 ? ' warning' : '');
  };
  ta.addEventListener('input', update);
  update();
}
