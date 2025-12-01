import db from '@/lib/db.js';

// rooms[roomId] = { players: [{ username, score }], result: {...} }
const rooms = {};

export async function POST(request) {
  try {
    const { username, score, room } = await request.json();

    if (!username || score === undefined || !room) {
      return new Response(
        JSON.stringify({ error: 'username / score / room が必要です' }),
        { status: 400 }
      );
    }

    const numericScore = Number(score);

    if (!rooms[room]) {
      rooms[room] = { players: [], result: null };
    }
    const state = rooms[room];

    // すでに登録済みなら上書き、なければ追加
    const existing = state.players.find((p) => p.username === username);
    if (existing) {
      existing.score = numericScore;
    } else {
      state.players.push({ username, score: numericScore });
    }

    // まだ2人そろっていない
    if (!state.result && state.players.length < 2) {
      return new Response(JSON.stringify({ wait: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 2人そろっていて、まだ結果が決まっていない → ここで1回だけ判定
    if (!state.result && state.players.length >= 2) {
      const [p1, p2] = state.players;

      // 引き分け
      if (p1.score === p2.score) {
        state.result = { type: 'draw' };
      } else {
        const winnerPlayer = p1.score > p2.score ? p1 : p2;
        const loserPlayer = winnerPlayer === p1 ? p2 : p1;

        const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
        const winner = getUser.get(winnerPlayer.username);
        const loser = getUser.get(loserPlayer.username);

        // ★ どちらかがDBにいない（ゲスト）場合 → レート更新せず結果だけ返す
        if (!winner || !loser) {
          state.result = {
            type: 'decided',
            winnerName: winnerPlayer.username,
            loserName: loserPlayer.username,
            winnerRating: null,
            loserRating: null,
          };
        } else {
          // 両方DBにいるときだけレート更新
          const K = 32;
          const expectedWinner =
            1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
          const expectedLoser = 1 - expectedWinner;

          const newWinnerRating = Math.round(
            winner.rating + K * (1 - expectedWinner)
          );
          const newLoserRating = Math.round(
            loser.rating + K * (0 - expectedLoser)
          );

          const updateUser = db.prepare(
            'UPDATE users SET rating = ?, wins = wins + ?, losses = losses + ? WHERE id = ?'
          );
          updateUser.run(newWinnerRating, 1, 0, winner.id);
          updateUser.run(newLoserRating, 0, 1, loser.id);

          const insertMatch = db.prepare(
            `INSERT INTO matches
             (user1_id, user2_id, winner_id, rating_change_user1, rating_change_user2)
             VALUES (?, ?, ?, ?, ?)`
          );
          insertMatch.run(
            winner.id,
            loser.id,
            winner.id,
            newWinnerRating - winner.rating,
            newLoserRating - loser.rating
          );

          state.result = {
            type: 'decided',
            winnerName: winner.username,
            loserName: loser.username,
            winnerRating: newWinnerRating,
            loserRating: newLoserRating,
          };
        }
      }
    }

    const result = state.result;

    if (!result) {
      return new Response(JSON.stringify({ wait: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 引き分け
    if (result.type === 'draw') {
      return new Response(JSON.stringify({ result: 'draw' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 自分視点の結果
    let myResult = 'draw';
    if (username === result.winnerName) myResult = 'win';
    else if (username === result.loserName) myResult = 'lose';

    return new Response(
      JSON.stringify({
        result: myResult,
        winnerName: result.winnerName,
        loserName: result.loserName,
        winnerRating: result.winnerRating,
        loserRating: result.loserRating,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'サーバーエラー' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
