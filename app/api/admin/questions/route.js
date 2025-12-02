// file: app/api/admin/questions/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

/**
 * 管理画面用 問題一覧 API
 * - question_submissions から取得
 * - ?status=approved / pending で絞り込み
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'approved' / 'pending' / null

    // Supabase(Postgres) 用クエリ
    // 👉 /api/questions と同じカラムだけに絞って、存在しないカラムを一切使わない
    let sql = `
      SELECT
        id,
        type,
        question_text,
        options_json,
        correct_answer,
        alt_answers_json,
        tags_json
      FROM question_submissions
    `;
    const params = [];

    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }

    sql += ' ORDER BY id DESC LIMIT 1000';

    const rows = await db.query(sql, params);

    // フロント（エンドレス＆管理画面）で使いやすい形に整形
    const questions = rows.map((row) => {
      // options_json → options 配列に変換
      let options = [];
      try {
        if (Array.isArray(row.options_json)) {
          options = row.options_json;
        } else if (typeof row.options_json === 'string') {
          const parsed = JSON.parse(row.options_json);
          if (Array.isArray(parsed)) options = parsed;
        }
      } catch {
        options = [];
      }

      return {
        id: row.id,
        // 旧コード互換用のフィールド名たち
        question: row.question_text ?? '',
        question_text: row.question_text ?? '',
        question_type: row.type ?? 'single',
        type: row.type ?? 'single',
        options,
        options_json: row.options_json,
        correct_answer: row.correct_answer ?? '',
        alt_answers_json: row.alt_answers_json ?? null,
        tags_json: row.tags_json ?? null,
      };
    });

    return NextResponse.json({ questions }, { status: 200 });
  } catch (e) {
    console.error('/api/admin/questions GET error', e);
    return NextResponse.json(
      { error: 'failed_to_load_admin_questions' },
      { status: 500 }
    );
  }
}
