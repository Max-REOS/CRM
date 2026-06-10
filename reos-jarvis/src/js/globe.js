// REOS JARVIS — Chat Universe Globe (globe.js)

const CONTINENTS = {
  'SALES & PARTNER':   { color: '#C9A84C', lat: 28,  lng: 15  },
  'LEGAL & FINANZEN':  { color: '#5BA4FF', lat: -22, lng: 140 },
  'PLATFORM & TECH':   { color: '#5DDF7A', lat: 15,  lng: 240 },
  'MARKETING & BRAND': { color: '#FF6E6E', lat: -40, lng: 320 },
  'SOCIAL MEDIA':      { color: '#FFB347', lat: 5,   lng: 60  },
  'STRATEGIE':         { color: '#C47DFF', lat: 55,  lng: 200 },
  'SALES SKILLS':      { color: '#FF9A45', lat: -55, lng: 85  },
  'INTERNE TOOLS':     { color: '#3FF0E0', lat: 40,  lng: 295 },
  'ORGANISATION':      { color: '#FFFFFF', lat: 0,   lng: 0   }
};

const HUB_CHATS = ['REOS-SocialMedia', 'REOS_Organisieren', 'Elite-Member-Club Positionierung'];

const SEED_CHATS = [
  { id: 'chat_001', title: 'Elite-Member-Club Positionierung', category: 'SALES & PARTNER', date: '25.05.2026', isHub: true, summary: 'Positionierungsstrategie für das Elite-Mitglieder-Konzept. Fokus auf Exklusivität und kuratierte Zugänge.', tags: ['Positionierung', 'Elite', 'Mitgliedschaft'], decisions: ['Invitation-only bleibt strikt', 'Tandem-Partnership als USP hervorheben'] },
  { id: 'chat_002', title: 'Imperia – Discovery & Angebot', category: 'SALES & PARTNER', date: '29.04.2026', isHub: false, summary: 'Discovery-Gespräch mit Andreas Fauster und Timo Luis. Angebot Silver-Tier vorbereitet.', tags: ['Imperia', 'Discovery', 'Angebot'], decisions: ['Zoom-Termin mit Timo', 'Silver als Einstiegsempfehlung'] },
  { id: 'chat_003', title: 'Horbach Pitch Vorbereitung', category: 'SALES & PARTNER', date: '19.04.2026', isHub: false, summary: 'Vorbereitung auf Senior-Partner-Meeting bei Horbach. Enterprise-Paket skizziert.', tags: ['Horbach', 'Enterprise', 'Pitch', 'Stein'], decisions: ['DBC als Ort für Meeting'] },
  { id: 'chat_004', title: 'Pollacks Tegernsee Response', category: 'SALES & PARTNER', date: '28.04.2026', isHub: false, summary: 'Antwort auf Inbound-Anfrage von The Pollacks. Boutique-Positionierung passt gut zu REOS Premium.', tags: ['Pollacks', 'Tegernsee', 'Inbound'], decisions: ['Persönliches Erstgespräch bevorzugt'] },
  { id: 'chat_005', title: 'USt-IdNr & Steuerregistrierung', category: 'LEGAL & FINANZEN', date: '15.05.2026', isHub: false, summary: 'Beantragung USt-IdNr. Steuerregistrierung beim Finanzamt München abgeschlossen.', tags: ['USt-IdNr', 'Steuer', 'Finanzamt'], decisions: ['Steuerberater für Jahresabschluss 2026 beauftragen'] },
  { id: 'chat_006', title: 'CRS/FATCA Stadtsparkasse', category: 'LEGAL & FINANZEN', date: '15.04.2026', isHub: false, summary: 'Formular-Compliance für Geschäftskonto. CRS/FATCA abgehakt.', tags: ['FATCA', 'Compliance', 'Bank'], decisions: [] },
  { id: 'chat_007', title: 'Deutsche Bank Kontoeröffnung', category: 'LEGAL & FINANZEN', date: '14.04.2026', isHub: false, summary: 'Geschäftskonto bei Deutsche Bank eröffnet. SEPA-Mandate vorbereitet.', tags: ['Deutsche Bank', 'Konto', 'SEPA'], decisions: ['Deutsche Bank als primäre Geschäftsbank'] },
  { id: 'chat_008', title: 'Developer-Briefing (Gion)', category: 'PLATFORM & TECH', date: '09.05.2026', isHub: false, summary: 'Technisches Briefing mit Gion. Plattform-Features und Timeline besprochen.', tags: ['Gion', 'Plattform', 'Entwicklung'], decisions: ['Lead-Routing Priorisierung', 'Dual-Dashboard MVP'] },
  { id: 'chat_009', title: 'Website & KI-Bildprompts', category: 'PLATFORM & TECH', date: '16.05.2026', isHub: false, summary: 'Image-Prompts für Website-Visuals erstellt. Stil: premium, schwarz/gold, architectural.', tags: ['Website', 'AI-Bilder', 'Prompts'], decisions: ['Keine Stock-Photos', 'KI-generiert im REOS-Stil'] },
  { id: 'chat_010', title: 'REOS CRM via Claude Code', category: 'PLATFORM & TECH', date: '19.04.2026', isHub: false, summary: 'CRM-Aufbau für REOS Sales-Tracking. Leads, Follow-ups, Stages.', tags: ['CRM', 'Claude Code', 'Sales-Tracking'], decisions: ['Next.js CRM als internes Tool'] },
  { id: 'chat_011', title: 'Domain-Zugang für Gion', category: 'PLATFORM & TECH', date: '14.04.2026', isHub: false, summary: 'Zugangsdaten für reosgroups.com an Gion übergeben.', tags: ['Domain', 'Gion', 'Zugang'], decisions: [] },
  { id: 'chat_012', title: 'LinkedIn & Launch-Posts', category: 'MARKETING & BRAND', date: '03.05.2026', isHub: false, summary: 'Launch-Post Entwürfe für LinkedIn. Fokus auf professionellen Tone of Voice.', tags: ['LinkedIn', 'Launch', 'Content'], decisions: ['Kein AI-Jargon', 'Kein Fremdwort-Overload'] },
  { id: 'chat_013', title: 'Auto-Aufkleber Slogan', category: 'MARKETING & BRAND', date: '28.04.2026', isHub: false, summary: '"Grow Together. Close More." — finaler Slogan für Auto-Aufkleber.', tags: ['Slogan', 'Brand', 'Design'], decisions: ['Schwarz/Gold, schlicht'] },
  { id: 'chat_014', title: 'A4-Flyer & SEPA-Mandate', category: 'MARKETING & BRAND', date: '16.05.2026', isHub: false, summary: 'A4-Flyer-Design und SEPA-Mandat-Vorlage erstellt.', tags: ['Flyer', 'SEPA', 'Design'], decisions: ['Off-White Variante für SEPA'] },
  { id: 'chat_015', title: 'REOS-SocialMedia', category: 'SOCIAL MEDIA', date: '10.06.2026', isHub: true, summary: 'Vollständiges Social-Media-Playbook für REOS. Instagram-Ästhetik, LinkedIn institutional.', tags: ['Playbook', 'Instagram', 'LinkedIn'], decisions: ['Kein Paid Advertising', 'Pull-only Strategie'] },
  { id: 'chat_016', title: 'BTB Yacht Week Sponsoring', category: 'STRATEGIE', date: '19.04.2026', isHub: false, summary: 'Bewertung Yacht-Week-Sponsoring als Brand-Event für REOS.', tags: ['Event', 'Sponsoring', 'Brand'], decisions: ['Erst nach ersten 10 Mitgliedern evaluieren'] },
  { id: 'chat_017', title: 'Wettbewerber-Analyse', category: 'STRATEGIE', date: '04.05.2026', isHub: false, summary: 'Tiefenanalyse Agents Connected, BVFI, Erfolgsmakler-Team. REOS-Differenzierungsmerkmale.', tags: ['Wettbewerb', 'Analyse', 'Differenzierung'], decisions: ['Premium bleibt absolut, kein Freemium'] },
  { id: 'chat_018', title: 'Trial Close Psychologie', category: 'SALES SKILLS', date: '15.04.2026', isHub: false, summary: 'Trial Close Formel und Psychologie des Abschlusses. "Wenn wir das so aufsetzen könnten..."', tags: ['Trial Close', 'Psychologie', 'Abschluss'], decisions: ['Trial Close in jedes Sales-Gespräch einbauen'] },
  { id: 'chat_019', title: 'Social Media für Dunmore', category: 'INTERNE TOOLS', date: '10.06.2026', isHub: false, summary: 'Dunmore Social-Media-Strategie für persönliches Profil und REOS-Bezug.', tags: ['Dunmore', 'Social Media', 'Strategie'], decisions: ['LinkedIn primär für Dunmore'] },
  { id: 'chat_020', title: 'REOS_Organisieren', category: 'ORGANISATION', date: '10.06.2026', isHub: true, summary: 'Zentrale Organisationsstruktur: Wochenplan, Red/Green Time, Prioritäten-Framework.', tags: ['Organisation', 'Wochenplan', 'Red/Green Time'], decisions: ['Red Time: 23:00-01:00 absolut schützen'] }
];

