// REOS JARVIS — Knowledge Base (memory.js)

const SEED_KNOWLEDGE = [
  { id: 'kb_001', category: 'REOS', text: 'REOS Platform GmbH, gegründet in München. IHK bestätigt 27.03.2026. Externe Marke: REOS Group. Domain: reosgroups.com.', created_at: '2026-03-27T00:00:00Z' },
  { id: 'kb_002', category: 'REOS', text: 'Tagline: "REOS macht aus Zufall System – für beide Seiten." Auto-Aufkleber: "Grow Together. Close More."', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_003', category: 'REOS', text: 'Modell: Invitation-only B2B Membership-Netzwerk. Verbindet Premium-Immobilienmakler mit verifizierten Finanzierungsvermittlern. KEINE Freemium, KEIN Massenmarkt.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_004', category: 'REOS', text: 'Aktive Märkte: München, Mailand. Monaco vereinbart, noch nicht gestartet. Pipeline: Österreich, England, Italien, Südfrankreich, Schweiz, Luxemburg.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_005', category: 'Personal', text: 'Max Köhl, 21 Jahre, Gründer & CEO REOS Platform GmbH München. Ziel: Allianz verlassen bis Ende September 2026 (intern: Ende August).', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_006', category: 'Personal', text: 'Mentor: Philip George Dunmore, Senior Advisor, 66, ansässig DBC München. Reagiert immer in Minuten. Modell für Verlässlichkeit.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_007', category: 'Personal', text: 'Tagesrhythmus: Aufstehen 08:00, kein Frühstück nur Kaffee, Musik 24/7. Produktivste Zeit: 23:00–01:00. Zeitfresser: TikTok, Instagram.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_008', category: 'REOS', text: 'Preise Makler: Bronze €1.000/mo, Silver €2.500/mo, Gold €4.000/mo. Aktivierung: €3.500 einmalig. 1st Quarterly Payment (3 Monate), 6 Monate Mindestlaufzeit. NIEMALS Rabatt geben.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_009', category: 'REOS', text: 'Preise Finanzierungsvermittler: Bronze €3.000/mo, Silver €6.000/mo, Gold €8.000/mo. Aktivierung: €3.500 einmalig. 1st Quarterly Payment, 6 Monate Mindestlaufzeit.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_010', category: 'REOS', text: 'Strategische Partner (Sponsoren): Network €1.000/mo, Featured €2.500/mo, Strategic €4.000/mo. 12 Monate Mindestlaufzeit, automatische Verlängerung, 3 Monate Kündigungsfrist.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_011', category: 'Contacts', text: 'Horbach: 40 Zentren, 1.000+ Vermittler bundesweit. Kontakt: Philipp Stein München. Senior-Partner-Meeting im DBC. Primäres Enterprise-Ziel.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_012', category: 'Contacts', text: 'Imperia Immobilien GmbH: Andreas Fauster (GF), Timo Luis. Exklusiver Kapitalanlage-Spezialist Bayern. Timo bevorzugt Zoom. Discovery-first Ansatz.', created_at: '2026-04-29T00:00:00Z' },
  { id: 'kb_013', category: 'Contacts', text: 'Uwe Schweizer, Alpen Immobilien Allgäu: Bestätigtes Gründungsmitglied (Makler-Seite).', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_014', category: 'REOS', text: '2026 Ziel (intern bis Ende August): 10 Makler + 10 Vermittler + 5 Sponsoren unterzeichnet. €70.000/Monat MRR → Allianz-Exit.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_015', category: 'Rules', text: 'NIEMALS: Allianz↔REOS-Verbindung extern erwähnen. Niemals Rabatte anbieten. Niemals "Sponsoring" (→ strategische Partnerschaft), niemals "upfront" (→ 1st Quarterly Payment). Kein AI-Jargon, keine Ausrufezeichen, keine Emojis in externen REOS-Inhalten.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'kb_016', category: 'Rules', text: 'Follow-up Disziplin: Tag 5 für Makler/Vermittler. Tag 7 für Sponsoren. KEIN dritter Follow-up nach Tag 14.', created_at: '2026-04-01T00:00:00Z' },
];

let knowledgeBase = [];

async function loadKnowledge() {
  try {
    const data = await window.jarvis.readData('knowledge.json');
    knowledgeBase = Array.isArray(data) ? data : [];
    if (knowledgeBase.length === 0) {
      knowledgeBase = [...SEED_KNOWLEDGE];
      await saveKnowledge();
    }
  } catch {
    knowledgeBase = [...SEED_KNOWLEDGE];
  }
}

async function saveKnowledge() {
  await window.jarvis.writeData('knowledge.json', knowledgeBase);
}

function getKnowledgeText() {
  return knowledgeBase.map(e => `[${e.category}] ${e.text}`).join('\n');
}

