// scripts/addOptionsJsonToSubmissions.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

// 1) question_submissions に options_json カラムを追加
try {
  db.prepare(`
    ALTER TABLE question_submissions
    ADD COLUMN options_json TEXT
  `).run();
  console.log("✅ question_submissions.options_json を追加しました");
} catch (e) {
  console.log("ℹ options_json の追加はスキップ（既に存在するかも）:", e.message);
}

// 2) 既存データがあれば、options → options_json にコピー
try {
  const result = db
    .prepare(`
      UPDATE question_submissions
      SET options_json = options
      WHERE (options_json IS NULL OR options_json = '')
        AND options IS NOT NULL
    `)
    .run();
  console.log(`✅ options から options_json へコピーしました (${result.changes} 行)`);
} catch (e) {
  console.log("⚠ options_json 更新中にエラー:", e.message);
}

console.log("🎉 addOptionsJsonToSubmissions 完了！");