let canvas, ctx;
let rotX = 0.3, rotY = 0;
let targetRotX = 0.3, targetRotY = 0;
let isDragging = false, lastMX = 0, lastMY = 0;
let velX = 0, velY = 0;
let zoom = 1.0;
let hoveredNode = null;
let selectedNode = null;
let animFrame = null;
let stars = [];
let globeLogoImg = null;
let chats = [];

function initGlobe() {
  canvas = document.getElementById('globe-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  chats = [...SEED_CHATS];
  generateStars(220);
  setupGlobeEvents();
  renderGlobe();

  document.getElementById('detail-close')?.addEventListener('click', closeDetail);
  document.getElementById('detail-open-chat')?.addEventListener('click', () => {
    if (selectedNode) {
      window.switchView('chat');
      showToast(`Gespräch "${selectedNode.title}" geöffnet.`);
    }
  });
}

function generateStars(count) {
  stars = Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.5 + 0.3,
    alpha: Math.random() * 0.7 + 0.2,
    twinkleSpeed: Math.random() * 0.02 + 0.005,
    twinklePhase: Math.random() * Math.PI * 2
  }));
}

function setupGlobeEvents() {
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMX = e.clientX;
    lastMY = e.clientY;
    velX = velY = 0;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMX;
      const dy = e.clientY - lastMY;
      velY = dx * 0.005;
      velX = dy * 0.005;
      targetRotY += dx * 0.005;
      targetRotX += dy * 0.005;
      targetRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotX));
      lastMX = e.clientX;
      lastMY = e.clientY;
    } else {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      hoveredNode = findNodeAt(mx, my);
      updateTooltip(hoveredNode, e.clientX, e.clientY);
      canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
    }
  });

  canvas.addEventListener('click', (e) => {
    if (hoveredNode) {
      selectedNode = hoveredNode;
      showDetail(selectedNode);
    }
  });

  canvas.addEventListener('wheel', (e) => {
    zoom *= e.deltaY > 0 ? 0.92 : 1.08;
    zoom = Math.max(0.45, Math.min(2.8, zoom));
    e.preventDefault();
  }, { passive: false });

  // Touch support
  let lastPinchDist = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      lastMX = e.touches[0].clientX;
      lastMY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastMX;
      const dy = e.touches[0].clientY - lastMY;
      targetRotY += dx * 0.005;
      targetRotX += dy * 0.005;
      targetRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotX));
      lastMX = e.touches[0].clientX;
      lastMY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      zoom *= dist / lastPinchDist;
      zoom = Math.max(0.45, Math.min(2.8, zoom));
      lastPinchDist = dist;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => { isDragging = false; });
}

