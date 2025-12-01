// file: app/api/auth/login/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    let loginId = (body.login_id || '').toString().trim();
    const password = (body.password || '').toString();

    // 必須チェック
    if (!loginId || !password) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'bad_request',
          message: 'ログインIDとパスワードを入力してください。',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // 先頭の @ は削除
    loginId = loginId.replace(/^@/, '').trim();

    // ユーザー取得
    const row = db
      .prepare(
        `
        SELECT
          id,
          username,
          display_name,
          login_id,
          password_hash,
          banned
        FROM users
        WHERE login_id = ?
      `
      )
      .get(loginId);

    // ユーザーがいない or パスワード不一致
    if (!row || !row.password_hash) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'invalid_credentials',
          message: 'ログインIDまたはパスワードが正しくありません。',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ★ BAN チェック
    if ((row.banned ?? 0) !== 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'banned',
          message:
            'このアカウントはBANされています。詳しくは管理者にお問い合わせください。',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const passwordOk = bcrypt.compareSync(password, row.password_hash);
    if (!passwordOk) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'invalid_credentials',
          message: 'ログインIDまたはパスワードが正しくありません。',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ログイン成功 → クッキーに username を保存
    const cookieStore = await cookies();
    cookieStore.set('nb_username', row.username, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        username: row.username,
        display_name: row.display_name,
        login_id: row.login_id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('POST /api/auth/login error:', e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'server_error',
        message: `サーバーエラーが発生しました: ${e.message || e}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
