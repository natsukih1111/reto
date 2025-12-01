// app/api/admin/endless/log/route.js
import db from '@/lib/db.js';

export async function POST(request) {
  const { question_id, is_correct, answer_time_ms } = await request.json();

  if (!question_id) {
    return new Response(
      JSON.stringify({ error: 'question_id は必須です' }),
      { status: 400 }
    );
  }

  // 今は admin_user_id = 1 固定。あとでログインユーザーIDにする
  db.prepare(
    `INSERT INTO endless_logs
      (admin_user_id, question_id, is_correct, answer_time_ms)
     VALUES (?, ?, ?, ?)`
  ).run(1, question_id, is_correct ? 1 : 0, answer_time_ms ?? 0);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
