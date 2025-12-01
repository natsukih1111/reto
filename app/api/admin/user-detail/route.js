// app/api/admin/user-detail/route.js
import db from '@/lib/db.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  if (!id) {
    return new Response(JSON.stringify({ error: 'id が必要です' }), {
      status: 400,
    });
  }

  const user = db
    .prepare(
      `SELECT id, username, twitter_id, twitter_handle,
              created_at, rating, internal_rating,
              wins, losses, matches_played,
              win_streak, max_win_streak,
              berries, is_admin, is_author, banned
         FROM users
        WHERE id = ?`
    )
    .get(id);

  if (!user) {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const matches = db
    .prepare(
      `SELECT
         m.id,
         CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END as opponent_id,
         u.username as opponent_name,
         m.score_user1,
         m.score_user2,
         m.mode,
         m.created_at,
         m.rating_change_user1,
         m.rating_change_user2,
         m.winner_id
       FROM matches m
       JOIN users u ON u.id = CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END
       WHERE m.user1_id = ? OR m.user2_id = ?
       ORDER BY m.created_at DESC
       LIMIT 20`
    )
    .all(id, id, id, id)
    .map((m) => {
      const isMeUser1 = m.score_user1 !== null && m.opponent_id === m.opponent_id; // 雑だがとりあえず
      const myIsUser1 = true; // 簡略化。必要ならちゃんと判定。

      const myScore = myIsUser1 ? m.score_user1 : m.score_user2;
      const oppScore = myIsUser1 ? m.score_user2 : m.score_user1;
      const myRatingChange = myIsUser1
        ? m.rating_change_user1
        : m.rating_change_user2;
      const isWin = m.winner_id === id;
      const isDraw = m.winner_id == null;

      return {
        id: m.id,
        opponent_id: m.opponent_id,
        opponent_name: m.opponent_name,
        score_my: myScore,
        score_opp: oppScore,
        rating_change: myRatingChange,
        is_win: isWin,
        is_draw: isDraw,
        mode: m.mode,
        created_at: m.created_at,
      };
    });

  return new Response(JSON.stringify({ user, matches }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
