// REOS JARVIS — Scheduler & Accountability System
const cron = require('node-cron');
const { app, Notification, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(app.getPath('userData'), 'data');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); }
  catch { return file.endsWith('.log') ? [] : {}; }
}

function writeJSON(file, data) {
  try { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2)); }
  catch {}
}

function isQuietHour() {
  const h = new Date().getHours();
  return h >= 22 || h < 9;
}

function isSunday() {
  return new Date().getDay() === 0;
}

function isNotifPaused() {
  const settings = readJSON('settings.json');
  return settings.notifPauseUntil && Date.now() < settings.notifPauseUntil;
}

function canNotify() {
  return !isQuietHour() && !isSunday() && !isNotifPaused();
}

function sendNotification(title, body, actions) {
  if (!canNotify()) return;
  try {
    const n = new Notification({ title, body, silent: false });
    n.show();
    return n;
  } catch {}
}

function logAccountability(status) {
  const log = readJSON('accountability.log');
  const entry = { date: new Date().toISOString().slice(0, 10), time: new Date().toISOString(), status };
  log.push(entry);
  writeJSON('accountability.log', log);
  notifyMainWindow('accountability-update', entry);
}

function notifyMainWindow(channel, data) {
  try {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send(channel, data);
  } catch {}
}

// ── ACCOUNTABILITY CHECKS (Mon–Sat, 11:00 and 15:30) ──
let escalationTimers = {};

function sendAccountabilityCheck(label) {
  if (isSunday() || isQuietHour() || isNotifPaused()) return;

  const n = sendNotification(
    'JARVIS — Accountability Check',
    'Arbeitest du gerade oder scrollst du und verschwendest deine Zeit?'
  );

  // Escalation: 10 min → 2nd push; 20 min → auto-log VERSAGEN
  const t1 = setTimeout(() => {
    sendNotification('JARVIS — LETZTE CHANCE', 'Letzte Chance. Antworte oder es zählt als VERSAGEN.');
  }, 10 * 60 * 1000);

  const t2 = setTimeout(() => {
    logAccountability('VERSAGEN');
    sendNotification('JARVIS', 'Keine Antwort. Als VERSAGEN gewertet. Fang jetzt an.');
  }, 20 * 60 * 1000);

  escalationTimers[label] = [t1, t2];
}

function clearEscalation(label) {
  if (escalationTimers[label]) {
    escalationTimers[label].forEach(clearTimeout);
    delete escalationTimers[label];
  }
}

// IPC handlers for ARBEITEN/VERSAGEN responses
const { ipcMain } = require('electron');
ipcMain.handle('accountability-response', (e, status, label) => {
  clearEscalation(label || 'current');
  logAccountability(status);
  return true;
});

// Mon-Sat only
cron.schedule('0 11 * * 1-6', () => sendAccountabilityCheck('morning'));
cron.schedule('30 15 * * 1-6', () => sendAccountabilityCheck('afternoon'));

// ── WEEKLY REVIEW (Saturday 22:00) ──
cron.schedule('0 22 * * 6', () => {
  if (isNotifPaused()) return;
  const log = readJSON('accountability.log');
  const tasks = readJSON('tasks.json');
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 36e5);
  const weekLog = log.filter(l => new Date(l.time) > weekAgo);
  const working = weekLog.filter(l => l.status === 'ARBEITEN').length;
  const failing = weekLog.filter(l => l.status === 'VERSAGEN').length;
  const done = tasks.filter(t => t.status === 'done' && t.completed_at && new Date(t.completed_at) > weekAgo).length;
  const overdue = tasks.filter(t => t.status === 'overdue').length;

  sendNotification(
    'JARVIS — Wochenrückblick',
    `Diese Woche: ${working}x ARBEITEN, ${failing}x VERSAGEN. ${done} Tasks erledigt, ${overdue} überfällig.`
  );
});

// ── TASK DEADLINE NOTIFICATIONS ──
cron.schedule('0 9 * * *', () => {
  if (isSunday() || isNotifPaused()) return;
  const tasks = readJSON('tasks.json');
  const now = new Date();

  for (const task of tasks) {
    if (task.status === 'done' || task.status === 'cancelled') continue;
    if (!task.deadline) continue;
    const dl = new Date(task.deadline);
    const hoursLeft = (dl - now) / 36e5;

    if (hoursLeft >= 22 && hoursLeft <= 26) {
      sendNotification('Reminder', `"${task.title}" ist morgen fällig.`);
    } else if (hoursLeft >= -2 && hoursLeft <= 2) {
      sendNotification('DEADLINE', `"${task.title}" ist heute fällig.`);
    } else if (hoursLeft < -20 && hoursLeft >= -28) {
      sendNotification('Überfällig', `"${task.title}" war gestern fällig. Status?`);
      task.reminders_sent = (task.reminders_sent || 0) + 1;
    } else if (hoursLeft < -44 && hoursLeft >= -52) {
      sendNotification('Überfällig +2', `"${task.title}" ist seit 2 Tagen offen.`);
      task.reminders_sent = (task.reminders_sent || 0) + 1;
    } else if (hoursLeft < -68) {
      sendNotification('KRITISCH ÜBERFÄLLIG', `"${task.title}" ist seit 3+ Tagen offen. Was blockiert dich?`);
      task.status = 'overdue';
      notifyMainWindow('task-overdue-escalation', task);
    }
  }
  writeJSON('tasks.json', tasks);
});
