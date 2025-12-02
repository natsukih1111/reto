// file: app/api/admin/users/make-official/route.js
import db from '@/lib/db.js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    // どんな名前で来ても拾う
    const userId =
      body.userId ??
      body.authorUserId ??
      body.authorId ??
      body.id ??
      null;

    const usernameOrName =
      body.username ??
      body.displayName ??
      body.authorName ??
      null;

    if (!userId && !usernameOrName) {
      return NextResponse.json(
        { ok: false, message: 'userId または username が指定されていません。' },
        { status: 400 }
      );
    }

    let rows = [];

    if (userId) {
      rows = await db.query(
        `
          SELECT id, username, display_name, is_official_author
          FROM users
          WHERE id = $1
        `,
        [userId]
      );
    } else if (usernameOrName) {
      rows = await db.query(
        `
          SELECT id, username, display_name, is_official_author
          FROM users
          WHERE username = $1 OR display_name = $1
        `,
        [usernameOrName]
      );
    }

    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { ok: false, message: '該当ユーザーが見つかりません。' },
        { status: 404 }
      );
    }

    if (user.is_official_author) {
      return NextResponse.json(
        {
          ok: true,
          username: user.display_name || user.username,
          already: true,
        },
        { status: 200 }
      );
    }

    await db.query(
      `
        UPDATE users
        SET is_official_author = 1
        WHERE id = $1
      `,
      [user.id]
    );

    return NextResponse.json(
      {
        ok: true,
        username: user.display_name || user.username,
        already: false,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('make-official error:', e);
    return NextResponse.json(
      { ok: false, message: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
