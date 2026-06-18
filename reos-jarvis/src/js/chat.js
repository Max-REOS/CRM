// REOS JARVIS — Chat Interface (chat.js)

const REOS_KNOWLEDGE_BASE = `
=== REOS PLATFORM GMBH — WISSENSDATENBANK ===

UNTERNEHMEN:
- REOS Platform GmbH, München. IHK 27.03.2026. Externe Marke: REOS Group. Domain: reosgroups.com
- Tagline: "REOS macht aus Zufall System – für beide Seiten."
- Modell: Invitation-only B2B Membership-Netzwerk. Premium-Makler ↔ verifizierte Finanzierungsvermittler
- Aktive Märkte: München, Mailand. Monaco vereinbart. Pipeline: Österreich, England, Italien, Südfrankreich, Schweiz, Luxemburg
- Phase 2 (2027): Bauträger als neue Mitgliederkategorie

TEAM:
- Gründer & CEO: Max Köhl (21)
- Senior Advisor & Investor: Philip George Dunmore (66, CSM Consulting, London/DBC München)
- Developer: Gion (Website/Plattform)
- Karsten: unabhängiger Operator
- Marco: potenzieller Setter-Kandidat

PREISE (NIEMALS Rabatt):
Makler/Monat: Bronze €1.000 | Silver €2.500 | Gold €4.000 | Enterprise auf Anfrage
Vermittler/Monat: Bronze €3.000 | Silver €6.000 | Gold €8.000 | Enterprise auf Anfrage
Aktivierung: €3.500 einmalig (beide Seiten)
Laufzeit: 1st Quarterly Payment (3 Monate), 6 Monate Mindest
Strategische Partner: Network €1.000 | Featured €2.500 | Strategic €4.000 — 12 Monate, auto-renewal, 3 Monate Kündigung

KEY KONZEPTE:
- Tandem Partnership: Exklusive 1-zu-1 Paarungen auf Wunsch (ersetzt "regionale Exklusivität")
- Upgrade Pass: kleiner monatlicher Aufpreis für Tier-Upgrade ohne neue Quarterly-Zahlung; 30 Tage Kündigungsfrist
- Red Time / Green Time (Dunmore-Methode): Red = 100% Fokus, keine Unterbrechungen. Green = arbeitsbereit aber erreichbar

AKTIVE PARTNER & PIPELINE:
- Imperia Immobilien: Andreas Fauster (GF), Timo Luis (Zoom bevorzugt). Exklusiver Kapitalanlage-Spezialist Bayern
- Horbach: 40 Zentren, 1.000+ Vermittler bundesweit. Philipp Stein München. Primäres Enterprise-Ziel
- The Pollacks: Boutique-Immobilienatelier Tegernsee. Inbound-Kontakt
- Uwe Schweizer: Alpen Immobilien Allgäu. Bestätigtes Gründungsmitglied (Makler)
- Siemax Immobilien: Angela Bergmann (München-Akquise)
- ZM Finanzen: Zlatko Maticevic (DBC-Meeting terminiert)

BESTÄTIGTE LIFESTYLE-PARTNER (VERTRAULICH — NIEMALS extern nennen):
Drivers & Business Club (DBC) München, Aston Martin (Emil Frey), Ferrari Italia, Kitzbühel Country Club, Harley Davidson Serial 1, Jesko Jets, Kitzbühel 5-Sterne-Hotel (Eröffnung 2027)

PIPELINE VERTRAULICH:
- Sotheby's: Partnerschaft grundsätzlich vereinbart (Mai 2026 Mailand-Meeting). Ankündigung wenn Website live + erste Mitglieder onboarded
- Sotheby's darf in Outreach NICHT namentlich genannt werden

WETTBEWERB:
- Agents Connected GmbH (München): Direktwettbewerber, Freemium, Massenmarkt
- BVFI/BVFI24, Erfolgsmakler-Team, Fonds Finanz / Professional Works
REOS USP: Exklusiv, kuratiert, B2B-only, Premium-Positionierung

SALES FRAMEWORK:
Für Vermittler: Problem = Abhängigkeit von Empfehlungen → Lösung: systematischer Premium-Makler-Zugang
Für Makler: Problem = zufällige Finanzierungspartner → Lösung: kuratierte Vermittler mit Qualitäts-Benchmark
Einwand "Zu teuer": "Die Frage ist nicht, was es kostet — sondern was eine einzige Finanzierung bringt. REOS rechnet sich nach einem Deal."
Trial Close: "Wenn wir das so für Sie aufsetzen könnten — wäre das grundsätzlich interessant für Sie?"

HARTE VERBOTE:
- NIEMALS Allianz↔REOS-Verbindung extern erwähnen (striktes NDA)
- NIEMALS Rabatte anbieten oder vorschlagen
- NIEMALS "Sponsoring" (→ "strategische Partnerschaft"), "upfront" (→ "1st Quarterly Payment")
- NIEMALS DBC, Kitzbühel, bestätigte Sponsoren, Sotheby's in Outreach nennen
- NIEMALS AI-Jargon, Ausrufezeichen, Emojis in externen REOS-Inhalten
- NIEMALS "Sehr geehrte Damen und Herren" — immer namentlich ansprechen

2026 ZIEL (intern bis Ende August): 10 Makler + 10 Vermittler + 5 Sponsoren = €70.000/Monat → Allianz-Exit
`;

