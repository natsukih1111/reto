// scripts/fixTimestamps.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

function ensureUpdatedAt(table) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some((c) => c.name === "updated_at");
  if (exists) {
    console.log(`ℹ ${table}.updated_at は既にあります（スキップ）`);
    return;
  }

  console.log(`➡ ${table}.updated_at を追加します…`);

  // ① デフォルト無しでカラムを追加（関数 DEFAULT を避ける）
  db.prepare(`ALTER TABLE ${table} ADD COLUMN updated_at DATETIME`).run();

  // ② 既存行には CURRENT_TIMESTAMP を入れておく
  db.prepare(
    `UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`
  ).run();

  console.log(`✅ ${table}.updated_at を追加しました`);
}

// questions と question_submissions の両方に updated_at を保証
ensureUpdatedAt("questions");
ensureUpdatedAt("question_submissions");

console.log("🎉 fixTimestamps 完了！");