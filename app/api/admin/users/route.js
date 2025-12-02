// file: app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

// GET /api/admin/users?mode=ranking|list|banned|stats[&q=...]
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'ranking';
  const q = (searchParams.get('q') || '').trim();

  try {
    // ① ダッシュボード用 stats
    if (mode === 'stats') {
      const userCountRow = await db.get(
        'SELECT COUNT(*) AS count FROM users',
        []
      );
      const pendingQuestionsRow = await db.get(
        `
          SELECT COUNT(*) AS count
          FROM question_submissions
          WHERE status = 'pending' OR status IS NULL OR status = ''
        `,
        []
      );
      const openReportsRow = await db.get(
        `
          SELECT COUNT(*) AS count
          FROM question_reports
          WHERE status = 'open' OR status IS NULL OR status = ''
        `,
        []
      );

      return NextResponse.json({
        userCount: Number(userCountRow?.count || 0),
        pendingQuestions: Number(pendingQuestionsRow?.count || 0),
        openReports: Number(openReportsRow?.count || 0),
      });
    }

    // ② レートランキング
    if (mode === 'ranking') {
      const rows = await db.query(
        `
          SELECT
            id,
            username,
            display_name,
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
        `,
        []
      );

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

    // ③ ユーザー一覧 / BANリスト
    let sql = `
      SELECT
        id,
        username,
        display_name,
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

    // mode=banned のとき
    if (mode === 'banned') {
      params.push(1);
      const idx = params.length;
      conds.push(`banned = $${idx}`);
    }

    // キーワード検索（display_name も対象にする）
    if (q) {
      const like = `%${q}%`;
      params.push(like, like, like, like);
      const base = params.length - 3;
      conds.push(
        `(username ILIKE $${base} OR display_name ILIKE $${base + 1} OR login_id ILIKE $${base + 2} OR twitter_url ILIKE $${base + 3})`
      );
    }

    if (conds.length > 0) {
      sql += ' WHERE ' + conds.join(' AND ');
    }
    sql += ' ORDER BY id DESC LIMIT 500';

    const users = await db.query(sql, params);

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

    const user = await db.get(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    if (!user) {
      return NextResponse.json(
        { ok: false, message: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const banned = action === 'ban' ? 1 : 0;

    await db.run(
      'UPDATE users SET banned = $1 WHERE id = $2',
      [banned, userId]
    );

    // ban_logs は失敗しても致命的じゃないので握りつぶす
    try {
      await db.run(
        `
          INSERT INTO ban_logs (user_id, action, reason)
          VALUES ($1, $2, $3)
        `,
        [userId, action, reason]
      );
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
