// file: app/api/admin/reset-season/route.js
import db, {
  getCurrentSeason,
  resetRatingsForNewSeason,
} from '@/lib/db.js';
import { cookies } from 'next/headers';

export async function POST() {
  // ① ログイン中ユーザーの取得（/api/me と同じやり方）
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

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username);

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

  // ③ ここで本体のレートリセット処理
  resetRatingsForNewSeason();

  // TODO: この後で
  // ・シーズン終了時のレートランキング確定＆保存
  // ・ベリー配布
  // ・過去シーズン一覧用のスナップショット保存
  // を追加していく予定

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
}
