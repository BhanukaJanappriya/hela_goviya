/* ── API Base ─────────────────────────────────────────────────────────────── */
const API = '/api';

class ApiClient {
  constructor() { this.token = localStorage.getItem('hg_token'); }
  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }
  setToken(t) { this.token = t; t ? localStorage.setItem('hg_token', t) : localStorage.removeItem('hg_token'); }
  async req(method, url, body = null) {
    try {
      const opts = { method, headers: this.headers() };
      if (body) opts.body = JSON.stringify(body);
      const res  = await fetch(`${API}${url}`, opts);
      const data = await res.json();
      if (res.status === 401) { this.setToken(null); localStorage.removeItem('hg_user'); window.location.href = '/login.html'; return; }
      return { ok: res.ok, status: res.status, ...data };
    } catch (e) {
      console.error(e);
      return { ok: false, success: false, message: 'Network error' };
    }
  }
  get(u)        { return this.req('GET', u); }
  post(u, b)    { return this.req('POST', u, b); }
  put(u, b)     { return this.req('PUT', u, b); }
  delete(u)     { return this.req('DELETE', u); }
}
const api = new ApiClient();

/* ── Auth helpers ─────────────────────────────────────────────────────────── */
const Auth = {
  getUser()        { const u = localStorage.getItem('hg_user'); return u ? JSON.parse(u) : null; },
  setUser(u)       { localStorage.setItem('hg_user', JSON.stringify(u)); },
  logout()         { api.setToken(null); localStorage.removeItem('hg_user'); window.location.href = '/login.html'; },
  requireAuth(roles = []) {
    const user = Auth.getUser();
    if (!user || !api.token) { window.location.href = '/login.html'; return null; }
    if (roles.length && !roles.includes(user.role)) { window.location.href = '/login.html'; return null; }
    return user;
  },
  redirectByRole(role) {
    const map = { admin:'/pages/admin.html', customer:'/pages/customer.html', vendor:'/pages/vendor.html', seller:'/pages/seller.html', driver:'/pages/driver.html' };
    window.location.href = map[role] || '/login.html';
  }
};

/* ── Toast ────────────────────────────────────────────────────────────────── */
const Toast = {
  show(msg, type = 'info', ms = 3500) {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${icons[type]||'ℹ'}</span> <span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.cssText = 'opacity:0;transform:translateX(100%);transition:all .3s'; setTimeout(() => t.remove(), 300); }, ms);
  }
};

