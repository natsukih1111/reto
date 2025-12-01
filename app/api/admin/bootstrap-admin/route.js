// file: app/api/admin/bootstrap-admin/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';

// 最初の1人だけ自分を管理者に昇格できるAPI
export async function POST() {
  const cookieStore = await cookies();
  const username = cookieStore.get('nb_username')?.value ?? null;

  if (!username) {
    return new Response(
      JSON.stringify({ error: 'ログインしていません' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  // すでに管理者が存在するかチェック
  const adminRow = db
    .prepare('SELECT id, username FROM users WHERE is_admin = 1 LIMIT 1')
    .get();

  // すでに管理者がいる場合は、その人だけが他ユーザーを管理者にできる想定なのでNG
  if (adminRow) {
    return new Response(
      JSON.stringify({
        error: 'すでに管理者が存在するため、このAPIでは管理者追加できません',
        currentAdmin: adminRow.username,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  // 自分のユーザーを取得
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username);

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'ユーザーが見つかりません' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  // 自分を管理者に昇格
  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);

  return new Response(
    JSON.stringify({
      ok: true,
      message: 'このユーザーを管理者に設定しました',
      username: user.username,
      userId: user.id,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}
