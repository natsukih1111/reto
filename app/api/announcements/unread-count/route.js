// file: app/api/announcements/unread-count/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db.js';

export const runtime = 'nodejs';

async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    // 未ログインなら 0 件
    if (!username) {
      return NextResponse.json({ ok: true, count: 0 }, { status: 200 });
    }

    const userRows = await queryRows(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    const user = userRows[0];

    if (!user) {
      return NextResponse.json({ ok: true, count: 0 }, { status: 200 });
    }

    // 最終既読時刻
    const readRows = await queryRows(
      'SELECT last_read_at FROM announcement_user_reads WHERE user_id = $1',
      [user.id]
    );

    const lastReadAt =
      (readRows[0] && readRows[0].last_read_at) ||
      '1970-01-01T00:00:00Z';

    // last_read_at より新しいお知らせ件数
    const countRows = await queryRows(
      `
        SELECT COUNT(*) AS cnt
          FROM announcements
         WHERE is_published = TRUE
           AND created_at > $1
      `,
      [lastReadAt]
    );

    const raw = countRows[0]?.cnt ?? 0;
    const count = typeof raw === 'number' ? raw : Number(raw) || 0;

    return NextResponse.json({ ok: true, count }, { status: 200 });
  } catch (e) {
    console.error('/api/announcements/unread-count error', e);
    return NextResponse.json(
      { ok: false, count: 0, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
