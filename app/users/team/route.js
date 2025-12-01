// file: app/api/user/team/route.js
import { NextResponse } from 'next/server';
import {
  getUserTeam,
  saveUserTeam,
} from '@/lib/characters.js';

// マイチームの取得
// 例: /api/user/team?user_id=1
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
    const team = getUserTeam(userId);
    return NextResponse.json({ team });
  } catch (err) {
    console.error('GET /api/user/team error', err);
    return NextResponse.json(
      { error: 'マイチームの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// マイチームの保存
// body: { user_id: number, character_ids: number[] }  // 最大5
export async function POST(request) {
  try {
    const body = await request.json();
    const userId = Number(body.user_id);
    const characterIds = body.character_ids || [];

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id が必要です' },
        { status: 400 }
      );
    }

    if (!Array.isArray(characterIds) || characterIds.length > 5) {
      return NextResponse.json(
        { error: 'character_ids は配列で、最大5体までです' },
        { status: 400 }
      );
    }

    saveUserTeam(userId, characterIds);

    const team = getUserTeam(userId);
    return NextResponse.json({ team });
  } catch (err) {
    console.error('POST /api/user/team error', err);
    return NextResponse.json(
      { error: 'マイチームの保存に失敗しました' },
      { status: 500 }
    );
  }
}
