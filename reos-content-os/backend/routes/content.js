'use strict';

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { db } = require('../db/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Design System constant (embedded in all design-brief prompts) ──────────────
const DESIGN_SYSTEM = {
  style: 'Grow Acquisition / niksetting',
  description: 'Full-bleed photo background + Hero number + info box',
  colors: {
    background: '#0A0A0A',
    accent: '#C9A84C',
    text: '#FFFFFF',
    overlay: 'rgba(10,10,10,0.65)'
  },
  typography: {
    heroNumber: 'min 80px, bold, white or gold',
    headline: 'clean sans-serif, bold, white, 28–40px',
    body: 'clean sans-serif, regular/medium, white, 16–20px',
    infoBox: 'small caps or semi-bold label, gold accent, 14–16px'
  },
  layout: 'Each slide = full-bleed photo background + dark overlay + content elements',
  slideStructure: [
    'Cover slide: hook text + hero number/stat',
    '3–4 content slides: one key point per slide',
    'CTA slide: clear call-to-action + REOS branding'
  ]
};

// ─── REOS Brand Context (embedded in all prompts) ──────────────────────────────
const REOS_CONTEXT = `
REOS GROUP — VOLLSTÄNDIGER BRAND-KONTEXT:

Was ist REOS?
REOS ist eine exklusive B2B-Membership-Plattform, die Immobilienmakler und Baufinanzierer in Deutschland strukturiert zusammenbringt. Launch: 1. Mai 2026. München-basiert, deutschlandweit. "Members Only – by application." Pre-Launch-Phase.

ZIELGRUPPE 1 — IMMOBILIENMAKLER:
Hauptproblem: Unqualifizierte Kaufinteressenten ohne bestätigte Finanzierung kosten Zeit und Nerven. Abschlüsse scheitern spät im Prozess an der Finanzierung.
REOS-Lösung: Strukturierte, verlässliche Baufinanzierungspartner direkt im Netzwerk. Vorqualifizierte Leads mit bestätigter Kaufabsicht. Tandem-Partnerschaft mit festem Baufinanzierer. Schnellere Abschlüsse, weniger Leerläufe.
Preise: Bronze €1.000/Mo | Silver €2.500/Mo | Gold €4.000/Mo + €3.500 Joining Fee | 6 Monate Mindestlaufzeit

ZIELGRUPPE 2 — BAUFINANZIERER:
Hauptproblem: Kaltakquise, unqualifizierte Anfragen, keine festen Partnerstrukturen mit Maklern.
REOS-Lösung: Qualifizierte Kaufinteressenten mit konkretem Objekt und bestätigter Kaufabsicht landen direkt beim Berater. Keine Kaltakquise. Feste Maklerpartner. Mehr Abschlüsse pro Monat.
Welcome Gift: Harley Davidson E-Bike bei Beitritt.
Preise: Bronze €3.000/Mo | Silver €6.000/Mo | Gold €8.000/Mo + €3.500 Joining Fee + Harley Davidson E-Bike | 6 Monate Mindestlaufzeit | 1. Quartalszahlung upfront

POSITIONIERUNG:
- Premium, exklusiv, "by application only" — nicht jeder kommt rein
- Kein Social-Media-Guru-Stil, keine Floskeln
- Ton: direkt, professionell, auf Augenhöhe mit erfolgreichen Unternehmern
- Keine unverifizierten Statistiken verwenden (Pre-Launch)
- Stattdessen: Marktdaten, Branchenzahlen, Pain Points, Exklusivitäts-Framing
- Launch-Countdown und FOMO nutzen (Launch 1. Mai 2026)
- Referenz-Ästhetik: tuxedosociety (Ultra-Luxury Members Club), niksetting (Unternehmer-Content)

DESIGN:
- Schwarz (#0A0A0A) + Gold (#C9A84C)
- Dunkle, cineastische Fotos: Skyline bei Nacht, dunkle Bibliothek, Luxusautos bei Nacht, edle Architektur
- Vollbild-Foto + dunkles Overlay + goldene Elemente

CONTENT-PILLARS:
- Markt & Zahlen: Datenbasierte Marktanalysen als Credibility-Aufbau
- Makler-Know-how: Konkrete Vorteile für Makler durch REOS-Membership
- Baufinanzierer-Know-how: Konkrete Vorteile für Baufinanzierer durch REOS
- Exklusivität & Launch: Members Only, by application, Countdown zum 1. Mai 2026
- Pain Points: Die echten Probleme die REOS löst
`.trim();
function stripCodeFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

// ─── Core generation functions ──────────────────────────────────────────────────

/**
 * Generates a 6-post weekly content plan (Mon–Sat) based on news items.
 */
async function generateWeeklyPlan(newsItems, weekNumber) {
  const newsContext = newsItems.map((n, i) =>
    `[${i + 1}] "${n.headline}" (${n.source}, ${n.date}) — Key data: ${n.key_data}`
  ).join('\n');

  const systemPrompt = `Du bist der REOS Content Stratege. Erstelle hochwertige, konvertierende Social-Media-Posts für REOS Group.

${REOS_CONTEXT}

WICHTIG: Abwechslung zwischen Makler-fokussierten und Baufinanzierer-fokussierten Posts. Nutze Markt-News als Aufhänger für REOS-relevante Inhalte. Vermeide generisches Marketing-Sprech.`;

  const userPrompt = `Erstelle einen Wochenplan (KW ${weekNumber}) mit genau 6 Posts für Montag bis Samstag.

Aktuelle News-Grundlage:
${newsContext}

Gib mir ein JSON-Array mit genau 6 Objekten zurück:
[
  {
    "day": "Montag",
    "pillar": "Markt & Zahlen",
    "format": "Karussell",
    "title": "Titel des Posts",
    "hook": "Erster Satz / Hook-Zeile",
    "news_basis": "Welche News (Quelle + Headline) ist die Basis",
    "slide_count": 6
  }
]

Tage: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag.
Formats: Karussell, Reel, Single Post, Story.
Verteile die Content-Pillars sinnvoll über die Woche. Antworte NUR mit dem JSON-Array, kein Text drumherum.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Claude returned no text for weekly plan');

  const cleaned = stripCodeFences(textBlock.text);

  let posts;
  try {
    posts = JSON.parse(cleaned);
  } catch (err) {
    console.error('Weekly plan parse error. Raw response:', cleaned);
    throw new Error(`Failed to parse weekly plan JSON: ${err.message}`);
  }

  if (!Array.isArray(posts)) throw new Error('Weekly plan response is not an array');

  // Save to DB
  const insert = db.prepare(`
    INSERT INTO content_ideas (week_number, day, pillar, format, title, hook, news_basis, slide_count, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idea')
  `);

  const savedPosts = [];
  const insertMany = db.transaction((items) => {
    for (const post of items) {
      const result = insert.run(
        weekNumber,
        post.day || '',
        post.pillar || '',
        post.format || '',
        post.title || '',
        post.hook || '',
        post.news_basis || '',
        post.slide_count || 5
      );
      savedPosts.push({ ...post, id: result.lastInsertRowid, week_number: weekNumber, status: 'idea' });
    }
  });

  insertMany(posts);
  return savedPosts;
}

/**
 * Generates a slide-by-slide Canva design brief for a content idea.
 */
async function generateDesignBrief(contentIdea) {
  const designSystemText = `
DESIGN SYSTEM (niksetting / Grow Acquisition):
- Style: ${DESIGN_SYSTEM.style} — ${DESIGN_SYSTEM.description}
- Background: ${DESIGN_SYSTEM.colors.background} (almost black)
- Accent color: ${DESIGN_SYSTEM.colors.accent} (gold)
- Text: ${DESIGN_SYSTEM.colors.text}
- Overlay: ${DESIGN_SYSTEM.colors.overlay} over all photos
- Hero number: ${DESIGN_SYSTEM.typography.heroNumber}
- Headlines: ${DESIGN_SYSTEM.typography.headline}
- Body text: ${DESIGN_SYSTEM.typography.body}
- Info boxes: ${DESIGN_SYSTEM.typography.infoBox}
- Layout: ${DESIGN_SYSTEM.layout}
`.trim();

  const prompt = `Du erstellst einen detaillierten Canva-Design-Brief für REOS Group.

${REOS_CONTEXT}

POST-DETAILS:
TITEL: ${contentIdea.title}
PILLAR: ${contentIdea.pillar}
FORMAT: ${contentIdea.format}
HOOK: ${contentIdea.hook}
BASIS: ${contentIdea.news_basis || 'N/A'}
ANZAHL SLIDES: ${contentIdea.slide_count || 5}

${designSystemText}

FOTO-STIL FÜR PHOTO_PROMPT: Immer dunkle, cineastische Luxury-Ästhetik. Beispiele: Stadtskyline bei Nacht, dunkle elegante Bibliothek mit Leder und Holz, Porsche GT3RS von hinten bei Nacht, modernes Penthouse mit Stadtblick, Männerhände an einem Steuerrad eines Luxusautos, dunkler Konferenzraum mit Glasfront über der Stadt. Immer dunkel, edel, dramatisch beleuchtet — wie tuxedosociety oder niksetting.

Erstelle einen Slide-für-Slide Design-Brief als JSON-Array. Jedes Slide-Objekt:
{
  "slide_number": 1,
  "type": "cover",
  "photo_prompt": "English description of the background photo scene — purely visual, NO text/signs/words/letters in the image, cinematic luxury atmosphere",
  "hero_element": "Die große Zahl oder das Kernelement (z.B. '+12%' oder 'EPX')",
  "headline": "Hauptüberschrift des Slides",
  "body_text": "Fließtext / Bullet Points für dieses Slide",
  "info_box": "Text für die goldene Info-Box (optional, leer wenn nicht nötig)",
  "design_notes": "Spezifische Gestaltungshinweise für den Designer"
}

Slide-Typen: "cover" (1. Slide), "content" (mittlere Slides), "cta" (letzter Slide).
Antworte NUR mit dem JSON-Array, kein Text drumherum.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 5000,
    messages: [{ role: 'user', content: prompt }]
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Claude returned no text for design brief');

  const cleaned = stripCodeFences(textBlock.text);

  let slides;
  try {
    slides = JSON.parse(cleaned);
  } catch (err) {
    console.error('Design brief parse error. Raw response:', cleaned);
    throw new Error(`Failed to parse design brief JSON: ${err.message}`);
  }

  if (!Array.isArray(slides)) throw new Error('Design brief response is not an array');

  // Save to DB (upsert: delete existing, insert new)
  db.prepare('DELETE FROM design_briefs WHERE content_idea_id = ?').run(contentIdea.id);

  const insert = db.prepare(`
    INSERT INTO design_briefs (content_idea_id, slides, design_system)
    VALUES (?, ?, ?)
  `);

  const result = insert.run(
    contentIdea.id,
    JSON.stringify(slides),
    JSON.stringify(DESIGN_SYSTEM)
  );

  return {
    id: result.lastInsertRowid,
    content_idea_id: contentIdea.id,
    slides,
    design_system: DESIGN_SYSTEM
  };
}

/**
 * Generates an Instagram/LinkedIn caption for a content idea.
 */
async function generateCaption(contentIdea, platform = 'instagram') {
  const isLinkedIn = platform.toLowerCase() === 'linkedin';

  const prompt = `Du schreibst eine ${isLinkedIn ? 'LinkedIn' : 'Instagram'}-Caption für REOS Group.

${REOS_CONTEXT}

POST-DETAILS:
TITEL: ${contentIdea.title}
PILLAR: ${contentIdea.pillar}
FORMAT: ${contentIdea.format}
HOOK: ${contentIdea.hook}
BASIS: ${contentIdea.news_basis || 'N/A'}

Ton: Direkt, premium, auf Augenhöhe mit erfolgreichen Unternehmern. Kein Guru-Stil. Exklusivitäts-Gefühl transportieren. Wo passend: CTA zur Bewerbung für die Membership.

${isLinkedIn ? `LinkedIn-Format:
- Hook-Satz (max. 2 Zeilen, zieht zum "mehr lesen")
- 3–5 Absätze mit konkretem Mehrwert
- Klarer CTA am Ende
- 3–5 relevante Hashtags` :
`Instagram-Format:
- Starker Hook (erste Zeile, unter 125 Zeichen)
- 3–5 Bullet Points oder kurze Absätze mit Mehrwert
- Klarer CTA (z.B. "Speicher dir diesen Post" / "Schreib uns" / "Link in Bio")
- 5–8 Hashtags (Mix aus Nische + groß)`}

Antworte NUR mit diesem JSON-Objekt, kein Text drumherum:
{
  "caption_text": "Vollständiger Caption-Text",
  "hashtags": "#hashtag1 #hashtag2 ...",
  "cta": "Der Call-to-Action Text"
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Claude returned no text for caption');

  const cleaned = stripCodeFences(textBlock.text);

  let captionData;
  try {
    captionData = JSON.parse(cleaned);
  } catch (err) {
    console.error('Caption parse error. Raw response:', cleaned);
    throw new Error(`Failed to parse caption JSON: ${err.message}`);
  }

  // Save to DB
  const insert = db.prepare(`
    INSERT INTO captions (content_idea_id, caption_text, hashtags, cta, platform)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    contentIdea.id,
    captionData.caption_text || '',
    captionData.hashtags || '',
    captionData.cta || '',
    platform
  );

  return {
    id: result.lastInsertRowid,
    content_idea_id: contentIdea.id,
    ...captionData,
    platform
  };
}

async function generateLaunchPost(type = 'makler') {
  const isMakler = type === 'makler';

  const prompt = `Du erstellst einen Launch-Post für REOS Group — den ersten offiziellen Social-Media-Post zur Ankündigung der Plattform.

${REOS_CONTEXT}

AUFGABE: Erstelle einen Karussell-Post (6 Slides) speziell für ${isMakler ? 'Immobilienmakler' : 'Baufinanzierer'}.

Ziel: Aufmerksamkeit erzeugen, Neugier wecken, FOMO auslösen. Dieser Post soll dazu bringen, sich für die Membership zu bewerben, BEVOR der Launch am 1. Mai 2026 passiert.

Ton: Premium, exklusiv, direkt. Wie eine Einladung in einen Members-Only-Club. Nicht verkäuferisch, sondern selbstbewusst.

Gib mir exakt dieses JSON-Objekt zurück (kein Text drumherum):
{
  "title": "Post-Titel",
  "pillar": "Exklusivität & Launch",
  "format": "Karussell",
  "hook": "Erste Zeile / Hook des Posts",
  "news_basis": "REOS Launch — 1. Mai 2026",
  "slide_count": 6
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Claude returned no text');

  let idea;
  try {
    const cleaned = stripCodeFences(textBlock.text);
    idea = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse launch post JSON: ${err.message}`);
  }

  const weekNumber = (() => {
    const d = new Date();
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  })();

  const result = db.prepare(`
    INSERT INTO content_ideas (week_number, day, pillar, format, title, hook, news_basis, slide_count, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idea')
  `).run(weekNumber, 'Launch', idea.pillar, idea.format, idea.title, idea.hook, idea.news_basis, idea.slide_count || 6);

  return { ...idea, id: result.lastInsertRowid, week_number: weekNumber, day: 'Launch', status: 'idea' };
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/content/launch-post
 */
