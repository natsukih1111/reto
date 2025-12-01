// file: app/api/ranking/history/[season]/route.js
import db, {
  getSeasonDisplayLabel,
  getRankName,
  getChallengeSeasonRanking,
} from '@/lib/db.js';

export async function GET(request, { params }) {
  const seasonCodeRaw = params?.season;
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

  const seasonLabel = getSeasonDisplayLabel(seasonCode);
  const year = Math.floor(seasonCode / 100);
  const month = seasonCode % 100;
  const ymLabel = `${year}年${month}月`;

  // ============================
  // レート戦ランキング（TOP10）
  // 1500 + シーズン中の rating_change の合計で最終レートを近似
  // ============================
  const rateRows = db
    .prepare(
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
        AND m.season = ?
      GROUP BY u.id
      HAVING wins > 0 OR losses > 0
      ORDER BY (1500 + total_change) DESC, wins DESC, u.id ASC
      LIMIT 10
    `
    )
    .all(seasonCode);

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
      rankName: getRankName(finalRating),
    };
  });

  // ==========================================
  // チャレンジモード シーズンランキング（TOP10）
  // 既存の challenge_season_records をそのまま利用
  // ==========================================
  const seasonTop = getChallengeSeasonRanking(seasonCode, 10);

  let challengeRanking = [];

  if (seasonTop.length > 0) {
    const userIds = seasonTop.map((row) => row.user_id);
    const placeholders = userIds.map(() => '?').join(', ');

    const userRows = db
      .prepare(
        `
        SELECT id, username, display_name, rating
        FROM users
        WHERE id IN (${placeholders})
      `
      )
      .all(...userIds);

    const userMap = new Map(userRows.map((u) => [u.id, u]));

    challengeRanking = seasonTop.map((row, index) => {
      const u = userMap.get(row.user_id);
      return {
        rank: index + 1,
        user_id: row.user_id,
        username: u ? u.username : '（退会したユーザー）',
        display_name: u?.display_name ?? null,
        rating: u ? u.rating : null,
        rankName: u ? getRankName(u.rating) : null,
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
}
