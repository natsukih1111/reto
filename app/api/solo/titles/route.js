// file: app/api/solo/titles/route.js
import db from '@/lib/db.js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ログイン中ユーザー取得（nb_username クッキー → users.id）
async function getCurrentUserId() {
  const cookieStore = await cookies();
  const username = cookieStore.get('nb_username')?.value;
  if (!username) return null;

  const row = await db.get(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );
  return row?.id ?? null;
}

// 指定 name の称号を 1 つ付与（すでに持っていれば何もしない）
async function ensureUserTitleByName(userId, titleName) {
  if (!userId || !titleName) return;

  const title = await db.get(
    'SELECT id FROM titles WHERE name = $1',
    [titleName]
  );
  if (!title) {
    console.warn('[solo/titles] title not found:', titleName);
    return;
  }

  const exists = await db.get(
    'SELECT 1 FROM user_titles WHERE user_id = $1 AND title_id = $2',
    [userId, title.id]
  );
  if (exists) return;

  await db.run(
    'INSERT INTO user_titles (user_id, title_id) VALUES ($1, $2)',
    [userId, title.id]
  );
}

// POST /api/solo/titles
// body: { type: 'meteor' | 'sniper' | 'boss', value, difficulty?, result?, noTeam? }
export async function POST(request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: 'not_logged_in' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { type, value, difficulty, result, noTeam } = body;

    if (!type) {
      return NextResponse.json(
        { ok: false, message: 'type is required' },
        { status: 400 }
      );
    }

    const granted = [];

    // ========= 隕石クラッシュ =========
    if (type === 'meteor') {
      const score = Number(value) || 0;

      if (score >= 50) {
        await ensureUserTitleByName(userId, '隕石ルーキー');
        granted.push('隕石ルーキー');
      }
      if (score >= 75) {
        await ensureUserTitleByName(userId, '隕石マニア');
        granted.push('隕石マニア');
      }
      if (score >= 100) {
        await ensureUserTitleByName(userId, '隕石王');
        granted.push('隕石王');
      }
    }

    // ========= 正答スナイパー =========
    if (type === 'sniper') {
      const score = Number(value) || 0;

      if (score >= 50) {
        await ensureUserTitleByName(userId, '駆け出し狙撃手');
        granted.push('駆け出し狙撃手');
      }
      if (score >= 75) {
        await ensureUserTitleByName(userId, '名狙撃手');
        granted.push('名狙撃手');
      }
      if (score >= 100) {
        await ensureUserTitleByName(userId, '狙撃の王');
        granted.push('狙撃の王');
      }
    }

    // ========= ボス討伐 =========
    if (type === 'boss') {
      // value は クリアタイム ms を想定
      const clearMs = Number(value) || 0;
      const clearSec = clearMs > 0 ? clearMs / 1000 : null;

      // 勝利以外は称号なし
      if (result === 'win') {
        // 難易度ごとのタイム条件
        if (difficulty === 'easy' && clearSec != null && clearSec <= 60) {
          await ensureUserTitleByName(userId, 'イージーエンブレム');
          granted.push('イージーエンブレム');
        }
        if (difficulty === 'normal' && clearSec != null && clearSec <= 100) {
          await ensureUserTitleByName(userId, 'ノーマルエンブレム');
          granted.push('ノーマルエンブレム');
        }
        if (difficulty === 'hard' && clearSec != null && clearSec <= 150) {
          await ensureUserTitleByName(userId, 'ハードエンブレム');
          granted.push('ハードエンブレム');
        }
        if (difficulty === 'veryhard' && clearSec != null && clearSec <= 180) {
          await ensureUserTitleByName(userId, 'ベリーハードエンブレム');
          granted.push('ベリーハードエンブレム');
        }
        if (difficulty === 'extra' && clearSec != null && clearSec <= 300) {
          await ensureUserTitleByName(userId, 'エクストラエンブレム');
          granted.push('エクストラエンブレム');
        }

        // エクストラをチーム編成なしでクリア → 修行者
        if (difficulty === 'extra' && noTeam === true) {
          await ensureUserTitleByName(userId, '修行者');
          granted.push('修行者');
        }
      }
    }

    return NextResponse.json({ ok: true, granted });
  } catch (e) {
    console.error('[api/solo/titles] error', e);
    return NextResponse.json(
      { ok: false, message: 'server_error' },
      { status: 500 }
    );
  }
}
