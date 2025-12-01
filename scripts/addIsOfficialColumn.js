// file: scripts/addIsOfficialColumn.js
import Database from 'better-sqlite3';

const db = new Database('quiz.db');

// すでにカラムがあるかどうか確認
const columns = db.prepare(`PRAGMA table_info(questions);`).all();
const hasIsOfficial = columns.some((col) => col.name === 'is_official');

if (hasIsOfficial) {
  console.log('is_official カラムは既に存在します。何もしません。');
  process.exit(0);
}

console.log('is_official カラムを追加します...');

db.prepare(
  `ALTER TABLE questions ADD COLUMN is_official INTEGER DEFAULT 0`
).run();

console.log('is_official カラムを追加しました。');
