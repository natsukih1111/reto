// file: app/api/admin/reset-season/route.js
import db, {
  getCurrentSeason,
  resetRatingsForNewSeason,
} from '@/lib/db.js';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // ① ログイン中ユーザーの取得
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'ログインしていません' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ★ db.prepare().get → db.get(sql, [params]) に変更
    const user = await db.get(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (!user || !user.is_admin) {
      return new Response(
        JSON.stringify({ error: '管理者のみ実行できます' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ② 今のシーズンコード（YYYYMM）
    const season = getCurrentSeason();

    // ③ レートリセット本体（後述のヘルパー）
    await resetRatingsForNewSeason();

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'レートをシーズン開始用にリセットしました',
        season,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('/api/admin/reset-season error', e);
    return new Response(
      JSON.stringify({ error: 'サーバーエラーが発生しました' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
