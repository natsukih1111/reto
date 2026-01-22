// file: app/api/admin/close-season/route.js
import { NextResponse } from 'next/server';
import db, {
  getCurrentSeason,
  getPreviousSeason,
  getSeasonDisplayLabel,
  resetRatingsForNewSeason,
} from '@/lib/db.js';
import { addBerriesByUserId } from '@/lib/berries.js';

export const runtime = 'nodejs'; // ★これが超重要（pg を確実に Node で動かす）

// 共通本体
async function handleCloseSeason() {
  try {
    // 「今の月」を基準に、締め切るシーズンは「1ヶ月前」
    const currentSeason = getCurrentSeason();
    const closingSeason = getPreviousSeason(currentSeason);
    const seasonLabel = getSeasonDisplayLabel(closingSeason);

    // =========================
    // ① レート戦 TOP10 を保存
    // =========================
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
        WHERE banned = 0
        ORDER BY rating DESC, wins DESC, best_streak DESC, id ASC
        LIMIT 10
      `,
      []
    );

    // 以前そのシーズンの記録があれば消す（やり直し実行にも対応）
    await db.run(
      `
        DELETE FROM rate_season_rankings
        WHERE season = $1
      `,
      [closingSeason]
    );

    // 新しく記録を挿入
    for (let i = 0; i < top10.length; i++) {
      const u = top10[i];
      await db.run(
        `
          INSERT INTO rate_season_rankings
            (season, user_id, rank, rating, wins, losses, best_streak)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [closingSeason, u.user_id, i + 1, u.rating, u.wins, u.losses, u.best_streak]
      );
    }

    // =========================
    // ② チャレンジモード シーズン集計
    // =========================
    const challengeRows = await db.query(
      `
        SELECT
          user_id,
          MAX(correct_count) AS best_correct,
          MIN(miss_count)    AS best_miss
        FROM challenge_runs
        WHERE season = $1
        GROUP BY user_id
      `,
      [closingSeason]
    );

    // そのシーズン分を一旦消してから入れ直す
    await db.run(
      `
        DELETE FROM challenge_season_records
        WHERE season = $1
      `,
      [closingSeason]
    );

    for (const row of challengeRows) {
      const { user_id, best_correct, best_miss } = row;

      // シーズン記録テーブルに保存
      await db.run(
        `
          INSERT INTO challenge_season_records
            (season, user_id, best_correct, best_miss)
          VALUES ($1, $2, $3, $4)
        `,
        [closingSeason, user_id, best_correct, best_miss]
      );

      // 歴代ベスト更新（challenge_alltime_records）
      const existing = await db.get(
        `
          SELECT user_id, best_correct, best_miss, best_season
          FROM challenge_alltime_records
          WHERE user_id = $1
        `,
        [user_id]
      );

      const existingBestCorrect = existing?.best_correct ?? 0;
      const existingBestMiss = existing?.best_miss ?? 999999;

      const isBetter =
        best_correct > existingBestCorrect ||
        (best_correct === existingBestCorrect && best_miss < existingBestMiss);

      if (isBetter) {
        if (existing) {
          await db.run(
            `
              UPDATE challenge_alltime_records
              SET best_correct = $1,
                  best_miss    = $2,
                  best_season  = $3
              WHERE user_id = $4
            `,
            [best_correct, best_miss, closingSeason, user_id]
          );
        } else {
          await db.run(
            `
              INSERT INTO challenge_alltime_records
                (user_id, best_correct, best_miss, best_season)
              VALUES ($1, $2, $3, $4)
            `,
            [user_id, best_correct, best_miss, closingSeason]
          );
        }
      }
    }

    // このシーズン分の challenge_runs は消して、新シーズンをまっさらからスタート
    await db.run(
      `
        DELETE FROM challenge_runs
        WHERE season = $1
      `,
      [closingSeason]
    );

    // =========================
    // ③ レート戦 TOP10 にシーズン報酬ベリー配布
    // =========================
    const rewards = [10000, 5000, 4000, 3000, 2500, 2000, 1500, 1000, 500, 500];

    for (let i = 0; i < top10.length; i++) {
      const u = top10[i];
      const reward = rewards[i] ?? 0;
      if (reward > 0) {
        await addBerriesByUserId(
          u.user_id,
          reward,
          `シーズン${closingSeason} レート戦${i + 1}位報酬`
        );
      }
    }

    // =========================
    // ④ レートリセット（新シーズン用に 1500 スタートへ）
    // =========================
    await resetRatingsForNewSeason();

    return NextResponse.json(
      {
        ok: true,
        closedSeason: closingSeason,
        seasonLabel,
        message: `シーズン ${seasonLabel} (${closingSeason}) を締め切り、レート＆チャレンジ記録を新シーズン用にリセットしました。`,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('/api/admin/close-season error', e);
    return NextResponse.json(
      {
        ok: false,
        error: 'server_error',
        message: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}

// Vercel の cron（GET）＆管理画面ボタン（POST）両方対応
export async function GET() {
  return handleCloseSeason();
}
export async function POST() {
  return handleCloseSeason();
}
