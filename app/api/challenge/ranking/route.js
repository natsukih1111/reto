// file: app/api/challenge/ranking/route.js
import db, { getCurrentSeason } from '@/lib/db.js';

async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const seasonParam = searchParams.get('season');

  const season = seasonParam
    ? Number(seasonParam)
    : await getCurrentSeason();

  const rows = await queryRows(
    `
    SELECT
      u.username,
      u.id AS user_id,
      MAX(c.correct_count) AS best_correct,
      MIN(c.duration_ms)  AS best_time
    FROM challenge_runs c
    JOIN users u ON u.id = c.user_id
    WHERE c.season = $1
    GROUP BY u.id, u.username
    ORDER BY best_correct DESC, best_time ASC
    LIMIT 10
    `,
    [season]
  );

  return new Response(JSON.stringify({ season, ranking: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
