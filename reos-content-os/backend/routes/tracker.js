'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

const VALID_STATUSES = ['draft', 'scheduled', 'published', 'archived'];

/**
 * Validates and normalises a status value.
 * Returns the status if valid, throws otherwise.
 */
function validateStatus(status) {
  if (status && !VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.code = 'INVALID_STATUS';
    throw err;
  }
  return status;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/tracker
 * Returns all post tracker entries.
 * Query: ?status=draft|scheduled|published|archived, ?week=<weekNumber>
 */
router.get('/', (req, res) => {
  try {
    const { status, week } = req.query;

    let query = 'SELECT * FROM post_tracker WHERE 1=1';
    const params = [];

    if (status) {
      validateStatus(status);
      query += ' AND status = ?';
      params.push(status);
    }

    if (week) {
      // Join with content_ideas to filter by week_number
      // Use a subquery to find content_idea_ids for the given week
      query += ` AND (content_idea_id IN (SELECT id FROM content_ideas WHERE week_number = ?) OR (content_idea_id IS NULL AND strftime('%W', scheduled_date) = printf('%02d', ? - 1)))`;
      params.push(Number(week), Number(week));
    }

    query += ' ORDER BY scheduled_date ASC, created_at DESC';

    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error('GET /api/tracker error:', err);
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tracker
 * Creates a new post tracker entry.
 * Body: {
 *   content_idea_id?, title, pillar?, format?, platform?,
 *   scheduled_date?, status?, canva_link?, drive_link?, caption?, notes?
 * }
 */
router.post('/', (req, res) => {
  try {
    const {
      content_idea_id,
      title,
      pillar,
      format,
      platform,
      scheduled_date,
      status = 'draft',
      canva_link,
      drive_link,
      caption,
      notes
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }

    validateStatus(status);

    // If content_idea_id is provided, verify it exists
    if (content_idea_id) {
      const idea = db.prepare('SELECT id FROM content_ideas WHERE id = ?').get(Number(content_idea_id));
      if (!idea) {
        return res.status(400).json({
          success: false,
          error: `Content idea with id ${content_idea_id} does not exist`
        });
      }
    }

    const result = db.prepare(`
      INSERT INTO post_tracker
        (content_idea_id, title, pillar, format, platform, scheduled_date, status, canva_link, drive_link, caption, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      content_idea_id || null,
      title,
      pillar || null,
      format || null,
      platform || null,
      scheduled_date || null,
      status,
      canva_link || null,
      drive_link || null,
      caption || null,
      notes || null
    );

    const created = db.prepare('SELECT * FROM post_tracker WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Tracker entry created', data: created });
  } catch (err) {
    console.error('POST /api/tracker error:', err);
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/tracker/:id
 * Full update of a tracker entry.
 * Body: same fields as POST (all optional except title recommended)
 */
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM post_tracker WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: `Tracker entry ${id} not found` });
    }

    const {
      content_idea_id,
      title,
      pillar,
      format,
      platform,
      scheduled_date,
      status,
      canva_link,
      drive_link,
      caption,
      notes
    } = req.body;

    if (status) validateStatus(status);

    // If updating content_idea_id, verify it exists
    if (content_idea_id !== undefined && content_idea_id !== null) {
      const idea = db.prepare('SELECT id FROM content_ideas WHERE id = ?').get(Number(content_idea_id));
      if (!idea) {
        return res.status(400).json({
          success: false,
          error: `Content idea with id ${content_idea_id} does not exist`
        });
      }
    }

    db.prepare(`
      UPDATE post_tracker SET
        content_idea_id = ?,
        title = ?,
        pillar = ?,
        format = ?,
        platform = ?,
        scheduled_date = ?,
        status = ?,
        canva_link = ?,
        drive_link = ?,
        caption = ?,
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      content_idea_id !== undefined ? (content_idea_id || null) : existing.content_idea_id,
      title !== undefined ? title : existing.title,
      pillar !== undefined ? (pillar || null) : existing.pillar,
      format !== undefined ? (format || null) : existing.format,
      platform !== undefined ? (platform || null) : existing.platform,
      scheduled_date !== undefined ? (scheduled_date || null) : existing.scheduled_date,
      status !== undefined ? status : existing.status,
      canva_link !== undefined ? (canva_link || null) : existing.canva_link,
      drive_link !== undefined ? (drive_link || null) : existing.drive_link,
      caption !== undefined ? (caption || null) : existing.caption,
      notes !== undefined ? (notes || null) : existing.notes,
      id
    );

    const updated = db.prepare('SELECT * FROM post_tracker WHERE id = ?').get(id);
    res.json({ success: true, message: `Tracker entry ${id} updated`, data: updated });
  } catch (err) {
    console.error('PUT /api/tracker/:id error:', err);
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/tracker/:id
 * Deletes a tracker entry.
 */
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = db.prepare('DELETE FROM post_tracker WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: `Tracker entry ${id} not found` });
    }

    res.json({ success: true, message: `Tracker entry ${id} deleted` });
  } catch (err) {
    console.error('DELETE /api/tracker/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tracker/week/:weekNumber
 * Returns all tracker entries for a given ISO week number.
 * Joins with content_ideas to match by week_number.
 */
router.get('/week/:weekNumber', (req, res) => {
  try {
    const weekNumber = Number(req.params.weekNumber);

    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
      return res.status(400).json({ success: false, error: 'weekNumber must be an integer between 1 and 53' });
    }

    // Get entries linked to a content_idea from this week
    const linkedRows = db.prepare(`
      SELECT pt.*
      FROM post_tracker pt
      INNER JOIN content_ideas ci ON pt.content_idea_id = ci.id
      WHERE ci.week_number = ?
      ORDER BY pt.scheduled_date ASC, pt.created_at DESC
    `).all(weekNumber);

    // Also get standalone entries (no content_idea_id) where we can't determine week — return separately
    const standaloneRows = db.prepare(`
      SELECT * FROM post_tracker
      WHERE content_idea_id IS NULL
      ORDER BY scheduled_date ASC, created_at DESC
    `).all();

    res.json({
      success: true,
      data: linkedRows,
      standalone: standaloneRows,
      weekNumber,
      total: linkedRows.length
    });
  } catch (err) {
    console.error('GET /api/tracker/week/:weekNumber error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/tracker/:id/status
 * Quickly updates only the status field of a tracker entry.
 * Body: { status: 'draft' | 'scheduled' | 'published' | 'archived' }
 */
router.patch('/:id/status', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    validateStatus(status);

    const existing = db.prepare('SELECT id FROM post_tracker WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Tracker entry ${id} not found` });
    }

    db.prepare(`
      UPDATE post_tracker SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, id);

    const updated = db.prepare('SELECT * FROM post_tracker WHERE id = ?').get(id);
    res.json({ success: true, message: `Tracker entry ${id} status updated to "${status}"`, data: updated });
  } catch (err) {
    console.error('PATCH /api/tracker/:id/status error:', err);
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
