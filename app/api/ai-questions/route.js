// file: app/api/ai-questions/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

export const runtime = 'nodejs';

/**
 * AI戦用の問題一覧
 * - endless_results に登場した question_id だけを返す
 * - まだログが無いときは承認済みの全問題を返す
 */
export async function GET() {
  try {
    let logs = [];
    try {
      logs = await db.query(
        `
          SELECT DISTINCT question_id
          FROM endless_results
        `,
        []
      );
    } catch (e) {
      console.warn('endless_results 読み込み失敗 or テーブル無し', e);
      logs = [];
    }

    const ids = (logs || [])
      .map((r) => Number(r.question_id))
      .filter((v) => Number.isFinite(v));

    // ログゼロ or ID無し → フォールバック（承認済み全部）
    if (ids.length === 0) {
      const fallback = await db.query(
        `
          SELECT *
          FROM question_submissions
          WHERE status = 'approved'
          ORDER BY id ASC
        `,
        []
      );
      return NextResponse.json(fallback, { status: 200 });
    }

    // id 配列で絞り込み（Postgres の ANY を利用）
    const rows = await db.query(
      `
        SELECT *
        FROM question_submissions
        WHERE status = 'approved'
          AND id = ANY($1::int[])
        ORDER BY id ASC
      `,
      [ids]
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error('ai-questions GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch ai questions' },
      { status: 500 }
    );
  }
}
