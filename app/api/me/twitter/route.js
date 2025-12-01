// file: app/api/me/twitter/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';

// Twitter URL 更新: POST /api/me/twitter
// body: { twitter_url: string }
export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value ?? null;

    if (!username) {
      return new Response(
        JSON.stringify({ ok: false, error: 'no_user' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    let twitterUrl = (body.twitter_url ?? '').toString().trim();

    // 空文字なら「未設定」として保存
    if (twitterUrl.length === 0) {
      db.prepare(
        `UPDATE users SET twitter_url = NULL WHERE username = ?`
      ).run(username);
    } else {
      // 長すぎるものはざっくり切る（保険）
      if (twitterUrl.length > 200) {
        twitterUrl = twitterUrl.slice(0, 200);
      }
      db.prepare(
        `UPDATE users SET twitter_url = ? WHERE username = ?`
      ).run(twitterUrl, username);
    }

    return new Response(
      JSON.stringify({ ok: true, twitter_url: twitterUrl }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('POST /api/me/twitter error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
