// file: app/api/challenge/finish/route.js
import db, { getCurrentSeason } from '@/lib/db.js';

const BERRY_PER_CORRECT = 50;

// db.query が配列 or { rows } どちらでも動く用ヘルパ
async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

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
      return new Response(JSON.stringify({ error: 'user_id が必要です' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
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

    // ユーザー存在チェック
    const userRows = await queryRows(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    if (userRows.length === 0) {
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

    // ===== 1) challenge_runs に今回の結果を記録 =====
    const season = getCurrentSeason(); // 例: 202511

    await queryRows(
      `
        INSERT INTO challenge_runs
          (user_id, season, correct_count, miss_count, duration_ms)
        VALUES
          ($1,      $2,     $3,            $4,        $5)
      `,
      [userId, season, correct, miss, durationMs]
    );

    // ===== 2) ベリー付与（1問正解ごとに 50 ベリー）=====
    const berriesEarned = correct * BERRY_PER_CORRECT;

    if (berriesEarned > 0) {
      await queryRows(
        `
        UPDATE users
           SET berries = COALESCE(berries, 0) + $1
         WHERE id = $2
        `,
        [berriesEarned, userId]
      );

      await queryRows(
        `
        INSERT INTO berries_log (user_id, amount, reason)
        VALUES ($1, $2, $3)
        `,
        [userId, berriesEarned, 'チャレンジモード正解報酬']
      );
    }

    // ===== 3) 今のベスト値を challenge_runs から計算して返す =====
    const seasonBestRow = await queryRows(
      `
        SELECT MAX(correct_count) AS best_correct
        FROM challenge_runs
        WHERE user_id = $1 AND season = $2
      `,
      [userId, season]
    );

    const allTimeBestRow = await queryRows(
      `
        SELECT MAX(correct_count) AS best_correct
        FROM challenge_runs
        WHERE user_id = $1
      `,
      [userId]
    );

    const seasonBest =
      seasonBestRow[0]?.best_correct != null
        ? {
            season,
            best_correct: Number(seasonBestRow[0].best_correct) || 0,
          }
        : null;

    const allTimeBest =
      allTimeBestRow[0]?.best_correct != null
        ? {
            season: null,
            best_correct: Number(allTimeBestRow[0].best_correct) || 0,
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
