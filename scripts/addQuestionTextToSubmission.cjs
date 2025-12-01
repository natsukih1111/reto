// scripts/addQuestionTextToSubmissions.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

// 1) question_submissions に question_text カラムを追加（なければ）
try {
  db.prepare(`
    ALTER TABLE question_submissions
    ADD COLUMN question_text TEXT
  `).run();
  console.log("✅ question_submissions.question_text を追加しました");
} catch (e) {
  console.log("ℹ question_text の追加はスキップ（既に存在するかも）:", e.message);
}

// 2) 既存レコードの question → question_text へコピー
try {
  const result = db
    .prepare(`
      UPDATE question_submissions
      SET question_text = question
      WHERE question_text IS NULL OR question_text = ''
    `)
    .run();
  console.log(`✅ question_submissions.question_text を question からコピーしました (${result.changes} 行)`);
} catch (e) {
  console.log("⚠ question_text 更新中にエラー:", e.message);
}

console.log("🎉 addQuestionTextToSubmissions 完了！");