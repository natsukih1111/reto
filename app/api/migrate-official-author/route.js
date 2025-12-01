// file: app/api/migrate-official-author/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    try {
      // 公認作問者フラグ（0 or 1）
      db.prepare(
        'ALTER TABLE users ADD COLUMN is_official_author INTEGER NOT NULL DEFAULT 0'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (
        !msg.includes('duplicate column') &&
        !msg.includes('already exists')
      ) {
        throw e;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('migrate-official-author error:', e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}