// file: app/api/mistakes/add/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db.js';
import { addUserMistake } from '@/lib/mistakes.js';

async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

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

    const userRows = await queryRows(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    const user = userRows[0];

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // question_submissions に存在するかチェック
    const qRows = await queryRows(
      'SELECT id FROM question_submissions WHERE id = $1',
      [qid]
    );
    const question = qRows[0];

    if (!question) {
      return NextResponse.json(
        { ok: false, error: 'QUESTION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 実際に user_mistakes に記録
    await addUserMistake(user.id, qid);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/mistakes/add error', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
