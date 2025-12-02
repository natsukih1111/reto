// file: app/api/ranking/history/list/route.js
import db, { getSeasonDisplayLabel } from '@/lib/db.js';

export async function GET() {
  try {
    const rows = await db.query(
      `
        SELECT DISTINCT season
        FROM rate_season_rankings
        ORDER BY season DESC
      `,
      []
    );

    return new Response(
      JSON.stringify({
        seasons: rows.map((r) => ({
          season: r.season,
          label: getSeasonDisplayLabel(r.season),
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('[api/ranking/history/list] error', e);
    return new Response(
      JSON.stringify({ error: 'failed to load rate seasons' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
