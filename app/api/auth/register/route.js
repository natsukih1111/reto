// file: app/api/auth/register/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let loginId = (body.login_id || '').toString().trim();
    let displayName = (body.display_name || '').toString().trim();
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

    // 先頭の @ は削除（TwitterっぽいIDを想定）
    loginId = loginId.replace(/^@/, '').trim();

    // ★ Twitter ID っぽい形式か軽くチェック（1〜15文字 / 英数とアンダースコアのみ）
    if (!/^[A-Za-z0-9_]{1,15}$/.test(loginId)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'invalid_login_id',
          message:
            'ログインIDは、英数字とアンダースコアのみ・最大15文字で入力してください。（TwitterのIDと同じ形式）',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // 表示名（空なら後でデフォルトを入れる）
    displayName = displayName.replace(/[\r\n]/g, ' ').trim();
    if (displayName.length > 20) {
      displayName = displayName.slice(0, 20);
    }

    // 既存ユーザーを login_id で検索
    const existing = db
      .prepare('SELECT * FROM users WHERE login_id = ?')
      .get(loginId);

    if (existing) {
      // BAN かどうかに関係なく、同じ login_id があれば新規登録はNG
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'already_exists',
          message:
            'このログインIDは既に使用されています。心当たりがない場合は管理者に連絡してください。',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ここまで来たら完全な新規登録
    const cookieStore = await cookies();
    const passwordHash = bcrypt.hashSync(password, 10);

    // とりあえずゲスト名を username に使う
    const rand = Math.floor(10000 + Math.random() * 90000);
    const username = `ゲスト-${rand}`;

    // display_name が空なら、とりあえず username を表示名にしておく
    const finalDisplayName = displayName || username;

    db.prepare(
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
      VALUES (?, ?, 1500, 1500, 0, 0, 0, 0, 0, ?, ?, 0, NULL, 0)
    `
    ).run(username, finalDisplayName, loginId, passwordHash);

    // クッキーに username をセットしてログイン状態に
    cookieStore.set('nb_username', username, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1年
    });

    return new Response(
      JSON.stringify({
        ok: true,
        username,
        login_id: loginId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('POST /api/auth/register error:', e);

    // DBレベルの UNIQUE 制約に引っかかったときの保険
    const msg = String(e.message || '');
    if (msg.includes('idx_users_login_id_unique') || msg.includes('UNIQUE') && msg.includes('login_id')) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'already_exists',
          message: 'このログインIDは既に使用されています。',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

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
