// file: app/api/ranking/history/list/route.js
import db, { getSeasonDisplayLabel } from '@/lib/db.js';

export async function GET() {
  const rows = db.prepare(`
    SELECT DISTINCT season FROM rate_season_rankings
    ORDER BY season DESC
  `).all();

  return new Response(
    JSON.stringify({
      seasons: rows.map((r) => ({
        season: r.season,
        label: getSeasonDisplayLabel(r.season),
      })),
    }),
    { status: 200 }
  );
}
