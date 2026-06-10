// REOS JARVIS — List View (list.js)

let listFilter = 'ALL';
let listSearch = '';

function initList() {
  renderCatFilters();
  renderChatList();

  document.getElementById('list-search')?.addEventListener('input', (e) => {
    listSearch = e.target.value.toLowerCase();
    renderChatList();
  });
}

function renderCatFilters() {
  const container = document.getElementById('cat-filters');
  if (!container) return;
  const cats = ['ALLE', ...Object.keys(typeof CONTINENTS !== 'undefined' ? CONTINENTS : {})];
  container.innerHTML = cats.map(c => `
    <button class="cat-filter-btn ${c === 'ALLE' || (c === listFilter) ? 'active' : ''}" data-cat="${c}">${c}</button>
  `).join('');
  container.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      listFilter = btn.dataset.cat === 'ALLE' ? 'ALL' : btn.dataset.cat;
      container.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderChatList();
    });
  });
}

function renderChatList() {
  const container = document.getElementById('chat-list');
  if (!container) return;

  const chats = typeof SEED_CHATS !== 'undefined' ? SEED_CHATS : [];
  let filtered = chats;
  if (listFilter !== 'ALL') filtered = filtered.filter(c => c.category === listFilter);
  if (listSearch) filtered = filtered.filter(c =>
    c.title.toLowerCase().includes(listSearch) ||
    c.category.toLowerCase().includes(listSearch) ||
    (c.tags || []).some(t => t.toLowerCase().includes(listSearch))
  );

  // Hubs first
  const hubs = filtered.filter(c => c.isHub);
  const rest = filtered.filter(c => !c.isHub);
  const sorted = [...hubs, ...rest];

  if (sorted.length === 0) {
    container.innerHTML = '<div style="padding:20px;color:var(--text-dim);font-family:var(--font-mono);font-size:10px;letter-spacing:1px">KEINE ERGEBNISSE</div>';
    return;
  }

  container.innerHTML = sorted.map(c => {
    const cont = typeof CONTINENTS !== 'undefined' ? CONTINENTS[c.category] : {};
    const color = cont?.color || '#C9A84C';
    return `
      <div class="chat-list-item ${c.isHub ? 'is-hub' : ''}" data-id="${c.id}" style="${c.isHub ? `border-left-color:${color}` : ''}">
        <div class="list-item-icon" style="color:${color}">${c.isHub ? '⬡' : '●'}</div>
        <div class="list-item-info">
          <div class="list-item-title">${c.title}</div>
          <div class="list-item-cat" style="color:${color}">${c.category}</div>
        </div>
        ${c.isHub ? '<div class="list-hub-badge">HUB</div>' : ''}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.chat-list-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.chat-list-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const chat = sorted.find(c => c.id === item.dataset.id);
      if (chat) showListDetail(chat);
    });
  });
}

function showListDetail(chat) {
  const container = document.getElementById('list-detail');
  if (!container) return;
  const cont = typeof CONTINENTS !== 'undefined' ? CONTINENTS[chat.category] : {};
  const color = cont?.color || '#C9A84C';

  container.innerHTML = `
    <div style="max-width:700px">
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;color:${color};margin-bottom:8px">${chat.category}</div>
      ${chat.isHub ? '<div class="hub-badge" style="margin-bottom:8px">⬡ HUB-CHAT</div>' : ''}
      <div style="font-size:24px;font-weight:600;color:var(--text);margin-bottom:4px;line-height:1.3">${chat.isHub ? '⬡ ' : ''}${chat.title}</div>
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-bottom:24px">${chat.date}</div>

      <div class="detail-section-label">ZUSAMMENFASSUNG</div>
      <div class="detail-content" style="font-size:14px;line-height:1.7">${chat.summary || '—'}</div>

      <div class="detail-section-label">SCHLÜSSEL-THEMEN</div>
      <div class="detail-tags">${(chat.tags || []).map(t => `<span class="detail-tag">${t}</span>`).join('')}</div>

      <div class="detail-section-label">ENTSCHEIDUNGEN</div>
      <div class="detail-content">${(chat.decisions || []).map(d => `<div style="margin-bottom:6px">• ${d}</div>`).join('') || '—'}</div>

      <button class="btn-open-chat" style="margin-top:32px" onclick="window.switchView('chat');window.showToast('Gespräch &quot;${chat.title.replace(/"/g, '\\"')}&quot; geöffnet.')">
        → CHAT ÖFFNEN & FORTSETZEN
      </button>
    </div>
  `;
}

window.initList = initList;
