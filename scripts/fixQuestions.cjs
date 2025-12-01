// scripts/fixQuestions.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

// 1) status カラム追加
try {
  db.prepare("ALTER TABLE questions ADD COLUMN status TEXT DEFAULT 'approved'").run();
  console.log("✅ questions.status を追加しました");
} catch (e) {
  console.log("ℹ status の追加はスキップ（既に存在）");
}

// 2) question_type カラム追加
try {
  db.prepare("ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT 'single'").run();
  console.log("✅ questions.question_type を追加しました");
} catch (e) {
  console.log("ℹ question_type の追加はスキップ（既に存在）");
}

console.log("🎉 fixQuestions 完了！");