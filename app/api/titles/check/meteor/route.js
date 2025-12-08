// file: app/api/titles/check/meteor/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db.js';
import { awardTitlesForUser } from '@/lib/titleAward.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const scoreRaw = body.score;
    const score = typeof scoreRaw === 'number' ? scoreRaw : Number(scoreRaw);

    if (!Number.isFinite(score) || score <= 0) {
      return NextResponse.json({ ok: true, awarded: [] });
    }

    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value;
    if (!username) {
      // ログインしていないときは何もしない（エラーにもしない）
      return NextResponse.json({ ok: false, reason: 'not_logged_in', awarded: [] });
    }

    const user = await db.get(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (!user?.id) {
      return NextResponse.json({ ok: false, reason: 'user_not_found', awarded: [] });
    }

    const codes = [];
    // 「自己ベストが○○を超える」 → 今回スコアが条件を超えていれば付与
    if (score > 100) {
      codes.push('meteor_50', 'meteor_75', 'meteor_100');
    } else if (score > 75) {
      codes.push('meteor_50', 'meteor_75');
    } else if (score > 50) {
      codes.push('meteor_50');
    }

    if (codes.length === 0) {
      return NextResponse.json({ ok: true, awarded: [] });
    }

    const awarded = await awardTitlesForUser(user.id, codes);

    return NextResponse.json({ ok: true, awarded });
  } catch (e) {
    console.error('[api/titles/check/meteor] error', e);
    return NextResponse.json(
      { ok: false, message: 'server_error' },
      { status: 500 }
    );
  }
}
