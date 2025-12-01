// file: app/api/migrate-question-authors/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    // author_user_id カラムを追加（存在していれば無視）
    try {
      db.prepare(
        'ALTER TABLE question_submissions ADD COLUMN author_user_id INTEGER'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      // すでにカラムがある場合のエラーは無視
      if (
        !msg.includes('duplicate column') &&
        !msg.includes('already exists') &&
        !msg.includes('has no column named') // 念のため
      ) {
        throw e;
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('migrate-question-authors error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error', message: String(e) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
