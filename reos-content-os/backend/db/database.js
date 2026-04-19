'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'reos-content-os.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS news_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      headline TEXT NOT NULL,
      source TEXT NOT NULL,
      date TEXT NOT NULL,
      key_data TEXT,
      content_angles TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      week_number INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL,
      day TEXT NOT NULL,
      pillar TEXT NOT NULL,
      format TEXT NOT NULL,
      title TEXT NOT NULL,
      hook TEXT NOT NULL,
      news_basis TEXT,
      slide_count INTEGER DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'idea',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS design_briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_idea_id INTEGER NOT NULL,
      slides TEXT NOT NULL,
      design_system TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (content_idea_id) REFERENCES content_ideas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_idea_id INTEGER,
      title TEXT NOT NULL,
      pillar TEXT,
      format TEXT,
      platform TEXT,
      scheduled_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      canva_link TEXT,
      drive_link TEXT,
      caption TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (content_idea_id) REFERENCES content_ideas(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS captions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_idea_id INTEGER,
      caption_text TEXT NOT NULL,
      hashtags TEXT,
      cta TEXT,
      platform TEXT NOT NULL DEFAULT 'instagram',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (content_idea_id) REFERENCES content_ideas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS generated_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_idea_id INTEGER NOT NULL,
      slide_number INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      prompt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (content_idea_id) REFERENCES content_ideas(id) ON DELETE CASCADE,
      UNIQUE(content_idea_id, slide_number)
    );
  `);

  console.log('Database initialized at:', DB_PATH);
}

module.exports = { db, initDatabase };