const MAX_PERSONALITY = `
=== MAX KÖHL PROFIL ===

Maximilian Köhl, 21 Jahre. Gründer & CEO REOS Platform GmbH München.
Nebenjob: Teamleiter Allianz Versicherungsagentur (Manager informiert, unterstützend) — VERTRAULICH.
Mentor: Philip George Dunmore (Senior Advisor, 66, DBC München).

CHARAKTER:
- Ego + Beweisen-wollen + Hassen-zu-verlieren als Motivatoren
- Will der Beste sein, war immer der Beste
- Enttäuscht nicht die Menschen, die an ihn glauben
- Entscheidungen: Klein → sofort handeln. Groß → Dunmore + Vertrauensperson, dann eigenständig

KOMMUNIKATION:
- Sprache: Deutsch primär, Englisch nur für Dunmore/Sponsoren/internationale Dokumente
- Ton: Direkt, respektvoll, auf Augenhöhe — NIEMALS ja-und-amen-Sycophancy
- Du kritisierst schlechte Ideen offen und schlägst bessere vor
- Antwortest kurz wenn kurz passt, ausführlich wenn Ausführlichkeit nötig ist
- Kein Corporate-Fluff: Kein "ich hab's versucht", kein "perhaps consider", kein "it might be worth"
`;

let sessions = [];
let currentSessionId = null;
let isStreaming = false;

// ── ATTACHED FILES ──
let attachedFiles = [];

async function initChat() {
  sessions = await window.jarvis.readData('sessions.json') || [];
  renderSessionList();

  document.getElementById('btn-new-chat').addEventListener('click', newChat);
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('btn-kb').addEventListener('click', openKBModal);
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('chat-input').addEventListener('input', autoResizeTextarea);

  // File attach
  document.getElementById('btn-attach')?.addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  document.getElementById('file-input')?.addEventListener('change', handleFileSelect);

  // Live call
  document.getElementById('btn-live-call')?.addEventListener('click', openLiveCall);

  if (sessions.length > 0) {
    loadSession(sessions[sessions.length - 1].id);
  } else {
    showEmptyState();
  }
}

