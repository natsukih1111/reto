// file: app/api/my-questions/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';

// 自分が投稿した問題の一覧を返す API
export async function GET() {
  try {
    const cookieStore = await cookies();
    const usernameFromCookie = cookieStore.get('nb_username')?.value || null;

    if (!usernameFromCookie) {
      return new Response(
        JSON.stringify({
          error: 'ログインが必要です。',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // cookie から username を元にユーザー情報取得
    const user = db
      .prepare(
        `
        SELECT id, username, login_id
        FROM users
        WHERE username = ?
      `
      )
      .get(usernameFromCookie);

    if (!user) {
      // クッキーはあるけどDBにいない（ありえない想定だが一応）
      return new Response(
        JSON.stringify({
          error: 'ユーザー情報が見つかりませんでした。',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const username = user.username;
    const loginId = user.login_id || null;
    const userIdText = String(user.id);

    // created_by には環境によって username / login_id / user_id(文字列) の
    // どれかが入っている想定なので、それら全てを自分の投稿として扱う
    const rows = db
      .prepare(
        `
        SELECT
          id,
          type,
          status,
          created_by,
          is_admin,
          created_at,
          COALESCE(question_text, question) AS question_text
        FROM question_submissions
        WHERE
          created_by = ?
          OR created_by = ?
          OR created_by = ?
        ORDER BY created_at DESC
      `
      )
      .all(username, loginId ?? '', userIdText);

    return new Response(JSON.stringify({ questions: rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error('GET /api/my-questions error:', err);
    return new Response(
      JSON.stringify({ error: 'サーバーエラー' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
