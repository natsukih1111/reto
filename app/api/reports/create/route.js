// file: app/api/reports/create/route.js
import { NextResponse } from 'next/server';
import { createQuestionReport } from '@/lib/reports.js';

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      question_id,
      comment,
      source_mode,             // 'rate' | 'rate-ai' | 'challenge' など
      reported_by_user_id = null,
      battle_id = null,
      challenge_run_id = null,
    } = body;

    // 必須チェック（ユーザーIDは無くてもOK）
    if (!question_id || !comment || !source_mode) {
      return NextResponse.json(
        {
          error:
            'question_id / source_mode / comment は必須です（ユーザーIDは省略可）',
        },
        { status: 400 }
      );
    }

    const created = await createQuestionReport({
      question_id,
      reported_by_user_id,
      source_mode,
      battle_id,
      challenge_run_id,
      comment,
    });

    return NextResponse.json({ report: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/reports/create error:', err);
    return NextResponse.json(
      { error: '問題不備報告の登録に失敗しました' },
      { status: 500 }
    );
  }
}
