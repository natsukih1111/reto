import db from '@/lib/db.js';

// GET /api/user-summary?username=なつ
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return new Response(
      JSON.stringify({ error: 'username が必要です' }),
      { status: 400 }
    );
  }

  // まずユーザーを探す
  let user = db
    .prepare(
      'SELECT id, username, rating, wins, losses, twitter, bio FROM users WHERE username = ?'
    )
    .get(username);

  // いなかったら自動で作る（ゲストや初回ユーザー用）
  if (!user) {
    const insert = db.prepare(
      'INSERT OR IGNORE INTO users (username) VALUES (?)'
    );
    insert.run(username);

    user = db
      .prepare(
        'SELECT id, username, rating, wins, losses, twitter, bio FROM users WHERE username = ?'
      )
      .get(username);
  }

  // ここまで来ても user が取れない場合はエラー
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'ユーザーを作成できませんでした' }),
      { status: 500 }
    );
  }

  // 最近の対戦履歴 20件
  const matches = db
    .prepare(
      `
      SELECT
        m.*,
        u1.username AS user1_name,
        u2.username AS user2_name
      FROM matches m
      JOIN users u1 ON m.user1_id = u1.id
      JOIN users u2 ON m.user2_id = u2.id
      WHERE m.user1_id = ? OR m.user2_id = ?
      ORDER BY m.created_at DESC
      LIMIT 20
    `
    )
    .all(user.id, user.id)
    .map((m) => {
      const isUser1 = m.user1_id === user.id;
      const opponentName = isUser1 ? m.user2_name : m.user1_name;
      const ratingChange = isUser1
        ? m.rating_change_user1
        : m.rating_change_user2;
      const isWin = m.winner_id === user.id;

      return {
        id: m.id,
        opponentName,
        isWin,
        ratingChange,
        created_at: m.created_at,
      };
    });

  const result = {
    user,
    matches,
    wrongQuestions: [], // ここはあとで実装
    postedQuestions: [], // ここもあとで実装
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// プロフィール更新用（twitter, bio）
export async function PUT(request) {
  try {
    const body = await request.json();
    const { username, twitter, bio } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'username が必要です' }),
        { status: 400 }
      );
    }

    // 無ければ作ってから更新
    let user = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);

    if (!user) {
      const insert = db.prepare(
        'INSERT OR IGNORE INTO users (username) VALUES (?)'
      );
      insert.run(username);
      user = db
        .prepare('SELECT id FROM users WHERE username = ?')
        .get(username);
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'ユーザーを作成できませんでした' }),
        { status: 500 }
      );
    }

    db.prepare(
      'UPDATE users SET twitter = ?, bio = ? WHERE id = ?'
    ).run(twitter || null, bio || '', user.id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: 'サーバーエラー' }),
      { status: 500 }
    );
  }
}
