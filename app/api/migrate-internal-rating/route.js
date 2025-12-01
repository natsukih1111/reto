// file: app/api/migrate-internal-rating/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    // users テーブルに internal_rating カラムを追加
    db.prepare(
      'ALTER TABLE users ADD COLUMN internal_rating REAL DEFAULT 1500'
    ).run();

    return new Response('ok: added internal_rating', { status: 200 });
  } catch (e) {
    console.error(e);

    const msg = String(e || '');
    // すでにカラムがある場合は「duplicate column name」で落ちるので成功扱い
    if (msg.includes('duplicate column name')) {
      return new Response('ok: column already exists', { status: 200 });
    }

    return new Response('error: ' + msg, { status: 500 });
  }
}
