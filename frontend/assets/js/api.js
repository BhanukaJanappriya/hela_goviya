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
          <div class="user-card">
            <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <div><div class="user-name">${user.name}</div><div class="user-role" style="color:${rc[role]}">${role}</div></div>
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