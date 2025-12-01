// file: app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

// ★管理者チェックは一旦ナシ（誰でも叩ける版）

// GET /api/admin/users?mode=ranking|list|banned[&q=...]
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'ranking';
  const q = (searchParams.get('q') || '').trim();

  try {
    // ① レートランキング
    if (mode === 'ranking') {
      const rows = db
        .prepare(
          `
          SELECT
            id,
            username,
            rating,
            internal_rating,
            wins,
            losses,
            matches_played,
            best_streak,
            twitter_url,
            banned
          FROM users
          ORDER BY rating DESC
          LIMIT 200
        `
        )
        .all();

      const users = rows.map((u) => {
        const r = u.internal_rating ?? u.rating ?? 1500;
        let rankName = '';
        if (r >= 1800) rankName = '海賊王';
        else if (r >= 1750) rankName = '四皇';
        else if (r >= 1700) rankName = '七武海';
        else if (r >= 1650) rankName = '超新星';
        else if (r >= 1600) rankName = 'Level 新世界';
        else if (r >= 1550) rankName = 'Level 偉大なる航路';
        else if (r >= 1500) rankName = 'Level 東の海';
        else rankName = '海賊見習い';

        return {
          ...u,
          rankName,
        };
      });

      return NextResponse.json({ ok: true, users });
    }

    // ② ユーザー一覧 / BANリスト
    let sql = `
      SELECT
        id,
        username,
        rating,
        internal_rating,
        wins,
        losses,
        matches_played,
        twitter_url,
        banned
      FROM users
    `;
    const conds = [];
    const params = [];

    if (mode === 'banned') {
      conds.push('banned = 1');
    }

    if (q) {
      conds.push(
        '(username LIKE ? OR login_id LIKE ? OR twitter_url LIKE ?)'
      );
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    if (conds.length > 0) {
      sql += ' WHERE ' + conds.join(' AND ');
    }
    sql += ' ORDER BY id DESC LIMIT 500';

    const users = db.prepare(sql).all(...params);

    return NextResponse.json({ ok: true, users });
  } catch (e) {
    console.error('/api/admin/users GET error', e);
    return NextResponse.json(
      { ok: false, message: '取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users  （BAN / BAN解除）
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, userId, reason = '' } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { ok: false, message: 'action と userId が必要です' },
        { status: 400 }
      );
    }

    if (action !== 'ban' && action !== 'unban') {
      return NextResponse.json(
        { ok: false, message: '不正な action です' },
        { status: 400 }
      );
    }

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId);
    if (!user) {
      return NextResponse.json(
        { ok: false, message: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const banned = action === 'ban' ? 1 : 0;

    db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(
      banned,
      userId
    );

    // ban_logs は失敗しても致命的じゃないので握りつぶす
    try {
      db.prepare(
        `
        INSERT INTO ban_logs (user_id, action, reason)
        VALUES (?, ?, ?)
      `
      ).run(userId, action, reason);
    } catch (e) {
      console.warn('ban_logs insert failed:', e.message || e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/admin/users POST error', e);
    return NextResponse.json(
      { ok: false, message: '更新に失敗しました' },
      { status: 500 }
    );
  }
}
