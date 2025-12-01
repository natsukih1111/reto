// file: app/api/admin/ban-user/route.js
import db from '@/lib/db.js';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const loginId = (body.login_id || '').toString().trim();

    if (!loginId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'bad_request',
          message: 'login_id が指定されていません。',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const result = db
      .prepare('UPDATE users SET banned = 1 WHERE login_id = ?')
      .run(loginId);

    return new Response(
      JSON.stringify({
        ok: true,
        updated: result.changes,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('POST /api/admin/ban-user error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
