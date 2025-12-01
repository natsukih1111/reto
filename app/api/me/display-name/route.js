// file: app/api/me/display-name/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';

async function getCurrentUserRow() {
  const cookieStore = await cookies();
  const usernameCookie = cookieStore.get('nb_username')?.value || null;

  if (!usernameCookie) return null;

  const row = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(usernameCookie);

  return row || null;
}

// 現在の表示名を取得
export async function GET() {
  try {
    const row = await getCurrentUserRow();
    if (!row) {
      return new Response(
        JSON.stringify({ ok: false, error: 'not_logged_in' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const displayName = row.display_name || row.username;
    const nameChangeUsed = row.name_change_used ?? 0;

    return new Response(
      JSON.stringify({
        ok: true,
        displayName,
        nameChangeUsed,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('GET /api/me/display-name error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}

// 表示名を 1回だけ変更
export async function POST(req) {
  try {
    const row = await getCurrentUserRow();
    if (!row) {
      return new Response(
        JSON.stringify({ ok: false, error: 'not_logged_in' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    let newName = (body.display_name || '').toString().trim();

    if (!newName) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'bad_request',
          message: '名前を入力してください。',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // 文字数制限（例: 最大20文字）
    if (newName.length > 20) {
      newName = newName.slice(0, 20);
    }

    // 改行などは消しておく
    newName = newName.replace(/[\r\n]/g, ' ');

    const alreadyUsed = row.name_change_used ?? 0;
    if (alreadyUsed >= 1) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'already_changed',
          message: '名前の変更は1度までです。',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    db.prepare(
      `
      UPDATE users
      SET display_name = ?, name_change_used = 1
      WHERE username = ?
    `
    ).run(newName, row.username);

    return new Response(
      JSON.stringify({
        ok: true,
        displayName: newName,
        nameChangeUsed: 1,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('POST /api/me/display-name error:', e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'server_error',
        message: 'サーバーエラーが発生しました。',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
