// file: app/api/me/route.js
import { NextResponse } from 'next/server';
import db, {
  getCurrentSeason,
  getSeasonDisplayLabel,
  getUserChallengeSeasonBest,
  getUserChallengeAllTimeBest,
} from '@/lib/db.js';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    console.log('[api/me] nb_username =', username);

    // クッキーが無い → 未ログイン
    if (!username) {
      return NextResponse.json(
        { user: null, season: null, season_code: null, challenge: null },
        { status: 200 }
      );
    }

    // ユーザー取得（banned も含める）
    const row = db
      .prepare(
        `
        SELECT
          id,
          username,
          display_name,
          rating,
          internal_rating,
          matches_played,
          wins,
          losses,
          current_streak,
          best_streak,
          berries,
          twitter_url,
          login_id,
          banned
        FROM users
        WHERE username = ?
      `
      )
      .get(username);

    console.log('[api/me] user row =', row);

    // ユーザーが存在しない or BAN 中 → ログアウト扱い
    if (!row || (row.banned ?? 0) !== 0) {
      try {
        cookieStore.set('nb_username', '', { path: '/', maxAge: 0 });
      } catch (e) {
        console.warn('[api/me] failed to clear cookie', e);
      }

      return NextResponse.json(
        { user: null, season: null, season_code: null, challenge: null },
        { status: 200 }
      );
    }

    // ===== twitter URL 正規化 =====
    const { banned, twitter_url, login_id, ...rest } = row;

    let twitterIdSource = twitter_url || login_id || '';

    let effectiveTwitterUrl = '';
    if (twitterIdSource) {
      let id = twitterIdSource.replace(/^@/, '').trim();
      id = id.replace(/^https?:\/\/(twitter\.com|x\.com)\//, '').trim();

      if (id) {
        effectiveTwitterUrl = `https://x.com/${id}`;
      }
    }

    const user = {
      ...rest,
      login_id,
      twitter_url: effectiveTwitterUrl,
    };

    // ===== シーズン関連 =====
    const seasonCode = getCurrentSeason();                 // 例: 202511
    const seasonLabel = getSeasonDisplayLabel(seasonCode); // 例: "S4"

    const seasonBest = getUserChallengeSeasonBest(user.id, seasonCode);
    const allTimeBest = getUserChallengeAllTimeBest(user.id);

    return NextResponse.json(
      {
        user,
        season: seasonLabel,
        season_code: seasonCode,
        challenge: {
          seasonBest: seasonBest || null,
          allTimeBest: allTimeBest || null,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('[api/me] error', e);
    return NextResponse.json(
      {
        user: null,
        season: null,
        season_code: null,
        challenge: null,
      },
      { status: 500 }
    );
  }
}
