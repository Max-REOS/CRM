'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

function stripCodeFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function fetchImmobilienNews(weekNumber) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY is not configured');

  const today = new Date().toISOString().split('T')[0];

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Marktresearcher für REOS Group, eine B2B-Plattform für deutsche Immobilienmakler. Heute ist ${today}, KW ${weekNumber}. Antworte IMMER NUR mit validem JSON, kein Text davor oder danach.`
        },
        {
          role: 'user',
          content: `Recherchiere die 5 wichtigsten aktuellen Nachrichten aus dem deutschen Immobilienmarkt der letzten 7–14 Tage. Suche bei: Europace EPX, Dr. Klein Trendindikator, IW Institut, BVR, Handelsblatt Immobilien, Immoscout24, Postbank Wohnatlas, Destatis Wohnimmobilien.

Gib mir exakt dieses JSON-Array zurück (kein Markdown, kein Text drumherum):
[
  {
    "headline": "Prägnante Schlagzeile auf Deutsch",
    "source": "Quellenname",
    "date": "YYYY-MM-DD",
    "key_data": "Wichtigste Zahl oder Aussage (z.B. '+3,2% gegenüber Vormonat')",
    "content_angles": [
      {"pillar": "Markt & Zahlen", "angle": "Konkreter Content-Winkel für Makler", "format": "Karussell"},
      {"pillar": "Makler-Know-how", "angle": "Konkreter Content-Winkel für Makler", "format": "Single Post"},
      {"pillar": "Kundenkommunikation", "angle": "Konkreter Content-Winkel für Makler", "format": "Reel"}
    ]
  }
]`
        }
      ],
      max_tokens: 4000,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const rawText = json.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Perplexity returned empty response');

  const cleaned = stripCodeFences(rawText);

  let newsItems;
  try {
    newsItems = JSON.parse(cleaned);
  } catch (err) {
    console.error('Perplexity news parse error. Raw:', cleaned);
    throw new Error(`Failed to parse Perplexity response as JSON: ${err.message}`);
  }

  if (!Array.isArray(newsItems)) throw new Error('Perplexity response is not a JSON array');

  const insert = db.prepare(`
    INSERT INTO news_items (headline, source, date, key_data, content_angles, week_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(
        item.headline || '',
        item.source || '',
        item.date || today,
        item.key_data || '',
        JSON.stringify(item.content_angles || []),
        weekNumber
      );
    }
  });

  insertMany(newsItems);
  return newsItems;
}

// GET /api/news
router.get('/', (req, res) => {
  try {
    const { week } = req.query;
    const rows = week
      ? db.prepare('SELECT * FROM news_items WHERE week_number = ? ORDER BY created_at DESC').all(Number(week))
      : db.prepare('SELECT * FROM news_items ORDER BY created_at DESC').all();

    const parsed = rows.map(row => ({
      ...row,
      content_angles: (() => { try { return JSON.parse(row.content_angles); } catch { return []; } })()
    }));

    res.json({ success: true, news: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/news/fetch
router.post('/fetch', async (req, res) => {
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      return res.status(400).json({ success: false, error: 'PERPLEXITY_API_KEY ist nicht konfiguriert.' });
    }
    const weekNumber = req.body.weekNumber || getWeekNumber();
    console.log(`Fetching news via Perplexity for KW ${weekNumber}…`);
    const newsItems = await fetchImmobilienNews(weekNumber);
    res.json({ success: true, news: newsItems, message: `${newsItems.length} News für KW ${weekNumber} gefunden` });
  } catch (err) {
    console.error('POST /api/news/fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/news/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM news_items WHERE id = ?').run(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'News nicht gefunden' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
