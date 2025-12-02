// file: app/api/admin/official-authors/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

// db.query が配列 or { rows } どちらでも動くようにするヘルパー
async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

// 公認作問者一覧取得
export async function GET() {
  try {
    const rows = await queryRows(
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
    );

    return NextResponse.json({ authors: rows }, { status: 200 });
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
    const body = await request.json().catch(() => ({}));

    // userId / user_id のどっちでも受ける
    const rawId = body.userId ?? body.user_id;
    const userId = rawId ? Number(rawId) : NaN;

    if (!rawId || Number.isNaN(userId)) {
      return NextResponse.json(
        { error: 'userId が指定されていません' },
        { status: 400 }
      );
    }

    const res = await db.query(
      `
        UPDATE users
        SET is_official_author = 0
        WHERE id = $1
      `,
      [userId]
    );

    // pg クライアント想定：rowCount があればそれを使う
    const affected =
      typeof res.rowCount === 'number'
        ? res.rowCount
        : Array.isArray(res)
        ? res.length
        : 0;

    if (affected === 0) {
      return NextResponse.json(
        { error: '指定されたユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('POST /api/admin/official-authors error:', err);
    return NextResponse.json(
      { error: '公認作問者の解除に失敗しました' },
      { status: 500 }
    );
  }
}
