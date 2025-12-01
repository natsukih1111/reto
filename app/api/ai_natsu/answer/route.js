import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

export const runtime = 'nodejs';

const DB_PATH = path.join(process.cwd(), 'quiz.db');

// --- DB ヘルパー: 1行だけ取得 ---
function getSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.get(sql, params, (err, row) => {
      db.close();
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

// 念のためテーブル存在チェック（無ければ何もしない）
async function ensureTableIfAny() {
  // CREATE TABLE は既に admin/endless/results でやっている想定なので
  // ここでは何もしない or 必要なら CHECK 用のクエリだけ入れてもOK
  return;
}

/**
 * POST /api/ai_natsu/answer
 * body: { questionId: number, timeLimitMs?: number }
 *
 * 仕様:
 *  - endless_results の「直近1件」の正誤をそのまま AI の正誤として使う
 *  - answer_ms をベースに ±20% くらいの誤差をつけて返す
 *  - timeLimitMs が渡されていれば、その少し手前で止まるように clamp
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { questionId, timeLimitMs } = body || {};

    if (typeof questionId !== 'number') {
      return NextResponse.json(
        { error: 'questionId (number) が必要です' },
        { status: 400 }
      );
    }

    await ensureTableIfAny();

    const row = await getSql(
      `
      SELECT question_id, correct, answer_ms, logged_at
      FROM endless_results
      WHERE question_id = ?
      ORDER BY datetime(logged_at) DESC, id DESC
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

    // 「直近の正誤をそのまま参照」
    const correct = row.correct === 1;

    // 解答時間（ms）をベースに少しランダム化
    let answerMs =
      typeof row.answer_ms === 'number' && row.answer_ms > 0
        ? row.answer_ms
        : 20000; // データが無い時のデフォルト 20秒

    const jitterRange = Math.floor(answerMs * 0.2); // ±20%
    const jitter = Math.floor(Math.random() * jitterRange * 2) - jitterRange;
    answerMs = answerMs + jitter;
    if (answerMs < 500) answerMs = 500; // 0.5秒未満にはしない

    if (typeof timeLimitMs === 'number' && timeLimitMs > 1000) {
      // タイムリミットの少し手前までに収まるように
      const maxMs = timeLimitMs - 500;
      if (answerMs > maxMs) answerMs = maxMs;
    }

    return NextResponse.json({
      canAnswer: true,
      correct,
      answerMs,
    });
  } catch (e) {
    console.error('AIなつ解答APIエラー', e);
    return NextResponse.json(
      { error: 'internal error', detail: String(e) },
      { status: 500 }
    );
  }
}
