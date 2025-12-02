// file: app/api/ranking/history/[season]/route.js
import db, { getSeasonDisplayLabel } from '@/lib/db.js';
import { getTitleFromRating } from '@/lib/title';

export async function GET(_request, context) {
  // ★ params は Promise なので await 必須
  const { season: seasonCodeRaw } = await context.params;
  const seasonCode = Number(seasonCodeRaw);

  if (!Number.isFinite(seasonCode)) {
    return new Response(
      JSON.stringify({ error: 'season パラメータが不正です' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  try {
    const seasonLabel = getSeasonDisplayLabel(seasonCode);
    const year = Math.floor(seasonCode / 100);
    const month = seasonCode % 100;
    const ymLabel = `${year}年${month}月`;

    // ============================
    // レート戦ランキング（TOP10）
    // ============================
    const rateRows = await db.query(
      `
        SELECT
          u.id            AS user_id,
          u.username      AS username,
          u.display_name  AS display_name,
          COALESCE(
            SUM(
              CASE
                WHEN m.user1_id = u.id THEN COALESCE(m.rating_change1, 0)
                WHEN m.user2_id = u.id THEN COALESCE(m.rating_change2, 0)
                ELSE 0
              END
            ),
            0
          ) AS total_change,
          SUM(
            CASE WHEN m.winner_id = u.id THEN 1 ELSE 0 END
          ) AS wins,
          SUM(
            CASE
              WHEN m.winner_id IS NOT NULL
               AND m.winner_id != 0
               AND m.winner_id != u.id
              THEN 1
              ELSE 0
            END
          ) AS losses
        FROM matches m
        JOIN users u
          ON (u.id = m.user1_id OR u.id = m.user2_id)
        WHERE m.mode = 'rate'
          AND m.season = $1
        GROUP BY u.id
        HAVING wins > 0 OR losses > 0
        ORDER BY (1500 + total_change) DESC, wins DESC, u.id ASC
        LIMIT 10
      `,
      [seasonCode]
    );

    const rateRanking = rateRows.map((row, index) => {
      const finalRating = 1500 + (row.total_change ?? 0);
      return {
        rank: index + 1,
        user_id: row.user_id,
        username: row.username,
        display_name: row.display_name,
        rating: Math.round(finalRating),
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        rankName: getTitleFromRating(finalRating),
      };
    });

    // ==========================================
    // チャレンジモード シーズンランキング（TOP10）
    // ==========================================
    let challengeRanking = [];

    const seasonTop = await db.query(
      `
        SELECT
          user_id,
          best_correct,
          best_miss
        FROM challenge_season_records
        WHERE season = $1
        ORDER BY best_correct DESC, best_miss ASC, user_id ASC
        LIMIT 10
      `,
      [seasonCode]
    );

    if (seasonTop.length > 0) {
      const userIds = seasonTop.map((row) => row.user_id);
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');

      const userRows = await db.query(
        `
          SELECT id, username, display_name, rating
          FROM users
          WHERE id IN (${placeholders})
        `,
        userIds
      );

      const userMap = new Map(userRows.map((u) => [u.id, u]));

      challengeRanking = seasonTop.map((row, index) => {
        const u = userMap.get(row.user_id);
        const name =
          (u?.display_name && u.display_name.trim().length > 0
            ? u.display_name
            : u?.username) || '（退会したユーザー）';

        return {
          rank: index + 1,
          user_id: row.user_id,
          name, // ★ history/[season]/page.js はこの name を表示に使う
          username: u?.username ?? null,
          display_name: u?.display_name ?? null,
          rating: u ? u.rating : null,
          best_correct: row.best_correct,
          best_miss: row.best_miss,
        };
      });
    }

    const body = {
      seasonCode,
      seasonLabel,
      ymLabel,
      rateRanking,
      challengeRanking,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('[api/ranking/history/[season]] error', e);
    return new Response(
      JSON.stringify({ error: 'failed to load season ranking' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
