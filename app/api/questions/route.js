// file: app/api/questions/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

/**
 * レート戦・フリーマッチ用の「出題用問題一覧」を返すAPI
 * - question_submissions から status = 'approved' のものだけを返す
 */
export async function GET() {
  try {
    // Supabase(Postgres)用クエリ
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
        ORDER BY id DESC
        LIMIT 1000
      `,
      ['approved']
    );

    // battleページ側のコードは
    //   data.questions が配列 か data 自体が配列
    // の両方に対応しているので、ここでは { questions: rows } で返す
    return NextResponse.json(
      { questions: rows },
      { status: 200 }
    );
  } catch (e) {
    console.error('/api/questions GET error', e);
    return NextResponse.json(
      { error: 'failed_to_load_questions' },
      { status: 500 }
    );
  }
}