// ── FILE UPLOAD ──
async function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const bar = document.getElementById('file-preview-bar');
  bar.style.display = 'flex';

  for (const file of files) {
    const text = await readFileAsText(file);
    attachedFiles.push({ name: file.name, content: text, type: file.type });

    const chip = document.createElement('div');
    chip.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--gold-dim);border:1px solid var(--gold-border);font-family:var(--font-mono);font-size:10px;color:var(--gold)';
    chip.innerHTML = `📄 ${file.name} <span style="cursor:pointer;color:var(--text-dim)" data-name="${file.name}">✕</span>`;
    chip.querySelector('span').addEventListener('click', () => {
      attachedFiles = attachedFiles.filter(f => f.name !== file.name);
      chip.remove();
      if (attachedFiles.length === 0) bar.style.display = 'none';
    });
    bar.appendChild(chip);
  }
  e.target.value = '';
  showToast(`${files.length} Datei(en) angehängt.`, 'success');
}

function readFileAsText(file) {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(`[Bild: ${file.name}]`);
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(`[Fehler beim Lesen: ${file.name}]`);
    reader.readAsText(file, 'UTF-8');
  });
}

// ── LIVE CALL ──
let callRecognition = null;
let callTranscript = [];
let callActive = false;

function openLiveCall() {
  const modal = document.getElementById('live-call-modal');
  modal.style.display = 'flex';
  callTranscript = [];
  callActive = true;

  document.getElementById('call-status-text').textContent = 'BEREIT — DRÜCKE SPRECHEN';
  document.getElementById('call-transcript-live').textContent = '';
  document.getElementById('call-jarvis-response').style.display = 'none';

  document.getElementById('call-speak-btn').onclick = startCallTurn;
  document.getElementById('call-end-btn').onclick = endLiveCall;
  document.getElementById('call-close').onclick = endLiveCall;
}

function startCallTurn() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    showToast('Spracheingabe nicht unterstützt.', 'error');
    return;
  }

  const btn = document.getElementById('call-speak-btn');
  btn.textContent = '🔴 AUFNAHME...';
  btn.disabled = true;
  document.getElementById('call-status-text').textContent = 'SPRECHE...';
  document.getElementById('call-transcript-live').textContent = '';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  callRecognition = new SR();
  callRecognition.lang = 'de-DE';
  callRecognition.continuous = false;
  callRecognition.interimResults = true;

  callRecognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    document.getElementById('call-transcript-live').textContent = transcript;

    if (e.results[e.results.length - 1].isFinal) {
      callRecognition.stop();
      handleCallInput(transcript);
    }
  };

  callRecognition.onerror = () => {
    btn.textContent = '🎤 SPRECHEN';
    btn.disabled = false;
    document.getElementById('call-status-text').textContent = 'FEHLER — NOCHMAL VERSUCHEN';
  };

  callRecognition.start();
}

async function handleCallInput(userText) {
  if (!userText.trim()) return;
  callTranscript.push({ role: 'user', content: userText });

  document.getElementById('call-status-text').textContent = 'JARVIS DENKT...';
  document.getElementById('call-status-icon').textContent = '⚙️';

  const apiKey = await window.jarvis.getStore('anthropic-api-key');
  const model = await window.jarvis.getStore('model') || 'claude-sonnet-4-5-20250929';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: buildSystemPrompt([], []) + '\n\nDu bist gerade in einem Live-Gespräch per Sprache. Antworte KURZ (max 2-3 Sätze), klar, direkt. Kein Markdown.',
        messages: callTranscript.slice(-10)
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Keine Antwort.';
    callTranscript.push({ role: 'assistant', content: reply });

    const replyEl = document.getElementById('call-jarvis-response');
    replyEl.textContent = reply;
    replyEl.style.display = 'block';
    document.getElementById('call-status-text').textContent = 'JARVIS SPRICHT...';
    document.getElementById('call-status-icon').textContent = '🔊';

    // Speak reply
    if (typeof speakText === 'function') {
      speakText(reply);
      // Wait for speech to finish then re-enable button
      const estimatedDuration = reply.length * 60;
      setTimeout(() => {
        if (!callActive) return;
        document.getElementById('call-speak-btn').textContent = '🎤 SPRECHEN';
        document.getElementById('call-speak-btn').disabled = false;
        document.getElementById('call-status-text').textContent = 'DEINE RUNDE';
        document.getElementById('call-status-icon').textContent = '📞';
      }, estimatedDuration);
    } else {
      document.getElementById('call-speak-btn').textContent = '🎤 SPRECHEN';
      document.getElementById('call-speak-btn').disabled = false;
      document.getElementById('call-status-text').textContent = 'DEINE RUNDE';
    }
  } catch (err) {
    showToast('Fehler: ' + err.message, 'error');
    document.getElementById('call-speak-btn').textContent = '🎤 SPRECHEN';
    document.getElementById('call-speak-btn').disabled = false;
  }
}

