// file: app/api/submit-question-fast/route.js
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

// ★ multi/order は correct_answer を JSON配列文字列に統一
//   answer(旧)は互換用に || 形式で保存
function normalizeAnswerForStorage(questionType, answer) {
  const raw = String(answer ?? '').trim();
  if (!raw) return { legacyAnswer: '', correctAnswer: '' };

  const isListType = questionType === 'multi' || questionType === 'order';

  // text / single はそのまま
  if (!isListType) {
    return { legacyAnswer: raw, correctAnswer: raw };
  }

  // JSON配列で来た場合
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const cleaned = arr
          .map((s) => String(s ?? '').trim())
          .filter(Boolean);

        return {
          legacyAnswer: cleaned.join('||'),
          correctAnswer: JSON.stringify(cleaned),
        };
      }
    } catch {
      // 失敗したら下の || 分割へ
    }
  }

  // || 形式で来た場合（フロントは今これ）
  const cleaned = raw
    .split('||')
    .map((s) => String(s ?? '').trim())
    .filter(Boolean);

  return {
    legacyAnswer: cleaned.join('||'),
    correctAnswer: JSON.stringify(cleaned),
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { type, question, options = [], answer, tags = [], altAnswers = [] } = body;

    const questionText = (question || '').trim();
    if (!questionText) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    const cleanedOptions = Array.isArray(options)
      ? options.map((o) => String(o ?? '').trim()).filter(Boolean)
      : [];

    const cleanedAltAnswers = Array.isArray(altAnswers)
      ? altAnswers.map((a) => String(a ?? '').trim()).filter(Boolean)
      : [];

    const cleanedTags = Array.isArray(tags) ? tags : [];

    const questionType = type || (cleanedOptions.length > 0 ? 'single' : 'text');

    // ★ ここが修正点
    const { legacyAnswer, correctAnswer } = normalizeAnswerForStorage(
      questionType,
      answer
    );

    // multi / order バリデーション（最低限）
    if (questionType === 'multi' || questionType === 'order') {
      let arr = [];
      try {
        const parsed = JSON.parse(correctAnswer);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {
        arr = [];
      }

      if (arr.length < 1) {
        return new Response(
          JSON.stringify({
            ok: false,
            message:
              questionType === 'multi'
                ? '複数回答では正解を1つ以上指定してください。'
                : '並び替えでは正解を2つ以上指定してください。',
          }),
          { status: 400 }
        );
      }
      if (questionType === 'order' && arr.length < 2) {
        return new Response(
          JSON.stringify({
            ok: false,
            message: '並び替えでは正解を2つ以上指定してください。',
          }),
          { status: 400 }
        );
      }
    }

    // ★ ユーザー取得
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
        legacyAnswer, // ★ 旧answerは || で保存
        status,
        authorName,
        questionText,
        JSON.stringify(cleanedOptions),
        correctAnswer, // ★ correct_answer は JSON配列文字列
        JSON.stringify(cleanedAltAnswers),
        JSON.stringify(cleanedTags),
        authorUserId,
      ]
    );

    return new Response(JSON.stringify({ ok: true, status }), { status: 201 });
  } catch (e) {
    console.error('submit-question-fast error', e);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
}
