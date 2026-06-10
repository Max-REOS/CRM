// REOS JARVIS — Task System (tasks.js)

let tasks = [];
let taskFilter = 'all';
let editingTaskId = null;

async function initTasks() {
  tasks = await window.jarvis.readData('tasks.json') || [];
  renderTasks();
  updateTrayTaskCount();

  document.getElementById('btn-new-task')?.addEventListener('click', openNewTaskModal);
  document.getElementById('task-save')?.addEventListener('click', saveTask);
  document.getElementById('task-cancel')?.addEventListener('click', closeTaskModal);
  document.getElementById('task-modal-close')?.addEventListener('click', closeTaskModal);
  document.getElementById('task-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('task-modal')) closeTaskModal();
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      taskFilter = chip.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderTasks();
    });
  });
}

function renderTasks() {
  const grid = document.getElementById('tasks-grid');
  if (!grid) return;

  let filtered = [...tasks];
  const now = new Date();

  // Mark overdue
  filtered = filtered.map(t => {
    if (t.status === 'open' && t.deadline && new Date(t.deadline) < now) {
      t.status = 'overdue';
    }
    return t;
  });

  if (taskFilter === 'open') filtered = filtered.filter(t => t.status === 'open');
  else if (taskFilter === 'overdue') filtered = filtered.filter(t => t.status === 'overdue');
  else if (taskFilter === 'done') filtered = filtered.filter(t => t.status === 'done');
  else if (taskFilter === 'critical') filtered = filtered.filter(t => t.priority === 'critical' && t.status !== 'done');

  // Sort: overdue + critical first, then by deadline
  filtered.sort((a, b) => {
    const pa = { critical: 0, high: 1, medium: 2, low: 3 }[a.priority] ?? 2;
    const pb = { critical: 0, high: 1, medium: 2, low: 3 }[b.priority] ?? 2;
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (b.status === 'overdue' && a.status !== 'overdue') return 1;
    if (pa !== pb) return pa - pb;
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
    return 0;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-dim);font-family:var(--font-mono);font-size:11px;letter-spacing:2px;padding:20px 0">KEINE AUFGABEN IN DIESER KATEGORIE</div>';
    return;
  }

  grid.innerHTML = filtered.map(task => {
    const isOverdue = task.status === 'overdue';
    const isDone = task.status === 'done';
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const hoursLeft = deadline ? (deadline - now) / 36e5 : Infinity;
    const deadlineClass = isOverdue ? 'overdue' : hoursLeft < 24 ? 'soon' : '';
    const deadlineStr = deadline
      ? (isOverdue ? `ÜBERFÄLLIG seit ${deadline.toLocaleDateString('de-DE')}` : deadline.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
      : 'Kein Deadline';

    return `
      <div class="task-card priority-${task.priority} ${isDone ? 'done' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${task.id}">
        <div class="task-check" onclick="toggleTaskDone('${task.id}')">${isDone ? '✓' : ''}</div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <span class="task-cat">${task.category || 'REOS'}</span>
            <span class="task-deadline ${deadlineClass}">${deadlineStr}</span>
          </div>
        </div>
        <div class="priority-badge ${task.priority}">${task.priority.toUpperCase()}</div>
        <button class="kb-btn-small" onclick="editTask('${task.id}')" style="margin-left:4px">✏</button>
        <button class="kb-btn-small delete" onclick="deleteTask('${task.id}')" style="margin-left:4px">✕</button>
      </div>
    `;
  }).join('');
}

function openNewTaskModal() {
  editingTaskId = null;
  document.getElementById('task-modal-title').textContent = 'NEUE AUFGABE';
  document.getElementById('task-title-input').value = '';
  document.getElementById('task-cat-input').value = 'REOS';
  document.getElementById('task-priority-input').value = 'medium';
  document.getElementById('task-deadline-input').value = '';
  document.getElementById('task-desc-input').value = '';
  document.getElementById('task-modal').style.display = 'flex';
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingTaskId = id;
  document.getElementById('task-modal-title').textContent = 'AUFGABE BEARBEITEN';
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-cat-input').value = task.category || 'REOS';
  document.getElementById('task-priority-input').value = task.priority || 'medium';
  document.getElementById('task-deadline-input').value = task.deadline ? task.deadline.slice(0, 16) : '';
  document.getElementById('task-desc-input').value = task.description || '';
  document.getElementById('task-modal').style.display = 'flex';
}

function closeTaskModal() {
  document.getElementById('task-modal').style.display = 'none';
  editingTaskId = null;
}

async function saveTask() {
  const title = document.getElementById('task-title-input').value.trim();
  if (!title) { showToast('Titel fehlt.', 'error'); return; }

  const task = {
    id: editingTaskId || `task_${Date.now()}`,
    title,
    description: document.getElementById('task-desc-input').value.trim(),
    category: document.getElementById('task-cat-input').value,
    priority: document.getElementById('task-priority-input').value,
    deadline: document.getElementById('task-deadline-input').value ? new Date(document.getElementById('task-deadline-input').value).toISOString() : null,
    status: editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.status || 'open') : 'open',
    source: 'manual',
    created_at: editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.created_at || new Date().toISOString()) : new Date().toISOString(),
    completed_at: null,
    reminders_sent: 0
  };

  if (editingTaskId) {
    const idx = tasks.findIndex(t => t.id === editingTaskId);
    if (idx >= 0) tasks[idx] = task;
  } else {
    tasks.push(task);
  }

  await window.jarvis.writeData('tasks.json', tasks);
  closeTaskModal();
  renderTasks();
  updateTrayTaskCount();
  showToast(editingTaskId ? 'Aufgabe aktualisiert.' : 'Aufgabe erstellt.', 'success');
}

async function toggleTaskDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (task.status === 'done') {
    task.status = 'open';
    task.completed_at = null;
  } else {
    task.status = 'done';
    task.completed_at = new Date().toISOString();
  }
  await window.jarvis.writeData('tasks.json', tasks);
  renderTasks();
  updateTrayTaskCount();
}

async function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  await window.jarvis.writeData('tasks.json', tasks);
  renderTasks();
  updateTrayTaskCount();
  showToast('Aufgabe gelöscht.');
}

function updateTrayTaskCount() {
  const open = tasks.filter(t => t.status === 'open' || t.status === 'overdue').length;
  window.jarvis.updateTray(open).catch(() => {});
}

window.initTasks = initTasks;
window.toggleTaskDone = toggleTaskDone;
window.editTask = editTask;
window.deleteTask = deleteTask;
