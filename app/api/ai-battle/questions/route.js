// file: app/api/ai-battle/questions/route.js
import db from '@/lib/db.js';
import sqlite3 from 'sqlite3';
import path from 'path';

export const runtime = 'nodejs';

// エンドレス結果用の quiz.db
const QUIZ_DB_PATH = path.join(process.cwd(), 'quiz.db');

// quiz.db から複数行取得するヘルパー
function allSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    const quizDb = new sqlite3.Database(QUIZ_DB_PATH);
    quizDb.all(sql, params, (err, rows) => {
      quizDb.close();
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// 配列シャッフル（Fisher–Yates）
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET() {
  try {
    // 1) エンドレスモードで一度でも解かれた question_id 一覧を取得
    const logs = await allSql(
      `
      SELECT DISTINCT question_id
      FROM endless_results
    `
    );

    let questions;

    if (logs.length === 0) {
      // まだエンドレス結果が何もないときは、
      // フォールバックで通常の承認済み問題から取る
      questions = db
        .prepare(
          `
          SELECT
            id,
            question_type AS type,
            question,
            answer,
            options
          FROM questions
          WHERE status = 'approved'
        `
        )
        .all();
    } else {
      const ids = logs.map((r) => r.question_id).filter((v) => v != null);
      if (!ids.length) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }

      const placeholders = ids.map(() => '?').join(',');

      // 2) メインDBから、そのIDの問題だけ取得
      questions = db
        .prepare(
          `
          SELECT
            id,
            question_type AS type,
            question,
            answer,
            options
          FROM questions
          WHERE id IN (${placeholders})
            AND status = 'approved'
        `
        )
        .all(...ids);
    }

    // 3) JS側でシャッフルして返す
    const shuffled = shuffleArray(questions);

    // /api/questions と同じように「配列」で返す想定
    return new Response(JSON.stringify(shuffled), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('ai-battle/questions GET error', e);
    return new Response(
      JSON.stringify({ error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