function project(lat, lng, rotX, rotY, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  let x = -radius * Math.sin(phi) * Math.cos(theta);
  let y = radius * Math.cos(phi);
  let z = radius * Math.sin(phi) * Math.sin(theta);

  // Rotate around X axis
  const y2 = y * Math.cos(rotX) - z * Math.sin(rotX);
  const z2 = y * Math.sin(rotX) + z * Math.cos(rotX);
  // Rotate around Y axis
  const x3 = x * Math.cos(rotY) + z2 * Math.sin(rotY);
  const z3 = -x * Math.sin(rotY) + z2 * Math.cos(rotY);

  return { x: x3, y: y2, z: z3 };
}

function findNodeAt(mx, my) {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.38 * zoom;

  for (const chat of chats) {
    const cont = CONTINENTS[chat.category];
    if (!cont) continue;
    const p = project(cont.lat, cont.lng, rotX, rotY, R);
    if (p.z < 0) continue;
    const px = cx + p.x;
    const py = cy - p.y;
    const nodeR = chat.isHub ? 11 : 7;
    const dist = Math.hypot(mx - px, my - py);
    if (dist <= nodeR * 1.5) return chat;
  }
  return null;
}

function updateTooltip(node, mx, my) {
  const tooltip = document.getElementById('globe-tooltip');
  if (!node) { tooltip.style.display = 'none'; return; }
  const cont = CONTINENTS[node.category] || {};
  tooltip.style.display = 'block';
  tooltip.style.left = (mx + 16) + 'px';
  tooltip.style.top = (my - 20) + 'px';
  tooltip.innerHTML = `
    <div class="tooltip-cat" style="color:${cont.color || '#C9A84C'}">${node.category}</div>
    <div class="tooltip-title">${node.isHub ? '⬡ ' : ''}${node.title}</div>
    <div class="tooltip-date">${node.date}</div>
    <div class="tooltip-hint">→ KLICKEN FÜR DETAILS</div>
  `;
}

