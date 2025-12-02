// file: app/api/ai_natsu/answer/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

export const runtime = 'nodejs';

/**
 * POST /api/ai_natsu/answer
 * body: { questionId: number, timeLimitMs?: number }
 *
 * 仕様:
 *  - endless_results の「その問題の直近1件」の正誤をそのまま AI の正誤にする
 *  - answer_ms をベースに ±20% くらいの誤差をつけて返す
 *  - timeLimitMs があれば、その少し手前で止まるように clamp
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { questionId, timeLimitMs } = body || {};

    if (typeof questionId !== 'number') {
      return NextResponse.json(
        { error: 'questionId (number) が必要です' },
        { status: 400 }
      );
    }

    const row = await db.get(
      `
        SELECT question_id, correct, answer_ms, logged_at
        FROM endless_results
        WHERE question_id = $1
        ORDER BY logged_at DESC, id DESC
        LIMIT 1
      `,
      [questionId]
    );

    // エンドレスモードで一度も解かれていない問題
    if (!row) {
      return NextResponse.json({
        canAnswer: false,
        reason: 'NO_ENDLESS_RESULT',
      });
    }

    const correct = Number(row.correct) === 1;

    let answerMs =
      typeof row.answer_ms === 'number' && row.answer_ms > 0
        ? row.answer_ms
        : 20000;

    // ±20% のランダム誤差
    const jitterRange = Math.floor(answerMs * 0.2);
    const jitter =
      Math.floor(Math.random() * jitterRange * 2) - jitterRange;
    answerMs += jitter;

    if (answerMs < 500) answerMs = 500;

    if (typeof timeLimitMs === 'number' && timeLimitMs > 1000) {
      const maxMs = timeLimitMs - 500;
      if (answerMs > maxMs) answerMs = maxMs;
    }

    return NextResponse.json(
      {
        canAnswer: true,
        correct,
        answerMs,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('AIなつ解答APIエラー', e);
    return NextResponse.json(
      { error: 'internal_error', detail: String(e) },
      { status: 500 }
    );
  }
}
