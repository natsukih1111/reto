// file: app/api/titles/check/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db.js';

// 数値 or null に安全に変換
function toIntOrNull(v, def = null) {
  if (v === null || v === undefined) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    if (!username) {
      // ログインしてないなら何もしない（エラーにはしない）
      return NextResponse.json({ ok: false, reason: 'not_logged_in' });
    }

    const user = await db.get(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (!user) {
      return NextResponse.json({ ok: false, reason: 'user_not_found' });
    }

    const userId = user.id;

    const body = await request.json().catch(() => ({}));
    const meteorScore = toIntOrNull(body.meteorScore, null);     // 隕石クラッシュ今回スコア
    const sniperScore = toIntOrNull(body.sniperScore, null);     // 正答スナイパー今回スコア
    const challengeScore = toIntOrNull(body.challengeScore, null); // チャレンジ今回スコア（将来用）

    const bossResult = body.bossResult || null;
    const bossDifficulty = bossResult?.difficulty || null; // 'easy' | 'normal' | ...
    const bossClearTimeMs = toIntOrNull(bossResult?.clearTimeMs, null);
    const bossNoTeam = !!bossResult?.noTeam;

    // ---- user_solo_stats を取得 or 作成 ----
    let stats = await db.get(
      'SELECT * FROM user_solo_stats WHERE user_id = $1',
      [userId]
    );

    if (!stats) {
      await db.run('INSERT INTO user_solo_stats (user_id) VALUES ($1)', [userId]);
      stats = await db.get(
        'SELECT * FROM user_solo_stats WHERE user_id = $1',
        [userId]
      );
    }

    // 既存ベスト
    let meteorBest = toIntOrNull(stats.meteor_best, 0);
    let sniperBest = toIntOrNull(stats.sniper_best, 0);
    let challengeBest = toIntOrNull(stats.challenge_best, 0);

    let bossEasyBest = toIntOrNull(stats.boss_easy_best_ms, null);
    let bossNormalBest = toIntOrNull(stats.boss_normal_best_ms, null);
    let bossHardBest = toIntOrNull(stats.boss_hard_best_ms, null);
    let bossVeryhardBest = toIntOrNull(stats.boss_veryhard_best_ms, null);
    let bossExtraBest = toIntOrNull(stats.boss_extra_best_ms, null);

    // ---- 今回スコアでベスト更新（あれば） ----

    if (meteorScore !== null && meteorScore > meteorBest) {
      meteorBest = meteorScore;
    }
    if (sniperScore !== null && sniperScore > sniperBest) {
      sniperBest = sniperScore;
    }
    if (challengeScore !== null && challengeScore > challengeBest) {
      challengeBest = challengeScore;
    }

    if (bossClearTimeMs !== null && bossDifficulty) {
      if (bossDifficulty === 'easy') {
        bossEasyBest =
          bossEasyBest === null
            ? bossClearTimeMs
            : Math.min(bossEasyBest, bossClearTimeMs);
      } else if (bossDifficulty === 'normal') {
        bossNormalBest =
          bossNormalBest === null
            ? bossClearTimeMs
            : Math.min(bossNormalBest, bossClearTimeMs);
      } else if (bossDifficulty === 'hard') {
        bossHardBest =
          bossHardBest === null
            ? bossClearTimeMs
            : Math.min(bossHardBest, bossClearTimeMs);
      } else if (bossDifficulty === 'veryhard') {
        bossVeryhardBest =
          bossVeryhardBest === null
            ? bossClearTimeMs
            : Math.min(bossVeryhardBest, bossClearTimeMs);
      } else if (bossDifficulty === 'extra') {
        bossExtraBest =
          bossExtraBest === null
            ? bossClearTimeMs
            : Math.min(bossExtraBest, bossClearTimeMs);
      }
    }

    // ベスト値を1回の UPDATE で保存
    await db.run(
      `
      UPDATE user_solo_stats
      SET
        meteor_best = $1,
        sniper_best = $2,
        challenge_best = $3,
        boss_easy_best_ms = $4,
        boss_normal_best_ms = $5,
        boss_hard_best_ms = $6,
        boss_veryhard_best_ms = $7,
        boss_extra_best_ms = $8,
        updated_at = now()
      WHERE user_id = $9
      `,
      [
        meteorBest,
        sniperBest,
        challengeBest,
        bossEasyBest,
        bossNormalBest,
        bossHardBest,
        bossVeryhardBest,
        bossExtraBest,
        userId,
      ]
    );

    // ---- 称号の解禁条件判定 ----
    const codesToUnlock = new Set();

    // 隕石クラッシュ
    if (meteorBest >= 50) codesToUnlock.add('meteor_50');
    if (meteorBest >= 75) codesToUnlock.add('meteor_75');
    if (meteorBest >= 100) codesToUnlock.add('meteor_100');

    // 正答スナイパー
    if (sniperBest >= 50) codesToUnlock.add('sniper_50');
    if (sniperBest >= 75) codesToUnlock.add('sniper_75');
    if (sniperBest >= 100) codesToUnlock.add('sniper_100');

    // ボス討伐（タイム系）
    if (bossEasyBest !== null && bossEasyBest <= 60 * 1000) {
      codesToUnlock.add('boss_easy_60');
    }
    if (bossNormalBest !== null && bossNormalBest <= 100 * 1000) {
      codesToUnlock.add('boss_normal_100');
    }
    if (bossHardBest !== null && bossHardBest <= 150 * 1000) {
      codesToUnlock.add('boss_hard_150');
    }
    if (bossVeryhardBest !== null && bossVeryhardBest <= 180 * 1000) {
      codesToUnlock.add('boss_vh_180');
    }
    if (bossExtraBest !== null && bossExtraBest <= 300 * 1000) {
      codesToUnlock.add('boss_extra_300');
    }

    // ボス討伐エクストラ チームなし（時間条件なし）
    if (
      bossDifficulty === 'extra' &&
      bossClearTimeMs !== null &&
      bossNoTeam
    ) {
      codesToUnlock.add('boss_extra_noteam');
    }

    // チャレンジモード（将来用）
    if (challengeBest >= 10) codesToUnlock.add('challenge_10');
    if (challengeBest >= 30) codesToUnlock.add('challenge_30');
    if (challengeBest >= 50) codesToUnlock.add('challenge_50');

    // キャラ図鑑の所持数（毎回集計）
    const zRow = await db.get(
      'SELECT COUNT(*) AS cnt FROM owned_characters WHERE user_id = $1',
      [userId]
    );
    const zukanCount = toIntOrNull(zRow?.cnt, 0);

    if (zukanCount >= 100) codesToUnlock.add('zukan_100');
    if (zukanCount >= 300) codesToUnlock.add('zukan_300');
    if (zukanCount >= 500) codesToUnlock.add('zukan_500');

    if (codesToUnlock.size === 0) {
      // 解禁なし
      return NextResponse.json({ ok: true, newlyUnlocked: [] });
    }

    const codeList = Array.from(codesToUnlock);

    // 該当する titles を取得
    const titleRows = await db.query(
      `
      SELECT
        id,
        code,
        name,
        image_path AS image_url
      FROM titles
      WHERE code = ANY($1::text[])
      `,
      [codeList]
    );

    if (!titleRows || titleRows.length === 0) {
      return NextResponse.json({ ok: true, newlyUnlocked: [] });
    }

    // すでに所持している称号
    const ownedRows = await db.query(
      'SELECT title_id FROM user_titles WHERE user_id = $1',
      [userId]
    );
    const ownedSet = new Set(
      (ownedRows || []).map((r) => String(r.title_id))
    );

    const newlyUnlocked = [];

    // まだ持っていない称号だけ user_titles に追加
    for (const row of titleRows) {
      const idStr = String(row.id);
      if (ownedSet.has(idStr)) continue;

      await db.run(
        `
        INSERT INTO user_titles (user_id, title_id)
        SELECT $1, $2
        WHERE NOT EXISTS (
          SELECT 1 FROM user_titles
          WHERE user_id = $1 AND title_id = $2
        )
        `,
        [userId, row.id]
      );

      newlyUnlocked.push({
        id: row.id,
        code: row.code,
        name: row.name,
        image_url: row.image_url,
      });
    }

    return NextResponse.json({ ok: true, newlyUnlocked });
  } catch (e) {
    console.error('[api/titles/check] error', e);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}
