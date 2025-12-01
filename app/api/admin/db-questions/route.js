// file: app/api/admin/db-questions/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    const rows = db
      .prepare(`
        SELECT id, question_type, question, status
        FROM questions
        ORDER BY id ASC
      `)
      .all();

    return new Response(
      JSON.stringify({ questions: rows }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('db-questions GET error', e);
    return new Response(
      JSON.stringify({ error: 'DBエラーが発生しました。' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
