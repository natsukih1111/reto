// file: app/api/migrate-official-authors/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    // users.official_author: 公認作問者フラグ
    try {
      db.prepare(
        'ALTER TABLE users ADD COLUMN official_author INTEGER NOT NULL DEFAULT 0'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
        throw e;
      }
    }

    // question_submissions.author_user_id
    try {
      db.prepare(
        'ALTER TABLE question_submissions ADD COLUMN author_user_id INTEGER'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
        throw e;
      }
    }

    // question_submissions.author_username
    try {
      db.prepare(
        'ALTER TABLE question_submissions ADD COLUMN author_username TEXT'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
        throw e;
      }
    }

    // question_submissions.is_official: 公式扱いの問題かどうか（公認作問者の投稿）
    try {
      db.prepare(
        'ALTER TABLE question_submissions ADD COLUMN is_official INTEGER NOT NULL DEFAULT 0'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
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
    console.error('migrate-official-authors error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