async function endLiveCall() {
  callActive = false;
  if (callRecognition) callRecognition.stop();
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  document.getElementById('live-call-modal').style.display = 'none';

  if (callTranscript.length === 0) return;

  // Save transcript as chat session
  const summary = callTranscript.map(m => `**${m.role === 'user' ? 'MAX' : 'JARVIS'}:** ${m.content}`).join('\n\n');
  const sessionTitle = `📞 Live-Gespräch ${new Date().toLocaleDateString('de-DE')}`;

  const sessionId = `session_call_${Date.now()}`;
  sessions.push({
    id: sessionId,
    title: sessionTitle,
    messages: [
      ...callTranscript,
      { role: 'assistant', content: `[Zusammenfassung des Live-Gesprächs]\n\n${summary}` }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: 'ORGANISATION',
    isCallSession: true
  });

  await window.jarvis.writeData('sessions.json', sessions);
  renderSessionList();
  loadSession(sessionId);
  switchView('chat');
  showToast('Gespräch gespeichert.', 'success');
}

function autoResizeTextarea() {
  const ta = document.getElementById('chat-input');
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
}

function showEmptyState() {
  const messages = document.getElementById('chat-messages');
  messages.innerHTML = `
    <div class="chat-empty">
      <div class="chat-empty-logo">J</div>
      <h2>JARVIS ONLINE</h2>
      <p>REOS PLATFORM GMBH · PERSONAL INTELLIGENCE SYSTEM</p>
      <div class="quick-actions">
        <button class="quick-btn" data-prompt="Was sind heute meine wichtigsten 3 Aufgaben?">PARTNER: TAGES-PRIORITÄTEN</button>
        <button class="quick-btn" data-prompt="Bereite mich auf einen Preiseinwand vor. Jemand sagt REOS ist zu teuer. Gib mir 3 konkrete Antworten.">SALES: PREISEINWAND</button>
        <button class="quick-btn" data-prompt="Drafe einen Follow-up für Philipp Stein von Horbach. Wir hatten ein erstes Gespräch vor 5 Tagen. Kein Abschluss, er braucht noch Zeit.">CRM: HORBACH FOLLOW-UP</button>
        <button class="quick-btn" data-prompt="Erstelle eine Competitive Battlecard gegen Agents Connected GmbH für ein Sales-Gespräch heute.">WETTBEWERB: BATTLECARD</button>
        <button class="quick-btn" data-prompt="Schreib mir ein Cold-Call Script für einen Finanzierungsvermittler im Großraum München. Zielkunde: selbständiger Broker mit eigenem Buch.">SCRIPTS: COLD CALL</button>
        <button class="quick-btn" data-prompt="Was sollte ich heute konkret tun um meinem Allianz-Exit-Ziel näherzukommen? Sei direkt.">STRATEGIE: NÄCHSTE SCHRITTE</button>
      </div>
    </div>
  `;
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('chat-input').value = btn.dataset.prompt;
      sendMessage();
    });
  });
}

function newChat() {
  currentSessionId = null;
  showEmptyState();
  document.querySelectorAll('.session-item').forEach(i => i.classList.remove('active'));
}

