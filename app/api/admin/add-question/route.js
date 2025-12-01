import db from '@/lib/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { question, options, answer, createdBy } = body;

    if (!question || !Array.isArray(options) || !answer) {
      return new Response(
        JSON.stringify({ error: 'question / options / answer は必須です' }),
        { status: 400 }
      );
    }

    const optionsStr = JSON.stringify(options);

    // ゲーム用 questions テーブルに直接追加
    db.prepare(
      'INSERT INTO questions (question, options, answer) VALUES (?, ?, ?)'
    ).run(question, optionsStr, answer);

    // ついでに question_submissions にも「approved」「is_admin=1」で保存しておく
    db.prepare(
      `INSERT INTO question_submissions
        (type, question, options, answer, status, created_by, is_admin)
       VALUES ('single', ?, ?, ?, 'approved', ?, 1)`
    ).run(question, optionsStr, answer, createdBy || 'admin');

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: 'サーバーエラー' }),
      { status: 500 }
    );
  }
}
