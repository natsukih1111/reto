// file: app/api/admin/close-season/route.js
import { NextResponse } from 'next/server';
import db, { getCurrentSeason, resetRatingsForNewSeason } from '@/lib/db.js';
import { addBerriesByUserId } from '@/lib/berries.js';

// 共通本体（GET/POST 両方から呼ぶ）
async function doCloseSeason() {
  const season = getCurrentSeason();

  // ① 今シーズンのレート戦TOP10を取得（BAN されていないユーザーのみ）
  const top10 = await db.query(
    `
      SELECT
        id   AS user_id,
        username,
        rating,
        wins,
        losses,
        best_streak
      FROM users
      WHERE COALESCE(banned, 0) = 0
      ORDER BY rating DESC, wins DESC, best_streak DESC, id ASC
      LIMIT 10
    `,
    []
  );

  // ② ランキング保存
  if (top10.length > 0) {
    await db.run(
      `
        INSERT INTO rate_season_rankings
          (season, user_id, rank, rating, wins, losses, best_streak)
        VALUES
          ${top10
            .map(
              (_, i) =>
                `($1, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6}, $${i * 6 + 7})`
            )
            .join(', ')}
      `,
      [
        season,
        ...top10.flatMap((u, idx) => [
          u.user_id,
          idx + 1,
          u.rating,
          u.wins,
          u.losses,
          u.best_streak,
        ]),
      ]
    );
  }

  // ③ 報酬配布（1位～10位）
  const rewards = [10000, 5000, 4000, 3000, 2500, 2000, 1500, 1000, 500, 500];

  for (let i = 0; i < top10.length; i++) {
    const u = top10[i];
    const reward = rewards[i] ?? 0;
    if (reward > 0) {
      await addBerriesByUserId(
        u.user_id,
        reward,
        `シーズン${season} レート戦${i + 1}位報酬`
      );
    }
  }

  // ④ レートリセット（1500に戻す）
  await resetRatingsForNewSeason();

  return { season, top10Count: top10.length };
}

// 手動用（管理画面のボタンから）
export async function POST() {
  try {
    const result = await doCloseSeason();
    return NextResponse.json(
      {
        ok: true,
        message: `シーズン ${result.season} を締めました。レートをリセットしました。（TOP10: ${result.top10Count}件）`,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('POST /api/admin/close-season error', e);
    return NextResponse.json(
      { ok: false, error: 'シーズン締め処理に失敗しました。' },
      { status: 500 }
    );
  }
}

// Vercel Cron 用（GET で呼ばれる）
export async function GET() {
  try {
    const result = await doCloseSeason();
    return NextResponse.json(
      {
        ok: true,
        message: `Cron: シーズン ${result.season} を締めました。レートをリセットしました。（TOP10: ${result.top10Count}件）`,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('GET /api/admin/close-season error', e);
    return NextResponse.json(
      { ok: false, error: 'シーズン締め処理に失敗しました。' },
      { status: 500 }
    );
  }
}
