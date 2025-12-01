// scripts/initQuestionSubmissions.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

// 問題投稿テーブル
// 投稿時の情報を全部ここに貯める
db.prepare(`
  CREATE TABLE IF NOT EXISTS question_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,                       -- 投稿者ユーザーID（未ログインなら NULL も許容）
    question_text TEXT NOT NULL,          -- 問題文
    question_type TEXT NOT NULL,          -- 'single' | 'multi' | 'multi_select' | 'order' | 'text'
    options_json TEXT,                    -- 選択肢（JSON文字列）
    correct_answer TEXT,                  -- 正解（メイン）
    alt_answers_json TEXT,                -- 別解（JSON配列文字列）
    tags_json TEXT,                       -- タグ（JSON配列文字列）
    status TEXT DEFAULT 'pending',        -- 'pending' | 'approved' | 'rejected'
    is_official INTEGER DEFAULT 0,        -- 管理者の公式問題なら 1
    creator_is_trusted INTEGER DEFAULT 0, -- 公認作問者なら 1
    reason TEXT,                          -- 却下理由やメモ
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log("✅ question_submissions テーブルを作成/確認しました");