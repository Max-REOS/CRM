// REOS JARVIS — Main Application Router

let currentView = 'globe';

// ═══ SPLASH ═══
window.addEventListener('DOMContentLoaded', async () => {
  const progress = document.getElementById('splash-progress');
  let p = 0;
  const tick = setInterval(() => {
    p += Math.random() * 15;
    if (p >= 95) { clearInterval(tick); p = 95; }
    progress.style.width = p + '%';
  }, 100);

  // Load modules
  await loadScripts([
    'js/memory.js',
    'js/chat.js',
    'js/globe.js',
    'js/list.js',
    'js/tasks.js',
    'js/voice.js'
  ]);

  progress.style.width = '100%';
  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    document.getElementById('splash').style.transition = 'opacity 0.4s';
    setTimeout(() => document.getElementById('splash').remove(), 400);
    initApp();
  }, 400);
});

function loadScripts(srcs) {
  return Promise.all(srcs.map(src => new Promise(resolve => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = resolve;
    document.head.appendChild(s);
  })));
}

async function initApp() {
  // Window controls
  document.getElementById('btn-min').addEventListener('click', () => window.jarvis.windowMinimize());
  document.getElementById('btn-max').addEventListener('click', () => window.jarvis.windowMaximize());
  document.getElementById('btn-close').addEventListener('click', () => window.jarvis.windowClose());

  // View tabs
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // IPC navigation
  window.jarvis.onNavigate((view) => switchView(view));

  // Init views
  if (typeof initGlobe === 'function') initGlobe();
  if (typeof initList === 'function') initList();
  if (typeof initChat === 'function') initChat();
  if (typeof initTasks === 'function') initTasks();
  if (typeof initSettings === 'function') initSettings();
  if (typeof initCalendar === 'function') initCalendar();

  // Default view
  switchView('globe');

  // Check first-run
  const apiKey = await window.jarvis.getStore('anthropic-api-key');
  if (!apiKey) {
    setTimeout(() => {
      switchView('settings');
      showToast('Willkommen bei JARVIS. Bitte API-Key hinterlegen.', 'info', 6000);
    }, 800);
  }
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
  });
  document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));

  const viewEl = document.getElementById(`view-${view}`);
  const tabEl = document.getElementById(`tab-${view === 'calendar' ? 'cal' : view}`);

  if (viewEl) {
    viewEl.style.display = 'flex';
    requestAnimationFrame(() => viewEl.classList.add('active'));
  }
  if (tabEl) tabEl.classList.add('active');
}

function handleKeyboard(e) {
  if (e.ctrlKey && e.key === 'n') { e.preventDefault(); switchView('chat'); if (typeof newChat === 'function') newChat(); }
  if (e.ctrlKey && e.key === 't') { e.preventDefault(); switchView('tasks'); document.getElementById('btn-new-task')?.click(); }
  if (e.ctrlKey && e.key === 'g') { e.preventDefault(); switchView('globe'); }
  if (e.ctrlKey && e.key === 'l') { e.preventDefault(); switchView('list'); }
  if (e.key === 'Escape') {
    document.getElementById('kb-modal').style.display = 'none';
    document.getElementById('task-modal').style.display = 'none';
  }
}

// ═══ TOAST ═══
function showToast(msg, type = 'info', duration = 3500) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

window.showToast = showToast;
window.switchView = switchView;

