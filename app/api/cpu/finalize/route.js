// file: app/api/cpu/finalize/route.js
import { NextResponse } from 'next/server';
import { finalizeCpuRateMatch } from '@/lib/rating.js';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const userId = body.userId;
    const cpu = body.cpu || {};
    const scoreUser = Number(body.scoreUser) || 0;
    const scoreCpu = Number(body.scoreCpu) || 0;
    const totalTimeUser = Number(body.totalTimeUser) || 0;
    const totalTimeCpu = Number(body.totalTimeCpu) || 0;
    const roomId = String(body.roomId || '');

    if (!userId) {
      return NextResponse.json({ error: 'userId が必要です' }, { status: 400 });
    }
    if (!Number.isFinite(Number(cpu.rating))) {
      return NextResponse.json({ error: 'cpu.rating が必要です' }, { status: 400 });
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

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error('[cpu/finalize] error', e);
    return NextResponse.json({ error: 'CPU戦の確定に失敗しました' }, { status: 500 });
  }
}
