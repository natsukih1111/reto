// file: app/api/admin/delete-question/route.js
import db from '@/lib/db.js';

export async function POST(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'id が必要です' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const questionId = Number(id);

    const deleteTx = db.transaction((qid) => {
      // この問題を参照しているテーブルから先に削除
      db.prepare(
        `DELETE FROM question_reports WHERE question_id = ?`
      ).run(qid);

      db.prepare(
        `DELETE FROM endless_logs WHERE question_id = ?`
      ).run(qid);

      db.prepare(
        `DELETE FROM user_mistakes WHERE question_id = ?`
      ).run(qid);

      // 最後に questions 本体を削除
      db.prepare(
        `DELETE FROM questions WHERE id = ?`
      ).run(qid);
    });

    deleteTx(questionId);

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('delete-question error', e);
    return new Response(
      JSON.stringify({ error: 'DBエラーが発生しました。' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
