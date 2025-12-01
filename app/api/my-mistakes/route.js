// file: app/api/my-mistakes/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db.js';
import { getUserMistakesWithQuestions } from '@/lib/mistakes.js';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    if (!username) {
      return NextResponse.json(
        { ok: false, reason: 'NOT_LOGGED_IN', mistakes: [] },
        { status: 200 }
      );
    }

    const user = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);

    if (!user) {
      return NextResponse.json(
        { ok: false, reason: 'USER_NOT_FOUND', mistakes: [] },
        { status: 200 }
      );
    }

    const list = getUserMistakesWithQuestions(user.id, 2000);

    return NextResponse.json({
      ok: true,
      mistakes: list,
    });
  } catch (e) {
    console.error('/api/my-mistakes error', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR', mistakes: [] },
      { status: 500 }
    );
  }
}
