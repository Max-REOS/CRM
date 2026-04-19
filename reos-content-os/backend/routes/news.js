'use strict';

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { db } = require('../db/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Strips markdown code fences from a string (e.g. ```json ... ```)
 */
function stripCodeFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/**
 * Get current ISO week number for a given date (default: today)
 */
function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Fetch current German real estate news using Claude with built-in web_search tool.
 * The web_search_20250305 tool is handled server-side by Anthropic — we make a single
 * API call and receive the final synthesised text response.
 */
async function fetchImmobilienNews(weekNumber) {
  const prompt = `Du bist ein Researcher für REOS Group, eine B2B-Plattform für deutsche Immobilienmakler.

Bitte recherchiere aktuelle Nachrichten und Daten aus dem deutschen Immobilienmarkt (KW ${weekNumber}) von diesen Quellen:
- Europace EPX Hauspreisindex
- Dr. Klein Trendindikator (Baufinanzierung)
- onOffice Marktberichte
- IW Institut (Institut der deutschen Wirtschaft)
- BVR (Bundesverband der Deutschen Volksbanken und Raiffeisenbanken)
- Handelsblatt Immobilien
- Immoscout24 Marktreport
- Postbank Wohnatlas

Gib mir genau 5 aktuelle News-Items aus den letzten 2 Wochen zurück. Jedes Item soll folgende Struktur haben:
- headline: prägnante Schlagzeile auf Deutsch
- source: Quellenname
- date: Datum der Meldung (JJJJ-MM-TT Format)
- key_data: wichtigste Zahl/Statistik aus der Meldung
- content_angles: Array mit genau 3 Content-Ideen, jede mit:
  - pillar: einer der Werte "Markt & Zahlen", "Makler-Know-how", "Kundenkommunikation", "REOS Features", "Motivation & Mindset"
  - angle: konkreter Content-Winkel für Immobilienmakler
  - format: einer der Werte "Karussell", "Reel", "Single Post", "Story"

Antworte NUR mit einem validen JSON-Array ohne zusätzlichen Text oder Markdown:
[
  {
    "headline": "...",
    "source": "...",
    "date": "JJJJ-MM-TT",
    "key_data": "...",
    "content_angles": [
      {"pillar": "...", "angle": "...", "format": "..."},
      {"pillar": "...", "angle": "...", "format": "..."},
      {"pillar": "...", "angle": "...", "format": "..."}
    ]
  }
]`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  // Extract the final text block from the response
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) {
    throw new Error('Claude returned no text content in news fetch response');
  }

  const cleaned = stripCodeFences(textBlock.text);

  let newsItems;
  try {
    newsItems = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('Failed to parse Claude news JSON:', cleaned);
    throw new Error(`Failed to parse Claude news response as JSON: ${parseErr.message}`);
  }

  if (!Array.isArray(newsItems)) {
    throw new Error('Claude news response is not a JSON array');
  }

  // Persist to DB
  const insert = db.prepare(`
    INSERT INTO news_items (headline, source, date, key_data, content_angles, week_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(
        item.headline || '',
        item.source || '',
        item.date || new Date().toISOString().split('T')[0],
        item.key_data || '',
        JSON.stringify(item.content_angles || []),
        weekNumber
      );
    }
  });

  insertMany(newsItems);

  return newsItems;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/news
 * Returns all news items from the database, newest first.
 */
router.get('/', (req, res) => {
  try {
    const { week } = req.query;
    let rows;
    if (week) {
      rows = db.prepare('SELECT * FROM news_items WHERE week_number = ? ORDER BY created_at DESC').all(Number(week));
    } else {
      rows = db.prepare('SELECT * FROM news_items ORDER BY created_at DESC').all();
    }

    // Parse JSON fields
    const parsed = rows.map(row => ({
      ...row,
      content_angles: (() => {
        try { return JSON.parse(row.content_angles); } catch { return []; }
      })()
    }));

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('GET /api/news error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/news/fetch
 * Triggers a fresh news fetch via Claude web search.
 * Body: { weekNumber? }
 */
router.post('/fetch', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ANTHROPIC_API_KEY is not configured. Please set it in your .env file.'
      });
    }

    const weekNumber = req.body.weekNumber || getWeekNumber();
    console.log(`Fetching news for KW ${weekNumber}…`);

    const newsItems = await fetchImmobilienNews(weekNumber);

    res.json({
      success: true,
      message: `Fetched ${newsItems.length} news items for KW ${weekNumber}`,
      data: newsItems
    });
  } catch (err) {
    console.error('POST /api/news/fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/news/:id
 * Deletes a single news item by ID.
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM news_items WHERE id = ?').run(Number(id));

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'News item not found' });
    }

    res.json({ success: true, message: `News item ${id} deleted` });
  } catch (err) {
    console.error('DELETE /api/news/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
