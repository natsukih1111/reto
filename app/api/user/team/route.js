// file: app/api/user/team/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

/**
 * GET /api/user/team?user_id=3
 * 指定ユーザーのマイチームを取得
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdRaw = searchParams.get('user_id');

    if (!userIdRaw) {
      return NextResponse.json(
        { error: 'user_id が指定されていません' },
        { status: 400 }
      );
    }

    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId)) {
      return NextResponse.json(
        { error: 'user_id が不正です' },
        { status: 400 }
      );
    }

    const rows = await db.query(
      `
        SELECT
          ut.slot,
          ut.character_id,
          uc.stars,
          c.char_no,
          c.name,
          c.base_rarity
        FROM user_teams ut
        JOIN user_characters uc
          ON uc.user_id = ut.user_id
         AND uc.character_id = ut.character_id
        LEFT JOIN characters c
          ON c.id = ut.character_id
        WHERE ut.user_id = $1
        ORDER BY ut.slot ASC
      `,
      [userId]
    );

    const team = rows.map((row) => ({
      slot: row.slot,
      character_id: row.character_id,
      stars: row.stars ?? 1,
      char_no: row.char_no ?? row.character_id,
      name: row.name || `キャラID:${row.character_id}`,
      base_rarity: row.base_rarity ?? 1,
    }));

    return NextResponse.json({ team });
  } catch (e) {
    console.error('/api/user/team GET error:', e);
    return NextResponse.json(
      { error: 'マイチームの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/team
 * body: { user_id: number, character_ids: number[] }
 * マイチームを保存（最大5体）
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'リクエストボディが不正です' },
        { status: 400 }
      );
    }

    // user_id / userId のどちらでも受け付ける
    const userIdRaw = body.user_id ?? body.userId;
    const userId = Number(userIdRaw);

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json(
        { error: 'userId が正しく指定されていません' },
        { status: 400 }
      );
    }

    let characterIds = body.character_ids ?? body.characterIds ?? [];
    if (!Array.isArray(characterIds)) {
      return NextResponse.json(
        { error: 'character_ids は配列で指定してください' },
        { status: 400 }
      );
    }

    // 最大5体に制限 & 数値だけにしておく
    characterIds = characterIds
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n))
      .slice(0, 5);

    // いったん全部消して、先頭から入れ直す
    await db.run('DELETE FROM user_teams WHERE user_id = $1', [userId]);

    for (let i = 0; i < characterIds.length; i++) {
      const cid = characterIds[i];
      await db.run(
        `
          INSERT INTO user_teams (user_id, slot, character_id)
          VALUES ($1, $2, $3)
        `,
        [userId, i + 1, cid]
      );
    }

    // 保存後のチームを返す（GET と同じ形）
    const rows = await db.query(
      `
        SELECT
          ut.slot,
          ut.character_id,
          uc.stars,
          c.char_no,
          c.name,
          c.base_rarity
        FROM user_teams ut
        JOIN user_characters uc
          ON uc.user_id = ut.user_id
         AND uc.character_id = ut.character_id
        LEFT JOIN characters c
          ON c.id = ut.character_id
        WHERE ut.user_id = $1
        ORDER BY ut.slot ASC
      `,
      [userId]
    );

    const team = rows.map((row) => ({
      slot: row.slot,
      character_id: row.character_id,
      stars: row.stars ?? 1,
      char_no: row.char_no ?? row.character_id,
      name: row.name || `キャラID:${row.character_id}`,
      base_rarity: row.base_rarity ?? 1,
    }));

    return NextResponse.json({ ok: true, team });
  } catch (e) {
    console.error('/api/user/team POST error:', e);
    return NextResponse.json(
      { error: 'マイチームの保存に失敗しました' },
      { status: 500 }
    );
  }
}
