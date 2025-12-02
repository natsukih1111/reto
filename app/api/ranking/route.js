// file: app/api/ranking/route.js
import db, { getCurrentSeason, getSeasonDisplayLabel } from '@/lib/db.js';

async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

export async function GET() {
  try {
    const seasonCode = getCurrentSeason();           // 例: 202512
    const seasonLabel = getSeasonDisplayLabel(seasonCode); // 例: S1 とか

    // ============================
    // レート戦ランキング（TOP10）
    // ============================
    const rateRows = await queryRows(
      `
        SELECT
          id          AS user_id,
          username,
          display_name,
          rating,
          wins,
          losses,
          best_streak
        FROM users
        WHERE banned = 0
        ORDER BY rating DESC, wins DESC, best_streak DESC, id ASC
        LIMIT 10
      `,
      []
    );

    const rateRanking = rateRows.map((u, index) => ({
      rank: index + 1,
      user_id: u.user_id,
      username: u.username,
      display_name: u.display_name,
      rating: u.rating,
      wins: u.wins,
      losses: u.losses,
      best_streak: u.best_streak,
    }));

    // ==========================================
    // チャレンジモード シーズンランキング（TOP10）
    // challenge_runs から直接集計
    // ==========================================
    const challengeRows = await queryRows(
      `
        SELECT
          u.id           AS user_id,
          u.username     AS username,
          u.display_name AS display_name,
          u.rating       AS rating,
          MAX(c.correct_count) AS best_correct,
          MIN(c.miss_count)    AS best_miss
        FROM challenge_runs c
        JOIN users u ON u.id = c.user_id
        WHERE c.season = $1
        GROUP BY u.id, u.username, u.display_name, u.rating
        ORDER BY best_correct DESC, best_miss ASC, u.id ASC
        LIMIT 10
      `,
      [seasonCode]
    );

    const challengeRanking = challengeRows.map((row, index) => ({
      rank: index + 1,
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      rating: row.rating,
      best_correct: row.best_correct,
      best_miss: row.best_miss,
    }));

    const body = {
      seasonCode,
      seasonLabel,
      rateRanking,
      challengeRanking,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('[api/ranking] error', e);
    return new Response(
      JSON.stringify({ error: 'failed to load ranking' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
