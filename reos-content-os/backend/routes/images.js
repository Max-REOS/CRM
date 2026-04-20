'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

const LUXURY_STYLE_SUFFIX = ', ultra dark luxury aesthetic, cinematic photography, dramatic chiaroscuro lighting, deep shadows, rich blacks, subtle golden accents, moody night atmosphere, ultra-realistic, 8k, editorial style, tuxedo society aesthetic, dark background, no people, architectural or automotive subject';

async function generateImage(prompt, slideNumber = 1) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY ist nicht konfiguriert');

  const fullPrompt = prompt + LUXURY_STYLE_SUFFIX;

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      image_size: 'square_hd',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      sync_mode: true,
      enable_safety_checker: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`fal.ai API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const imageUrl = json.images?.[0]?.url;
  if (!imageUrl) throw new Error('fal.ai returned no image URL');

  return imageUrl;
}

// POST /api/images/generate
// Body: { prompt, ideaId, slideNumber }
router.post('/generate', async (req, res) => {
  try {
    if (!process.env.FAL_API_KEY) {
      return res.status(400).json({ success: false, error: 'FAL_API_KEY ist nicht konfiguriert.' });
    }

    const { prompt, ideaId, slideNumber = 1 } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt ist erforderlich' });

    console.log(`Generating image for slide ${slideNumber}…`);
    const imageUrl = await generateImage(prompt, slideNumber);

    if (ideaId) {
      db.prepare(`
        INSERT OR REPLACE INTO generated_images (content_idea_id, slide_number, image_url, prompt)
        VALUES (?, ?, ?, ?)
      `).run(Number(ideaId), Number(slideNumber), imageUrl, prompt);
    }

    res.json({ success: true, imageUrl, slideNumber });
  } catch (err) {
    console.error('POST /api/images/generate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/images/generate-all/:ideaId
// Generates images for all slides of a design brief
router.post('/generate-all/:ideaId', async (req, res) => {
  try {
    if (!process.env.FAL_API_KEY) {
      return res.status(400).json({ success: false, error: 'FAL_API_KEY ist nicht konfiguriert.' });
    }

    const ideaId = Number(req.params.ideaId);
    const brief = db.prepare('SELECT * FROM design_briefs WHERE content_idea_id = ? ORDER BY created_at DESC LIMIT 1').get(ideaId);

    if (!brief) {
      return res.status(404).json({ success: false, error: 'Kein Design-Brief gefunden. Bitte zuerst einen Brief generieren.' });
    }

    let slides;
    try { slides = JSON.parse(brief.slides); } catch { return res.status(500).json({ success: false, error: 'Fehler beim Lesen der Slides' }); }

    const results = [];

    for (const slide of slides) {
      if (!slide.photo_prompt) {
        results.push({ slideNumber: slide.slide_number, imageUrl: null, skipped: true });
        continue;
      }

      try {
        console.log(`Generating image for slide ${slide.slide_number}…`);
        const imageUrl = await generateImage(slide.photo_prompt, slide.slide_number);

        db.prepare(`
          INSERT OR REPLACE INTO generated_images (content_idea_id, slide_number, image_url, prompt)
          VALUES (?, ?, ?, ?)
        `).run(ideaId, slide.slide_number, imageUrl, slide.photo_prompt);

        results.push({ slideNumber: slide.slide_number, imageUrl });
      } catch (err) {
        console.error(`Image generation failed for slide ${slide.slide_number}:`, err.message);
        results.push({ slideNumber: slide.slide_number, imageUrl: null, error: err.message });
      }
    }

    res.json({ success: true, images: results });
  } catch (err) {
    console.error('POST /api/images/generate-all error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/images/:ideaId
router.get('/:ideaId', (req, res) => {
  try {
    const ideaId = Number(req.params.ideaId);
    const images = db.prepare('SELECT * FROM generated_images WHERE content_idea_id = ? ORDER BY slide_number ASC').all(ideaId);
    res.json({ success: true, images });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
