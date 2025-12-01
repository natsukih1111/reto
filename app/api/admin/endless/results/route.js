import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

// Node ランタイムを明示（sqlite3 を使うため）
export const runtime = 'nodejs';

// quiz.db へのパス（プロジェクト直下の quiz.db を想定）
const DB_PATH = path.join(process.cwd(), 'quiz.db');

// sqlite3.run を Promise 化するヘルパー
function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.run(sql, params, function (err) {
      if (err) {
        db.close();
        return reject(err);
      }
      const result = { lastID: this.lastID, changes: this.changes };
      db.close();
      resolve(result);
    });
  });
}

// 初回呼び出し時にテーブルが無ければ作る
async function ensureTable() {
  const createSql = `
    CREATE TABLE IF NOT EXISTS endless_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      correct INTEGER NOT NULL,          -- 1 = 正解, 0 = 不正解
      answer_ms INTEGER,                 -- 解答時間ミリ秒
      logged_at TEXT NOT NULL            -- ISO8601 文字列
    );
  `;
  await runSql(createSql);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { questionId, correct, answerMs, timestamp } = body || {};

    if (typeof questionId !== 'number') {
      return NextResponse.json(
        { error: 'questionId (number) が必要です' },
        { status: 400 }
      );
    }
    if (typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'correct (boolean) が必要です' },
        { status: 400 }
      );
    }

    const loggedAt = timestamp || new Date().toISOString();
    const ms = typeof answerMs === 'number' ? answerMs : null;

    await ensureTable();

    await runSql(
      `
      INSERT INTO endless_results (question_id, correct, answer_ms, logged_at)
      VALUES (?, ?, ?, ?)
    `,
      [questionId, correct ? 1 : 0, ms, loggedAt]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('endless_results への保存エラー', e);
    return NextResponse.json(
      { error: 'internal error', detail: String(e) },
      { status: 500 }
    );
  }
}
