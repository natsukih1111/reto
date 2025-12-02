// file: app/api/login/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

/**
 * 疑似 Twitter ログイン API
 * body: { username: "ログインID（Twitter ID or URL or @ID）" }
 *
 * - users.username = Twitter ID にそろえる
 * - twitter_url = https://x.com/ID を保存
 * - nb_username クッキーもその ID に更新
 */
export async function POST(req) {
  try {
    const body = await req.json();
    let raw = (body.username || '').trim();

    if (!raw) {
      return NextResponse.json(
        { ok: false, error: 'username_required' },
        { status: 400 }
      );
    }

    // URL や @付きで来た場合に ID だけ抜き出す
    let handle = raw;
    if (handle.startsWith('http')) {
      const m = handle.match(/(?:x|twitter)\.com\/([^/?#]+)/i);
      if (m && m[1]) handle = m[1];
    }
    handle = handle.replace(/^@/, '').trim();

    if (!handle) {
      return NextResponse.json(
        { ok: false, error: 'invalid_handle' },
        { status: 400 }
      );
    }

    const username = handle;

    // Supabase(Postgres) 版：ユーザー取得
    const selectSql = `
      SELECT
        id,
        username,
        rating,
        games_played,
        win_streak,
        max_win_streak,
        twitter_url
      FROM users
      WHERE username = $1
    `;
    let user = await db.get(selectSql, [username]);

    // なければ新規作成
    if (!user) {
      await db.run(
        `
          INSERT INTO users
            (username, rating, wins, losses, games_played, win_streak, max_win_streak)
          VALUES
            ($1, 1500, 0, 0, 0, 0, 0)
        `,
        [username]
      );

      user = await db.get(selectSql, [username]);
    }

    // twitter_url を https://x.com/ID で更新
    const twitterUrl = `https://x.com/${handle}`;
    if (user.twitter_url !== twitterUrl) {
      await db.run(
        `
          UPDATE users
          SET twitter_url = $1
          WHERE id = $2
        `,
        [twitterUrl, user.id]
      );
      user.twitter_url = twitterUrl;
    }

    // レスポンス生成 ＋ nb_username クッキーを設定
    const res = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          rating: user.rating,
          gamesPlayed: user.games_played,
          winStreak: user.win_streak,
          maxWinStreak: user.max_win_streak,
          twitter_url: user.twitter_url,
        },
      },
      { status: 200 }
    );

    // ★ ここが重要：/api/me が読むクッキーを上書き
    res.cookies.set('nb_username', username, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1年
    });

    return res;
  } catch (e) {
    console.error('login POST error:', e);
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