// ═══ SETTINGS INIT ═══
async function initSettings() {
  const container = document.getElementById('settings-view');
  const apiKey = await window.jarvis.getStore('anthropic-api-key') || '';
  const autostart = await window.jarvis.getStore('autostart') || false;
  const usage = await window.jarvis.readData('api-usage.log').catch(() => []);

  const todayUsage = usage.filter(u => u.date === new Date().toISOString().slice(0,10));
  const totalInput = todayUsage.reduce((s, u) => s + (u.input || 0), 0);
  const totalOutput = todayUsage.reduce((s, u) => s + (u.output || 0), 0);
  const estCost = ((totalInput * 3 + totalOutput * 15) / 1e6).toFixed(4);

  container.innerHTML = `
    <div style="max-width:700px;margin:0 auto">
      <div class="section-title" style="margin-bottom:24px">EINSTELLUNGEN</div>

      <div class="settings-section">
        <div class="settings-section-title">ANTHROPIC API</div>
        <div class="setting-row">
          <div class="setting-label">API KEY</div>
          <input type="password" class="setting-input" id="s-apikey" value="${apiKey}" placeholder="sk-ant-...">
        </div>
        <div class="setting-row">
          <div class="setting-label">MODELL</div>
          <select class="setting-input" id="s-model">
            <option value="claude-sonnet-4-5-20250929" ${(!await window.jarvis.getStore('model') || await window.jarvis.getStore('model') === 'claude-sonnet-4-5-20250929') ? 'selected' : ''}>Sonnet (Standard)</option>
            <option value="claude-haiku-4-5-20251001" ${await window.jarvis.getStore('model') === 'claude-haiku-4-5-20251001' ? 'selected' : ''}>Haiku (Schnell)</option>
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-label"></div>
          <button class="btn-primary" id="s-save-api">SPEICHERN</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">TOKEN-VERBRAUCH HEUTE</div>
        <div class="usage-stats">
          INPUT TOKENS: ${totalInput.toLocaleString()}<br>
          OUTPUT TOKENS: ${totalOutput.toLocaleString()}<br>
          GESCHÄTZTE KOSTEN: $${estCost}<br>
          <span style="color:var(--text-dim);font-size:10px">* Prompt-Caching reduziert Input-Kosten um ~90%</span>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">SYSTEM</div>
        <div class="setting-row">
          <div class="setting-label">MIT WINDOWS STARTEN</div>
          <div class="toggle ${autostart ? 'on' : ''}" id="s-autostart"></div>
        </div>
        <div class="setting-row">
          <div class="setting-label">BENACHRICHTIGUNGEN</div>
          <div class="toggle on" id="s-notif"></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">GOOGLE CALENDAR</div>
        <div class="setting-row">
          <div class="setting-label">STATUS</div>
          <span id="gcal-status" style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim)">NICHT VERBUNDEN</span>
        </div>
        <div class="setting-row">
          <div class="setting-label"></div>
          <button class="btn-primary" id="s-google-auth">GOOGLE AUTHENTIFIZIEREN</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('s-save-api')?.addEventListener('click', async () => {
    const key = document.getElementById('s-apikey').value.trim();
    const model = document.getElementById('s-model').value;
    await window.jarvis.setStore('anthropic-api-key', key);
    await window.jarvis.setStore('model', model);
    showToast('Einstellungen gespeichert.', 'success');
  });

  document.getElementById('s-autostart')?.addEventListener('click', async function() {
    this.classList.toggle('on');
    const on = this.classList.contains('on');
    await window.jarvis.setStore('autostart', on);
    await window.jarvis.setAutostart(on);
  });

  document.getElementById('s-google-auth')?.addEventListener('click', () => {
    if (typeof startGoogleAuth === 'function') startGoogleAuth();
    else showToast('Google-Auth wird geladen...', 'info');
  });

  // Reload after save
  document.getElementById('s-save-api')?.addEventListener('click', () => {
    setTimeout(() => initSettings(), 300);
  });
}

window.initSettings = initSettings;

// ═══ CALENDAR INIT ═══
async function initCalendar() {
  const container = document.getElementById('calendar-events');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--text-dim);font-family:var(--font-mono);font-size:11px;letter-spacing:2px">GOOGLE CALENDAR VERBINDEN UM TERMINE ANZUZEIGEN</div>';

  document.getElementById('btn-google-auth')?.addEventListener('click', () => {
    if (typeof startGoogleAuth === 'function') startGoogleAuth();
    else showToast('Google OAuth nicht initialisiert. API-Key prüfen.', 'error');
  });
}

window.initCalendar = initCalendar;
