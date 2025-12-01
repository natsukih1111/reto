// file: app/api/me/twitter-handle/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    let username = cookieStore.get('nb_username')?.value ?? null;

    let user = null;
    if (username) {
      user = db
        .prepare('SELECT * FROM users WHERE username = ?')
        .get(username);
    }

    if (!user) {
      const rand = Math.floor(10000 + Math.random() * 90000);
      username = `ゲスト-${rand}`;

      db.prepare(
        `
        INSERT INTO users (
          username,
          rating,
          internal_rating,
          wins,
          losses,
          matches_played,
          best_streak
        )
        VALUES (?, 1500, 1500, 0, 0, 0, 0)
      `
      ).run(username);

      user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

      cookieStore.set('nb_username', username, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    const body = await req.json().catch(() => ({}));
    let handle = (body.twitter_handle ?? '').toString().trim();

    if (!handle) {
      db.prepare(
        'UPDATE users SET twitter_url = NULL WHERE username = ?'
      ).run(username);

      return new Response(
        JSON.stringify({ ok: true, twitter_handle: '', twitter_url: '' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    handle = handle.replace(/^@/, '');
    if (handle.length > 50) handle = handle.slice(0, 50);

    db.prepare(
      'UPDATE users SET twitter_url = ? WHERE username = ?'
    ).run(handle, username);

    const twitterProfileUrl = `https://x.com/${handle}`;

    return new Response(
      JSON.stringify({
        ok: true,
        twitter_handle: handle,
        twitter_url: twitterProfileUrl,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('POST /api/me/twitter-handle error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