router.post('/launch-post', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ success: false, error: 'ANTHROPIC_API_KEY is not configured.' });
    }
    const type = req.body.type || 'makler';
    const idea = await generateLaunchPost(type);
    res.json({ success: true, data: idea });
  } catch (err) {
    console.error('POST /api/content/launch-post error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/content/reos-post
 * Fully manual REOS post creator with custom inputs.
 * Body: { thema, postType, zielgruppe, instructions, slideCount, bildHinweis }
 */
router.post('/reos-post', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ success: false, error: 'ANTHROPIC_API_KEY is not configured.' });
    }
    const { thema, postType, zielgruppe, instructions, slideCount, bildHinweis } = req.body;
    if (!thema) return res.status(400).json({ success: false, error: 'thema ist erforderlich' });

    const slideCountNum = Math.min(Math.max(Number(slideCount) || 6, 3), 8);
    const bildHinweisText = bildHinweis
      ? `\nBILD-STIL VORGABE DES NUTZERS: "${bildHinweis}" — Integriere diese Vorgabe in die photo_prompts der Slides.`
      : '';

    const prompt = `Du erstellst einen detaillierten Canva-Design-Brief für REOS Group.

${REOS_CONTEXT}

POST-DETAILS (vom Nutzer vorgegeben):
THEMA / INHALT: ${thema}
POST-TYP: ${postType || 'REOS Vorteile'}
ZIELGRUPPE: ${zielgruppe || 'Immobilienmakler'}
SPEZIELLE ANWEISUNGEN: ${instructions || 'Keine speziellen Anweisungen'}
ANZAHL SLIDES: ${slideCountNum}
${bildHinweisText}

DESIGN SYSTEM:
- Schwarz (#0A0A0A) + Gold (#C9A84C), Full-bleed Foto + dunkles Overlay
- Hero-Element: große Zahl/Begriff, weiß oder gold
- Headlines: clean sans-serif, weiß, bold
- Foto-Stil: ultra-dunkle Luxury — Porsche/Ferrari bei Nacht, Stadtskylinen, dunkle elegante Architektur, Penthouse, dramatische Beleuchtung. Wie tuxedosociety. Keine Menschen. Prompts auf Englisch für fal.ai.

Erstelle ein JSON-Array mit exakt ${slideCountNum} Slides (Cover → Content-Slides → CTA):
[
  {
    "slide_number": 1,
    "type": "cover",
    "photo_prompt": "English scene description, purely visual, NO text or signs in image",
    "hero_element": "Big number or key element",
    "headline": "Main headline",
    "body_text": "Body text / bullet points",
    "info_box": "Gold info box text (optional, empty if not needed)",
    "design_notes": "Specific design instructions"
  }
]
Antworte NUR mit dem JSON-Array, kein Text drumherum.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }]
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) throw new Error('Claude returned no text');

    const cleaned = stripCodeFences(textBlock.text);
    let slides;
    try {
      slides = JSON.parse(cleaned);
    } catch (err) {
      throw new Error(`Failed to parse REOS post JSON: ${err.message}`);
    }
    if (!Array.isArray(slides)) throw new Error('Response is not an array');

    const weekNumber = (() => {
      const d = new Date();
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    })();

    const ideaResult = db.prepare(`
      INSERT INTO content_ideas (week_number, day, pillar, format, title, hook, news_basis, slide_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idea')
    `).run(weekNumber, 'REOS', postType || 'REOS Vorteile', 'Karussell', thema, slides[0]?.headline || thema, zielgruppe || 'Immobilienmakler', slideCountNum);

    const ideaId = ideaResult.lastInsertRowid;

    db.prepare('DELETE FROM design_briefs WHERE content_idea_id = ?').run(ideaId);
    const briefResult = db.prepare(`
      INSERT INTO design_briefs (content_idea_id, slides, design_system) VALUES (?, ?, ?)
    `).run(ideaId, JSON.stringify(slides), JSON.stringify(DESIGN_SYSTEM));

    res.json({
      success: true,
      data: {
        idea: { id: ideaId, week_number: weekNumber, day: 'REOS', pillar: postType || 'REOS Vorteile', format: 'Karussell', title: thema, hook: slides[0]?.headline || thema, news_basis: zielgruppe || 'Immobilienmakler', slide_count: slideCountNum, status: 'idea' },
        brief: { id: briefResult.lastInsertRowid, content_idea_id: ideaId, slides, design_system: DESIGN_SYSTEM }
      }
    });
  } catch (err) {
    console.error('POST /api/content/reos-post error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/content/design-brief/:ideaId
 * Save edited slides (e.g. after user edits photo prompts).
 * Body: { slides: [...] }
 */
router.put('/design-brief/:ideaId', (req, res) => {
  try {
    const ideaId = Number(req.params.ideaId);
    const { slides } = req.body;
    if (!slides || !Array.isArray(slides)) {
      return res.status(400).json({ success: false, error: 'slides array required' });
    }
    const brief = db.prepare('SELECT id FROM design_briefs WHERE content_idea_id = ? ORDER BY created_at DESC LIMIT 1').get(ideaId);
    if (!brief) return res.status(404).json({ success: false, error: 'Brief not found' });
    db.prepare('UPDATE design_briefs SET slides = ? WHERE id = ?').run(JSON.stringify(slides), brief.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/content/weekly-plan
 * Generate a weekly content plan from selected news items.
 * Body: { newsIds: [1,2,3,...], weekNumber: 17 }
 */
router.post('/weekly-plan', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ANTHROPIC_API_KEY is not configured.'
      });
    }

    const { newsIds, weekNumber } = req.body;

    if (!weekNumber) {
      return res.status(400).json({ success: false, error: 'weekNumber is required' });
    }

    // Load news items from DB
    let newsItems;
    if (newsIds && Array.isArray(newsIds) && newsIds.length > 0) {
      const placeholders = newsIds.map(() => '?').join(',');
      const rows = db.prepare(`SELECT * FROM news_items WHERE id IN (${placeholders})`).all(...newsIds);
      newsItems = rows.map(r => ({
        ...r,
        content_angles: (() => { try { return JSON.parse(r.content_angles); } catch { return []; } })()
      }));
    } else {
      // Use latest news for this week
      const rows = db.prepare('SELECT * FROM news_items WHERE week_number = ? ORDER BY created_at DESC LIMIT 5').all(weekNumber);
      newsItems = rows.map(r => ({
        ...r,
        content_angles: (() => { try { return JSON.parse(r.content_angles); } catch { return []; } })()
      }));
    }

    if (newsItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: `No news items found for week ${weekNumber}. Please fetch news first.`
      });
    }

    const plan = await generateWeeklyPlan(newsItems, weekNumber);

    res.json({
      success: true,
      message: `Generated ${plan.length} content ideas for KW ${weekNumber}`,
      data: plan
    });
  } catch (err) {
    console.error('POST /api/content/weekly-plan error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/content/weekly-plan/:weekNumber
 * Returns saved content plan for a given week.
 */
router.get('/weekly-plan/:weekNumber', (req, res) => {
  try {
    const weekNumber = Number(req.params.weekNumber);
    const rows = db.prepare(
      'SELECT * FROM content_ideas WHERE week_number = ? ORDER BY id ASC'
    ).all(weekNumber);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/content/weekly-plan/:weekNumber error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/content/design-brief/:ideaId
 * Generate a Canva design brief for a content idea.
 */
router.post('/design-brief/:ideaId', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ success: false, error: 'ANTHROPIC_API_KEY is not configured.' });
    }

    const ideaId = Number(req.params.ideaId);
    const idea = db.prepare('SELECT * FROM content_ideas WHERE id = ?').get(ideaId);

    if (!idea) {
      return res.status(404).json({ success: false, error: `Content idea ${ideaId} not found` });
    }

    const brief = await generateDesignBrief(idea);

    res.json({
      success: true,
      message: `Design brief generated for idea ${ideaId}`,
      data: brief
    });
  } catch (err) {
    console.error('POST /api/content/design-brief/:ideaId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/content/design-brief/:ideaId
 * Returns saved design brief for a content idea.
 */
router.get('/design-brief/:ideaId', (req, res) => {
  try {
    const ideaId = Number(req.params.ideaId);
    const brief = db.prepare('SELECT * FROM design_briefs WHERE content_idea_id = ? ORDER BY created_at DESC LIMIT 1').get(ideaId);

    if (!brief) {
      return res.status(404).json({ success: false, error: `No design brief found for idea ${ideaId}` });
    }

    res.json({
      success: true,
      data: {
        ...brief,
        slides: (() => { try { return JSON.parse(brief.slides); } catch { return []; } })(),
        design_system: (() => { try { return JSON.parse(brief.design_system); } catch { return {}; } })()
      }
    });
  } catch (err) {
    console.error('GET /api/content/design-brief/:ideaId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/content/caption/:ideaId
 * Generate a caption for a content idea.
 * Body: { platform?: 'instagram' | 'linkedin' }
 */
router.post('/caption/:ideaId', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ success: false, error: 'ANTHROPIC_API_KEY is not configured.' });
    }

    const ideaId = Number(req.params.ideaId);
    const platform = req.body.platform || 'instagram';

    const idea = db.prepare('SELECT * FROM content_ideas WHERE id = ?').get(ideaId);

    if (!idea) {
      return res.status(404).json({ success: false, error: `Content idea ${ideaId} not found` });
    }

    const caption = await generateCaption(idea, platform);

    res.json({
      success: true,
      message: `Caption generated for idea ${ideaId} (${platform})`,
      data: caption
    });
  } catch (err) {
    console.error('POST /api/content/caption/:ideaId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/content/caption/:ideaId
 * Returns saved captions for a content idea.
 */
router.get('/caption/:ideaId', (req, res) => {
  try {
    const ideaId = Number(req.params.ideaId);
    const captions = db.prepare('SELECT * FROM captions WHERE content_idea_id = ? ORDER BY created_at DESC').all(ideaId);

    res.json({ success: true, data: captions });
  } catch (err) {
    console.error('GET /api/content/caption/:ideaId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/content/ideas
 * Returns all content ideas with optional ?week= filter.
 */
router.get('/ideas', (req, res) => {
  try {
    const { week } = req.query;
    let rows;

    if (week) {
      rows = db.prepare('SELECT * FROM content_ideas WHERE week_number = ? ORDER BY id ASC').all(Number(week));
    } else {
      rows = db.prepare('SELECT * FROM content_ideas ORDER BY created_at DESC').all();
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/content/ideas error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/content/ideas/:id
 * Delete a content idea and its associated briefs/captions.
 */
router.delete('/ideas/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = db.prepare('DELETE FROM content_ideas WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: `Content idea ${id} not found` });
    }

    res.json({ success: true, message: `Content idea ${id} deleted` });
  } catch (err) {
    console.error('DELETE /api/content/ideas/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
