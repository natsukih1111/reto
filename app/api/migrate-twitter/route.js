// file: app/api/migrate-twitter/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    // すでにカラムがある場合はエラーになるが、そのときは無視
    try {
      db.prepare('ALTER TABLE users ADD COLUMN twitter_url TEXT').run();
    } catch (e) {
      const msg = String(e.message || e);
      // 既にカラムがある場合のエラー文言を無視
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
    console.error('migrate-twitter error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
