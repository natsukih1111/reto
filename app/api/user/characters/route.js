// file: app/api/user/characters/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';
import { addCharactersToUser, getUserCharacters } from '@/lib/characters.js';

const COST_PER_PULL = 500; // ガチャ1回の消費ベリー

// GET: /api/user/characters?user_id=123
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = Number(searchParams.get('user_id'));

  if (!userId) {
    return NextResponse.json(
      { error: 'user_id が必要です' },
      { status: 400 }
    );
  }

  try {
    console.log('GET /api/user/characters userId=', userId);
    const characters = getUserCharacters(userId);
    return NextResponse.json({ characters });
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

    const spendAndAdd = db.transaction((uid, cids, cost) => {
      const userRow = db
        .prepare('SELECT berries FROM users WHERE id = ?')
        .get(uid);

      if (!userRow) {
        throw new Error('USER_NOT_FOUND');
      }
      if (userRow.berries < cost) {
        throw new Error('NOT_ENOUGH_BERRIES');
      }

      // ベリー減算
      db.prepare(
        'UPDATE users SET berries = berries - ? WHERE id = ?'
      ).run(cost, uid);

      // ログ
      db.prepare(
        'INSERT INTO berries_log (user_id, amount, reason) VALUES (?, ?, ?)'
      ).run(uid, -cost, 'ガチャ');

      // キャラ付与（内部でさらに transaction を使ってもOK）
      addCharactersToUser(uid, cids);
    });

    try {
      spendAndAdd(userId, characterIds, totalCost);
    } catch (e) {
      console.error('spendAndAdd error', e);
      if (e.message === 'NOT_ENOUGH_BERRIES') {
        return NextResponse.json(
          { error: 'ベリーが足りません。ガチャを引くには 500 ベリー必要です。' },
          { status: 400 }
        );
      }
      if (e.message === 'USER_NOT_FOUND') {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 400 }
        );
      }
      throw e;
    }

    const characters = getUserCharacters(userId);
    const userAfter = db
      .prepare('SELECT berries FROM users WHERE id = ?')
      .get(userId);

    return NextResponse.json({
      characters,
      berries: userAfter?.berries ?? null,
    });
  } catch (err) {
    console.error('POST /api/user/characters error', err);
    return NextResponse.json(
      { error: 'キャラ登録に失敗しました' },
      { status: 500 }
    );
  }
}
