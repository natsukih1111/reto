// file: app/api/announcements/mark-read/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db.js';

export const runtime = 'nodejs';

async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    if (!username) {
      return NextResponse.json(
        { ok: false, error: 'NOT_LOGGED_IN' },
        { status: 401 }
      );
    }

    const userRows = await queryRows(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    const user = userRows[0];

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // ユーザーごとの最終既読時刻を NOW に更新（なければINSERT）
    await queryRows(
      `
        INSERT INTO announcement_user_reads (user_id, last_read_at)
        VALUES ($1, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET last_read_at = EXCLUDED.last_read_at
      `,
      [user.id]
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('/api/announcements/mark-read error', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