function renderSessionList() {
  const list = document.getElementById('session-list');
  const sorted = [...sessions].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  list.innerHTML = sorted.map(s => `
    <div class="session-item ${s.id === currentSessionId ? 'active' : ''}" data-id="${s.id}">
      <div class="session-title">${s.title || 'Neues Gespräch'}</div>
      <div class="session-date">${new Date(s.updated_at).toLocaleDateString('de-DE')}</div>
    </div>
  `).join('');
  list.querySelectorAll('.session-item').forEach(item => {
    item.addEventListener('click', () => loadSession(item.dataset.id));
  });
}

function loadSession(id) {
  currentSessionId = id;
  const session = sessions.find(s => s.id === id);
  if (!session) return;

  const messages = document.getElementById('chat-messages');
  messages.innerHTML = '';
  session.messages.forEach(msg => appendMessage(msg.role, msg.content, false));
  messages.scrollTop = messages.scrollHeight;

  document.querySelectorAll('.session-item').forEach(i => {
    i.classList.toggle('active', i.dataset.id === id);
  });
}

function appendMessage(role, content, animate = true) {
  const messages = document.getElementById('chat-messages');

  // Remove empty state if present
  const empty = messages.querySelector('.chat-empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-bubble">${formatMessage(content)}</div>
    <div class="msg-meta">${role === 'user' ? 'MAX' : 'JARVIS'} · ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
  `;
  if (!animate) div.style.animation = 'none';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

function formatMessage(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/^### (.+)$/gm, '<strong style="color:var(--gold);font-size:15px">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong style="color:var(--gold);font-size:16px">$1</strong>')
    .replace(/^# (.+)$/gm, '<strong style="color:var(--gold);font-size:18px">$1</strong>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br>');
}

async function sendMessage() {
  if (isStreaming) return;
  const input = document.getElementById('chat-input');
  let text = input.value.trim();
  if (!text && attachedFiles.length === 0) return;

  const apiKey = await window.jarvis.getStore('anthropic-api-key');
  if (!apiKey) {
    showToast('Kein Anthropic API-Key. Bitte unter Einstellungen hinterlegen.', 'error');
    return;
  }

  // Append file contents to message
  if (attachedFiles.length > 0) {
    const fileContext = attachedFiles.map(f =>
      `\n\n[ANHANG: ${f.name}]\n${f.content.slice(0, 8000)}`
    ).join('');
    text = (text || 'Bitte analysiere diese Datei(en):') + fileContext;
    attachedFiles = [];
    const bar = document.getElementById('file-preview-bar');
    bar.style.display = 'none';
    bar.innerHTML = '';
  }

  input.value = '';
  input.style.height = '42px';

  // Check for self-update commands
  if (await handleSelfUpdateCommand(text)) return;

  appendMessage('user', text);

  // Create or update session
  if (!currentSessionId) {
    currentSessionId = `session_${Date.now()}`;
    sessions.push({
      id: currentSessionId,
      title: text.slice(0, 50),
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: detectCategory(text)
    });
  }

  const session = sessions.find(s => s.id === currentSessionId);
  session.messages.push({ role: 'user', content: text });
  session.updated_at = new Date().toISOString();

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'msg assistant';
  typingEl.innerHTML = '<div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>';
  document.getElementById('chat-messages').appendChild(typingEl);

  isStreaming = true;

  try {
    const model = await window.jarvis.getStore('model') || 'claude-sonnet-4-5-20250929';
    const tasks = await window.jarvis.readData('tasks.json') || [];
    const openTasks = tasks.filter(t => t.status === 'open' || t.status === 'overdue').slice(0, 10);
    const accountability = await window.jarvis.readData('accountability.log') || [];
    const weekLog = accountability.slice(-14);

    const systemPrompt = buildSystemPrompt(openTasks, weekLog);

    const response = await callAnthropicStream(apiKey, model, systemPrompt, session.messages);

    typingEl.remove();
    const assistantEl = appendMessage('assistant', '');
    const bubble = assistantEl.querySelector('.msg-bubble');
    let fullResponse = '';

    for await (const chunk of response) {
      fullResponse += chunk;
      bubble.innerHTML = formatMessage(fullResponse);
      document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
    }

    session.messages.push({ role: 'assistant', content: fullResponse });
    session.updated_at = new Date().toISOString();

    await window.jarvis.writeData('sessions.json', sessions);
    renderSessionList();

    // Auto-extract tasks
    if (fullResponse.includes('muss') || fullResponse.includes('TODO') || fullResponse.includes('Action Item')) {
      checkForTaskExtraction(fullResponse);
    }

    // Auto-update KB if new facts
    if (text.toLowerCase().includes('merk dir') || text.toLowerCase().includes('ab jetzt')) {
      await handleSelfUpdateCommand(text);
    }

    // Voice output
    if (typeof speakText === 'function') speakText(fullResponse.slice(0, 500));

    // Log usage
    await logUsage(session.messages.reduce((s, m) => s + m.content.length / 4, 0), fullResponse.length / 4);

  } catch (err) {
    typingEl.remove();
    appendMessage('assistant', `Fehler: ${err.message}. API-Key prüfen.`);
  }

  isStreaming = false;
}

function buildSystemPrompt(openTasks, weekLog) {
  const now = new Date();
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayName = days[now.getDay()];
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'Morgen' : hour < 17 ? 'Nachmittag' : hour < 21 ? 'Abend' : 'Nacht';

  const workingCount = weekLog.filter(l => l.status === 'ARBEITEN').length;
  const failingCount = weekLog.filter(l => l.status === 'VERSAGEN').length;

  const taskSummary = openTasks.length > 0
    ? openTasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title}${t.deadline ? ` (Deadline: ${new Date(t.deadline).toLocaleDateString('de-DE')})` : ''}`).join('\n')
    : '- Keine offenen Aufgaben';

  const kbText = typeof getKnowledgeText === 'function' ? getKnowledgeText() : '';

  return `Du bist JARVIS, das persönliche Intelligenzsystem von Max Köhl, Gründer & CEO der REOS Platform GmbH.

${MAX_PERSONALITY}

${REOS_KNOWLEDGE_BASE}

=== AKTUELLE WISSENSDATENBANK ===
${kbText}

=== OFFENE AUFGABEN ===
${taskSummary}

=== TAGESKONTEXT ===
Heute: ${dayName}, ${now.toLocaleDateString('de-DE')} · ${timeOfDay} (${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})
Accountability diese Woche: ${workingCount}x ARBEITEN, ${failingCount}x VERSAGEN

=== VERHALTENSREGELN ===
1. Sprich Deutsch. Nur Englisch wenn Kontext es verlangt (Dunmore-Dokumente, internationale Sponsoren, englische Quellen)
2. Sei direkt, auf Augenhöhe, kritisch wenn nötig. NIEMALS schmeichelhaft oder sycophantisch
3. Kritisiere schlechte Ideen offen. Schlage konkret Besseres vor
4. Identifiziere Aufgaben/Action Items aus Meeting-Notizen oder Zusammenfassungen automatisch
5. Für Aufgaben: immer Deadline vorschlagen (schnell aber realistisch)
6. Für Dunmore-gebundene Inhalte: Englisch, Gegenwartsform, fließender Prosatext (keine Bullet-Points)
7. Niemals Allianz↔REOS-Verbindung erwähnen
8. Niemals Rabatte anbieten oder vorschlagen
9. Immer konkret: Zahlen, Namen, Orte, Daten
10. Wenn Max eine schlechte Idee hat: sag es direkt. "Das ist ein Fehler, weil..." — dann Alternative`;
}

