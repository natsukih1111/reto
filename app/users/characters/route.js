// file: app/api/user/characters/route.js
import { NextResponse } from 'next/server';
import {
  addCharactersToUser,
  getUserCharacters,
} from '@/lib/characters.js';

// 図鑑取得（GET）
// 例: /api/user/characters?user_id=1
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

// ガチャ結果でキャラ登録（POST）
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

    addCharactersToUser(userId, characterIds);

    // 登録後の最新図鑑を返す
    const characters = getUserCharacters(userId);
    return NextResponse.json({ characters });
  } catch (err) {
    console.error('POST /api/user/characters error', err);
    return NextResponse.json(
      { error: 'キャラ登録に失敗しました' },
      { status: 500 }
    );
  }
}
