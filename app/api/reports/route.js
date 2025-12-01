// file: app/api/reports/route.js
import db from '@/lib/db.js';

export async function POST(request) {
  const { question_id, reporter_user_id, content } = await request.json();

  if (!question_id || !content) {
    return new Response(
      JSON.stringify({ error: '必要な情報が足りません' }),
      { status: 400 }
    );
  }

  const stmt = db.prepare(`
    INSERT INTO question_reports
      (question_id, reporter_user_id, content)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(question_id, reporter_user_id ?? null, content);

  return new Response(
    JSON.stringify({ id: info.lastInsertRowid }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}

// 管理者用一覧
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'open';

  const rows = db
    .prepare(
      `SELECT r.*, q.question
       FROM question_reports r
       JOIN questions q ON q.id = r.question_id
       WHERE r.status = ?
       ORDER BY r.created_at DESC
       LIMIT 100`
    )
    .all(status);

  return new Response(JSON.stringify({ reports: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