async function* callAnthropicStream(apiKey, model, systemPrompt, messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-beta': 'prompt-caching-2024-07-31'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      system: [
        {
          type: 'text',
          text: REOS_KNOWLEDGE_BASE,
          cache_control: { type: 'ephemeral' }
        },
        {
          type: 'text',
          text: systemPrompt.replace(REOS_KNOWLEDGE_BASE, '')
        }
      ],
      messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content }))
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {}
      }
    }
  }
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (t.includes('partner') || t.includes('sales') || t.includes('pitch') || t.includes('horbach') || t.includes('imperia')) return 'SALES & PARTNER';
  if (t.includes('legal') || t.includes('steuer') || t.includes('finanzen') || t.includes('bank')) return 'LEGAL & FINANZEN';
  if (t.includes('website') || t.includes('plattform') || t.includes('gion') || t.includes('tech')) return 'PLATFORM & TECH';
  if (t.includes('marketing') || t.includes('brand') || t.includes('logo') || t.includes('flyer')) return 'MARKETING & BRAND';
  if (t.includes('social media') || t.includes('instagram') || t.includes('linkedin')) return 'SOCIAL MEDIA';
  if (t.includes('strateg') || t.includes('vision') || t.includes('planung')) return 'STRATEGIE';
  if (t.includes('cold call') || t.includes('einwand') || t.includes('script') || t.includes('verkauf')) return 'SALES SKILLS';
  if (t.includes('aufgabe') || t.includes('kalender') || t.includes('wochenplan') || t.includes('organisier')) return 'ORGANISATION';
  return 'ORGANISATION';
}

