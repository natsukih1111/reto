// file: app/api/admin/approve-question/route.js
import db from '@/lib/db.js';
import { addBerriesByUserId } from '@/lib/berries';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);

    console.log('[approve-question] request body =', body);

    if (!id) {
      console.warn('[approve-question] id missing in body:', body);
      return new Response(JSON.stringify({ error: 'id が必要です' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 投稿された問題を取得（Supabase / Postgres）
    const submission = await db.get(
      'SELECT * FROM question_submissions WHERE id = $1',
      [id]
    );

    console.log('[approve-question] submission =', submission);

    if (!submission) {
      return new Response(
        JSON.stringify({ error: 'データが見つかりません' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // すでに承認済みなら、二重付与防止で即リターン
    if (submission.status === 'approved') {
      console.log(
        '[approve-question] already approved, skip reward. id =',
        id
      );
      return new Response(
        JSON.stringify({ ok: true, alreadyApproved: true }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // ---- 作問者ユーザーIDの特定ロジック ----
    let authorUserId =
      submission.author_user_id ?? submission.user_id ?? null;

    console.log(
      '[approve-question] initial author_user_id from row =',
      submission.author_user_id,
      ' / user_id =',
      submission.user_id,
      ' => authorUserId =',
      authorUserId
    );

    // 旧データなどで author_user_id / user_id が無い場合のフォールバック
    if (!authorUserId && submission.created_by) {
      try {
        const key = submission.created_by;
        const userRow = await db.get(
          `
            SELECT id, username, display_name, login_id
            FROM users
            WHERE display_name = $1
               OR username     = $2
               OR login_id     = $3
            LIMIT 1
          `,
          [key, key, key]
        );

        console.log(
          '[approve-question] fallback search from created_by =',
          key,
          ' => userRow =',
          userRow
        );

        if (userRow) {
          authorUserId = userRow.id;
        }
      } catch (e) {
        console.error(
          '[approve-question] failed to resolve author from created_by:',
          e
        );
      }
    }

    console.log('[approve-question] final authorUserId =', authorUserId);

    // ステータスを approved に更新 & 古い行なら author_user_id を埋め直す
    await db.run(
      `
        UPDATE question_submissions
        SET
          status = 'approved',
          reviewed_at = NOW(),
          author_user_id = COALESCE(author_user_id, $1)
        WHERE id = $2
      `,
      [authorUserId ?? null, id]
    );

    // ベリー付与（authorUserId が特定できた場合のみ）
    if (authorUserId) {
      try {
        console.log(
          '[approve-question] add 200 berries to user_id =',
          authorUserId,
          'for submission id =',
          id
        );
        await addBerriesByUserId(
          authorUserId,
          200,
          '問題承認報酬'
        );
      } catch (e) {
        console.error('addBerriesByUserId (approve) failed:', e);
      }
    } else {
      console.warn(
        `[approve-question] author_user_id を特定できなかったため、ベリー付与スキップ (submission id=${id})`
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error('[/api/admin/approve-question] error:', err);
    return new Response(JSON.stringify({ error: 'サーバーエラー' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
