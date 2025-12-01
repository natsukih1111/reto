// scripts/showSchema.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

function showTable(name) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${name})`).all();
    console.log("==========", name, "==========");
    if (rows.length === 0) {
      console.log("  (テーブルが存在しません)");
      return;
    }
    for (const r of rows) {
      console.log(
        `${r.cid}: name=${r.name}, type=${r.type}, notnull=${r.notnull}, dflt=${r.dflt_value}`
      );
    }
    console.log();
  } catch (e) {
    console.log("⚠ テーブル取得エラー:", name, e.message);
  }
}

showTable("questions");
showTable("question_submissions");