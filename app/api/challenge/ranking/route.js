// file: app/api/challenge/ranking/route.js
import db, { getCurrentSeason } from '@/lib/db.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const seasonParam = searchParams.get('season');
  const season = seasonParam ? Number(seasonParam) : getCurrentSeason();

  const rows = db
    .prepare(
      `SELECT u.username, u.id as user_id,
              MAX(c.correct_count) as best_correct,
              MIN(c.duration_ms) as best_time
       FROM challenge_runs c
       JOIN users u ON u.id = c.user_id
       WHERE c.season = ?
       GROUP BY u.id, u.username
       ORDER BY best_correct DESC, best_time ASC
       LIMIT 10`
    )
    .all(season);

  return new Response(JSON.stringify({ season, ranking: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
