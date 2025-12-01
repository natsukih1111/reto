// file: app/api/mistakes/log/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db.js';
import { addUserMistake } from '@/lib/mistakes.js';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const questionId = Number(body.questionId || 0);

    if (!questionId) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_QUESTION_ID' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    if (!username) {
      return NextResponse.json(
        { ok: false, error: 'NOT_LOGGED_IN' },
        { status: 401 }
      );
    }

    const user = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // question_submissions に存在するかチェック
    const submission = db
      .prepare('SELECT id FROM question_submissions WHERE id = ?')
      .get(questionId);

    if (!submission) {
      return NextResponse.json(
        { ok: false, error: 'QUESTION_NOT_FOUND' },
        { status: 404 }
      );
    }

    addUserMistake(user.id, questionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/mistakes/log error', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
