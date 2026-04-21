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
  const map = {
    'Markt & Zahlen': 'blue',
    'Makler-Know-how': 'orange',
    'Baufinanzierer-Know-how': 'green',
    'Exklusivität & Launch': 'gold',
    'Pain Points': 'red',
    Credibility: 'blue', Conversion: 'orange', Reach: 'green'
  };
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

function createREOSPost() {
  showModal(`
    <h2 class="modal-title" style="color:var(--gold);margin-bottom:6px">REOS Post erstellen</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:0.85rem">Gib vor, was Claude posten soll — du hast die volle Kontrolle.</p>
    <div class="form-grid">
      <div>
        <label class="form-label">Thema / Inhalt *</label>
        <textarea class="textarea" id="rp-thema" rows="3" placeholder="z.B. Die 3 größten Vorteile der REOS Membership für Makler — schnellere Abschlüsse durch vorqualifizierte Leads..."></textarea>
      </div>
      <div class="form-row">
        <div>
          <label class="form-label">Post-Typ</label>
          <select class="select" id="rp-type">
            <option value="Exklusivität & Launch">Launch Announcement</option>
            <option value="Makler-Know-how">Vorteile für Makler</option>
            <option value="Baufinanzierer-Know-how">Vorteile für Baufinanzierer</option>
            <option value="Markt & Zahlen">Fakten & Zahlen</option>
            <option value="Pain Points">Pain Points</option>
            <option value="Exklusivität & Launch">FOMO / Members Only</option>
            <option value="Markt & Zahlen">Preise & Membership</option>
            <option value="Exklusivität & Launch">Behind the Scenes</option>
          </select>
        </div>
        <div>
          <label class="form-label">Zielgruppe</label>
          <select class="select" id="rp-audience">
            <option value="Immobilienmakler">Immobilienmakler</option>
            <option value="Baufinanzierer">Baufinanzierer</option>
            <option value="Beide Zielgruppen">Beide</option>
          </select>
        </div>
      </div>
      <div>
        <label class="form-label">Anweisungen an Claude <span style="opacity:0.5">(optional)</span></label>
        <textarea class="textarea" id="rp-instructions" rows="2" placeholder="z.B. Betone die Joining Fee, erwähne das Harley E-Bike, nutze konkrete Zahlen, schreibe einen starken FOMO-Hook..."></textarea>
      </div>
      <div>
        <label class="form-label">Bild-Stil Vorgabe <span style="opacity:0.5">(optional)</span></label>
        <input class="input" id="rp-bildhinweis" type="text" placeholder="z.B. Porsche GT3 bei Nacht, nasse Straße, Stadtlicht — oder: dunkle Bibliothek mit Leder..." />
      </div>
      <div>
        <label class="form-label">Anzahl Slides</label>
        <select class="select" id="rp-slides" style="width:140px">
          <option value="4">4 Slides</option>
          <option value="5">5 Slides</option>
          <option value="6" selected>6 Slides</option>
          <option value="7">7 Slides</option>
          <option value="8">8 Slides</option>
        </select>
      </div>
      <div class="form-footer" style="margin-top:8px">
        <button class="btn btn-secondary" onclick="hideModal()">Abbrechen</button>
        <button class="btn btn-gold" onclick="confirmREOSPost()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Post + Brief erstellen
        </button>
      </div>
    </div>`, '');
}

