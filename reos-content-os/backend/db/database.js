'use strict';

const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'reos-content-os.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let _db = null;
let _inTransaction = false;

function saveDb() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getLastInsertRowid() {
  try {
    const stmt = _db.prepare('SELECT last_insert_rowid()');
    stmt.step();
    const row = stmt.get();
    stmt.free();
    return row ? row[0] : 0;
  } catch { return 0; }
}

// Compatibility layer that mimics the better-sqlite3 synchronous API
const db = {
  prepare(sql) {
    return {
      get(...args) {
        const params = args.flat();
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        const hasRow = stmt.step();
        const row = hasRow ? stmt.getAsObject() : undefined;
        stmt.free();
        return row;
      },
      all(...args) {
        const params = args.flat();
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      run(...args) {
        const params = args.flat();
        _db.run(sql, params.length ? params : []);
        const lastInsertRowid = getLastInsertRowid();
        const changes = _db.getRowsModified();
        if (!_inTransaction) saveDb();
        return { lastInsertRowid, changes };
      }
    };
  },
  transaction(fn) {
    return (items) => {
      _inTransaction = true;
      _db.run('BEGIN TRANSACTION');
      try {
        fn(items);
        _db.run('COMMIT');
      } catch (e) {
        try { _db.run('ROLLBACK'); } catch {}
        throw e;
      } finally {
        _inTransaction = false;
      }
      saveDb();
    };
  },
  exec(sql) {
    _db.exec(sql);
  },
  pragma(str) {
    if (str === 'journal_mode = WAL') return;
    _db.run(`PRAGMA ${str}`);
  }
};

async function initDatabase() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  let fileData = null;
  if (fs.existsSync(DB_PATH)) {
    fileData = fs.readFileSync(DB_PATH);
  }

  _db = new SQL.Database(fileData ? Buffer.from(fileData) : null);
  _db.run('PRAGMA foreign_keys = ON');

  _db.exec(`
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS captions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_idea_id INTEGER,
      caption_text TEXT NOT NULL,
      hashtags TEXT,
      cta TEXT,
      platform TEXT NOT NULL DEFAULT 'instagram',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generated_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_idea_id INTEGER NOT NULL,
      slide_number INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      prompt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(content_idea_id, slide_number)
    );
  `);

  saveDb();
  console.log('Database initialized at:', DB_PATH);
}

module.exports = { db, initDatabase };
