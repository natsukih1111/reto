// file: app/api/ranking/history/route.js
import db, { getSeasonDisplayLabel } from '@/lib/db.js';

export async function GET() {
  try {
    const rows = await db.query(
      `
        SELECT DISTINCT season
        FROM challenge_season_records
        ORDER BY season DESC
      `,
      []
    );

    const seasons = rows.map((row) => ({
      seasonCode: row.season,
      seasonLabel: getSeasonDisplayLabel(row.season),
    }));

    return new Response(JSON.stringify({ seasons }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('[api/ranking/history] error', e);
    return new Response(
      JSON.stringify({ error: 'failed to load history seasons' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
