// file: app/api/admin/reports/route.js
import { NextResponse } from 'next/server';
import {
  listQuestionReportsForAdmin,
  updateQuestionReportForAdmin,
} from '@/lib/reports.js';

// GET: /api/admin/reports?status=open|fixed|dismissed|all
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusKey = searchParams.get('status') || 'open';
    const limit = Number(searchParams.get('limit') || '100');
    const offset = Number(searchParams.get('offset') || '0');

    const list = await listQuestionReportsForAdmin({
      statusKey,
      limit,
      offset,
    });

    const reports = list.map((r) => ({
      id: r.id,
      question_id: r.question_id,
      reporter_user_id: r.reporter_user_id,
      question: r.question_text,
      content: r.comment,
      admin_note: r.admin_note,
      status: r.status_key,
      created_at: r.created_at,
      updated_at: r.updated_at,
      correct_answer: r.correct_answer,
      options_json: r.options_json,
    }));

    return NextResponse.json({ reports });
  } catch (err) {
    console.error('GET /api/admin/reports error:', err);
    return NextResponse.json(
      { error: '問題不備報告の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: /api/admin/reports
// body: { id, status: 'open'|'fixed'|'dismissed', adminNote }
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, status, adminNote = '' } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id と status は必須です' },
        { status: 400 }
      );
    }

    const updated = await updateQuestionReportForAdmin({
      id,
      statusKey: status,
      adminNote,
    });

    if (!updated) {
      return NextResponse.json(
        { error: '指定されたIDの報告が見つかりません' },
        { status: 404 }
      );
    }

    const report = {
      id: updated.id,
      question_id: updated.question_id,
      reporter_user_id: updated.reporter_user_id,
      question: updated.question_text,
      content: updated.comment,
      admin_note: updated.admin_note,
      status: updated.status_key,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      correct_answer: updated.correct_answer,
      options_json: updated.options_json,
    };

    return NextResponse.json({ report });
  } catch (err) {
    console.error('POST /api/admin/reports error:', err);
    return NextResponse.json(
      { error: '問題不備報告の更新に失敗しました' },
      { status: 500 }
    );
  }
}
