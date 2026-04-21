'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');

const IMAGES_DIR = path.join(__dirname, '..', '..', 'data', 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const LUXURY_STYLE_SUFFIX = ', ultra dark luxury aesthetic, cinematic photography, dramatic chiaroscuro lighting, deep shadows, rich blacks, subtle golden accents, moody night atmosphere, ultra-realistic, 8k, editorial style, tuxedo society aesthetic, dark background, no people, architectural or automotive subject';

async function generateImage(prompt) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY ist nicht konfiguriert');

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt + LUXURY_STYLE_SUFFIX,
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
  const falUrl = json.images?.[0]?.url;
  if (!falUrl) throw new Error('fal.ai returned no image URL');

  // Download and save locally so URLs never expire
  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const localPath = path.join(IMAGES_DIR, filename);
  const imgRes = await fetch(falUrl);
  if (imgRes.ok) {
    const buf = await imgRes.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(buf));
    return `/api/images/file/${filename}`;
  }

  // Fallback: return original URL if download fails
  return falUrl;
}

// GET /api/images/file/:filename — serve locally saved images
router.get('/file/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('not found');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=2592000');
  res.sendFile(filePath);
});

// GET /api/images/proxy?url=<encoded> — proxy external URLs for Canvas
router.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('url required');
  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).send('upstream error');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// POST /api/images/generate
router.post('/generate', async (req, res) => {
  try {
    if (!process.env.FAL_API_KEY) {
      return res.status(400).json({ success: false, error: 'FAL_API_KEY ist nicht konfiguriert.' });
    }
    const { prompt, ideaId, slideNumber = 1 } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt ist erforderlich' });

    console.log(`Generating image for slide ${slideNumber}…`);
    const imageUrl = await generateImage(prompt);

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
router.post('/generate-all/:ideaId', async (req, res) => {
  try {
    if (!process.env.FAL_API_KEY) {
      return res.status(400).json({ success: false, error: 'FAL_API_KEY ist nicht konfiguriert.' });
    }

    const ideaId = Number(req.params.ideaId);
    const brief = db.prepare('SELECT * FROM design_briefs WHERE content_idea_id = ? ORDER BY created_at DESC LIMIT 1').get(ideaId);
    if (!brief) return res.status(404).json({ success: false, error: 'Kein Design-Brief gefunden.' });

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
        const imageUrl = await generateImage(slide.photo_prompt);
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
