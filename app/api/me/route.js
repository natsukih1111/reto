// file: app/api/me/route.js
import { NextResponse } from 'next/server';
import db, { getCurrentSeason, getSeasonDisplayLabel } from '@/lib/db.js';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    console.log('[api/me] nb_username =', username);

    if (!username) {
      return NextResponse.json(
        {
          user: null,
          season: null,
          season_code: null,
          challenge: null,
          challengeSeasonBest: null,
          challengeAllTimeBest: null,
        },
        { status: 200 }
      );
    }

    const row = await db.get(
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
        WHERE username = $1
      `,
      [username]
    );

    console.log('[api/me] user row =', row);

    if (!row || (row.banned ?? 0) !== 0) {
      try {
        cookieStore.set('nb_username', '', { path: '/', maxAge: 0 });
      } catch (e) {
        console.warn('[api/me] failed to clear cookie', e);
      }

      return NextResponse.json(
        {
          user: null,
          season: null,
          season_code: null,
          challenge: null,
          challengeSeasonBest: null,
          challengeAllTimeBest: null,
        },
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
    const seasonCode = getCurrentSeason();
    const seasonLabel = getSeasonDisplayLabel(seasonCode);

    // ===== チャレンジモード記録（challenge_runs から集計） =====
    let seasonBest = null;
    let allTimeBest = null;

    try {
      const seasonRow = await db.get(
        `
          SELECT MAX(correct_count) AS best_correct
          FROM challenge_runs
          WHERE user_id = $1 AND season = $2
        `,
        [user.id, seasonCode]
      );

      const allTimeRow = await db.get(
        `
          SELECT MAX(correct_count) AS best_correct
          FROM challenge_runs
          WHERE user_id = $1
        `,
        [user.id]
      );

      if (seasonRow && seasonRow.best_correct != null) {
        seasonBest = {
          season: seasonCode,
          best_correct: Number(seasonRow.best_correct) || 0,
        };
      }

      if (allTimeRow && allTimeRow.best_correct != null) {
        allTimeBest = {
          season: null,
          best_correct: Number(allTimeRow.best_correct) || 0,
        };
      }
    } catch (e) {
      console.error('[api/me] challenge stats error', e);
    }

    return NextResponse.json(
      {
        user,
        season: seasonLabel,
        season_code: seasonCode,
        challenge: {
          seasonBest,
          allTimeBest,
        },
        challengeSeasonBest: seasonBest,
        challengeAllTimeBest: allTimeBest,
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
        challengeSeasonBest: null,
        challengeAllTimeBest: null,
      },
      { status: 500 }
    );
  }
}
