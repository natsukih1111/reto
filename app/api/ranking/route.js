// file: app/api/ranking/route.js
import db, {
  getCurrentSeason,
  getSeasonDisplayLabel,
  getRankName,
  getChallengeSeasonRanking,
} from '@/lib/db.js';

export async function GET() {
  const seasonCode = getCurrentSeason(); // 例: 202511
  const seasonLabel = getSeasonDisplayLabel(seasonCode); // 例: S1, S2...

  // ============================
  // レート戦ランキング（TOP10）
  // ============================
  const rateRows = db
    .prepare(
      `
      SELECT
        id,
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
    `
    )
    .all();

  const rateRanking = rateRows.map((u, index) => ({
    rank: index + 1,
    user_id: u.id,
    username: u.username,
    display_name: u.display_name,
    rating: u.rating,
    wins: u.wins,
    losses: u.losses,
    best_streak: u.best_streak,
    rankName: getRankName(u.rating),
  }));

  // ==========================================
  // チャレンジモード シーズンランキング（TOP10）
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
    rateRanking,
    challengeRanking,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
