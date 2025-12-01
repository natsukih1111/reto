import db from '@/lib/db.js';

// ユーザー一覧を返す（GET /api/users）
export async function GET() {
  const users = db
    .prepare('SELECT id, username, rating, wins, losses FROM users ORDER BY rating DESC')
    .all();

  return new Response(JSON.stringify(users), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// ユーザー登録（POST /api/users）
export async function POST(request) {
  try {
    const { username } = await request.json();

    if (!username || username.trim() === '') {
      return new Response(JSON.stringify({ error: 'ユーザー名は必須です' }), { status: 400 });
    }

    // ユーザー名の重複チェック
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) {
      return new Response(JSON.stringify({ error: 'ユーザー名はすでに使われています' }), { status: 409 });
    }

    // ユーザー登録
    const stmt = db.prepare('INSERT INTO users (username) VALUES (?)');
    const info = stmt.run(username);

    return new Response(JSON.stringify({ id: info.lastInsertRowid, username }), {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

