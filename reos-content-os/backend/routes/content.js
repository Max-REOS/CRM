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

/**
 * Strips markdown code fences from a string.
 */
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

  const systemPrompt = `Du bist der REOS Content Stratege. Du erstellst Inhaltsstrategien für REOS Group, eine B2B-Plattform, die deutschen Immobilienmaklern hilft, mehr Kunden zu gewinnen und zu binden.

Tonalität: direkt, professionell, auf Augenhöhe mit erfahrenen Maklern. Keine Floskeln, keine Übertreibungen. Klarer Mehrwert pro Post.

Content-Pillars:
- Markt & Zahlen: Datenbasierte Marktanalysen, EPX-Index, Preistrends
- Makler-Know-how: Tools, Tipps, Prozesse für mehr Effizienz
- Kundenkommunikation: Wie Makler besser mit Käufern/Verkäufern kommunizieren
- REOS Features: Konkrete Vorteile der REOS-Plattform im Alltag
- Motivation & Mindset: Erfolgsgeschichten, Branchen-Mindset, Resilienz`;

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

  const prompt = `Du erstellst einen detaillierten Canva-Design-Brief für diesen Post:

TITEL: ${contentIdea.title}
PILLAR: ${contentIdea.pillar}
FORMAT: ${contentIdea.format}
HOOK: ${contentIdea.hook}
BASIS: ${contentIdea.news_basis || 'N/A'}
ANZAHL SLIDES: ${contentIdea.slide_count || 5}

${designSystemText}

Erstelle einen Slide-für-Slide Design-Brief als JSON-Array. Jedes Slide-Objekt:
{
  "slide_number": 1,
  "type": "cover",
  "photo_prompt": "Beschreibung des Hintergrundfotos für Unsplash/KI-Bildgenerierung",
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

  const prompt = `Du schreibst eine ${isLinkedIn ? 'LinkedIn' : 'Instagram'}-Caption für diesen Immobilienmakler-Post:

TITEL: ${contentIdea.title}
PILLAR: ${contentIdea.pillar}
FORMAT: ${contentIdea.format}
HOOK: ${contentIdea.hook}
BASIS: ${contentIdea.news_basis || 'N/A'}

Ton: direkt, professionell, auf Augenhöhe mit erfahrenen deutschen Maklern. Keine Floskeln.

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

// ─── Routes ────────────────────────────────────────────────────────────────────

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