async function confirmREOSPost() {
  const thema = document.getElementById('rp-thema').value.trim();
  if (!thema) { showToast('Bitte ein Thema eingeben', 'error'); return; }
  const body = {
    thema,
    postType: document.getElementById('rp-type').value,
    zielgruppe: document.getElementById('rp-audience').value,
    instructions: document.getElementById('rp-instructions').value.trim(),
    slideCount: document.getElementById('rp-slides').value,
    bildHinweis: document.getElementById('rp-bildhinweis').value.trim()
  };
  hideModal();
  showLoading('Claude erstellt REOS Post + Design-Brief…');
  try {
    const data = await apiCall('/content/reos-post', { method: 'POST', body });
    const { idea, brief } = data.data;
    state.ideas.unshift(idea);
    renderIdeasGrid();
    populateBriefPostSelect();
    state.activeBriefData = brief;
    state.activeBriefIdeaId = idea.id;
    switchTab('brief');
    document.getElementById('brief-post-select').value = idea.id;
    renderBriefSlides(brief.slides || [], []);
    updateBriefButtons();
    showToast('Post + Brief erstellt — Prompts prüfen, dann Bilder generieren!', 'success');
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
  } finally {
    hideLoading();
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
  document.getElementById('btn-export-slides').disabled = !state.activeBriefData;
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
  const sn = slide.slide_number;
  const fields = [
    slide.hero_element && ['Hero-Element', `<span class="brief-hero">${escHtml(slide.hero_element)}</span>`],
    slide.headline && ['Headline', `<strong>${escHtml(slide.headline)}</strong>`],
    slide.body_text && ['Body-Text', escHtml(slide.body_text).replace(/\n/g, '<br>')],
    slide.info_box && ['Info-Box', escHtml(slide.info_box).replace(/\n/g, '<br>')],
  ].filter(Boolean);

  const imageHtml = imageUrl
    ? `<div class="brief-slide-image"><img src="${escHtml(imageUrl)}" alt="Slide ${sn}" loading="lazy" /></div>`
    : `<div class="brief-slide-image brief-slide-image--empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <span>Kein Bild</span>
       </div>`;

  return `
    <div class="brief-slide" id="slide-card-${sn}">
      <div class="brief-slide-number">${sn || '?'}</div>
      ${imageHtml}
      <div class="brief-slide-content">
        <div class="brief-slide-type-row">
          <span class="badge badge-${typeBadge}">${typeLabel}</span>
          ${slide.title ? `<span class="brief-slide-title">${escHtml(slide.title)}</span>` : ''}
        </div>
        <div class="brief-field brief-field-prompt">
          <div class="brief-field-prompt-header">
            <span class="brief-field-label">Foto-Prompt</span>
            <button class="btn-edit-prompt" onclick="toggleEditPrompt(${sn})" title="Prompt bearbeiten">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Bearbeiten
            </button>
          </div>
          <span class="brief-field-value brief-photo-prompt" id="prompt-display-${sn}">${escHtml(slide.photo_prompt || '')}</span>
          <div class="prompt-edit-box" id="prompt-edit-${sn}" style="display:none">
            <textarea class="textarea prompt-textarea" id="prompt-input-${sn}" rows="3">${escHtml(slide.photo_prompt || '')}</textarea>
            <div class="prompt-edit-actions">
              <button class="btn btn-secondary btn-xs" onclick="toggleEditPrompt(${sn})">Abbrechen</button>
              <button class="btn btn-primary btn-xs" onclick="savePrompt(${sn})">Speichern</button>
            </div>
          </div>
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

function toggleEditPrompt(slideNumber) {
  const display = document.getElementById(`prompt-display-${slideNumber}`);
  const editBox = document.getElementById(`prompt-edit-${slideNumber}`);
  const isEditing = editBox.style.display !== 'none';
  display.style.display = isEditing ? '' : 'none';
  editBox.style.display = isEditing ? 'none' : 'block';
  if (!isEditing) document.getElementById(`prompt-input-${slideNumber}`).focus();
}

async function savePrompt(slideNumber) {
  if (!state.activeBriefData || !state.activeBriefIdeaId) return;
  const newPrompt = document.getElementById(`prompt-input-${slideNumber}`).value.trim();
  const slides = state.activeBriefData.slides.map(s =>
    s.slide_number === slideNumber ? { ...s, photo_prompt: newPrompt } : s
  );
  try {
    await apiCall(`/content/design-brief/${state.activeBriefIdeaId}`, { method: 'PUT', body: { slides } });
    state.activeBriefData = { ...state.activeBriefData, slides };
    document.getElementById(`prompt-display-${slideNumber}`).textContent = newPrompt;
    toggleEditPrompt(slideNumber);
    showToast('Prompt gespeichert', 'success');
  } catch (err) {
    showToast('Fehler beim Speichern: ' + err.message, 'error');
  }
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
            ${['Markt & Zahlen','Makler-Know-how','Baufinanzierer-Know-how','Exklusivität & Launch','Pain Points'].map(p => `<option${v('pillar')===p?' selected':''}>${p}</option>`).join('')}
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

// ─── SLIDE EXPORT (Canvas → ZIP) ─────────────────────────────────────────────

async function exportSlides() {
  if (!state.activeBriefData || !state.activeBriefIdeaId) return;
  const slides = state.activeBriefData.slides || [];

  const imgData = await apiCall(`/images/${state.activeBriefIdeaId}`).catch(() => ({ images: [] }));
  const images = imgData.images || [];
  const imageMap = {};
  images.forEach(img => { if (img.image_url) imageMap[img.slide_number] = img.image_url; });

  const hasImages = Object.keys(imageMap).length > 0;
  if (!hasImages) {
    showToast('Bitte zuerst Bilder generieren', 'error');
    return;
  }

  showLoading(`Slides werden gerendert (${slides.length} Bilder)…`);
  try {
    const zip = new JSZip();
    const total = slides.length;

    let imagesLoaded = 0;
    for (let i = 0; i < total; i++) {
      const slide = slides[i];
      const url = imageMap[slide.slide_number];
      document.getElementById('loading-message').textContent = `Slide ${i + 1} von ${total} wird gerendert…`;
      if (url) imagesLoaded++;
      const canvas = await renderSlideCanvas(slide, url, total);
      const blob = await new Promise((resolve, reject) => {
        try { canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob null')), 'image/jpeg', 0.93); }
        catch (e) { reject(e); }
      });
      zip.file(`reos_slide_${String(slide.slide_number).padStart(2, '0')}.jpg`, blob);
    }
    if (imagesLoaded === 0) showToast('Hinweis: Keine Bilder gefunden — bitte erst "Bilder generieren" klicken', 'error');

    if (state.activeCaptionData) {
      const cap = state.activeCaptionData;
      const txt = [cap.caption_text, '', cap.hashtags || '', cap.cta ? `\nCTA: ${cap.cta}` : ''].filter(Boolean).join('\n');
      zip.file('caption.txt', txt);
    }

    const idea = state.ideas.find(i => i.id == state.activeBriefIdeaId);
    const titleSlug = (idea?.title || 'reos-post').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titleSlug}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${total} Slides + Caption exportiert`, 'success');
  } catch (err) {
    showToast('Export fehlgeschlagen: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function renderSlideCanvas(slide, imageUrl, totalSlides) {
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, S, S);

  // Background image
  if (imageUrl) {
    try {
      const img = await loadCanvasImage(imageUrl);
      const scale = Math.max(S / img.width, S / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
    } catch (e) {
      console.error('Canvas image load failed:', imageUrl, e.message);
    }
  }

  // Gradient overlay — dark at bottom for text
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, 'rgba(10,10,10,0.35)');
  grad.addColorStop(0.45, 'rgba(10,10,10,0.55)');
  grad.addColorStop(1, 'rgba(10,10,10,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Gold accent bar top-left (above hero text)
  ctx.fillStyle = '#C9A84C';
  ctx.fillRect(60, 44, 100, 3);

  let y = 160;

  // Hero element
  if (slide.hero_element) {
    ctx.font = 'bold 108px system-ui, sans-serif';
    ctx.fillStyle = '#C9A84C';
    y = wrapCanvasText(ctx, slide.hero_element, 60, y, S - 120, 118) + 10;
  }

  // Headline
  if (slide.headline) {
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    y = wrapCanvasText(ctx, slide.headline, 60, y, S - 120, 66, 3) + 24;
  }

  // Body text
  if (slide.body_text) {
    ctx.font = '400 30px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    y = wrapCanvasText(ctx, slide.body_text, 60, y, S - 120, 42, 5) + 20;
  }

  // Info box
  if (slide.info_box && y < S - 200) {
    const boxH = 64;
    ctx.fillStyle = 'rgba(201,168,76,0.12)';
    ctx.strokeStyle = 'rgba(201,168,76,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(60, y, S - 120, boxH);
    ctx.fill(); ctx.stroke();
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillStyle = '#C9A84C';
    const infoTxt = slide.info_box.length > 65 ? slide.info_box.slice(0, 62) + '…' : slide.info_box;
    ctx.fillText(infoTxt, 80, y + 40);
  }

  // Bottom bar
  ctx.fillStyle = 'rgba(10,10,10,0.6)';
  ctx.fillRect(0, S - 90, S, 90);

  // REOS wordmark
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillStyle = '#C9A84C';
  ctx.textAlign = 'left';
  ctx.fillText('REOS', 60, S - 32);

  // Progress dots
  const dotR = 5, dotGap = 18;
  const dotsW = totalSlides * (dotR * 2) + (totalSlides - 1) * (dotGap - dotR * 2);
  let dx = S - 60 - dotsW;
  for (let i = 0; i < totalSlides; i++) {
    ctx.beginPath();
    ctx.arc(dx + dotR, S - 38, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i === slide.slide_number - 1 ? '#C9A84C' : 'rgba(255,255,255,0.3)';
    ctx.fill();
    dx += dotGap;
  }

  return canvas;
}

async function loadCanvasImage(url) {
  // Fetch as blob — works for both local (/api/...) and external URLs via proxy
  const fetchUrl = url.startsWith('/') ? url : `/api/images/proxy?url=${encodeURIComponent(url)}`;
  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${fetchUrl}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image decode failed')); };
    img.src = objectUrl;
  });
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineH, maxLines = 99) {
  const words = text.replace(/\n/g, ' \n ').split(' ');
  let line = '', lines = 0;
  for (const word of words) {
    if (word === '\n') {
      if (lines >= maxLines) break;
      ctx.fillText(line.trim(), x, y); line = ''; y += lineH; lines++;
      continue;
    }
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines >= maxLines) break;
      ctx.fillText(line.trim(), x, y); line = word; y += lineH; lines++;
    } else { line = test; }
  }
  if (line && lines < maxLines) { ctx.fillText(line.trim(), x, y); y += lineH; }
  return y;
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
  document.getElementById('btn-reos-post').addEventListener('click', createREOSPost);
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
  document.getElementById('btn-export-slides').addEventListener('click', exportSlides);
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
