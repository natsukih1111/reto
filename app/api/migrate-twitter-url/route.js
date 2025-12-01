// file: app/api/migrate-twitter-url/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    // すでにカラムがある場合はエラーになるので try/catch
    db.prepare(`ALTER TABLE users ADD COLUMN twitter_url TEXT`).run();

    return new Response(
      JSON.stringify({ ok: true, message: 'twitter_url カラムを追加しました。' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    // すでにカラムがある場合など
    const msg = String(e?.message || '');
    if (msg.includes('duplicate column name') || msg.includes('already exists')) {
      return new Response(
        JSON.stringify({ ok: true, message: 'twitter_url カラムはすでに存在します。' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    console.error('migrate-twitter-url error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'migration_failed', detail: msg }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
