// file: app/api/questions/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 120), 300);

    const rows = await db.query(
      `
        SELECT
          id,
          type,
          question_text,
          question,
          options_json,
          correct_answer,
          alt_answers_json,
          tags_json
        FROM question_submissions
        WHERE status = $1
        ORDER BY RANDOM()
        LIMIT ${limit}
      `,
      ['approved']
    );

    return NextResponse.json({ questions: rows }, { status: 200 });
  } catch (e) {
    console.error('/api/questions GET error', e);
    return NextResponse.json({ error: 'failed_to_load_questions' }, { status: 500 });
  }
}
