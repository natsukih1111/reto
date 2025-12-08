// file: app/api/solo/save-result/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ---- ボス難易度ごとの設定（列名＋クリア称号コード） ----
const BOSS_CONFIG = {
  easy: {
    column: 'boss_easy_best_ms',
    limitMs: 60 * 1000,
    titleCode: 'boss_easy_60',
  },
  normal: {
    column: 'boss_normal_best_ms',
    limitMs: 100 * 1000,
    titleCode: 'boss_normal_100',
  },
  hard: {
    column: 'boss_hard_best_ms',
    limitMs: 150 * 1000,
    titleCode: 'boss_hard_150',
  },
  veryhard: {
    column: 'boss_vh_best_ms',
    limitMs: 180 * 1000,
    titleCode: 'boss_vh_180',
  },
  extra: {
    column: 'boss_extra_best_ms',
    limitMs: 300 * 1000,
    titleCode: 'boss_extra_300',
  },
};

// ---- 共通: cookie からユーザー取得 ----
async function getUserFromCookie() {
  const cookieStore = await cookies();
  const username = cookieStore.get('nb_username')?.value;
  if (!username) return null;

  const user = await db.get(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );
  return user || null;
}

// ---- 共通: code から称号付与（すでに持っていたら何もしない） ----
async function awardTitleByCode(userId, code) {
  if (!userId || !code) return;

  const title = await db.get(
    'SELECT id FROM titles WHERE code = $1',
    [code]
  );
  if (!title) return;

  // 既に持っているかチェックしてから INSERT
  await db.run(
    `
    INSERT INTO user_titles (user_id, title_id)
    SELECT $1, $2
    WHERE NOT EXISTS (
      SELECT 1 FROM user_titles
      WHERE user_id = $1 AND title_id = $2
    )
    `,
    [userId, title.id]
  );
}

// ---- 現在の solo_records を見て、ソロ系称号をまとめてチェック ----
async function awardSoloTitles(userId) {
  const rec = await db.get(
    'SELECT * FROM solo_records WHERE user_id = $1',
    [userId]
  );
  if (!rec) return;

  const tasks = [];

  // --- 隕石クラッシュ ---
  if (rec.meteor_best >= 50) tasks.push(awardTitleByCode(userId, 'meteor_50'));
  if (rec.meteor_best >= 75) tasks.push(awardTitleByCode(userId, 'meteor_75'));
  if (rec.meteor_best >= 100) tasks.push(awardTitleByCode(userId, 'meteor_100'));

  // --- 正答スナイパー ---
  if (rec.sniper_best >= 50) tasks.push(awardTitleByCode(userId, 'sniper_50'));
  if (rec.sniper_best >= 75) tasks.push(awardTitleByCode(userId, 'sniper_75'));
  if (rec.sniper_best >= 100) tasks.push(awardTitleByCode(userId, 'sniper_100'));

  // --- ボス討伐（タイム系） ---
  const bossChecks = [
    { col: 'boss_easy_best_ms', cfg: BOSS_CONFIG.easy },
    { col: 'boss_normal_best_ms', cfg: BOSS_CONFIG.normal },
    { col: 'boss_hard_best_ms', cfg: BOSS_CONFIG.hard },
    { col: 'boss_vh_best_ms', cfg: BOSS_CONFIG.veryhard },
    { col: 'boss_extra_best_ms', cfg: BOSS_CONFIG.extra },
  ];

  for (const { col, cfg } of bossChecks) {
    const value = rec[col];
    if (
      value != null &&
      typeof value === 'number' &&
      cfg &&
      typeof cfg.limitMs === 'number' &&
      value <= cfg.limitMs
    ) {
      tasks.push(awardTitleByCode(userId, cfg.titleCode));
    }
  }

  // --- エクストラ無編成クリア ---
  if (
    rec.boss_extra_noteam_best_ms != null &&
    typeof rec.boss_extra_noteam_best_ms === 'number'
  ) {
    tasks.push(awardTitleByCode(userId, 'boss_extra_noteam'));
  }

  await Promise.all(tasks);
}

// ---- メイン: ソロ結果を受け取って更新 ----
export async function POST(request) {
  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: 'ログインしていません' },
        { status: 401 }
      );
    }
    const userId = user.id;

    const body = await request.json().catch(() => ({}));
    const mode = body.mode;

    if (!mode) {
      return NextResponse.json(
        { ok: false, message: 'mode が指定されていません' },
        { status: 400 }
      );
    }

    // ===== 隕石クラッシュ =====
    if (mode === 'meteor') {
      const score = Number(body.score) || 0;
      if (score <= 0) {
        return NextResponse.json({ ok: true, skipped: true });
      }

      await db.run(
        `
        INSERT INTO solo_records (user_id, meteor_best)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
        SET meteor_best = GREATEST(solo_records.meteor_best, EXCLUDED.meteor_best),
            updated_at   = NOW()
        `,
        [userId, score]
      );

      await awardSoloTitles(userId);
      return NextResponse.json({ ok: true });
    }

    // ===== 正答スナイパー =====
    if (mode === 'sniper') {
      const score = Number(body.score) || 0;
      if (score <= 0) {
        return NextResponse.json({ ok: true, skipped: true });
      }

      await db.run(
        `
        INSERT INTO solo_records (user_id, sniper_best)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
        SET sniper_best = GREATEST(solo_records.sniper_best, EXCLUDED.sniper_best),
            updated_at  = NOW()
        `,
        [userId, score]
      );

      await awardSoloTitles(userId);
      return NextResponse.json({ ok: true });
    }

    // ===== ボス討伐 =====
    if (mode === 'boss') {
      const difficulty = String(body.difficulty || '');
      const cfg = BOSS_CONFIG[difficulty];
      const clearTimeMs = Number(body.clearTimeMs) || 0;
      const noTeam = !!body.noTeam;

      if (!cfg || clearTimeMs <= 0) {
        return NextResponse.json(
          { ok: false, message: 'boss パラメータが不正です' },
          { status: 400 }
        );
      }

      // 難易度ごとの最短タイム更新
      const col = cfg.column;
      const sql = `
        INSERT INTO solo_records (user_id, ${col})
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
        SET ${col} = CASE
              WHEN solo_records.${col} IS NULL THEN EXCLUDED.${col}
              ELSE LEAST(solo_records.${col}, EXCLUDED.${col})
            END,
            updated_at = NOW()
      `;
      await db.run(sql, [userId, clearTimeMs]);

      // エクストラ無編成クリア
      if (difficulty === 'extra' && noTeam) {
        const sql2 = `
          INSERT INTO solo_records (user_id, boss_extra_noteam_best_ms)
          VALUES ($1, $2)
          ON CONFLICT (user_id) DO UPDATE
          SET boss_extra_noteam_best_ms = CASE
                WHEN solo_records.boss_extra_noteam_best_ms IS NULL
                  THEN EXCLUDED.boss_extra_noteam_best_ms
                ELSE LEAST(solo_records.boss_extra_noteam_best_ms, EXCLUDED.boss_extra_noteam_best_ms)
              END,
              updated_at = NOW()
        `;
        await db.run(sql2, [userId, clearTimeMs]);
      }

      await awardSoloTitles(userId);
      return NextResponse.json({ ok: true });
    }

    // 想定外 mode
    return NextResponse.json(
      { ok: false, message: `未知の mode: ${mode}` },
      { status: 400 }
    );
  } catch (e) {
    console.error('[api/solo/save-result] error', e);
    return NextResponse.json(
      { ok: false, message: 'server_error' },
      { status: 500 }
    );
  }
}
