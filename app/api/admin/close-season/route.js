// file: app/api/admin/close-season/route.js
import db, {
  getCurrentSeason,
  getSeasonDisplayLabel,
  resetRatingsForNewSeason,
} from '@/lib/db.js';
import { addBerriesByUserId } from '@/lib/berries.js';

export async function POST() {
  const season = getCurrentSeason();

  // ① 今シーズンのレート戦TOP10を取得
  const top10 = db.prepare(`
    SELECT id AS user_id, username, rating, wins, losses, best_streak
    FROM users
    WHERE banned = 0
    ORDER BY rating DESC, wins DESC, best_streak DESC, id ASC
    LIMIT 10
  `).all();

  // ② 保存処理
  const insert = db.prepare(`
    INSERT INTO rate_season_rankings
    (season, user_id, rank, rating, wins, losses, best_streak)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    top10.forEach((u, index) => {
      insert.run(
        season,
        u.user_id,
        index + 1,
        u.rating,
        u.wins,
        u.losses,
        u.best_streak
      );
    });
  });

  tx();

  // ③ 報酬配布（1位～10位）
  const rewards = [10000, 5000, 4000, 3000, 2500, 2000, 1500, 1000, 500, 500];

  top10.forEach((u, i) => {
    const reward = rewards[i] ?? 0;
    if (reward > 0) {
      addBerriesByUserId(u.user_id, reward, `シーズン${season} レート戦${i + 1}位報酬`);
    }
  });

  // ④ レートリセット（1500に戻す）
  resetRatingsForNewSeason();

  return new Response(
    JSON.stringify({
      ok: true,
      message: `シーズン ${season} を締めました。レートリセットしました。`,
    }),
    { status: 200 }
  );
}
