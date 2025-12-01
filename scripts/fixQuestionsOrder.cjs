// scripts/fixQuestionsOrder.cjs
const Database = require("better-sqlite3");
const db = new Database("quiz.db");

console.log("questions テーブルに order_json を追加します…");

try {
  db.prepare(`
    ALTER TABLE questions
    ADD COLUMN order_json TEXT DEFAULT '[]'
  `).run();

  console.log("✔ order_json を追加しました");
} catch (e) {
  if (String(e).includes("duplicate column")) {
    console.log("✔ すでに order_json は存在しています");
  } else {
    console.error(e);
  }
}