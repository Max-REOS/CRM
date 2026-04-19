'use strict';

const API = 'http://localhost:3001/api';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentTab: 'news',
  news: [],
  ideas: [],
  tracker: [],
  trackerFilter: '',
  selectedWeek: getCurrentWeekNumber(),
  planWeek: getCurrentWeekNumber(),
  activeBriefIdeaId: null,
  activeBriefData: null,
  activeCaptionData: null,
  editingTrackerId: null,
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function getCurrentWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek) + start.getDay() / 7);
  return weekNum;
}

function getWeekDates(weekNumber, year = new Date().getFullYear()) {
  const jan1 = new Date(year, 0, 1);
  const daysToMonday = (weekNumber - 1) * 7 - jan1.getDay() + 1;
  const monday = new Date(jan1);
  monday.setDate(jan1.getDate() + daysToMonday + (jan1.getDay() <= 4 ? 0 : 7));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d) {
  if (!d) return '–';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatShortDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pillarBadge(pillar) {
  const map = { Credibility: 'blue', Conversion: 'orange', Reach: 'green' };
  const cls = map[pillar] || 'gray';
  return `<span class="badge badge-${cls}">${escHtml(pillar)}</span>`;
}

function formatBadge(format) {
  return `<span class="badge badge-gray">${escHtml(format || '')}</span>`;
}

function statusLabel(s) {
  const map = { draft: 'Entwurf', scheduled: 'Geplant', published: 'Veröffentlicht', archived: 'Archiviert' };
  return map[s] || s;
}

async function apiCall(endpoint, options = {}) {
  try {
    const res = await fetch(API + endpoint, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    throw err;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function showLoading(msg = 'Wird generiert…') {
  document.getElementById('loading-message').textContent = msg;
  document.getElementById('loading-overlay').style.display = 'flex';
}
function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function showModal(html, title = '') {
  const box = document.getElementById('modal-content');
  box.innerHTML = (title ? `<h2 class="modal-title">${escHtml(title)}</h2>` : '') + html;
  document.getElementById('modal-overlay').style.display = 'flex';
}
function hideModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tab}`);
  });
  if (tab === 'news') loadNews();
  if (tab === 'ideas') loadIdeas(state.selectedWeek);
  if (tab === 'plan') loadWeekPlan(state.planWeek);
  if (tab === 'tracker') loadTracker();
  if (tab === 'settings') checkApiStatus();
}

// ─── Week Selector Helper ─────────────────────────────────────────────────────
function populateWeekSelects() {
  const kw = state.selectedWeek;
  const year = new Date().getFullYear();
  const options = Array.from({ length: 20 }, (_, i) => {
    const w = Math.max(1, kw - 2 + i);
    const sel = w === kw ? ' selected' : '';
    return `<option value="${w}"${sel}>KW ${w} – ${year}</option>`;
  }).join('');
  ['news-week-select', 'ideas-week-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = options;
  });
  document.getElementById('header-kw').textContent = `KW ${kw}`;
}

// ─── NEWS TAB ─────────────────────────────────────────────────────────────────
async function loadNews() {
  try {
    const data = await apiCall('/news');
    state.news = data.news || data.data || [];
    renderNewsList();
  } catch (err) {
    showToast('News konnten nicht geladen werden: ' + err.message, 'error');
  }
}

async function fetchNews() {
  const weekNumber = parseInt(document.getElementById('news-week-select').value) || state.selectedWeek;
  showLoading('Perplexity sucht aktuelle Immobilienmarkt-News…');
  try {
    const data = await apiCall('/news/fetch', { method: 'POST', body: { weekNumber } });
    state.news = data.news || data.data || [];
    renderNewsList();
    showToast(`${state.news.length} News-Artikel gefunden`, 'success');
  } catch (err) {
    showToast('Fehler beim Abrufen: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function deleteNews(id) {
  try {
    await apiCall(`/news/${id}`, { method: 'DELETE' });
    state.news = state.news.filter(n => n.id !== id);
    renderNewsList();
    showToast('News gelöscht', 'info');
  } catch (err) {
    showToast('Fehler beim Löschen: ' + err.message, 'error');
  }
}

function renderNewsList() {
  const list = document.getElementById('news-list');
  const empty = document.getElementById('news-empty');
  if (!state.news.length) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = state.news.map(item => renderNewsCard(item)).join('');
}

function renderNewsCard(item) {
  let angles = [];
  try { angles = typeof item.content_angles === 'string' ? JSON.parse(item.content_angles) : (item.content_angles || []); } catch {}
  const anglesHtml = angles.map(a => `
    <div class="news-angle">
      ${pillarBadge(a.pillar)}
      <span class="news-angle-text">${escHtml(a.angle)} <span class="badge badge-gray" style="font-size:0.68rem">${escHtml(a.format)}</span></span>
    </div>`).join('');
  return `
    <div class="card news-card">
      <div>
        <span class="news-card-source">${escHtml(item.source)}</span>
        <span class="news-card-date">${escHtml(item.date)}</span>
      </div>
      <div class="news-card-headline">${escHtml(item.headline)}</div>
      ${item.key_data ? `<div class="news-card-keydata">${escHtml(item.key_data)}</div>` : ''}
      ${anglesHtml ? `<div class="news-card-angles">${anglesHtml}</div>` : ''}
      <div class="news-card-actions">
        <button class="news-card-delete" onclick="deleteNews(${item.id})">Löschen</button>
      </div>
    </div>`;
}

// ─── IDEAS TAB ────────────────────────────────────────────────────────────────
async function loadIdeas(weekNumber) {
  try {
    const data = await apiCall(`/content/weekly-plan/${weekNumber}`);
    state.ideas = data.ideas || data.data || [];
    renderIdeasGrid();
    populateBriefPostSelect();
  } catch (err) {
    state.ideas = [];
    renderIdeasGrid();
  }
}

function showNewsPicker() {
  if (!state.news.length) {
    showToast('Bitte zuerst News laden (Tab "News")', 'info');
    return;
  }
  const box = document.getElementById('ideas-news-selector');
  const checkboxes = document.getElementById('ideas-news-checkboxes');
  checkboxes.innerHTML = state.news.map(n => `
    <label class="news-checkbox-item">
      <input type="checkbox" value="${n.id}" checked />
      <span class="news-checkbox-label">
        <strong>${escHtml(n.headline)}</strong>
        <span>${escHtml(n.source)} · ${escHtml(n.date)}</span>
      </span>
    </label>`).join('');
  box.style.display = 'block';
}

function hideNewsPicker() {
  document.getElementById('ideas-news-selector').style.display = 'none';
}

async function confirmGeneratePlan() {
  const weekNumber = parseInt(document.getElementById('ideas-week-select').value) || state.selectedWeek;
  const checked = document.querySelectorAll('#ideas-news-checkboxes input[type="checkbox"]:checked');
  const newsIds = Array.from(checked).map(cb => parseInt(cb.value));
  if (!newsIds.length) { showToast('Bitte mindestens eine News auswählen', 'info'); return; }
  hideNewsPicker();
  showLoading('Claude erstellt den Wochenplan…');
  try {
    const data = await apiCall('/content/weekly-plan', { method: 'POST', body: { newsIds, weekNumber } });
    state.ideas = data.ideas || data.data || [];
    state.selectedWeek = weekNumber;
    populateWeekSelects();
    renderIdeasGrid();
    populateBriefPostSelect();
    showToast(`${state.ideas.length} Posts für KW ${weekNumber} generiert`, 'success');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function deleteIdea(id) {
  try {
    await apiCall(`/content/ideas/${id}`, { method: 'DELETE' });
    state.ideas = state.ideas.filter(i => i.id !== id);
    renderIdeasGrid();
    populateBriefPostSelect();
    showToast('Idee gelöscht', 'info');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  }
}

function renderIdeasGrid() {
  const grid = document.getElementById('ideas-grid');
  const empty = document.getElementById('ideas-empty');
  if (!state.ideas.length) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = state.ideas.map(idea => renderIdeaCard(idea)).join('');
}

function renderIdeaCard(idea) {
  return `
    <div class="card idea-card" onclick="openBriefForIdea(${idea.id})">
      <div class="idea-card-day">${escHtml(idea.day)}</div>
      <div class="idea-card-title">${escHtml(idea.title)}</div>
      ${idea.hook ? `<div class="idea-card-hook">"${escHtml(idea.hook)}"</div>` : ''}
      <div class="idea-card-meta">
        ${pillarBadge(idea.pillar)}
        ${formatBadge(idea.format)}
        ${idea.slide_count ? `<span class="badge badge-gray">${idea.slide_count} Slides</span>` : ''}
      </div>
      <div class="idea-card-footer">
        <span class="idea-card-news" title="${escHtml(idea.news_basis)}">${escHtml(idea.news_basis || '')}</span>
        <div class="idea-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-xs" onclick="openBriefForIdea(${idea.id})">Brief</button>
          <button class="btn btn-danger btn-xs" onclick="deleteIdea(${idea.id})">✕</button>
        </div>
      </div>
    </div>`;
}

// ─── DESIGN BRIEF TAB ────────────────────────────────────────────────────────
function populateBriefPostSelect() {
  const sel = document.getElementById('brief-post-select');
  const current = sel.value;
  sel.innerHTML = '<option value="">– Post auswählen –</option>' +
    state.ideas.map(i => `<option value="${i.id}">${escHtml(i.day)}: ${escHtml(i.title)}</option>`).join('');
  if (current) sel.value = current;
  updateBriefButtons();
}

function updateBriefButtons() {
  const sel = document.getElementById('brief-post-select');
  const hasSelection = !!sel.value;
  document.getElementById('btn-generate-brief').disabled = !hasSelection;
  document.getElementById('btn-generate-caption').disabled = !hasSelection;
  document.getElementById('btn-generate-images').disabled = !state.activeBriefData;
  document.getElementById('btn-copy-brief').disabled = !state.activeBriefData;
}

async function openBriefForIdea(ideaId) {
  switchTab('brief');
  document.getElementById('brief-post-select').value = ideaId;
  updateBriefButtons();
  await loadBrief(ideaId);
}

async function loadBrief(ideaId) {
  state.activeBriefIdeaId = ideaId;
  try {
    const [briefData, imgData] = await Promise.all([
      apiCall(`/content/design-brief/${ideaId}`).catch(() => null),
      apiCall(`/images/${ideaId}`).catch(() => ({ images: [] }))
    ]);
    const brief = briefData?.brief || briefData?.data;
    const images = imgData?.images || [];
    if (brief && brief.slides) {
      state.activeBriefData = brief;
      renderBriefSlides(brief.slides, images);
      updateBriefButtons();
    } else {
      clearBriefView();
    }
  } catch {
    clearBriefView();
  }
}

async function generateBrief() {
  const ideaId = document.getElementById('brief-post-select').value;
  if (!ideaId) return;
  showLoading('Claude erstellt den Design-Brief…');
  try {
    const data = await apiCall(`/content/design-brief/${ideaId}`, { method: 'POST' });
    const brief = data.brief || data.data;
    state.activeBriefData = brief;
    state.activeBriefIdeaId = ideaId;
    renderBriefSlides(brief.slides || [], []);
    updateBriefButtons();
    showToast('Design-Brief erstellt', 'success');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function generateImages() {
  const ideaId = state.activeBriefIdeaId;
  if (!ideaId) return;
  showLoading('Bilder werden generiert (dauert ~30 Sek.)…');
  try {
    const data = await apiCall(`/images/generate-all/${ideaId}`, { method: 'POST' });
    const images = data.images || [];
    const generated = images.filter(i => i.imageUrl).length;
    if (state.activeBriefData) renderBriefSlides(state.activeBriefData.slides || [], images);
    showToast(`${generated} Bilder generiert`, 'success');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function generateCaption() {
  const ideaId = document.getElementById('brief-post-select').value;
  if (!ideaId) return;
  showLoading('Caption wird erstellt…');
  try {
    const data = await apiCall(`/content/caption/${ideaId}`, { method: 'POST' });
    const cap = data.caption || data.data;
    state.activeCaptionData = cap;
    const box = document.getElementById('brief-caption-box');
    const text = document.getElementById('brief-caption-text');
    let html = '';
    if (cap.caption_text) html += escHtml(cap.caption_text).replace(/\n/g, '<br>');
    if (cap.hashtags) html += `<br><br><strong style="color:var(--gold)">${escHtml(cap.hashtags)}</strong>`;
    text.innerHTML = html;
    box.style.display = 'block';
    showToast('Caption erstellt', 'success');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

function copyCaption() {
  const text = document.getElementById('brief-caption-text').innerText;
  navigator.clipboard.writeText(text).then(() => showToast('Caption kopiert', 'success')).catch(() => showToast('Kopieren fehlgeschlagen', 'error'));
}

function clearBriefView() {
  state.activeBriefData = null;
  document.getElementById('brief-slides').innerHTML = '';
  document.getElementById('brief-empty').style.display = 'flex';
  document.getElementById('brief-caption-box').style.display = 'none';
  updateBriefButtons();
}

function renderBriefSlides(slides, images = []) {
  const container = document.getElementById('brief-slides');
  const empty = document.getElementById('brief-empty');
  if (!slides || !slides.length) { clearBriefView(); return; }
  empty.style.display = 'none';
  const imageMap = {};
  images.forEach(img => { if (img.imageUrl) imageMap[img.slideNumber] = img.imageUrl; });
  container.innerHTML = slides.map(slide => renderSlideCard(slide, imageMap[slide.slide_number])).join('');
}

function renderSlideCard(slide, imageUrl) {
  const typeLabel = { cover: 'Cover', content: 'Content', cta: 'CTA' }[slide.type] || slide.type;
  const typeBadge = { cover: 'gold', content: 'blue', cta: 'green' }[slide.type] || 'gray';
  const fields = [
    slide.photo_prompt && ['Foto-Prompt', `<span class="brief-photo-prompt">${escHtml(slide.photo_prompt)}</span>`],
    slide.hero_element && ['Hero-Element', `<span class="brief-hero">${escHtml(slide.hero_element)}</span>`],
    slide.headline && ['Headline', `<strong>${escHtml(slide.headline)}</strong>`],
    slide.body_text && ['Body-Text', escHtml(slide.body_text).replace(/\n/g, '<br>')],
    slide.info_box && ['Info-Box', escHtml(slide.info_box).replace(/\n/g, '<br>')],
  ].filter(Boolean);

  const imageHtml = imageUrl
    ? `<div class="brief-slide-image"><img src="${escHtml(imageUrl)}" alt="Slide ${slide.slide_number}" loading="lazy" /></div>`
    : `<div class="brief-slide-image brief-slide-image--empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <span>Kein Bild</span>
       </div>`;

  return `
    <div class="brief-slide">
      <div class="brief-slide-number">${slide.slide_number || '?'}</div>
      ${imageHtml}
      <div class="brief-slide-content">
        <div class="brief-slide-type-row">
          <span class="badge badge-${typeBadge}">${typeLabel}</span>
          ${slide.title ? `<span class="brief-slide-title">${escHtml(slide.title)}</span>` : ''}
        </div>
        ${fields.map(([label, value]) => `
          <div class="brief-field">
            <span class="brief-field-label">${label}</span>
            <span class="brief-field-value">${value}</span>
          </div>`).join('')}
        ${slide.design_notes ? `<div class="brief-design-notes">${escHtml(slide.design_notes).replace(/\n/g, '<br>')}</div>` : ''}
      </div>
    </div>`;
}

function copyBriefToClipboard() {
  if (!state.activeBriefData) return;
  const slides = state.activeBriefData.slides || [];
  const text = slides.map(s => {
    const lines = [`SLIDE ${s.slide_number} — ${(s.type || '').toUpperCase()}`];
    if (s.title) lines.push(`Titel: ${s.title}`);
    if (s.photo_prompt) lines.push(`Foto: ${s.photo_prompt}`);
    if (s.hero_element) lines.push(`HERO: ${s.hero_element}`);
    if (s.headline) lines.push(`Headline: ${s.headline}`);
    if (s.body_text) lines.push(`Body: ${s.body_text}`);
    if (s.info_box) lines.push(`Info-Box: ${s.info_box}`);
    if (s.design_notes) lines.push(`Design: ${s.design_notes}`);
    return lines.join('\n');
  }).join('\n\n' + '─'.repeat(40) + '\n\n');
  navigator.clipboard.writeText(text).then(() => showToast('Brief in Zwischenablage', 'success')).catch(() => showToast('Kopieren fehlgeschlagen', 'error'));
}

// ─── WOCHENPLAN TAB ───────────────────────────────────────────────────────────
async function loadWeekPlan(weekNumber) {
  state.planWeek = weekNumber;
  document.getElementById('plan-week-label').textContent = `KW ${weekNumber}`;
  document.getElementById('plan-subtitle').textContent = `Kalenderansicht · KW ${weekNumber}`;
  try {
    const data = await apiCall(`/tracker/week/${weekNumber}`);
    const posts = data.posts || [];
    const ideaData = await apiCall(`/content/weekly-plan/${weekNumber}`).catch(() => ({}));
    const ideas = ideaData.ideas || ideaData.data || [];
    renderWeekCalendar(posts, ideas, weekNumber);
  } catch (err) {
    renderWeekCalendar([], [], weekNumber);
  }
}

function navigateWeek(direction) {
  state.planWeek = Math.max(1, state.planWeek + direction);
  loadWeekPlan(state.planWeek);
}

const DAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function renderWeekCalendar(posts, ideas, weekNumber) {
  const calendar = document.getElementById('week-calendar');
  const empty = document.getElementById('plan-empty');
  const dates = getWeekDates(weekNumber);
  const todayStr = new Date().toDateString();
  const allItems = [...ideas, ...posts];

  calendar.innerHTML = DAYS_DE.map((day, i) => {
    const date = dates[i];
    const isToday = date && date.toDateString() === todayStr;
    const dayPosts = ideas.filter(p => p.day === day);
    const trackerPosts = posts.filter(p => {
      const d = p.scheduled_date ? new Date(p.scheduled_date) : null;
      return d && d.toDateString() === (date ? date.toDateString() : '');
    });
    const items = [...dayPosts, ...trackerPosts];

    return `
      <div class="week-day-col${isToday ? ' today' : ''}">
        <div class="week-day-header">
          <div class="week-day-name">${day.slice(0, 2)}</div>
          ${date ? `<div class="week-day-date">${formatShortDate(date)}</div>` : ''}
        </div>
        <div class="week-day-posts">
          ${items.map(p => `
            <div class="week-post-card" onclick="openBriefForIdea(${p.id})">
              <div class="week-post-title">${escHtml(p.title || p.name || '')}</div>
              <div class="week-post-meta">
                ${pillarBadge(p.pillar)}
                ${formatBadge(p.format)}
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');

  empty.style.display = allItems.length ? 'none' : 'flex';
}

// ─── TRACKER TAB ─────────────────────────────────────────────────────────────
async function loadTracker() {
  try {
    const params = state.trackerFilter ? `?status=${state.trackerFilter}` : '';
    const data = await apiCall(`/tracker${params}`);
    state.tracker = data.posts || data.data || [];
    renderTrackerTable();
  } catch (err) {
    showToast('Tracker konnte nicht geladen werden', 'error');
  }
}

async function updateTrackerStatus(id, status) {
  try {
    await apiCall(`/tracker/${id}/status`, { method: 'PATCH', body: { status } });
    const item = state.tracker.find(t => t.id === id);
    if (item) item.status = status;
    const sel = document.querySelector(`select[data-tracker-id="${id}"]`);
    if (sel) { sel.dataset.status = status; sel.value = status; }
    showToast('Status aktualisiert', 'success');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  }
}

async function deleteTrackerEntry(id) {
  try {
    await apiCall(`/tracker/${id}`, { method: 'DELETE' });
    state.tracker = state.tracker.filter(t => t.id !== id);
    renderTrackerTable();
    showToast('Eintrag gelöscht', 'info');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  }
}

function renderTrackerTable() {
  const tbody = document.getElementById('tracker-tbody');
  const empty = document.getElementById('tracker-empty');
  const tableWrapper = document.querySelector('.table-wrapper');
  if (!state.tracker.length) {
    tbody.innerHTML = '';
    tableWrapper.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  tableWrapper.style.display = 'block';
  tbody.innerHTML = state.tracker.map(post => `
    <tr>
      <td>${post.scheduled_date ? formatDate(post.scheduled_date) : '<span class="tracker-no-link">–</span>'}</td>
      <td><span class="tracker-title" title="${escHtml(post.title)}">${escHtml(post.title)}</span></td>
      <td>${pillarBadge(post.pillar)}</td>
      <td>${formatBadge(post.format)}</td>
      <td>
        <select class="status-select" data-tracker-id="${post.id}" data-status="${post.status}" onchange="updateTrackerStatus(${post.id}, this.value)">
          <option value="draft"${post.status==='draft'?' selected':''}>Entwurf</option>
          <option value="scheduled"${post.status==='scheduled'?' selected':''}>Geplant</option>
          <option value="published"${post.status==='published'?' selected':''}>Veröffentlicht</option>
          <option value="archived"${post.status==='archived'?' selected':''}>Archiviert</option>
        </select>
      </td>
      <td>${post.canva_link ? `<a class="tracker-link" href="${escHtml(post.canva_link)}" target="_blank" rel="noopener">Canva ↗</a>` : '<span class="tracker-no-link">–</span>'}</td>
      <td>${post.drive_link ? `<a class="tracker-link" href="${escHtml(post.drive_link)}" target="_blank" rel="noopener">Drive ↗</a>` : '<span class="tracker-no-link">–</span>'}</td>
      <td class="col-actions">
        <div class="tracker-actions">
          <button class="btn btn-secondary btn-xs" onclick="openEditTracker(${post.id})">Bearbeiten</button>
          <button class="btn btn-danger btn-xs" onclick="deleteTrackerEntry(${post.id})">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

function openAddTracker() {
  state.editingTrackerId = null;
  showModal(trackerFormHtml(null), 'Neuer Tracker-Eintrag');
}

function openEditTracker(id) {
  state.editingTrackerId = id;
  const post = state.tracker.find(t => t.id === id);
  showModal(trackerFormHtml(post), 'Eintrag bearbeiten');
}

function trackerFormHtml(post) {
  const v = (field) => post ? escHtml(post[field] || '') : '';
  return `
    <div class="form-grid">
      <div>
        <label class="form-label">Titel *</label>
        <input class="input" id="tf-title" value="${v('title')}" placeholder="Post-Titel" />
      </div>
      <div class="form-row">
        <div>
          <label class="form-label">Säule</label>
          <select class="select" id="tf-pillar">
            <option value="">–</option>
            ${['Credibility','Conversion','Reach'].map(p => `<option${v('pillar')===p?' selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Format</label>
          <select class="select" id="tf-format">
            <option value="">–</option>
            ${['Karussell','Reel','Post','Story'].map(f => `<option${v('format')===f?' selected':''}>${f}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div>
          <label class="form-label">Plattform</label>
          <select class="select" id="tf-platform">
            <option value="">–</option>
            ${['Instagram','LinkedIn','TikTok','Facebook'].map(p => `<option${v('platform')===p?' selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Geplant für</label>
          <input class="input" id="tf-date" type="date" value="${post && post.scheduled_date ? post.scheduled_date.slice(0,10) : ''}" />
        </div>
      </div>
      <div>
        <label class="form-label">Status</label>
        <select class="select" id="tf-status">
          ${['draft','scheduled','published','archived'].map(s => `<option value="${s}"${v('status')===s?' selected':''}>${statusLabel(s)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label">Canva-Link</label>
        <input class="input" id="tf-canva" value="${v('canva_link')}" placeholder="https://www.canva.com/…" />
      </div>
      <div>
        <label class="form-label">Google Drive-Link</label>
        <input class="input" id="tf-drive" value="${v('drive_link')}" placeholder="https://drive.google.com/…" />
      </div>
      <div>
        <label class="form-label">Caption</label>
        <textarea class="textarea" id="tf-caption" rows="3" placeholder="Post-Text…">${v('caption')}</textarea>
      </div>
      <div>
        <label class="form-label">Notizen</label>
        <textarea class="textarea" id="tf-notes" rows="2" placeholder="Interne Notizen…">${v('notes')}</textarea>
      </div>
      <div class="form-footer">
        <button class="btn btn-secondary" onclick="hideModal()">Abbrechen</button>
        <button class="btn btn-primary" onclick="saveTrackerEntry()">Speichern</button>
      </div>
    </div>`;
}

async function saveTrackerEntry() {
  const title = document.getElementById('tf-title').value.trim();
  if (!title) { showToast('Titel ist erforderlich', 'error'); return; }
  const body = {
    title,
    pillar: document.getElementById('tf-pillar').value,
    format: document.getElementById('tf-format').value,
    platform: document.getElementById('tf-platform').value,
    scheduled_date: document.getElementById('tf-date').value || null,
    status: document.getElementById('tf-status').value || 'draft',
    canva_link: document.getElementById('tf-canva').value,
    drive_link: document.getElementById('tf-drive').value,
    caption: document.getElementById('tf-caption').value,
    notes: document.getElementById('tf-notes').value,
  };
  try {
    if (state.editingTrackerId) {
      const data = await apiCall(`/tracker/${state.editingTrackerId}`, { method: 'PUT', body });
      const idx = state.tracker.findIndex(t => t.id === state.editingTrackerId);
      if (idx !== -1) state.tracker[idx] = data.post || data.data;
    } else {
      const data = await apiCall('/tracker', { method: 'POST', body });
      state.tracker.unshift(data.post || data.data);
    }
    renderTrackerTable();
    hideModal();
    showToast('Gespeichert', 'success');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  }
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
async function checkApiStatus() {
  async function check(endpoint, badgeId, dotId) {
    const badge = document.getElementById(badgeId);
    const dot = document.getElementById(dotId);
    try {
      const data = await apiCall(endpoint);
      const ok = data.configured !== false && !data.error;
      badge.textContent = ok ? '✓ Verbunden' : '✗ Nicht konfiguriert';
      badge.className = `api-status-badge ${ok ? 'ok' : 'err'}`;
      if (dot) { dot.parentElement.classList.toggle('ok', ok); dot.parentElement.classList.toggle('err', !ok); }
      return ok;
    } catch {
      badge.textContent = '✗ Fehler';
      badge.className = 'api-status-badge err';
      if (dot) { dot.parentElement.classList.add('err'); dot.parentElement.classList.remove('ok'); }
      return false;
    }
  }
  const [anthOk, canvaOk, driveOk] = await Promise.all([
    check('/health', 'settings-anthropic-badge', null),
    check('/canva/status', 'settings-canva-badge', null),
    check('/drive/status', 'settings-drive-badge', null),
  ]);
  updateHeaderStatus({ anthropic: anthOk, canva: canvaOk, drive: driveOk });
}

function updateHeaderStatus(status) {
  const map = { anthropic: 'status-anthropic', canva: 'status-canva', drive: 'status-drive' };
  Object.entries(map).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('ok', !!status[key]);
      el.classList.toggle('err', !status[key]);
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateWeekSelects();

  // Tab clicks
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // News tab
  document.getElementById('btn-fetch-news').addEventListener('click', fetchNews);
  document.getElementById('news-week-select').addEventListener('change', e => { state.selectedWeek = parseInt(e.target.value); });

  // Ideas tab
  document.getElementById('btn-generate-plan').addEventListener('click', showNewsPicker);
  document.getElementById('btn-cancel-plan').addEventListener('click', hideNewsPicker);
  document.getElementById('btn-confirm-generate').addEventListener('click', confirmGeneratePlan);
  document.getElementById('ideas-week-select').addEventListener('change', e => {
    state.selectedWeek = parseInt(e.target.value);
    loadIdeas(state.selectedWeek);
  });

  // Design brief tab
  document.getElementById('brief-post-select').addEventListener('change', e => {
    if (e.target.value) loadBrief(e.target.value);
    else clearBriefView();
    updateBriefButtons();
  });
  document.getElementById('btn-generate-brief').addEventListener('click', generateBrief);
  document.getElementById('btn-generate-caption').addEventListener('click', generateCaption);
  document.getElementById('btn-generate-images').addEventListener('click', generateImages);
  document.getElementById('btn-copy-brief').addEventListener('click', copyBriefToClipboard);
  document.getElementById('btn-copy-caption').addEventListener('click', copyCaption);

  // Week plan tab
  document.getElementById('btn-prev-week').addEventListener('click', () => navigateWeek(-1));
  document.getElementById('btn-next-week').addEventListener('click', () => navigateWeek(+1));

  // Tracker tab
  document.getElementById('btn-add-tracker').addEventListener('click', openAddTracker);
  document.getElementById('tracker-filter-status').addEventListener('change', e => {
    state.trackerFilter = e.target.value;
    loadTracker();
  });

  // Settings
  document.getElementById('btn-refresh-status').addEventListener('click', checkApiStatus);

  // Modal close
  document.getElementById('modal-close').addEventListener('click', hideModal);
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) hideModal(); });

  // Keyboard ESC
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });

  // Initial load
  loadNews();
  checkApiStatus();
});
