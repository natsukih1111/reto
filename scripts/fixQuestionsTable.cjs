// scripts/fixQuestionsTable.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

try {
  // 管理画面側が参照している question_text カラムを追加
  db.prepare("ALTER TABLE questions ADD COLUMN question_text TEXT").run();
  console.log("✅ questions.question_text を追加しました");
} catch (e) {
  console.log("ℹ question_text の追加はスキップ（既に存在するかも）");
}

console.log("🎉 fixQuestionsTable 完了！");