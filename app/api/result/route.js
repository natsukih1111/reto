// file: app/api/rate/result/route.js
import { NextResponse } from 'next/server';
import { finalizeRateMatch } from '@/lib/rating.js';
import { addBerriesByUserId } from '@/lib/berries.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      user1Id,
      user2Id,
      score1,
      score2,
      totalTime1,
      totalTime2,
      roomId,
    } = body;

    // ★ レート更新 & 戦績更新などは全部ここに閉じ込める
    const result = finalizeRateMatch({
      user1Id,
      user2Id,
      score1,
      score2,
      totalTime1,
      totalTime2,
      roomId,
    });

    // result から勝者を拾って 300 ベリー付与
    // finalizeRateMatch から { winnerId, loserId, isDraw, ... } を返す前提
    if (result && result.winnerId && !result.isDraw) {
      addBerriesByUserId(result.winnerId, 300, 'レート戦勝利ボーナス');
    }

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'レート更新に失敗しました' },
      { status: 500 }
    );
  }
}
