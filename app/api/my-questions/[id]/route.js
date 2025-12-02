// file: app/api/my-questions/[id]/route.js
import db from '@/lib/db.js';

// 詳細取得: GET /api/my-questions/[id]
export async function GET(_req, context) {
  // ★ params は Promise なので await 必須
  const { id: idStr } = await context.params;
  const id = Number(idStr);

  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const row = await db.get(
    `
      SELECT
        id,
        type,
        status,
        created_by,
        is_admin,
        created_at,
        updated_at,
        COALESCE(question_text, question) AS question_text,
        options_json,
        correct_answer,
        alt_answers_json,
        tags_json
      FROM question_submissions
      WHERE id = $1
    `,
    [id]
  );

  if (!row) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  let options = [];
  let altAnswers = [];
  let tags = [];

  try {
    options = row.options_json ? JSON.parse(row.options_json) : [];
  } catch {}
  try {
    altAnswers = row.alt_answers_json ? JSON.parse(row.alt_answers_json) : [];
  } catch {}
  try {
    tags = row.tags_json ? JSON.parse(row.tags_json) : [];
  } catch {}

  const payload = {
    id: row.id,
    type: row.type,
    status: row.status,
    created_by: row.created_by,
    is_admin: row.is_admin,
    created_at: row.created_at,
    updated_at: row.updated_at,
    question_text: row.question_text,
    options,
    correct_answer: row.correct_answer,
    alt_answers: altAnswers,
    tags,
  };

  return new Response(JSON.stringify({ question: payload }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// 投稿キャンセル: DELETE /api/my-questions/[id]
export async function DELETE(_req, context) {
  // ★ こっちも await 必須
  const { id: idStr } = await context.params;
  const id = Number(idStr);

  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const row = await db.get(
    `SELECT status FROM question_submissions WHERE id = $1`,
    [id]
  );

  if (!row) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (row.status !== 'pending') {
    return new Response(
      JSON.stringify({ error: 'only_pending_can_be_cancelled' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  await db.run(`DELETE FROM question_submissions WHERE id = $1`, [id]);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
