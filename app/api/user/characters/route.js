// file: app/api/user/characters/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

const COST_PER_PULL = 500; // ガチャ1回の消費ベリー

// GET: /api/user/characters?user_id=123
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('user_id'));

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id が必要です' },
        { status: 400 }
      );
    }

    console.log('GET /api/user/characters userId=', userId);

    // 所持キャラ一覧（マスタ情報とJOIN）
    const characters = await db.query(
      `
        SELECT
          uc.id,
          uc.user_id,
          uc.character_id,
          uc.stars,
          uc.copies,
          uc.created_at,
          uc.updated_at,
          c.char_no,
          c.name,
          c.base_rarity
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.id
        WHERE uc.user_id = $1
        ORDER BY c.char_no ASC
      `,
      [userId]
    );

    return NextResponse.json({ characters }, { status: 200 });
  } catch (err) {
    console.error('GET /api/user/characters error', err);
    return NextResponse.json(
      { error: 'キャラ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: ガチャ結果でキャラ登録 + ベリー消費
// body: { user_id: number, character_ids: number[] }
export async function POST(request) {
  try {
    const body = await request.json();
    const userId = Number(body.user_id);
    const characterIds = body.character_ids;

    if (!userId || !Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json(
        { error: 'user_id と character_ids が必要です' },
        { status: 400 }
      );
    }

    console.log(
      'POST /api/user/characters userId=',
      userId,
      'characters=',
      characterIds
    );

    const totalCost = COST_PER_PULL * characterIds.length;

    // 1) ユーザーのベリー残高チェック
    const userRow = await db.get(
      'SELECT berries FROM users WHERE id = $1',
      [userId]
    );

    if (!userRow) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 400 }
      );
    }
    if (userRow.berries < totalCost) {
      return NextResponse.json(
        {
          error:
            'ベリーが足りません。ガチャを引くには 500 ベリー必要です。',
        },
        { status: 400 }
      );
    }

    // 2) ベリー減算 & ログ記録
    await db.run(
      'UPDATE users SET berries = berries - $1 WHERE id = $2',
      [totalCost, userId]
    );

    await db.run(
      'INSERT INTO berries_log (user_id, amount, reason) VALUES ($1, $2, $3)',
      [userId, -totalCost, 'ガチャ']
    );

    // 3) キャラ付与（被りなら stars+1, copies+1 / 最大stars11）
    for (const charId of characterIds) {
      const existing = await db.get(
        `
          SELECT id, stars, copies
          FROM user_characters
          WHERE user_id = $1 AND character_id = $2
        `,
        [userId, charId]
      );

      if (!existing) {
        // 初取得
        await db.run(
          `
            INSERT INTO user_characters
              (user_id, character_id, stars, copies)
            VALUES ($1, $2, 1, 1)
          `,
          [userId, charId]
        );
      } else {
        const newStars = Math.min((existing.stars ?? 1) + 1, 11);
        const newCopies = (existing.copies ?? 1) + 1;

        await db.run(
          `
            UPDATE user_characters
            SET stars = $1, copies = $2, updated_at = NOW()
            WHERE id = $3
          `,
          [newStars, newCopies, existing.id]
        );
      }
    }

    // 4) 最新のキャラ一覧 + ベリー残高を返す
    const characters = await db.query(
      `
        SELECT
          uc.id,
          uc.user_id,
          uc.character_id,
          uc.stars,
          uc.copies,
          uc.created_at,
          uc.updated_at,
          c.char_no,
          c.name,
          c.base_rarity
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.id
        WHERE uc.user_id = $1
        ORDER BY c.char_no ASC
      `,
      [userId]
    );

    const userAfter = await db.get(
      'SELECT berries FROM users WHERE id = $1',
      [userId]
    );

    return NextResponse.json(
      {
        characters,
        berries: userAfter?.berries ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('POST /api/user/characters error', err);
    return NextResponse.json(
      { error: 'キャラ登録に失敗しました' },
      { status: 500 }
    );
  }
}
