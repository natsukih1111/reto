// file: scripts/add-rating-columns.js
import db from '../lib/db.js';

const alters = [
  "ALTER TABLE users ADD COLUMN internal_rating REAL",
  "ALTER TABLE users ADD COLUMN matches_played INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN best_streak INTEGER DEFAULT 0",
];

for (const sql of alters) {
  try {
    console.log('RUN:', sql);
    db.prepare(sql).run();
  } catch (e) {
    // すでにカラムがある場合はエラーになるので無視してOK
    console.log('SKIP:', sql, String(e));
  }
}

console.log('done.');
