// file: app/api/questions/submit/route.js
import db from '@/lib/db.js';

function normalizeText(text) {
  return text.replace(/\s+/g, '').toLowerCase();
}

// 類似度ざっくり（7割一致＋答え同じ）
function isSimilarQuestion(newQ, existingQ) {
  if (newQ.correct_answer !== existingQ.correct_answer) return false;

  const a = normalizeText(newQ.question);
  const b = normalizeText(existingQ.question);
  if (!a || !b) return false;

  const minLen = Math.min(a.length, b.length);
  if (minLen === 0) return false;

  let same = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) same++;
  }
  const ratio = same / minLen;
  return ratio >= 0.7;
}

export async function POST(request) {
  const body = await request.json();

  const {
    question_type,
    question,
    options = [],
    correct_answer,
    alt_answers = [],
    tags = [],
    author_user_id = null,
    is_admin = false,
    is_author = false,
  } = body;

  if (!question_type || !question || !correct_answer) {
    return new Response(
      JSON.stringify({ error: '必須項目が足りません' }),
      { status: 400 }
    );
  }

  // 別解は完全一致で判定する前提
  const altJson = JSON.stringify(alt_answers);
  const optJson = JSON.stringify(options);
  const tagsJson = JSON.stringify(tags);

  // 類似問題検索
  const existing = db
    .prepare(
      `SELECT id, question, correct_answer
       FROM questions
       WHERE status = 'approved'`
    )
    .all();

  const similar = [];
  for (const row of existing) {
    if (
      row.correct_answer === correct_answer &&
      isSimilarQuestion({ question, correct_answer }, row)
    ) {
      similar.push({ id: row.id, question: row.question });
    }
  }

  // 公認作問者 or 管理者なら自動承認、そうでなければ pending
  const status = is_admin || is_author ? 'approved' : 'pending';
  const isOfficial = is_admin || is_author ? 1 : 0;

  const stmt = db.prepare(`
    INSERT INTO questions
      (question_type, question, options_json, correct_answer,
       alt_answers_json, tags_json, author_user_id, is_official, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    question_type,
    question,
    optJson,
    correct_answer,
    altJson,
    tagsJson,
    author_user_id,
    isOfficial,
    status
  );

  // ベリー加算（通常:100 / 公認作問者:300）
  if (author_user_id) {
    const amount = isOfficial ? 300 : 100;
    db.transaction(() => {
      db.prepare(
        'UPDATE users SET berries = berries + ? WHERE id = ?'
      ).run(amount, author_user_id);
      db.prepare(
        'INSERT INTO berries_log (user_id, amount, reason) VALUES (?, ?, ?)'
      ).run(author_user_id, amount, '問題投稿');
    })();
  }

  return new Response(
    JSON.stringify({
      id: info.lastInsertRowid,
      status,
      similarQuestions: similar,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}
