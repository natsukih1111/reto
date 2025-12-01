// file: app/api/ai-questions/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

/**
 * AI戦用の問題一覧
 * - endless_results に登場した question_id だけを返す
 * - まだログが無いときは通常の承認済み問題を全部返す（フォールバック）
 */
export async function GET() {
  try {
    let logs;

    // endless_results から解いたことのある question_id を取得
    try {
      logs = db
        .prepare(
          `
          SELECT DISTINCT question_id
          FROM endless_results
        `
        )
        .all();
    } catch (e) {
      console.warn('endless_results 読み込み失敗 or テーブル無し', e);
      logs = [];
    }

    // ログが1件も無い（or まともな ID が無い）ときは通常版にフォールバック
    if (!logs || logs.length === 0) {
      const fallback = db
        .prepare(
          `
          SELECT *
          FROM question_submissions
          WHERE status = 'approved'
          ORDER BY id ASC
        `
        )
        .all();

      return NextResponse.json(fallback);
    }

    const ids = logs
      .map((r) => r.question_id)
      .filter(
        (v) =>
          (typeof v === 'number' && Number.isFinite(v)) ||
          (typeof v === 'string' && v !== '')
      );

    if (ids.length === 0) {
      const fallback = db
        .prepare(
          `
          SELECT *
          FROM question_submissions
          WHERE status = 'approved'
          ORDER BY id ASC
        `
        )
        .all();

      return NextResponse.json(fallback);
    }

    // IN 句のプレースホルダ (...,?,?)
    const placeholders = ids.map(() => '?').join(',');

    const rows = db
      .prepare(
        `
        SELECT *
        FROM question_submissions
        WHERE status = 'approved'
          AND id IN (${placeholders})
        ORDER BY id ASC
      `
      )
      .all(...ids);

    return NextResponse.json(rows);
  } catch (err) {
    console.error('ai-questions GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch ai questions' },
      { status: 500 }
    );
  }
}
