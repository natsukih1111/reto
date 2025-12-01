// scripts/listQuestions.cjs
const Database = require("better-sqlite3");

const db = new Database("quiz.db");

const rows = db
  .prepare(
    `
    SELECT
      id,
      question,
      status,
      question_type,
      tags_json,
      updated_at
    FROM questions
    ORDER BY id DESC
    LIMIT 50
    `
  )
  .all();

console.log("questions レコード（新しい順 最大50件）");
for (const r of rows) {
  console.log(
    `id=${r.id}, status=${r.status}, type=${r.question_type}, tags=${r.tags_json}, updated_at=${r.updated_at}`
  );
}