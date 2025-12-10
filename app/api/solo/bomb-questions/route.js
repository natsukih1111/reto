// file: app/api/solo/bomb-questions/route.js
import db from '@/lib/db.js';

// db.query が配列 or { rows } のどちらでも動くようにするヘルパー
async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

// DBの行を共通フォーマットに変換
function mapRowToQuestion(row) {
  let options = [];
  try {
    const src =
      row.options_json && typeof row.options_json === 'string'
        ? JSON.parse(row.options_json)
        : row.options_json;
    if (Array.isArray(src)) {
      options = src.map((s) => String(s).trim()).filter((s) => s !== '');
    }
  } catch {
    options = [];
  }

  return {
    id: row.id,
    questionType: row.question_type || row.type || 'order',
    text: row.question || '',
    // 並び替えの正解は「この配列の順番」
    options,
  };
}

// 承認済み ＆ 並び替え（order）問題だけ返す
export async function GET() {
  try {
    const rows = await queryRows(
      `
        SELECT
          id,
          type AS question_type,
          question,
          options_json,
          status
        FROM question_submissions
        WHERE status = 'approved'
          AND type = 'order'
        ORDER BY id ASC
      `
    );

    const questions = (rows || [])
      .map(mapRowToQuestion)
      .filter(
        (q) =>
          q.text &&
          Array.isArray(q.options) &&
          q.options.length >= 2
      );

    if (questions.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: '承認済みの並び替え問題が見つかりませんでした。',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true, questions }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (e) {
    console.error('/api/solo/bomb-questions GET error', e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'サーバーエラーが発生しました。',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}
