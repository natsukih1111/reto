// file: app/api/challenge/finish/route.js
import db, {
  getCurrentSeason,
  saveChallengeResult,
  getUserChallengeSeasonBest,
  getUserChallengeAllTimeBest,
} from '@/lib/db.js';

// チャレンジ結果保存 & ベリー付与 & ベスト記録返却
export async function POST(request) {
  try {
    const body = await request.json();

    const userId = Number(body.user_id);
    const correct = Number(body.correctCount ?? 0);
    const miss = Number(body.missCount ?? 0);
    const durationMs =
      body.durationMs !== undefined && body.durationMs !== null
        ? Number(body.durationMs)
        : null;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id が必要です' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    if (Number.isNaN(correct) || Number.isNaN(miss)) {
      return new Response(
        JSON.stringify({ error: 'correctCount / missCount が不正です' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ユーザー存在チェック（外部キーエラー防止）
    const user = db
      .prepare('SELECT id FROM users WHERE id = ?')
      .get(userId);

    if (!user) {
      return new Response(
        JSON.stringify({
          error: `user_id=${userId} のユーザーが存在しません`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // 1) チャレンジ結果ログ + シーズン/歴代ベスト更新
    //    → challenge_runs / challenge_season_records / challenge_alltime_records をまとめて面倒見てくれる
    saveChallengeResult({
      userId,
      correctCount: correct,
      missCount: miss,
      durationMs,
    });

    // 2) ベリー付与（1問正解ごとに 50 ベリー）
    const berriesEarned = correct * 50;

    if (berriesEarned > 0) {
      const tx = db.transaction((uid, amount, reason) => {
        // users テーブルの所持ベリー更新
        db.prepare(
          `UPDATE users SET berries = berries + ? WHERE id = ?`
        ).run(amount, uid);

        // berries_log に履歴追加
        db.prepare(
          `
          INSERT INTO berries_log (user_id, amount, reason)
          VALUES (?, ?, ?)
        `
        ).run(uid, amount, reason);
      });

      tx(userId, berriesEarned, 'チャレンジモード正解報酬');
    }

    // 3) シーズン/歴代ベストを取得して返す
    const season = getCurrentSeason();

    const seasonRow = getUserChallengeSeasonBest(userId, season);
    const allTimeRow = getUserChallengeAllTimeBest(userId);

    const seasonBest = seasonRow
      ? {
          season: seasonRow.season,
          best_correct: seasonRow.best_correct,
          best_miss: seasonRow.best_miss,
          best_at: seasonRow.best_at,
        }
      : null;

    const allTimeBest = allTimeRow
      ? {
          season: allTimeRow.season ?? null,
          best_correct: allTimeRow.best_correct,
          best_miss: allTimeRow.best_miss,
          best_at: allTimeRow.best_at,
        }
      : null;

    return new Response(
      JSON.stringify({
        ok: true,
        berriesEarned,
        seasonBest,
        allTimeBest,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (err) {
    console.error('challenge/finish error', err);
    return new Response(
      JSON.stringify({
        error: 'サーバーエラーが発生しました。',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
