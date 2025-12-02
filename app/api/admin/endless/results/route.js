// file: app/api/admin/endless/results/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const { questionId, correct, answerMs, timestamp } = body;

    if (!questionId) {
      // questionId が無い時だけ 400 を返す（フロントのバグ）
      return NextResponse.json(
        {
          ok: false,
          error: 'bad_request',
          message: 'questionId は必須です',
        },
        { status: 400 }
      );
    }

    const loggedAt = timestamp || new Date().toISOString();

    const ms =
      typeof answerMs === 'number' && Number.isFinite(answerMs)
        ? Math.max(0, Math.floor(answerMs))
        : null;

    // Supabase 用。db.query が使える前提
    try {
      await db.query(
        `
          INSERT INTO endless_results (question_id, correct, answer_ms, logged_at)
          VALUES ($1, $2, $3, $4)
        `,
        [questionId, correct ? 1 : 0, ms, loggedAt]
      );
    } catch (e) {
      // テーブルが無い／カラム違いなどの時でもフロントは止めない
      console.error('endless_results への保存エラー(DB)', e);
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('/api/admin/endless/results POST error', e);
    // ここもフロントは止めない方針なので 200
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
