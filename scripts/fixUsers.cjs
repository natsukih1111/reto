// scripts/fixUsers.cjs
const Database = require('better-sqlite3');
const db = new Database('quiz.db');

function ensureColumn(name, ddl) {
  const info = db.prepare("PRAGMA table_info('users')").all();
  const exists = info.some(col => col.name === name);
  if (exists) {
    console.log("EXISTS:", name);
    return;
  }
  console.log("ADD COLUMN:", name);
  db.prepare(`ALTER TABLE users ADD COLUMN ${ddl}`).run();
}

console.log("users テーブルをチェック中…");

ensureColumn("rating", "INTEGER NOT NULL DEFAULT 1500");
ensureColumn("wins", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("losses", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("games_played", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("win_streak", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("max_win_streak", "INTEGER NOT NULL DEFAULT 0");

// ★重要★ 今足りてないのはこれ
ensureColumn("internal_rating", "INTEGER");

console.log("完了");