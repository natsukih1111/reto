// file: app/api/challenge/start/route.js
import db from '@/lib/db.js';

// db.query の結果が配列 / { rows } どちらでも動くようにするヘルパ
async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

// 文字列 or JSON文字列 を「文字列配列」にする安全パーサ
function toStringArray(value) {
  if (!value) return [];

  // すでに配列なら文字列化して返す
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }

  if (typeof value !== 'string') return [];

  const t = value.trim();
  if (!t) return [];

  // JSON配列形式なら JSON.parse を試す
  if (t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
    } catch {
      // 失敗したら下の CSV 分解にフォールバック
    }
  }

  // カンマ・日本語の読点・スラッシュなどで分割
  return t
    .split(/[、，,／/]/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function POST(request) {
  try {
    const { user_id } = await request.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id が必要です' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ------------------------------
    // ★ 1日1回チェック
    // ------------------------------
    const today = new Date().toISOString().slice(0, 10);

    const attemptRows = await queryRows(
      `SELECT 1
         FROM challenge_daily_attempts
        WHERE user_id = $1 AND date = $2
        LIMIT 1`,
      [user_id, today]
    );

    if (attemptRows.length > 0) {
      return new Response(
        JSON.stringify({
          error: '今日はすでにチャレンジモードに挑戦しています。',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ------------------------------
    // ★ 承認済み問題をランダム取得
    // ------------------------------
    const rows = await queryRows(
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
      WHERE status = 'approved'
      ORDER BY RANDOM()
      `
    );

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({
          error: '出題できる承認済みの問題がありません。管理者に連絡してください。',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const questions = rows.map((row) => {
      const type = row.type || 'single';
      const text = row.question_text ?? row.question ?? '';

      const options = toStringArray(row.options_json);
      const altAnswers = toStringArray(row.alt_answers_json);

      let tags = [];
      try {
        if (row.tags_json) {
          if (Array.isArray(row.tags_json)) {
            tags = row.tags_json;
          } else if (
            typeof row.tags_json === 'string' &&
            row.tags_json.trim().startsWith('[')
          ) {
            const parsed = JSON.parse(row.tags_json);
            if (Array.isArray(parsed)) tags = parsed;
          }
        }
      } catch {
        tags = [];
      }

      return {
        id: row.id,
        type,
        question: text,
        options,
        correct: row.correct_answer ?? '',
        altAnswers,
        tags,
      };
    });

    // ------------------------------
    // ★ 今日挑戦した記録を残す（1日1回にする）
    // ------------------------------
    await queryRows(
      `
      INSERT INTO challenge_daily_attempts (user_id, date)
      VALUES ($1, $2)
      ON CONFLICT (user_id, date) DO NOTHING
      `,
      [user_id, today]
    );

    return new Response(
      JSON.stringify({
        ok: true,
        questions,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('challenge/start error', err);
    return new Response(
      JSON.stringify({
        error: 'サーバーエラーが発生しました。時間をおいて再度お試しください。',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
