// file: app/api/titles/route.js
import db from '@/lib/db.js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rows = await db.query(
      `
      SELECT
        id,
        name,
        image_path AS image_url,     -- ← image_path を image_url という名前で返す
        description AS condition_text -- ← description を condition_text という名前で返す
      FROM titles
      ORDER BY id
      `
    );

    return NextResponse.json({ titles: rows }, { status: 200 });
  } catch (e) {
    console.error('[api/titles] error', e);
    return NextResponse.json(
      { titles: [], error: 'server_error' },
      { status: 500 }
    );
  }
}
