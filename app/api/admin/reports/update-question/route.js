// file: app/api/admin/reports/update-question/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      question_id,
      question_text,
      correct_answer = '',
      options_text = '',
    } = body;

    if (!question_id || !question_text) {
      return NextResponse.json(
        { error: 'question_id と question_text は必須です' },
        { status: 400 }
      );
    }

    // textarea から options_json を作る（1行1選択肢）
    let optionsJson = null;
    if (typeof options_text === 'string' && options_text.trim() !== '') {
      const lines = options_text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      optionsJson = JSON.stringify(lines);
    }

    const updateStmt = db.prepare(
      `
      UPDATE questions
      SET question_text = ?, correct_answer = ?, options_json = ?
      WHERE id = ?
    `
    );

    const result = updateStmt.run(
      question_text,
      correct_answer ?? '',
      optionsJson,
      question_id
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: '指定された ID の問題が見つかりませんでした' },
        { status: 404 }
      );
    }

    const selectStmt = db.prepare(
      `
      SELECT id, question_text, correct_answer, options_json
      FROM questions
      WHERE id = ?
    `
    );
    const row = selectStmt.get(question_id);

    return NextResponse.json(
      {
        question: {
          id: row.id,
          question_text: row.question_text,
          correct_answer: row.correct_answer,
          options_json: row.options_json,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('POST /api/admin/reports/update-question error:', err);
    return NextResponse.json(
      { error: '問題の更新に失敗しました' },
      { status: 500 }
    );
  }
}
