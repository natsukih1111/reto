// file: app/api/auth/register/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

/**
 * Post /api/auth/register
 * Supabase(Postgres) 用に書き換え済み
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    // 入力値
    let loginId = (body.login_id || '').toString().trim();
    let displayName = (body.display_name || '').toString().trim();
    const password = (body.password || '').toString();

    // ===== 必須チェック =====
    if (!loginId || !password) {
      return Response.json(
        {
          ok: false,
          error: 'bad_request',
          message: 'ログインIDとパスワードを入力してください。',
        },
        { status: 400 }
      );
    }

    // @ を削除して、Twitter風のID制約に合わせる
    loginId = loginId.replace(/^@/, '').trim();

    if (!/^[A-Za-z0-9_]{1,15}$/.test(loginId)) {
      return Response.json(
        {
          ok: false,
          error: 'invalid_login_id',
          message:
            'ログインIDは、英数字とアンダースコアのみ・最大15文字で入力してください。',
        },
        { status: 400 }
      );
    }

    // 表示名の整形
    displayName = displayName.replace(/[\r\n]/g, ' ').trim();
    if (displayName.length > 20) {
      displayName = displayName.slice(0, 20);
    }

    // ===== 既存ユーザー検索（Postgres 用に $1 を使う） =====
    const existing = await db.get(
      'SELECT id FROM users WHERE login_id = $1',
      [loginId]
    );

    if (existing) {
      return Response.json(
        {
          ok: false,
          error: 'already_exists',
          message: 'このログインIDは既に使用されています。',
        },
        { status: 409 }
      );
    }

    // ===== 新規登録処理 =====

    // username はランダム "ゲスト-XXXXX"
    const rand = Math.floor(10000 + Math.random() * 90000);
    const username = `ゲスト-${rand}`;

    // display_name が空なら username を使う
    const finalDisplayName = displayName || username;

    // パスワードハッシュ
    const passwordHash = bcrypt.hashSync(password, 10);

    // Postgres INSERT（$1 形式に変更）
    await db.run(
      `
      INSERT INTO users (
        username,
        display_name,
        rating,
        internal_rating,
        wins,
        losses,
        matches_played,
        best_streak,
        berries,
        login_id,
        password_hash,
        banned,
        twitter_url,
        name_change_used
      )
      VALUES ($1, $2, 1500, 1500, 0, 0, 0, 0, 0, $3, $4, 0, NULL, 0)
      `,
      [username, finalDisplayName, loginId, passwordHash]
    );

    // ===== クッキーを保存（ログイン状態に） =====
    const cookieStore = await cookies();
    cookieStore.set('nb_username', username, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1年
    });

    return Response.json(
      {
        ok: true,
        username,
        login_id: loginId,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('POST /api/auth/register error:', e);

    // Postgres の unique 制約用エラーハンドリング
    const msg = String(e.message || '');

    if (msg.includes('duplicate key value') && msg.includes('login_id')) {
      return Response.json(
        {
          ok: false,
          error: 'already_exists',
          message: 'このログインIDは既に使用されています。',
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: 'server_error',
        message: `サーバーエラーが発生しました: ${e.message || e}`,
      },
      { status: 500 }
    );
  }
}
