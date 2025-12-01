// file: app/api/migrate-display-name/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    // display_name カラム追加
    try {
      db.prepare('ALTER TABLE users ADD COLUMN display_name TEXT').run();
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
        throw e;
      }
    }

    // name_change_used カラム追加（0 or 1）
    try {
      db.prepare(
        'ALTER TABLE users ADD COLUMN name_change_used INTEGER NOT NULL DEFAULT 0'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
        throw e;
      }
    }

    // まだ display_name が入っていない既存ユーザーには username をコピー
    db.prepare(
      `
      UPDATE users
      SET display_name = username
      WHERE display_name IS NULL OR display_name = ''
    `
    ).run();

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('migrate-display-name error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
