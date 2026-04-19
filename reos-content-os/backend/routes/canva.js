'use strict';

const express = require('express');
const router = express.Router();

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';

/**
 * Returns the Canva access token from env, or null if not configured.
 */
function getCanvaToken() {
  return process.env.CANVA_ACCESS_TOKEN || null;
}

/**
 * Makes an authenticated request to the Canva API.
 */
async function canvaRequest(path, options = {}) {
  const token = getCanvaToken();
  if (!token) {
    const err = new Error('CANVA_ACCESS_TOKEN is not configured');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const url = `${CANVA_API_BASE}${path}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const err = new Error(
      data.message || data.error || `Canva API error: ${response.status} ${response.statusText}`
    );
    err.status = response.status;
    err.canvaError = data;
    throw err;
  }

  return data;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/canva/status
 * Returns whether the Canva integration is configured.
 */
router.get('/status', (req, res) => {
  const token = getCanvaToken();
  if (!token) {
    return res.json({
      configured: false,
      message: 'CANVA_ACCESS_TOKEN is not set. Add it to your .env file to enable Canva integration.'
    });
  }
  res.json({
    configured: true,
    message: 'Canva integration is configured.',
    tokenPreview: `${token.slice(0, 8)}...`
  });
});

/**
 * POST /api/canva/create-design
 * Creates a new Canva design from a template.
 * Body: { title: string, templateId?: string }
 */
router.post('/create-design', async (req, res) => {
  try {
    if (!getCanvaToken()) {
      return res.status(503).json({
        success: false,
        configured: false,
        error: 'Canva is not configured. Set CANVA_ACCESS_TOKEN in your .env file.'
      });
    }

    const { title, templateId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }

    const body = { title };
    if (templateId) {
      body.asset_id = templateId;
    }

    const data = await canvaRequest('/designs', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    res.json({
      success: true,
      data: {
        id: data.design?.id,
        title: data.design?.title,
        editUrl: data.design?.urls?.edit_url,
        viewUrl: data.design?.urls?.view_url,
        thumbnailUrl: data.design?.thumbnail?.url,
        raw: data
      }
    });
  } catch (err) {
    console.error('POST /api/canva/create-design error:', err);
    if (err.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ success: false, configured: false, error: err.message });
    }
    res.status(err.status || 500).json({ success: false, error: err.message, details: err.canvaError });
  }
});

/**
 * GET /api/canva/designs
 * Lists the user's Canva designs.
 * Query: ?query= (optional search), ?continuation= (pagination token)
 */
router.get('/designs', async (req, res) => {
  try {
    if (!getCanvaToken()) {
      return res.status(503).json({
        success: false,
        configured: false,
        error: 'Canva is not configured. Set CANVA_ACCESS_TOKEN in your .env file.'
      });
    }

    const params = new URLSearchParams();
    if (req.query.query) params.set('query', req.query.query);
    if (req.query.continuation) params.set('continuation', req.query.continuation);
    params.set('ownership', 'owned');

    const queryStr = params.toString();
    const data = await canvaRequest(`/designs${queryStr ? `?${queryStr}` : ''}`);

    res.json({
      success: true,
      data: {
        designs: data.items || [],
        continuation: data.continuation || null,
        total: data.items?.length || 0
      }
    });
  } catch (err) {
    console.error('GET /api/canva/designs error:', err);
    if (err.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ success: false, configured: false, error: err.message });
    }
    res.status(err.status || 500).json({ success: false, error: err.message, details: err.canvaError });
  }
});

/**
 * GET /api/canva/templates
 * Lists available Canva templates (searches for Instagram post templates).
 * Query: ?query= (optional, defaults to "instagram post"), ?continuation=
 */
router.get('/templates', async (req, res) => {
  try {
    if (!getCanvaToken()) {
      return res.status(503).json({
        success: false,
        configured: false,
        error: 'Canva is not configured. Set CANVA_ACCESS_TOKEN in your .env file.'
      });
    }

    const query = req.query.query || 'instagram post';
    const params = new URLSearchParams({ query });
    if (req.query.continuation) params.set('continuation', req.query.continuation);

    const data = await canvaRequest(`/designs?${params.toString()}&ownership=community`);

    res.json({
      success: true,
      data: {
        templates: data.items || [],
        continuation: data.continuation || null
      }
    });
  } catch (err) {
    console.error('GET /api/canva/templates error:', err);
    if (err.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ success: false, configured: false, error: err.message });
    }
    res.status(err.status || 500).json({ success: false, error: err.message, details: err.canvaError });
  }
});

module.exports = router;
