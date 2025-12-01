// file: lib/rating.js
import db from './db.js';
import { addBerriesByUserId } from './berries.js';

// ...calcRatingWithMargin はそのまま...

export function finalizeRateMatch({
  user1Id,
  user2Id,
  score1,
  score2,
  totalTime1,
  totalTime2,
  roomId,
}) {
  const getUser = db.prepare(
    `SELECT id, username, rating, wins, losses,
            games_played, win_streak, max_win_streak
       FROM users
      WHERE id = ?`
  );

  const u1 = getUser.get(user1Id);
  const u2 = getUser.get(user2Id);

  if (!u1 || !u2) {
    throw new Error('ユーザーが見つかりません');
  }

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
  } = calcRatingWithMargin(u1, u2, score1, score2);

  const updateUser = db.prepare(
    `UPDATE users
        SET rating = ?, wins = ?, losses = ?,
            games_played = ?, win_streak = ?, max_win_streak = ?
      WHERE id = ?`
  );

  const matchStmt = db.prepare(
    `INSERT INTO matches (
        user1_id, user2_id,
        score_user1, score_user2,
        time_ms_user1, time_ms_user2,
        winner_id,
        rating_change_user1, rating_change_user2,
        mode, room_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
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

    updateUser.run(
      new1,
      newWins1,
      newLoss1,
      gp1,
      newStreak1,
      maxStreak1,
      u1.id
    );
    updateUser.run(
      new2,
      newWins2,
      newLoss2,
      gp2,
      newStreak2,
      maxStreak2,
      u2.id
    );

    matchStmt.run(
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
      roomId
    );
  });

  // DB 更新
  tx();

  // ★ 勝利したプレイヤーに 300 ベリー（引き分けはなし）
  if (!isDraw && winnerId) {
    try {
      addBerriesByUserId(winnerId, 300, 'レート戦勝利報酬');
    } catch (e) {
      console.error('addBerriesByUserId (rate win) failed:', e);
    }
  }

  return {
    winnerId,
    isDraw,
    delta1,
    delta2,
    newRating1: new1,
    newRating2: new2,
  };
}
