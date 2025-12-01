// scripts/resetQuestionSubmissions.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

console.log("⚠ question_submissions テーブルを作り直します");

// 1) いったんテーブルを消す（あったら）
db.prepare("DROP TABLE IF EXISTS question_submissions").run();

// 2) 最終形の定義で作り直す
db.prepare(`
  CREATE TABLE question_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,                    -- 'choice' / 'multi' / 'input' / 'order'
    question TEXT,                -- 問題文
    options TEXT,                 -- JSON 文字列（選択肢とか、並び替えの要素）
    answer TEXT,                  -- 正解（記述 / 並び替えの正解など）
    tags_json TEXT DEFAULT '[]',  -- タグ（JSON 配列）
    created_by TEXT,              -- 投稿者（ユーザー名 or ID）
    is_admin INTEGER DEFAULT 0,   -- 管理者投稿なら 1
    status TEXT DEFAULT 'pending',-- 'pending' | 'approved' | 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by TEXT,
    reviewed_at DATETIME
  )
`).run();

console.log("✅ question_submissions テーブルを作り直しました");