function showDetail(node) {
  const panel = document.getElementById('globe-detail');
  const cont = CONTINENTS[node.category] || {};

  document.getElementById('detail-cat').textContent = node.category;
  document.getElementById('detail-cat').style.color = cont.color || '#C9A84C';
  document.getElementById('detail-hub-badge').style.display = node.isHub ? 'inline-block' : 'none';
  document.getElementById('detail-title').textContent = (node.isHub ? '⬡ ' : '') + node.title;
  document.getElementById('detail-date').textContent = node.date;
  document.getElementById('detail-summary').textContent = node.summary || '—';
  document.getElementById('detail-tags').innerHTML = (node.tags || []).map(t => `<span class="detail-tag">${t}</span>`).join('');
  document.getElementById('detail-decisions').innerHTML = (node.decisions || []).map(d => `<div>• ${d}</div>`).join('') || '—';

  panel.classList.add('open');
}

function closeDetail() {
  document.getElementById('globe-detail').classList.remove('open');
  selectedNode = null;
}

let frameCount = 0;

function renderGlobe() {
  animFrame = requestAnimationFrame(renderGlobe);
  frameCount++;

  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  if (canvas.width !== W * window.devicePixelRatio) {
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  ctx.clearRect(0, 0, W, H);

  // Deep space background
  const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.8);
  bgGrad.addColorStop(0, '#050d1a');
  bgGrad.addColorStop(1, '#020408');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (const star of stars) {
    star.twinklePhase += star.twinkleSpeed;
    const alpha = star.alpha * (0.6 + 0.4 * Math.sin(star.twinklePhase));
    ctx.beginPath();
    ctx.arc(star.x * W, star.y * H, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(232,223,196,${alpha})`;
    ctx.fill();
  }

  if (!isDragging) {
    targetRotY += 0.0032;
    // Momentum
    rotX += (targetRotX - rotX) * 0.12;
    rotY += (targetRotY - rotY) * 0.12;
  } else {
    rotX = targetRotX;
    rotY = targetRotY;
  }

  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.38 * zoom;

  // Globe base
  const globeGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 0, cx, cy, R);
  globeGrad.addColorStop(0, 'rgba(30,50,80,0.8)');
  globeGrad.addColorStop(0.7, 'rgba(5,12,25,0.9)');
  globeGrad.addColorStop(1, 'rgba(2,4,8,0.95)');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = globeGrad;
  ctx.fill();

  // REOS Logo earth core (simulated since no actual file)
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = '#C9A84C';
  ctx.fill();
  ctx.globalAlpha = 0.04;
  ctx.font = `bold ${R * 0.3}px "Share Tech Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#C9A84C';
  ctx.fillText('REOS', cx, cy);
  ctx.restore();

  // Grid lines
  ctx.save();
  ctx.globalAlpha = 0.065;
  ctx.strokeStyle = '#C9A84C';
  ctx.lineWidth = 0.5;
  // Latitude lines
  for (let lat = -80; lat <= 80; lat += 20) {
    const isEquator = lat === 0;
    ctx.globalAlpha = isEquator ? 0.24 : 0.065;
    ctx.lineWidth = isEquator ? 1 : 0.5;
    ctx.beginPath();
    let first = true;
    for (let lng = -180; lng <= 180; lng += 3) {
      const p = project(lat, lng, rotX, rotY, R);
      if (p.z < 0) { first = true; continue; }
      const px = cx + p.x, py = cy - p.y;
      if (first) { ctx.moveTo(px, py); first = false; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Longitude lines
  ctx.globalAlpha = 0.065;
  ctx.lineWidth = 0.5;
  for (let lng = -180; lng <= 180; lng += 20) {
    ctx.beginPath();
    let first = true;
    for (let lat = -90; lat <= 90; lat += 3) {
      const p = project(lat, lng, rotX, rotY, R);
      if (p.z < 0) { first = true; continue; }
      const px = cx + p.x, py = cy - p.y;
      if (first) { ctx.moveTo(px, py); first = false; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Continent color patches
  for (const [name, cont] of Object.entries(CONTINENTS)) {
    const p = project(cont.lat, cont.lng, rotX, rotY, R);
    if (p.z < 0) continue;
    const px = cx + p.x, py = cy - p.y;
    const patchR = R * 0.14;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, patchR);
    grad.addColorStop(0, cont.color + '30');
    grad.addColorStop(1, cont.color + '00');
    ctx.beginPath();
    ctx.arc(px, py, patchR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Continent label at zoom > 0.65
    if (zoom > 0.65) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = cont.color;
      ctx.font = `${Math.max(8, 9 * zoom)}px "Share Tech Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(name, px, py - R * 0.1);
      ctx.restore();
    }
  }

  // Connections: cross-continent arcs from hub chats
  const hubNodes = chats.filter(c => c.isHub);
  for (const hub of hubNodes) {
    const hCont = CONTINENTS[hub.category];
    if (!hCont) continue;
    const hP = project(hCont.lat, hCont.lng, rotX, rotY, R);
    if (hP.z < 0) continue;
    const hPx = cx + hP.x, hPy = cy - hP.y;

    for (const [name, cont] of Object.entries(CONTINENTS)) {
      if (name === hub.category) continue;
      const tP = project(cont.lat, cont.lng, rotX, rotY, R);
      if (tP.z < 0) continue;
      const tPx = cx + tP.x, tPy = cy - tP.y;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#C9A84C';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(hPx, hPy);
      const mx2 = (hPx + tPx) / 2, my2 = (hPy + tPy) / 2 - R * 0.15;
      ctx.quadraticCurveTo(mx2, my2, tPx, tPy);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Sort back-to-front
  const nodeList = chats.map(chat => {
    const cont = CONTINENTS[chat.category];
    if (!cont) return null;
    const p = project(cont.lat, cont.lng, rotX, rotY, R);
    return { chat, p };
  }).filter(Boolean).sort((a, b) => a.p.z - b.p.z);

  // Draw nodes
  for (const { chat, p } of nodeList) {
    const cont = CONTINENTS[chat.category];
    const px = cx + p.x, py = cy - p.y;
    const inFront = p.z >= 0;
    const alpha = inFront ? 1 : 0.15;
    const baseR = chat.isHub ? 11 : 7;
    const isHovered = hoveredNode === chat;
    const isSelected = selectedNode === chat;
    const nodeR = baseR * (isHovered || isSelected ? 1.85 : 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (chat.isHub && inFront) {
      // Pulsing rings
      for (let i = 3; i >= 1; i--) {
        const pulse = Math.sin(frameCount * 0.04 + i) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(px, py, nodeR + i * 8 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = cont.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.15 * (1 - i * 0.25);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
    }

    if (isHovered || isSelected) {
      // Glow
      const glow = ctx.createRadialGradient(px, py, 0, px, py, nodeR * 2.5);
      glow.addColorStop(0, cont.color + '40');
      glow.addColorStop(1, cont.color + '00');
      ctx.beginPath();
      ctx.arc(px, py, nodeR * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    // Node fill
    const nodeGrad = ctx.createRadialGradient(px - nodeR * 0.3, py - nodeR * 0.3, 0, px, py, nodeR);
    nodeGrad.addColorStop(0, cont.color + 'ff');
    nodeGrad.addColorStop(1, cont.color + '88');
    ctx.beginPath();
    ctx.arc(px, py, nodeR, 0, Math.PI * 2);
    ctx.fillStyle = nodeGrad;
    ctx.fill();

    // Hub border ring
    if (chat.isHub) {
      ctx.beginPath();
      ctx.arc(px, py, nodeR + 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#C9A84C';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Label
    if (inFront && (zoom > 0.65 || chat.isHub)) {
      ctx.globalAlpha = alpha * (isHovered || isSelected ? 1 : 0.75);
      ctx.fillStyle = cont.color;
      ctx.font = `${chat.isHub ? 600 : 400} ${Math.max(9, 10 * zoom)}px "Rajdhani", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText((chat.isHub ? '⬡ ' : '') + chat.title.slice(0, 20), px, py + nodeR + 3);
    }

    ctx.restore();
  }

  // Atmosphere glow
  const atmoGrad = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.15);
  atmoGrad.addColorStop(0, 'rgba(201,168,76,0)');
  atmoGrad.addColorStop(0.6, 'rgba(201,168,76,0.04)');
  atmoGrad.addColorStop(1, 'rgba(201,168,76,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
  ctx.fillStyle = atmoGrad;
  ctx.fill();

  // Specular highlight
  ctx.save();
  ctx.globalAlpha = 0.12;
  const specGrad = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, 0, cx - R * 0.3, cy - R * 0.3, R * 0.55);
  specGrad.addColorStop(0, 'rgba(255,255,240,0.8)');
  specGrad.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = specGrad;
  ctx.fill();
  ctx.restore();
}

window.initGlobe = initGlobe;
