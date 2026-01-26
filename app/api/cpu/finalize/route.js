// file: app/api/cpu/finalize/route.js
import { NextResponse } from 'next/server';
import { finalizeCpuRateMatch } from '@/lib/rating.js';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const userId = body.userId;
    const cpu = body.cpu || {};
    const roomId = String(body.roomId || '');

    // ★追加：切断/離脱（没収試合）
    const forfeit = Boolean(body.forfeit);

    let scoreUser = Number(body.scoreUser) || 0;
    let scoreCpu = Number(body.scoreCpu) || 0;
    let totalTimeUser = Number(body.totalTimeUser) || 0;
    let totalTimeCpu = Number(body.totalTimeCpu) || 0;

    if (!userId) {
      return NextResponse.json({ error: 'userId が必要です' }, { status: 400 });
    }
    if (!Number.isFinite(Number(cpu.rating))) {
      return NextResponse.json({ error: 'cpu.rating が必要です' }, { status: 400 });
    }

    // ★切断は「確実に負け」になるようにスコアを寄せる
    // 既存の finalizeCpuRateMatch / calcRatingWithMargin を壊さないため、ここで整形する
    if (forfeit) {
      scoreUser = 0;
      scoreCpu = Math.max(1, scoreCpu || 1);
      // 時間はそのままでOK（必要なら penalty を加える運用も可）
    }

    const result = await finalizeCpuRateMatch({
      userId,
      cpuName: String(cpu.name || 'CPU'),
      cpuRating: Number(cpu.rating),
      scoreUser,
      scoreCpu,
      totalTimeUser,
      totalTimeCpu,
      roomId,
    });

    return NextResponse.json({ ok: true, result, forfeit });
  } catch (e) {
    console.error('[cpu/finalize] error', e);
    return NextResponse.json({ error: 'CPU戦の確定に失敗しました' }, { status: 500 });
  }
}
