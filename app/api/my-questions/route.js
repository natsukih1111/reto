// file: app/api/my-questions/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';

// 自分が投稿した問題の一覧を返す API（Supabase 版）
export async function GET() {
  try {
    const cookieStore = await cookies();
    const usernameFromCookie = cookieStore.get('nb_username')?.value || null;

    if (!usernameFromCookie) {
      return new Response(
        JSON.stringify({ error: 'ログインが必要です。' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // cookie から username を元にユーザー情報取得
    const userResult = await db.query(
      `
        SELECT id, username, login_id, display_name
        FROM users
        WHERE username = $1
      `,
      [usernameFromCookie]
    );
    const user = userResult[0];

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'ユーザー情報が見つかりませんでした。' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const username = user.username;
    const loginId = user.login_id || '';
    const userIdText = String(user.id);
    const displayName = user.display_name || '';

    // created_by に username / login_id / user.id 文字列 / display_name
    // のどれかが入っている想定で全部OR
    const qsResult = await db.query(
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
          created_by = $1
          OR created_by = $2
          OR created_by = $3
          OR created_by = $4
        ORDER BY created_at DESC
      `,
      [username, loginId, userIdText, displayName]
    );

    return new Response(
      JSON.stringify({ questions: qsResult }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
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
