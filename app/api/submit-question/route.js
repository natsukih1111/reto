// file: app/api/submit-question/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import { addBerriesByUserId } from '@/lib/berries';

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

    if (!row) return null;
    if (row.banned) return null;

    const { banned, ...safe } = row;
    return safe;
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    let { type, question, options = [], answer, tags = [], altAnswers = [] } =
      body;

    const questionText = (question || '').trim();
    const correctAnswer = (answer || '').trim();

    if (!questionText) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'bad_request',
          message: '問題文を入力してください。',
        }),
        { status: 400 }
      );
    }

    // ログインユーザー
    const currentUser = await getCurrentUser();
    const authorUserId = currentUser?.id ?? null;
    const authorName =
      currentUser?.display_name || currentUser?.username || null;
    const isOfficialAuthor = currentUser?.is_official_author ?? 0;

    const initialStatus = isOfficialAuthor ? 'approved' : 'pending';

    const cleanedOptions = Array.isArray(options)
      ? options.map((o) => o.trim()).filter(Boolean)
      : [];

    const cleanedTags = Array.isArray(tags) ? tags : [];
    const cleanedAltAnswers = Array.isArray(altAnswers)
      ? altAnswers.map((a) => a.trim()).filter(Boolean)
      : [];

    const questionType =
      type || (cleanedOptions.length > 0 ? 'single' : 'text');

    // 複数選択バリデーション
    if (questionType === 'multi') {
      const parts = correctAnswer
        .split('||')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length < 1) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'bad_request',
            message: '複数回答では正解を1つ以上指定してください。',
          }),
          { status: 400 }
        );
      }
    }

    const legacyOptions = cleanedOptions.join('||');

    // ---- INSERT ----
    await db.run(
      `
        INSERT INTO question_submissions
          (type, question, options, answer, status, created_by, is_admin,
           question_text, options_json, correct_answer,
           alt_answers_json, tags_json, author_user_id, updated_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, 0,
           $7, $8, $9,
           $10, $11, $12, CURRENT_TIMESTAMP)
      `,
      [
        questionType,
        questionText,
        legacyOptions,
        correctAnswer,
        initialStatus,
        authorName,
        questionText,
        JSON.stringify(cleanedOptions),
        correctAnswer,
        JSON.stringify(cleanedAltAnswers),
        JSON.stringify(cleanedTags),
        authorUserId,
      ]
    );

    // ベリー付与
    if (authorUserId) {
      const reward = isOfficialAuthor ? 300 : 100;
      await addBerriesByUserId(
        authorUserId,
        reward,
        isOfficialAuthor
          ? '公認作問者・問題投稿報酬'
          : '問題投稿報酬'
      );
    }

    // ================================
    // ★ 投稿数 +1 → 「15件投稿した」という情報だけ持つ
    //    チャレンジの復活判定は /api/challenge/start 側でやる
    // ================================
    try {
      if (authorUserId) {
        const today = new Date().toISOString().slice(0, 10);

        // 今日の投稿数 +1
        await db.run(
          `
            INSERT INTO challenge_daily_posts (user_id, date, count)
            VALUES ($1, $2, 1)
            ON CONFLICT (user_id, date)
            DO UPDATE SET count = challenge_daily_posts.count + 1
          `,
          [authorUserId, today]
        );
      }
    } catch (e) {
      console.error('daily post counter failed:', e);
    }

    // ================================
    // ★ タグ投稿数 → エンブレム獲得チェック
    //    自分の全投稿（承認待ち＋承認済み）から tags_json を集計
    // ================================
    try {
      if (authorUserId && cleanedTags.length > 0 && currentUser) {
        const username = currentUser.username || '';
        const displayName = currentUser.display_name || '';
        const userIdText = String(authorUserId);

        // 自分の投稿を、author_user_id と created_by の全パターンで拾う
        const tagRows = await db.query(
          `
            SELECT tags_json
            FROM question_submissions
            WHERE
              (
                author_user_id = $1
                OR created_by = $2
                OR created_by = $3
                OR created_by = $4
              )
              AND status IN ('pending', 'approved')
          `,
          [authorUserId, username, displayName, userIdText]
        );

        // tags_json を安全に配列に変換してカウント
        const tagCount = {};
        for (const r of tagRows) {
          let arr = [];

          if (Array.isArray(r.tags_json)) {
            arr = r.tags_json.map(String);
          } else if (typeof r.tags_json === 'string') {
            const s = r.tags_json.trim();
            if (s) {
              try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) {
                  arr = parsed.map(String);
                }
              } catch {
                // 変な形式は無視
              }
            }
          }

          for (const tag of arr) {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          }
        }

        // ★ titles テーブルの id に合わせる（1〜18 がストーリー系と想定）
        const EMBLEMS = [
          { id: 1,  tags: ['東の海'],                 needed: 30 },
          { id: 2,  tags: ['偉大なる航路突入'],       needed: 30 },
          { id: 3,  tags: ['アラバスタ'],             needed: 30 },
          { id: 4,  tags: ['空島'],                   needed: 30 },
          { id: 5,  tags: ['DBF'],                   needed: 30 },
          // 管理画面では「W7、エニエス・ロビー」という１つのタグ
          { id: 6,  tags: ['W7、エニエス・ロビー'],   needed: 30 },
          { id: 7,  tags: ['スリラーバーク'],         needed: 30 },
          // シャボン＆女ヶ島は合算
          {
            id: 8,
            tags: ['シャボンディ諸島', '女ヶ島'],
            needed: 30,
            mixed: true,
          },
          { id: 9,  tags: ['インペルダウン'],         needed: 30 },
          { id: 10, tags: ['頂上戦争'],               needed: 30 },
          { id: 11, tags: ['魚人島'],                 needed: 30 },
          { id: 12, tags: ['パンクハザード'],         needed: 30 },
          { id: 13, tags: ['ドレスローザ'],           needed: 30 },
          { id: 14, tags: ['ゾウ'],                   needed: 30 },
          { id: 15, tags: ['WCI'],                    needed: 30 },
          { id: 16, tags: ['ワノ国'],                 needed: 30 },
          { id: 17, tags: ['エッグヘッド'],           needed: 30 },
          { id: 18, tags: ['エルバフ'],               needed: 30 },
        ];

        for (const emblem of EMBLEMS) {
          let total = 0;

          if (emblem.mixed) {
            // 複数タグの合算
            total = emblem.tags.reduce(
              (sum, t) => sum + (tagCount[t] || 0),
              0
            );
          } else {
            total = tagCount[emblem.tags[0]] || 0;
          }

          if (total >= emblem.needed) {
            await db.run(
              `
                INSERT INTO user_titles (user_id, title_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, title_id) DO NOTHING
              `,
              [authorUserId, emblem.id]  // ← 数値IDをそのまま入れる
            );
          }
        }
      }
    } catch (e) {
      console.error('emblem check failed:', e);
    }


    return new Response(
      JSON.stringify({ ok: true, status: initialStatus }),
      { status: 201 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'failed_to_submit',
        message: e.message,
      }),
      { status: 500 }
    );
  }
}
