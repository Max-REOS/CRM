'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');

const IMAGES_DIR = path.join(__dirname, '..', '..', 'data', 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Style suffixes tuned per provider
const HIGGSFIELD_STYLE = ', ultra-luxury cinematic photography, dramatic chiaroscuro lighting, deep shadows, rich blacks, golden accent tones, hyper-realistic editorial style, 8K, private members club atmosphere, sophisticated and exclusive, photojournalistic authenticity, no text, no watermarks';
const FAL_STYLE = ', ultra dark luxury aesthetic, cinematic photography, dramatic chiaroscuro lighting, deep shadows, rich blacks, subtle golden accents, moody night atmosphere, ultra-realistic, 8k, editorial style, tuxedo society aesthetic, dark background, no people, architectural or automotive subject';

// ── Higgsfield Seedream v4 (async: submit → poll) ────────────────────────────
async function generateImageHiggsfield(prompt) {
  const key = process.env.HIGGSFIELD_API_KEY; // format: KEY_ID:KEY_SECRET

  const submitRes = await fetch('https://platform.higgsfield.ai/bytedance/seedream/v4/text-to-image', {
    method: 'POST',
    headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt + HIGGSFIELD_STYLE,
      resolution: '2K',
      aspect_ratio: '1:1',
      camera_fixed: false
    })
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Higgsfield submit error ${submitRes.status}: ${errText}`);
  }

  const submitted = await submitRes.json();
  const requestId = submitted.request_id;
  if (!requestId) throw new Error(`Higgsfield: no request_id in response: ${JSON.stringify(submitted)}`);

  console.log(`Higgsfield job submitted: ${requestId}`);

  // Poll up to 5 minutes (60 × 5s)
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(r => setTimeout(r, 5000));

    const pollRes = await fetch(`https://platform.higgsfield.ai/requests/${requestId}`, {
      headers: { 'Authorization': `Key ${key}` }
    });

    if (!pollRes.ok) {
      console.warn(`Higgsfield poll attempt ${attempt + 1} returned ${pollRes.status}`);
      continue;
    }

    const pollJson = await pollRes.json();
    const status = pollJson.status;

    if (status === 'COMPLETED') {
      const remoteUrl = pollJson.images?.[0]?.url;
      if (!remoteUrl) throw new Error('Higgsfield COMPLETED but no image URL');
      return remoteUrl;
    }

    if (status === 'FAILED') {
      throw new Error(`Higgsfield generation failed: ${pollJson.error || 'unknown reason'}`);
    }

    console.log(`Higgsfield status: ${status} (attempt ${attempt + 1})`);
  }

  throw new Error('Higgsfield timeout after 5 minutes');
}

// ── fal.ai Flux Pro 1.1 (sync) ───────────────────────────────────────────────
async function generateImageFal(prompt) {
  const key = process.env.FAL_API_KEY;

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt + FAL_STYLE,
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
  return falUrl;
}

// ── Unified entry point: prefer Higgsfield, auto-fallback to fal.ai ─────────
async function generateImage(prompt) {
  let remoteUrl;

  if (process.env.HIGGSFIELD_API_KEY) {
    try {
      console.log('Image provider: Higgsfield');
      remoteUrl = await generateImageHiggsfield(prompt);
    } catch (err) {
      console.warn(`Higgsfield failed (${err.message}), falling back to fal.ai…`);
      if (!process.env.FAL_API_KEY) throw new Error('Higgsfield fehlgeschlagen und kein FAL_API_KEY als Fallback');
      console.log('Image provider: fal.ai (fallback)');
      remoteUrl = await generateImageFal(prompt);
    }
  } else {
    if (!process.env.FAL_API_KEY) throw new Error('Weder HIGGSFIELD_API_KEY noch FAL_API_KEY konfiguriert');
    console.log('Image provider: fal.ai');
    remoteUrl = await generateImageFal(prompt);
  }

  // Download and save locally so URLs never expire
  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const localPath = path.join(IMAGES_DIR, filename);
  try {
    const imgRes = await fetch(remoteUrl);
    if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`);
    const buf = await imgRes.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(buf));
    console.log(`Image saved locally: ${filename}`);
    return `/api/images/file/${filename}`;
  } catch (err) {
    console.warn('Local save failed, returning remote URL:', err.message);
    return remoteUrl;
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

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
    if (!process.env.HIGGSFIELD_API_KEY && !process.env.FAL_API_KEY) {
      return res.status(400).json({ success: false, error: 'Kein Image-API-Key konfiguriert (HIGGSFIELD_API_KEY oder FAL_API_KEY).' });
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
    if (!process.env.HIGGSFIELD_API_KEY && !process.env.FAL_API_KEY) {
      return res.status(400).json({ success: false, error: 'Kein Image-API-Key konfiguriert.' });
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
