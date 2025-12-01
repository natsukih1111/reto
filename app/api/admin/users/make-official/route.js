// file: app/api/admin/users/make-official/route.js
import db from '@/lib/db.js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, username } = body;

    if (!userId && !username) {
      return NextResponse.json(
        { ok: false, message: 'userId または username が指定されていません。' },
        { status: 400 }
      );
    }

    let user = null;

    if (userId) {
      user = db
        .prepare(
          'SELECT id, username, display_name, is_official_author FROM users WHERE id = ?'
        )
        .get(userId);
    } else if (username) {
      // username か display_name のどちらかに一致したらOKという甘め検索
      user = db
        .prepare(
          'SELECT id, username, display_name, is_official_author FROM users WHERE username = ? OR display_name = ?'
        )
        .get(username, username);
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, message: '該当ユーザーが見つかりません。' },
        { status: 404 }
      );
    }

    // すでに公認なら何もしない
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

    // 公認フラグを立てる
    db.prepare(
      'UPDATE users SET is_official_author = 1 WHERE id = ?'
    ).run(user.id);

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