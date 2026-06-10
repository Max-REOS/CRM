// REOS JARVIS PWA

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'accountability') handleAccountabilityResponse(e.data.status);
  });
}

// ── STATE ──
let tasks = JSON.parse(localStorage.getItem('jarvis-tasks') || '[]');
let accLog = JSON.parse(localStorage.getItem('jarvis-acc') || '[]');
let currentView = 'tasks';

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderDate();
  setupTabs();
  renderTasks();
  renderAccStats();
  setupAccountabilityButtons();
  setupQuickAdd();

  // Sync from Drive if available (stub — full sync via desktop app)
  syncFromDrive();
});

function updateHeaderDate() {
  const el = document.getElementById('header-date');
  if (!el) return;
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const now = new Date();
  el.textContent = `${days[now.getDay()]} ${now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentView = tab.dataset.view;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.style.display = 'none'; });
      tab.classList.add('active');
      const view = document.getElementById(`view-${currentView}`);
      if (view) { view.classList.add('active'); view.style.display = 'block'; }
    });
  });
}

// ── TASKS ──
function renderTasks() {
  const list = document.getElementById('task-list');
  const countEl = document.getElementById('task-count');
  if (!list) return;

  const now = new Date();
  const open = tasks.filter(t => t.status !== 'done');
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
    return 0;
  });

  if (countEl) countEl.textContent = `${open.length} offene Aufgabe${open.length !== 1 ? 'n' : ''}`;

  list.innerHTML = sorted.map((task, i) => {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const isOverdue = deadline && deadline < now && task.status !== 'done';
    const deadlineStr = deadline ? deadline.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';

    return `
      <div class="task-item ${task.status === 'done' ? 'done' : ''} ${isOverdue ? 'overdue' : ''}">
        <div class="task-check-box" onclick="toggleTask(${i})">${task.status === 'done' ? '✓' : ''}</div>
        <div class="task-info">
          <div class="task-title">${task.title}</div>
          ${deadlineStr ? `<div class="task-deadline-str ${isOverdue ? 'overdue' : ''}">Deadline: ${deadlineStr}${isOverdue ? ' — ÜBERFÄLLIG' : ''}</div>` : ''}
        </div>
      </div>
    `;
  }).join('') || '<div class="empty-msg">KEINE AUFGABEN</div>';
}

function toggleTask(index) {
  if (!tasks[index]) return;
  tasks[index].status = tasks[index].status === 'done' ? 'open' : 'done';
  tasks[index].completed_at = tasks[index].status === 'done' ? new Date().toISOString() : null;
  saveTasks();
  renderTasks();
}

function saveTasks() {
  localStorage.setItem('jarvis-tasks', JSON.stringify(tasks));
}

function setupQuickAdd() {
  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    document.getElementById('quick-add').style.display = 'flex';
    document.getElementById('quick-task-input').focus();
  });

  document.getElementById('quick-save')?.addEventListener('click', () => {
    const title = document.getElementById('quick-task-input').value.trim();
    if (!title) return;
    tasks.push({
      id: `pwa_${Date.now()}`,
      title,
      status: 'open',
      priority: 'medium',
      source: 'pwa',
      created_at: new Date().toISOString()
    });
    saveTasks();
    renderTasks();
    document.getElementById('quick-task-input').value = '';
    document.getElementById('quick-add').style.display = 'none';
  });

  document.getElementById('quick-cancel')?.addEventListener('click', () => {
    document.getElementById('quick-add').style.display = 'none';
  });
}

// ── ACCOUNTABILITY ──
function setupAccountabilityButtons() {
  document.getElementById('btn-arbeiten')?.addEventListener('click', () => handleAccountabilityResponse('ARBEITEN'));
  document.getElementById('btn-versagen')?.addEventListener('click', () => handleAccountabilityResponse('VERSAGEN'));
}

function handleAccountabilityResponse(status) {
  accLog.push({ status, timestamp: new Date().toISOString() });
  localStorage.setItem('jarvis-acc', JSON.stringify(accLog));
  renderAccStats();

  const feedback = status === 'ARBEITEN'
    ? 'Gut. Weiter so.'
    : 'Leg das Handy weg. Öffne deine wichtigste Aufgabe. Jetzt.';

  const el = document.querySelector('.acc-question');
  if (el) {
    el.textContent = feedback;
    setTimeout(() => { el.textContent = 'Arbeitest du gerade?'; }, 4000);
  }
}

function renderAccStats() {
  const el = document.getElementById('acc-stats');
  if (!el) return;
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);
  const weekLog = accLog.filter(l => new Date(l.timestamp) > weekAgo);
  const working = weekLog.filter(l => l.status === 'ARBEITEN').length;
  const failing = weekLog.filter(l => l.status === 'VERSAGEN').length;
  el.textContent = `Diese Woche: ${working}x ARBEITEN · ${failing}x VERSAGEN`;
}

// ── DRIVE SYNC (stub) ──
async function syncFromDrive() {
  // Sync would pull tasks.json from Google Drive App Folder
  // Full implementation requires Drive API token from desktop
  // For now: load from localStorage + show sync timestamp
  const lastSync = localStorage.getItem('jarvis-last-sync');
  if (lastSync) {
    const el = document.querySelector('.header-date');
    if (el) el.title = `Letzter Sync: ${new Date(lastSync).toLocaleTimeString('de-DE')}`;
  }
}
