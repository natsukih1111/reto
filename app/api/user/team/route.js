// file: app/api/user/team/route.js
import { NextResponse } from 'next/server';
import { getUserTeam, saveUserTeam } from '@/lib/characters.js';

// GET: /api/user/team?user_id=123
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
    console.log('GET /api/user/team userId=', userId);
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

// POST: マイチーム保存
// body: { user_id: number, character_ids: number[] }  // 最大5体
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

    console.log('POST /api/user/team userId=', userId, 'team=', characterIds);
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
