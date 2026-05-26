import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import { config } from './config.js';

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      published_at TEXT,
      category TEXT,
      notified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracked_symbols (
      symbol TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function isInitialized() {
  const row = getDb().prepare(`SELECT value FROM meta WHERE key = 'initialized'`).get();
  return row?.value === 'true';
}

export function markInitialized() {
  getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES ('initialized', 'true')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run();
}

export function articleExists(id) {
  const row = getDb().prepare(`SELECT 1 FROM articles WHERE id = ?`).get(id);
  return Boolean(row);
}

export function saveArticle(article) {
  getDb()
    .prepare(
      `INSERT INTO articles (id, title, description, url, published_at, category)
       VALUES (@id, @title, @description, @url, @publishedAt, @category)
       ON CONFLICT(id) DO NOTHING`,
    )
    .run(article);
}

export function getArticleCount() {
  const row = getDb().prepare(`SELECT COUNT(*) AS count FROM articles`).get();
  return row.count;
}

export function pruneOldArticles(maxCount = 500) {
  const articleCount = getArticleCount();

  if (articleCount <= maxCount) {
    return 0;
  }

  const deleteCount = articleCount - maxCount;

  const result = getDb()
    .prepare(
      `DELETE FROM articles
       WHERE id IN (
         SELECT id
         FROM articles
         ORDER BY datetime(notified_at) ASC, id ASC
         LIMIT ?
       )`,
    )
    .run(deleteCount);

  return result.changes;
}

export function saveTrackedSymbols(symbols) {
  const database = getDb();
  const insert = database.prepare(
    `INSERT INTO tracked_symbols (symbol)
     VALUES (?)
     ON CONFLICT(symbol) DO NOTHING`,
  );

  const insertMany = database.transaction((values) => {
    for (const symbol of values) {
      insert.run(symbol);
    }
  });

  insertMany(symbols);
}

export function getTrackedSymbols() {
  const rows = getDb()
    .prepare(`SELECT symbol FROM tracked_symbols ORDER BY created_at ASC, symbol ASC`)
    .all();

  return rows.map((row) => row.symbol);
}
