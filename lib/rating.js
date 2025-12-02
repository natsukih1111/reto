// file: lib/rating.js
import db from './db.js';
import { addBerriesByUserId } from './berries.js';

// === 既存の calcRatingWithMargin をそのまま使う前提 ===
// export function calcRatingWithMargin(u1, u2, score1, score2) { ... }

// ===============================
// ★ Supabase対応 finalizeRateMatch
// ===============================
export async function finalizeRateMatch({
  user1Id,
  user2Id,
  score1,
  score2,
  totalTime1,
  totalTime2,
  roomId,
}) {
  // ---------- ① ユーザー情報取得 ----------
  const u1 = await db.get(
    `
      SELECT id, username, rating, wins, losses,
             games_played, win_streak, max_win_streak
      FROM users
      WHERE id = $1
    `,
    [user1Id]
  );

  const u2 = await db.get(
    `
      SELECT id, username, rating, wins, losses,
             games_played, win_streak, max_win_streak
      FROM users
      WHERE id = $1
    `,
    [user2Id]
  );

  if (!u1 || !u2) throw new Error('ユーザーが見つかりません');

  // ---------- ② レート・勝敗計算 ----------
  const result = calcRatingWithMargin(u1, u2, score1, score2);
  const {
    new1,
    new2,
    delta1,
    delta2,
    winnerId,
    isDraw,
    newStreak1,
    newStreak2,
    maxStreak1,
    maxStreak2,
  } = result;

  // ---------- ③ 各プレイヤーの戦績を更新 ----------
  const wins1 = u1.wins ?? 0;
  const wins2 = u2.wins ?? 0;
  const losses1 = u1.losses ?? 0;
  const losses2 = u2.losses ?? 0;
  const gp1 = (u1.games_played ?? 0) + 1;
  const gp2 = (u2.games_played ?? 0) + 1;

  let newWins1 = wins1;
  let newWins2 = wins2;
  let newLoss1 = losses1;
  let newLoss2 = losses2;

  if (!isDraw) {
    if (winnerId === u1.id) {
      newWins1 += 1;
      newLoss2 += 1;
    } else {
      newWins2 += 1;
      newLoss1 += 1;
    }
  }

  // Postgres UPDATE（順番に await すればOK）
  await db.run(
    `
      UPDATE users
      SET rating = $1,
          wins = $2,
          losses = $3,
          games_played = $4,
          win_streak = $5,
          max_win_streak = $6
      WHERE id = $7
    `,
    [new1, newWins1, newLoss1, gp1, newStreak1, maxStreak1, u1.id]
  );

  await db.run(
    `
      UPDATE users
      SET rating = $1,
          wins = $2,
          losses = $3,
          games_played = $4,
          win_streak = $5,
          max_win_streak = $6
      WHERE id = $7
    `,
    [new2, newWins2, newLoss2, gp2, newStreak2, maxStreak2, u2.id]
  );

  // ---------- ④ matches テーブルへ記録 ----------
  await db.run(
    `
      INSERT INTO matches (
        user1_id, user2_id,
        score_user1, score_user2,
        time_ms_user1, time_ms_user2,
        winner_id,
        rating_change_user1, rating_change_user2,
        mode, room_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `,
    [
      u1.id,
      u2.id,
      score1,
      score2,
      totalTime1,
      totalTime2,
      winnerId,
      delta1,
      delta2,
      'rate',
      roomId,
    ]
  );

  // ---------- ⑤ 勝者に300ベリー付与 ----------
  if (!isDraw && winnerId) {
    try {
      await addBerriesByUserId(winnerId, 300, 'レート戦勝利報酬');
    } catch (e) {
      console.error('[rating] addBerriesByUserId failed:', e);
    }
  }

  // ---------- ⑥ フロントに返す ----------
  return {
    winnerId,
    isDraw,
    delta1,
    delta2,
    newRating1: new1,
    newRating2: new2,
  };
}
