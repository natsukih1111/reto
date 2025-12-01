// file: app/api/submit-question/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import { addBerriesByUserId } from '@/lib/berries';

/**
 * 現在ログイン中のユーザーをクッキーから取得
 * ※ BAN されている場合は null を返す
 */
async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;
    if (!username) return null;

    const row = db
      .prepare(
        'SELECT id, username, display_name, is_official_author, banned FROM users WHERE username = ?'
      )
      .get(username);

    if (!row) return null;

    // BAN 中ならクッキー消して null 扱い
    if ((row.banned ?? 0) !== 0) {
      try {
        cookieStore.set('nb_username', '', { path: '/', maxAge: 0 });
      } catch (e) {
        console.warn('failed to clear cookie for banned user', e);
      }
      return null;
    }

    const { banned, ...safe } = row;
    return safe;
  } catch (e) {
    console.warn('getCurrentUser failed', e);
    return null;
  }
}

/**
 * 問題投稿 API
 * - 一般ユーザー: status=pending / 投稿時 +100 ベリー
 * - 公認作問者: status=approved / 投稿時 +300 ベリー
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    let {
      type,            // "single" | "multi" | "text" | "order"
      question,        // 問題文
      options = [],    // 選択肢 or 並び替え
      answer,          // 正解
      tags = [],       // タグ
      altAnswers = [], // 記述の別解
    } = body;

    const questionText = (question || '').trim();
    const correctAnswer = (answer || '').trim();

    if (!questionText) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'bad_request',
          message: '問題文を入力してください。',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ログインユーザー
    const currentUser = await getCurrentUser();
    const authorUserId = currentUser?.id ?? null;
    const authorName =
      currentUser?.display_name || currentUser?.username || null;
    const isOfficialAuthor = currentUser?.is_official_author ?? 0;

    // 公認作問者は最初から approved
    const initialStatus = isOfficialAuthor ? 'approved' : 'pending';

    // 整形
    const cleanedOptions = Array.isArray(options)
      ? options.map((o) => (o || '').trim()).filter(Boolean)
      : [];
    const cleanedTags = Array.isArray(tags) ? tags : [];
    const cleanedAltAnswers = Array.isArray(altAnswers)
      ? altAnswers.map((a) => (a || '').trim()).filter(Boolean)
      : [];

    const questionType =
      type || (cleanedOptions.length > 0 ? 'single' : 'text');

    // ★ 複数回答（multi）のバリデーション
    //   - 正解は 1 個以上 必須
    //   - 不正解は 0 個でも OK（＝全て正解でも投稿可能）
    if (questionType === 'multi') {
      // correctAnswer の形式が "1||3" などの可能性も考えて、"||" で分解して数を数える
      const parts = correctAnswer
        .split('||')
        .map((s) => s.trim())
        .filter(Boolean);

      if (parts.length < 1) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'bad_request',
            message:
              '複数回答問題では、少なくとも1つは正解を指定してください。',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        );
      }
      // ※ 不正解の個数チェックは一切しないので、
      //    ・正解1 + 不正解3
      //    ・正解のみ（不正解0）
      //    どちらも投稿OKになります。
    }

    const legacyOptions = cleanedOptions.join('||');

    const params = {
      type: questionType,
      question: questionText,
      options: legacyOptions,
      answer: correctAnswer,
      status: initialStatus,
      created_by: authorName || null,
      is_admin: 0,
      question_text: questionText,
      options_json: JSON.stringify(cleanedOptions),
      correct_answer: correctAnswer,
      alt_answers_json: JSON.stringify(cleanedAltAnswers),
      tags_json: JSON.stringify(cleanedTags),
      author_user_id: authorUserId,
    };

    // DB へ保存
    db.prepare(
      `
      INSERT INTO question_submissions
        (type, question, options, answer,
         status, created_by, is_admin,
         question_text, options_json, correct_answer,
         alt_answers_json, tags_json, author_user_id, updated_at)
      VALUES
        (@type, @question, @options, @answer,
         @status, @created_by, @is_admin,
         @question_text, @options_json, @correct_answer,
         @alt_answers_json, @tags_json, @author_user_id,
         CURRENT_TIMESTAMP)
      `
    ).run(params);

    // ベリー付与
    if (authorUserId) {
      const reward = isOfficialAuthor ? 300 : 100;
      try {
        console.log(
          '[submit-question] add berries',
          reward,
          'to user_id=',
          authorUserId,
          'official=',
          isOfficialAuthor
        );
        addBerriesByUserId(
          authorUserId,
          reward,
          isOfficialAuthor
            ? '公認作問者・問題投稿報酬'
            : '問題投稿報酬'
        );
      } catch (e) {
        console.error('addBerriesByUserId (submit) failed:', e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: initialStatus,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('submit-question POST error:', e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'failed_to_submit',
        message: e.message || String(e),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
