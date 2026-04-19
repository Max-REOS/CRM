'use strict';

// Load environment variables first, before anything else
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./db/database');

// Route modules
const newsRouter = require('./routes/news');
const contentRouter = require('./routes/content');
const canvaRouter = require('./routes/canva');
const driveRouter = require('./routes/drive');
const trackerRouter = require('./routes/tracker');
const imagesRouter = require('./routes/images');

// ─── App setup ─────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────

// Allow all origins for local development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies (up to 50mb to support base64 file uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// ─── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'REOS Content OS',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
      fal: !!process.env.FAL_API_KEY,
      canva: !!process.env.CANVA_ACCESS_TOKEN,
      googleDrive: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN)
    }
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────

app.use('/api/news', newsRouter);
app.use('/api/content', contentRouter);
app.use('/api/canva', canvaRouter);
app.use('/api/drive', driveRouter);
app.use('/api/tracker', trackerRouter);
app.use('/api/images', imagesRouter);

// ─── Catch-all: serve frontend index.html for client-side routing ─────────────

app.get('*', (req, res) => {
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If no frontend is built yet, return a helpful message
      res.status(200).json({
        message: 'REOS Content OS API is running.',
        docs: 'See /api/health for status.',
        routes: [
          'GET  /api/health',
          'GET  /api/news',
          'POST /api/news/fetch',
          'DELETE /api/news/:id',
          'POST /api/content/weekly-plan',
          'GET  /api/content/weekly-plan/:weekNumber',
          'POST /api/content/design-brief/:ideaId',
          'GET  /api/content/design-brief/:ideaId',
          'POST /api/content/caption/:ideaId',
          'GET  /api/content/caption/:ideaId',
          'GET  /api/content/ideas',
          'DELETE /api/content/ideas/:id',
          'GET  /api/canva/status',
          'POST /api/canva/create-design',
          'GET  /api/canva/designs',
          'GET  /api/canva/templates',
          'GET  /api/drive/status',
          'GET  /api/drive/files',
          'POST /api/drive/upload',
          'GET  /api/tracker',
          'POST /api/tracker',
          'PUT  /api/tracker/:id',
          'DELETE /api/tracker/:id',
          'GET  /api/tracker/week/:weekNumber',
          'PATCH /api/tracker/:id/status'
        ]
      });
    }
  });
});

// ─── Global error handler ──────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ─── Start server ──────────────────────────────────────────────────────────────

async function start() {
  try {
    await initDatabase();
  } catch (dbErr) {
    console.error('Failed to initialise database:', dbErr);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  REOS Content OS — API Server`);
    console.log(`  Running on http://localhost:${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/api/health`);
    console.log(`========================================\n`);
    console.log('Configured integrations:');
    console.log(`  Anthropic API: ${process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO (set ANTHROPIC_API_KEY)'}`);
    console.log(`  Canva API:     ${process.env.CANVA_ACCESS_TOKEN ? 'YES' : 'NO (set CANVA_ACCESS_TOKEN)'}`);
    console.log(`  Google Drive:  ${process.env.GOOGLE_REFRESH_TOKEN ? 'YES' : 'NO (set GOOGLE_REFRESH_TOKEN)'}`);
    console.log('');
  });
}

start();

module.exports = app; // Export for testing
