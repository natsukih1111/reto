// scripts/fixSubmissionsColumns.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

function addColumn(sql, label) {
  try {
    db.prepare(sql).run();
    console.log(`✅ ${label} を追加しました`);
  } catch (e) {
    console.log(`ℹ ${label} の追加はスキップ（既に存在するかも）`);
  }
}

// question_submissions に不足しているカラムをまとめて追加
addColumn(
  "ALTER TABLE question_submissions ADD COLUMN options_json TEXT",
  "question_submissions.options_json"
);

addColumn(
  "ALTER TABLE question_submissions ADD COLUMN correct_answer TEXT",
  "question_submissions.correct_answer"
);

addColumn(
  "ALTER TABLE question_submissions ADD COLUMN alt_answers_json TEXT DEFAULT '[]'",
  "question_submissions.alt_answers_json"
);

console.log("🎉 fixSubmissionsColumns 完了！");