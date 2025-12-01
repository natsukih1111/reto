// file: app/api/ai-battle/reward/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import { addBerriesByUserId } from '@/lib/berries';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.berry ?? 0);

    if (!Number.isFinite(amount) || amount === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'invalid_amount' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ★ await cookies()
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    if (!username) {
      return new Response(
        JSON.stringify({ ok: false, error: 'not_logged_in' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const user = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);

    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'user_not_found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    console.log('[ai-battle/reward] add', amount, 'berries to user_id=', user.id);

    addBerriesByUserId(user.id, amount, 'AIなつ戦勝利報酬');

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('ai-battle/reward error', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
