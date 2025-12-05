// file: app/api/announcements/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

export const runtime = 'nodejs';

// db.query が配列 or { rows } どちらでも動くように
async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

export async function GET() {
  try {
    const rows = await queryRows(
      `
        SELECT
          id,
          title,
          message,
          created_at,
          is_published
        FROM announcements
        WHERE is_published = TRUE
        ORDER BY created_at DESC, id DESC
        LIMIT 50
      `
    );

    return NextResponse.json(
      {
        ok: true,
        announcements: rows || [],
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('/api/announcements GET error', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR', announcements: [] },
      { status: 500 }
    );
  }
}
