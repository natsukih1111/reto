// file: app/api/admin/official-authors/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

// 公認作問者一覧取得
export async function GET() {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          id,
          username,
          display_name,
          rating,
          berries,
          twitter_url,
          is_official_author
        FROM users
        WHERE is_official_author = 1
        ORDER BY id ASC
      `
      )
      .all();

    return NextResponse.json({ authors: rows });
  } catch (err) {
    console.error('GET /api/admin/official-authors error:', err);
    return NextResponse.json(
      { error: '公認作問者一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 公認作問者の解除（公認ではなくす）
export async function POST(request) {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId が指定されていません' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(
      `
      UPDATE users
      SET is_official_author = 0
      WHERE id = ?
    `
    );
    const info = stmt.run(userId);

    if (info.changes === 0) {
      return NextResponse.json(
        { error: '指定されたユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/official-authors error:', err);
    return NextResponse.json(
      { error: '公認作問者の解除に失敗しました' },
      { status: 500 }
    );
  }
}