/* ── UI helpers ───────────────────────────────────────────────────────────── */
const UI = {
  currency(n)    { return `Rs. ${Number(n||0).toLocaleString('en-LK', { minimumFractionDigits:2 })}`; },
  date(d)        { return d ? new Date(d).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'numeric' }) : '—'; },
  dateTime(d)    { return d ? new Date(d).toLocaleString('en-GB',{ day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'; },
  ago(d) {
    if (!d) return '';
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1)   return 'Just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m/60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  },
  badge(status)  { return `<span class="badge status-${status}">${status.replace('_',' ')}</span>`; },
  catEmoji(slug) { const m={vegetables:'🥬',fruits:'🍎',grains:'🌾',herbs:'🌿',dairy:'🥚',organic:'♻️'}; return m[slug]||'🌿'; },
  loading(el)    { if(el) el.innerHTML = '<div class="loading"><div class="spinner"></div></div>'; },
  empty(el, msg='No data found', icon='📭') { if(el) el.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`; },

  /* Sidebar builder */
  buildSidebar(role, user, nav) {
    const rc = { admin:'#dc2626', customer:'#3b82f6', vendor:'#d97706', seller:'#7c3aed', driver:'#0d9488' };
    return `
      <div class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">🌿</div>
          <div><div class="logo-name">Hela Goviya</div><div class="logo-tag">Fresh from the farm</div></div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section-label">${role.toUpperCase()} PANEL</div>
          ${nav.map(n=>`
            <a href="${n.href||'#'}" class="nav-item${n.active?' active':''}" ${n.fn?`onclick="${n.fn};return false"`:''}>
              <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
              ${n.badge?`<span class="nav-badge">${n.badge}</span>`:''}
            </a>`).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="user-card" style="cursor:pointer" onclick="UI.openProfileModal()" title="View / edit profile">
            <div class="user-avatar" id="sidebarAvatarEl">
              ${user.avatar
                ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                : user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="user-name" id="sidebarUserNameEl">${user.name}</div>
              <div class="user-role" style="color:${rc[role]}">${role}</div>
            </div>
          </div>
          <button onclick="Auth.logout()" class="btn btn-outline btn-sm btn-full" style="margin-top:8px">Sign Out</button>
        </div>
      </div>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
  },

  /* Notification panel */
  buildNotifPanel() {
    return `
      <div class="notif-panel" id="notifPanel">
        <div class="notif-head">
          <h4>🔔 Notifications</h4>
          <button class="btn btn-ghost btn-sm" onclick="markAllRead()">Mark all read</button>
        </div>
        <div class="notif-list" id="notifList"><div class="loading"><div class="spinner"></div></div></div>
      </div>`;
  },

  /* Topbar builder */
  buildTopbar(title, showSearch = false) {
    return `
      <div class="topbar">
        <button class="hamburger" id="hamburger">☰</button>
        ${showSearch
          ? `<div class="topbar-search"><span class="search-icon">🔍</span><input type="text" placeholder="Search products…" id="globalSearch" oninput="debounceSearch(this.value)"></div>`
          : `<div class="topbar-title">${title}</div>`}
        <div style="flex:1"></div>
        <div class="topbar-actions">
          <button class="icon-btn" id="notifBtn" title="Notifications">🔔<span class="notif-dot" id="notifDot"></span></button>
        </div>
      </div>`;
  },

  initSidebar() {
    const h = document.getElementById('hamburger');
    const s = document.getElementById('sidebar');
    const o = document.getElementById('sidebarOverlay');
    if (h && s) {
      h.onclick = () => { s.classList.toggle('open'); o?.classList.toggle('show'); };
      o?.addEventListener('click', () => { s.classList.remove('open'); o.classList.remove('show'); });
    }
  },
  initNotifPanel() {
    const btn   = document.getElementById('notifBtn');
    const panel = document.getElementById('notifPanel');
    if (btn && panel) {
      btn.onclick = e => { e.stopPropagation(); panel.classList.toggle('open'); if (panel.classList.contains('open')) loadNotifications(); };
      document.addEventListener('click', () => panel.classList.remove('open'));
      panel.addEventListener('click', e => e.stopPropagation());
    }
    refreshNotifBadge();
  },

  /* ── Profile Modal ────────────────────────────────────────────────────────── */
  initProfileModal() {
    if (!document.getElementById('profileModal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="profileModal">
          <div class="modal" style="max-width:440px">
            <div class="modal-head">
              <h3>My Profile</h3>
              <button class="modal-close" onclick="closeModal('profileModal')">✕</button>
            </div>
            <div class="modal-body" id="profileModalBody">
              <div class="loading"><div class="spinner"></div></div>
            </div>
          </div>
        </div>`);
    }
  },

  async openProfileModal() {
    if (!document.getElementById('profileModal')) this.initProfileModal();
    openModal('profileModal');
    const body = document.getElementById('profileModalBody');
    body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    const res = await api.get('/auth/profile');
    const { user: u } = res?.data || {};
    if (!u) { body.innerHTML = '<p style="color:var(--red500);text-align:center;padding:24px">Failed to load profile</p>'; return; }
    const avatarHtml = u.avatar
      ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover">`
      : `<span>${u.name.charAt(0).toUpperCase()}</span>`;
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:24px">
        <div style="position:relative;display:inline-block;cursor:pointer" onclick="document.getElementById('_avatarFileInput').click()" title="Change profile photo">
          <div id="pmAvatarPreview" style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,var(--g400),var(--g600));display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;font-weight:700;overflow:hidden;margin:0 auto;border:3px solid var(--g200)">${avatarHtml}</div>
          <div style="position:absolute;bottom:2px;right:2px;background:var(--g600);color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;border:2px solid #fff">📷</div>
        </div>
        <input type="file" id="_avatarFileInput" accept="image/*" style="display:none" onchange="UI.previewAvatar(this)">
        <div style="font-size:.72rem;color:var(--gray400);margin-top:8px">Click photo to change</div>
      </div>
      <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="pmName" class="form-control" value="${u.name || ''}"></div>
      <div class="form-group"><label class="form-label">Email</label><input type="text" class="form-control" value="${u.email || ''}" disabled style="opacity:.6;cursor:not-allowed"></div>
      <div class="form-group"><label class="form-label">Phone</label><input type="tel" id="pmPhone" class="form-control" value="${u.phone || ''}" placeholder="07X XXX XXXX"></div>
      <div class="form-group"><label class="form-label">Address</label><input type="text" id="pmAddress" class="form-control" value="${u.address || ''}" placeholder="Your address"></div>
      <input type="hidden" id="pmAvatarData" value="${u.avatar || ''}">
      <button class="btn btn-primary btn-full btn-lg" id="pmSaveBtn" onclick="UI.saveProfileModal()">Save Changes</button>`;
  },

  previewAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 128, 128);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        document.getElementById('pmAvatarData').value = dataUrl;
        const preview = document.getElementById('pmAvatarPreview');
        if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover">`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  async saveProfileModal() {
    const name    = document.getElementById('pmName')?.value.trim();
    const phone   = document.getElementById('pmPhone')?.value.trim();
    const address = document.getElementById('pmAddress')?.value.trim();
    const avatar  = document.getElementById('pmAvatarData')?.value || '';
    if (!name) { Toast.show('Name is required', 'warning'); return; }
    const btn = document.getElementById('pmSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const res = await api.put('/auth/profile', { name, phone, address, avatar: avatar || null });
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    if (res?.success) {
      const stored = Auth.getUser();
      if (stored) Auth.setUser({ ...stored, name, avatar: avatar || stored.avatar || null });
      const avatarEl = document.getElementById('sidebarAvatarEl');
      if (avatarEl) avatarEl.innerHTML = avatar
        ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : name.charAt(0).toUpperCase();
      const nameEl = document.getElementById('sidebarUserNameEl');
      if (nameEl) nameEl.textContent = name;
      Toast.show('Profile updated!', 'success');
      closeModal('profileModal');
    } else {
      Toast.show(res?.message || 'Failed to update', 'error');
    }
  }
};

/* ── Notification helpers ─────────────────────────────────────────────────── */
async function refreshNotifBadge() {
  const r = await api.get('/notifications/unread-count');
  const d = document.getElementById('notifDot');
  if (d) d.style.display = (r?.data?.count > 0) ? 'block' : 'none';
}

async function loadNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;
  UI.loading(list);
  const r = await api.get('/notifications');
  if (r?.data?.length) {
    list.innerHTML = r.data.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="readNotif('${n.id}', this)">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${UI.ago(n.created_at)}</div>
      </div>`).join('');
  } else {
    UI.empty(list, 'No notifications yet', '🔔');
  }
}

async function readNotif(id, el) {
  el?.classList.remove('unread');
  await api.put(`/notifications/${id}/read`);
}

async function markAllRead() {
  await api.put('/notifications/read-all');
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  const d = document.getElementById('notifDot');
  if (d) d.style.display = 'none';
}

/* ── Modal helpers ────────────────────────────────────────────────────────── */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

/* ── Simple canvas charts ─────────────────────────────────────────────────── */
function drawBar(id, labels, values, color = '#22c55e') {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { t:20, b:36, l:48, r:12 };
  const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b;
  const max = Math.max(...values, 1);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#f9fafb'; ctx.fillRect(0,0,W,H);
  for (let i=0;i<=4;i++) {
    const y = pad.t + (cH/4)*i;
    ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W-pad.r, y); ctx.stroke();
    ctx.fillStyle='#9ca3af'; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='right';
    ctx.fillText(Math.round(max-(max/4)*i), pad.l-6, y+3);
  }
  const bW = Math.min((cW/labels.length)*0.55, 38);
  const gap = cW/labels.length;
  labels.forEach((lbl,i) => {
    const bH = Math.max(2, (values[i]/max)*cH);
    const x  = pad.l + gap*i + (gap-bW)/2;
    const y  = pad.t + cH - bH;
    ctx.fillStyle = color;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x,y,bW,bH,[4,4,0,0]); ctx.fill(); }
    else { ctx.fillRect(x,y,bW,bH); }
    ctx.fillStyle='#6b7280'; ctx.font='9px DM Sans,sans-serif'; ctx.textAlign='center';
    ctx.fillText(lbl, x+bW/2, H-8);
  });
}

function drawDonut(id, data, colors, labels=[]) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const total = data.reduce((s,v)=>s+v,0);
  if (!total) return;
  let start = -Math.PI/2;
  const cx=canvas.width/2, cy=canvas.height/2, r=Math.min(cx,cy)-6, inner=r*0.58;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  data.forEach((val,i) => {
    const angle = (val/total)*2*Math.PI;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,start,start+angle);
    ctx.closePath(); ctx.fillStyle=colors[i%colors.length]; ctx.fill();
    start += angle;
  });
  ctx.beginPath(); ctx.arc(cx,cy,inner,0,2*Math.PI);
  ctx.fillStyle='#fff'; ctx.fill();
  ctx.fillStyle='#374151'; ctx.font=`bold 14px DM Sans,sans-serif`; ctx.textAlign='center';
  ctx.fillText(total, cx, cy+5);
}

function drawMiniBar(id, values, color='#86efac') {
  const el = document.getElementById(id);
  if (!el) return;
  const max = Math.max(...values, 1);
  el.innerHTML = values.map(v =>
    `<div class="mini-bar" style="height:${Math.max(6,(v/max)*100)}%;background:${color}"></div>`
  ).join('');
}

/* ── Debounce ─────────────────────────────────────────────────────────────── */
let debTimer;
function debounce(fn, ms=400) { clearTimeout(debTimer); debTimer=setTimeout(fn,ms); }
function debounceSearch(v)    { debounce(()=>{ if(typeof onSearch==='function') onSearch(v); },350); }