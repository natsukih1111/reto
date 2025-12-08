// file: app/api/titles/owned/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value;

    if (!username) return NextResponse.json({ owned: [] });

    const u = await db.get(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );

    if (!u) return NextResponse.json({ owned: [] });

    const rows = await db.query(
      `SELECT title_id FROM user_titles WHERE user_id = $1`,
      [u.id]
    );

    return NextResponse.json(
      { owned: rows.map((r) => r.title_id) },
      { status: 200 }
    );
  } catch (e) {
    console.error('[api/titles/owned] error', e);
    return NextResponse.json({ owned: [] }, { status: 500 });
  }
}
