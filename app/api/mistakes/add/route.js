// file: app/api/mistakes/add/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db.js';
import { addUserMistake } from '@/lib/mistakes.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const qid = Number(body.questionId ?? body.question_id);

    if (!qid || Number.isNaN(qid)) {
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

    // 実際に記録
    addUserMistake(user.id, qid);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/mistakes/add error', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
