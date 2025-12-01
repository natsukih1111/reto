// file: app/api/migrate-berries/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    // berries カラム（無ければ追加、あれば無視）
    try {
      db.prepare(
        'ALTER TABLE users ADD COLUMN berries INTEGER NOT NULL DEFAULT 0'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
        throw e;
      }
    }

    // 公認作問者フラグ
    try {
      db.prepare(
        'ALTER TABLE users ADD COLUMN is_official_setter INTEGER NOT NULL DEFAULT 0'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
        throw e;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('migrate-berries error:', e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