async function addKnowledgeEntry(text, category = 'Personal') {
  const entry = {
    id: `kb_${Date.now()}`,
    category,
    text,
    created_at: new Date().toISOString()
  };
  knowledgeBase.push(entry);
  await saveKnowledge();
  await logKBChange('ADD', entry);
  return entry;
}

async function removeKnowledgeEntry(id) {
  const entry = knowledgeBase.find(e => e.id === id);
  knowledgeBase = knowledgeBase.filter(e => e.id !== id);
  await saveKnowledge();
  if (entry) await logKBChange('DELETE', entry);
}

async function updateKnowledgeEntry(id, text) {
  const entry = knowledgeBase.find(e => e.id === id);
  if (entry) {
    entry.text = text;
    entry.updated_at = new Date().toISOString();
    await saveKnowledge();
    await logKBChange('UPDATE', entry);
  }
}

async function logKBChange(action, entry) {
  try {
    const log = await window.jarvis.readData('kb-history.log').catch(() => []);
    log.push({ action, entry, timestamp: new Date().toISOString() });
    await window.jarvis.writeData('kb-history.log', log);
  } catch {}
}

// KB Modal UI
function openKBModal() {
  const modal = document.getElementById('kb-modal');
  modal.style.display = 'flex';
  renderKBEntries();

  document.getElementById('kb-close').onclick = () => modal.style.display = 'none';
  document.getElementById('kb-add').onclick = promptAddKB;
  document.getElementById('kb-export').onclick = exportKB;
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

function renderKBEntries(filter = '') {
  const body = document.getElementById('kb-body');
  const entries = filter
    ? knowledgeBase.filter(e => e.text.toLowerCase().includes(filter.toLowerCase()) || e.category.toLowerCase().includes(filter.toLowerCase()))
    : knowledgeBase;

  if (entries.length === 0) {
    body.innerHTML = '<div style="color:var(--text-dim);font-size:13px;text-align:center;padding:20px">Keine Einträge.</div>';
    return;
  }

  body.innerHTML = `
    <div style="margin-bottom:12px">
      <input type="text" placeholder="Wissensbasis durchsuchen..." style="width:100%;padding:8px 12px;background:rgba(201,168,76,0.04);border:1px solid var(--gold-border);color:var(--text);font-family:var(--font-main);font-size:13px;outline:none" id="kb-search-input" value="${filter}">
    </div>
    ${entries.map(e => `
      <div class="kb-entry" data-id="${e.id}">
        <div class="kb-entry-content">
          <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1px;color:var(--gold-mid);margin-bottom:4px">${e.category}</div>
          <div class="kb-entry-text" contenteditable="false" data-id="${e.id}">${e.text}</div>
          <div class="kb-entry-meta">${new Date(e.created_at).toLocaleDateString('de-DE')}</div>
        </div>
        <div class="kb-entry-actions">
          <button class="kb-btn-small" onclick="editKBEntry('${e.id}')">BEARBEITEN</button>
          <button class="kb-btn-small delete" onclick="deleteKBEntry('${e.id}')">LÖSCHEN</button>
        </div>
      </div>
    `).join('')}
  `;

  document.getElementById('kb-search-input')?.addEventListener('input', (e) => renderKBEntries(e.target.value));
}

async function editKBEntry(id) {
  const entry = knowledgeBase.find(e => e.id === id);
  if (!entry) return;
  const newText = prompt('Eintrag bearbeiten:', entry.text);
  if (newText && newText !== entry.text) {
    await updateKnowledgeEntry(id, newText);
    renderKBEntries();
    showToast('Eintrag aktualisiert.', 'success');
  }
}

async function deleteKBEntry(id) {
  if (confirm('Eintrag löschen?')) {
    await removeKnowledgeEntry(id);
    renderKBEntries();
    showToast('Eintrag gelöscht.');
  }
}

async function promptAddKB() {
  const text = prompt('Neuer Wissensbasis-Eintrag:');
  if (!text) return;
  const category = prompt('Kategorie (Personal / REOS / Contacts / Rules):', 'Personal') || 'Personal';
  await addKnowledgeEntry(text, category);
  renderKBEntries();
  showToast('Eintrag hinzugefügt.', 'success');
}

function exportKB() {
  const blob = new Blob([JSON.stringify(knowledgeBase, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `JARVIS_KB_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

// Load on startup
loadKnowledge();

window.knowledgeBase = knowledgeBase;
window.getKnowledgeText = getKnowledgeText;
window.addKnowledgeEntry = addKnowledgeEntry;
window.removeKnowledgeEntry = removeKnowledgeEntry;
window.openKBModal = openKBModal;
window.editKBEntry = editKBEntry;
window.deleteKBEntry = deleteKBEntry;
