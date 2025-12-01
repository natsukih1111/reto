// scripts/fixMore.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

// 1) questions.options_json を追加
try {
  db.prepare("ALTER TABLE questions ADD COLUMN options_json TEXT").run();
  console.log("✅ questions.options_json を追加しました");
} catch (e) {
  console.log("ℹ options_json の追加はスキップ（既に存在するかも）");
}

// 2) users.best_streak を追加
try {
  db.prepare("ALTER TABLE users ADD COLUMN best_streak INTEGER DEFAULT 0").run();
  console.log("✅ users.best_streak を追加しました");
} catch (e) {
  console.log("ℹ best_streak の追加はスキップ（既に存在するかも）");
}

// 3) users.banned を追加（BAN フラグ）
try {
  db.prepare("ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0").run();
  console.log("✅ users.banned を追加しました");
} catch (e) {
  console.log("ℹ banned の追加はスキップ（既に存在するかも）");
}

// 4) questions.correct_answer を追加
try {
  db.prepare("ALTER TABLE questions ADD COLUMN correct_answer TEXT").run();
  console.log("✅ questions.correct_answer を追加しました");
} catch (e) {
  console.log("ℹ correct_answer の追加はスキップ（既に存在するかも）");
}

// 5) questions.alt_answers_json を追加（記述問題の別解）
try {
  db.prepare("ALTER TABLE questions ADD COLUMN alt_answers_json TEXT DEFAULT '[]'").run();
  console.log("✅ questions.alt_answers_json を追加しました");
} catch (e) {
  console.log("ℹ alt_answers_json の追加はスキップ（既に存在するかも）");
}

// 6) questions.tags_json を追加（タグ情報）
try {
  db.prepare("ALTER TABLE questions ADD COLUMN tags_json TEXT DEFAULT '[]'").run();
  console.log("✅ questions.tags_json を追加しました");
} catch (e) {
  console.log("ℹ tags_json の追加はスキップ（既に存在するかも）");
}

// 7) users.matches_played を追加（対戦数カウンタ）
try {
  db.prepare("ALTER TABLE users ADD COLUMN matches_played INTEGER DEFAULT 0").run();
  console.log("✅ users.matches_played を追加しました");
} catch (e) {
  console.log("ℹ matches_played の追加はスキップ（既に存在するかも）");
}


// 8) question_submissions.type を追加（API が参照しているカラム名）
try {
  db.prepare("ALTER TABLE question_submissions ADD COLUMN type TEXT").run();
  console.log("✅ question_submissions.type を追加しました");
} catch (e) {
  console.log("ℹ question_submissions.type の追加はスキップ（既に存在するかも）");
}

// 9) question_submissions.question ...
try {
  db.prepare("ALTER TABLE question_submissions ADD COLUMN question TEXT").run();
  console.log("✅ question_submissions.question を追加しました");
} catch (e) {
  console.log("ℹ question_submissions.question の追加はスキップ（既に存在するかも）");
}

// 10) question_submissions.options ...
try {
  db.prepare("ALTER TABLE question_submissions ADD COLUMN options TEXT").run();
  console.log("✅ question_submissions.options を追加しました");
} catch (e) {
  console.log("ℹ question_submissions.options の追加はスキップ（既に存在するかも）");
}

// 11) question_submissions.answer ...
try {
  db.prepare("ALTER TABLE question_submissions ADD COLUMN answer TEXT").run();
  console.log("✅ question_submissions.answer を追加しました");
} catch (e) {
  console.log("ℹ question_submissions.answer の追加はスキップ（既に存在するかも）");
}

// 12) question_submissions.created_by を追加（投稿者のユーザー名 or ID 用）
try {
  db.prepare("ALTER TABLE question_submissions ADD COLUMN created_by TEXT").run();
  console.log("✅ question_submissions.created_by を追加しました");
} catch (e) {
  console.log("ℹ question_submissions.created_by の追加はスキップ（既に存在するかも）");
}

// 13) question_submissions.is_admin を追加（管理者投稿かどうかのフラグ）
try {
  db.prepare("ALTER TABLE question_submissions ADD COLUMN is_admin INTEGER DEFAULT 0").run();
  console.log("✅ question_submissions.is_admin を追加しました");
} catch (e) {
  console.log("ℹ question_submissions.is_admin の追加はスキップ（既に存在するかも）");
}

console.log("🎉 fixMore 完了！");
