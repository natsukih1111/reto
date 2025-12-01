// file: app/api/auth/logout/route.js
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // nb_username クッキーを削除（有効期限を 0 に）
    cookieStore.set('nb_username', '', {
      path: '/',
      maxAge: 0,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('POST /api/auth/logout error:', e);
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
