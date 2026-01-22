// file: app/api/ranking/history/[season]/route.js
import db, { getSeasonDisplayLabel } from '@/lib/db.js';
import { getTitleFromRating } from '@/lib/title';

export const runtime = 'nodejs';

async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

export async function GET(_request, context) {
  const params = await context.params; // Next.js：params は Promise
  const seasonCodeRaw = params?.season;
  const seasonCode = Number(seasonCodeRaw);

  if (!Number.isFinite(seasonCode)) {
    return new Response(JSON.stringify({ error: 'season パラメータが不正です' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    const seasonLabel = getSeasonDisplayLabel(seasonCode);
    const year = Math.floor(seasonCode / 100);
    const month = seasonCode % 100;
    const ymLabel = `${year}年${month}月`;

    // =========================
    // レート戦：保存済みの rate_season_rankings を表示
    // =========================
    const rateRows = await queryRows(
      `
        SELECT
          r.rank,
          r.user_id,
          u.username,
          u.display_name,
          r.rating,
          r.wins,
          r.losses,
          r.best_streak
        FROM rate_season_rankings r
        JOIN users u ON u.id = r.user_id
        WHERE r.season = $1
        ORDER BY r.rank ASC
        LIMIT 10
      `,
      [seasonCode]
    );

    const rateRanking = (rateRows || []).map((row) => {
      const name =
        (row.display_name && row.display_name.trim().length > 0
          ? row.display_name
          : row.username) || '名無し';

      return {
        rank: row.rank,
        user_id: row.user_id,
        name,
        username: row.username,
        display_name: row.display_name,
        rating: row.rating,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        best_streak: row.best_streak ?? 0,
        rankName: getTitleFromRating(row.rating ?? 1500),
      };
    });

    // =========================
    // チャレンジ：保存済みの challenge_season_records を表示
    // （close-season が challenge_runs を消す仕様なので、ここは records が正解）
    // =========================
    const challengeRows = await queryRows(
      `
        SELECT
          r.user_id,
          u.username,
          u.display_name,
          u.rating AS rating,
          r.best_correct,
          r.best_miss
        FROM challenge_season_records r
        JOIN users u ON u.id = r.user_id
        WHERE r.season = $1
        ORDER BY r.best_correct DESC, r.best_miss ASC, r.user_id ASC
        LIMIT 10
      `,
      [seasonCode]
    );

    const challengeRanking = (challengeRows || []).map((row, index) => {
      const name =
        (row.display_name && row.display_name.trim().length > 0
          ? row.display_name
          : row.username) || '名無し';

      return {
        rank: index + 1,
        user_id: row.user_id,
        name,
        username: row.username,
        display_name: row.display_name,
        rating: row.rating,
        best_correct: row.best_correct,
        best_miss: row.best_miss,
      };
    });

    return new Response(
      JSON.stringify({
        seasonCode,
        seasonLabel,
        ymLabel,
        rateRanking,
        challengeRanking,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('[api/ranking/history/[season]] error', e);
    return new Response(JSON.stringify({ error: 'failed to load season ranking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