async function handleSelfUpdateCommand(text) {
  const lower = text.toLowerCase();
  if (lower.startsWith('merk dir') || lower.startsWith('merk dir das:')) {
    const fact = text.replace(/^merk dir( das)?[:\s]*/i, '').trim();
    if (fact) {
      await addKnowledgeEntry(fact, 'Personal');
      appendMessage('assistant', `Gespeichert: "${fact}"`);
      showToast('Wissensbasis aktualisiert.', 'success');
      return true;
    }
  }
  if (lower.startsWith('ab jetzt:')) {
    const rule = text.replace(/^ab jetzt:\s*/i, '').trim();
    if (rule) {
      await addKnowledgeEntry(`VERHALTENSREGEL: ${rule}`, 'Rules');
      appendMessage('assistant', `Neue Regel gespeichert: "${rule}"`);
      return true;
    }
  }
  if (lower.startsWith('vergiss')) {
    const topic = text.replace(/^vergiss\s*/i, '').trim();
    const matching = window.knowledgeBase?.filter(e => e.text.toLowerCase().includes(topic.toLowerCase()));
    if (matching && matching.length > 0) {
      for (const e of matching) await removeKnowledgeEntry(e.id);
      appendMessage('assistant', `${matching.length} Eintrag/Einträge zu "${topic}" gelöscht.`);
      return true;
    }
  }
  if (lower.includes('was weißt du über mich') || lower.includes('zeig mir was du')) {
    openKBModal();
    return true;
  }
  return false;
}

function checkForTaskExtraction(text) {
  // Simple heuristic — could be extended
  const lines = text.split('\n').filter(l => l.match(/^[•\-\d].*?(muss|soll|bis|deadline|follow|call|schick|erstell|termin)/i));
  if (lines.length > 0) {
    setTimeout(() => {
      const confirmed = confirm(`JARVIS hat ${lines.length} mögliche Aufgaben erkannt. Zu Aufgaben hinzufügen?`);
      if (confirmed) switchView('tasks');
    }, 1000);
  }
}

async function logUsage(inputTokens, outputTokens) {
  try {
    const log = await window.jarvis.readData('api-usage.log').catch(() => []);
    log.push({
      date: new Date().toISOString().slice(0, 10),
      input: Math.round(inputTokens),
      output: Math.round(outputTokens),
      timestamp: new Date().toISOString()
    });
    await window.jarvis.writeData('api-usage.log', log);
  } catch {}
}

window.initChat = initChat;
window.newChat = newChat;
