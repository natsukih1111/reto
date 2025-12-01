// file: app/api/challenge/start/route.js
import db, {
  getCurrentSeason,
  hasChallengeAttemptToday,
  markChallengeAttemptToday,
} from '@/lib/db.js';

export async function POST(request) {
  try {
    const { user_id } = await request.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id が必要です' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // --- 1日1回チェック ---
    if (hasChallengeAttemptToday(user_id)) {
      return new Response(
        JSON.stringify({
          error: '今日はすでにチャレンジモードに挑戦しています。',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const season = getCurrentSeason();

    // --- 出題元：question_submissions（承認済みだけ）---
    // 実際のテーブル定義：
    // id, type, question, options, answer, tags_json, ...,
    // question_text, options_json, correct_answer, alt_answers_json, ...
    const rows = db
      .prepare(`
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
      `)
      .all();

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({
          error: '出題できる承認済みの問題がありません。管理者に連絡してください。',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const questions = rows.map((row) => {
      const type = row.type || 'single';
      const text = row.question_text ?? row.question ?? '';

      return {
        id: row.id,
        type,
        question: text,
        options: row.options_json ? JSON.parse(row.options_json) : [],
        correct: row.correct_answer ?? '',
        altAnswers: row.alt_answers_json
          ? JSON.parse(row.alt_answers_json)
          : [],
        tags: row.tags_json ? JSON.parse(row.tags_json) : [],
      };
    });

    // ここまで来て問題取得成功 → 今日の挑戦を消費扱いにする
    markChallengeAttemptToday(user_id);

    return new Response(
      JSON.stringify({
        season,
        questions,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (err) {
    console.error('challenge/start error', err);
    return new Response(
      JSON.stringify({
        error: 'サーバーエラーが発生しました。時間をおいて再度お試しください。',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
