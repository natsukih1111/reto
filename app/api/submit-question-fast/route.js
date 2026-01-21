import db from '@/lib/db.js';
import { cookies } from 'next/headers';

async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;
    if (!username) return null;

    const row = await db.get(
      `
        SELECT id, username, display_name, is_official_author, banned
        FROM users
        WHERE username = $1
      `,
      [username]
    );

    if (!row || row.banned) return null;
    return row;
  } catch {
    return null;
  }
}

// answer 正規化（submit-question と同じ）
function normalizeAnswer(questionType, answer) {
  const raw = String(answer ?? '').trim();
  if (!raw) return '';

  if (questionType === 'multi' || questionType === 'order') {
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return arr.map((s) => String(s).trim()).filter(Boolean).join('||');
        }
      } catch {}
    }
  }
  return raw;
}

export async function POST(req) {
  try {
    const body = await req.json();
    let { type, question, options = [], answer, tags = [], altAnswers = [] } = body;

    const questionText = (question || '').trim();
    if (!questionText) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    const cleanedOptions = options.map((o) => String(o).trim()).filter(Boolean);
    const cleanedAltAnswers = altAnswers.map((a) => String(a).trim()).filter(Boolean);

    const questionType =
      type || (cleanedOptions.length > 0 ? 'single' : 'text');

    const correctAnswer = normalizeAnswer(questionType, answer);

    // ★ ここが重要：ユーザー取得
    const user = await getCurrentUser();
    const authorUserId = user?.id ?? null;
    const authorName = user?.display_name || user?.username || null;
    const isOfficialAuthor = user?.is_official_author ?? 0;

    // ★ 公認作問者だけは即時 approved
    const status = isOfficialAuthor ? 'approved' : 'pending';

    await db.run(
      `
        INSERT INTO question_submissions
          (type, question, options, answer, status, created_by, is_admin,
           question_text, options_json, correct_answer,
           alt_answers_json, tags_json, author_user_id, updated_at)
        VALUES
          ($1,$2,$3,$4,$5,$6,0,
           $7,$8,$9,
           $10,$11,$12,CURRENT_TIMESTAMP)
      `,
      [
        questionType,
        questionText,
        cleanedOptions.join('||'),
        correctAnswer,
        status,
        authorName,
        questionText,
        JSON.stringify(cleanedOptions),
        correctAnswer,
        JSON.stringify(cleanedAltAnswers),
        JSON.stringify(tags),
        authorUserId,
      ]
    );

    return new Response(
      JSON.stringify({ ok: true, status }),
      { status: 201 }
    );
  } catch (e) {
    console.error('submit-question-fast error', e);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
}
