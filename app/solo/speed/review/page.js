// file: app/solo/speed/review/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QuestionReviewAndReport from '@/components/QuestionReviewAndReport';

export default function SpeedReviewPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('speed_last_result');
      if (raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
  }, []);

  const diffLabel = useMemo(() => {
    const d = data?.diff || 'normal';
    if (d === 'weak') return '弱い';
    if (d === 'hard') return '強い';
    if (d === 'extra') return 'EXTRA';
    return '普通';
  }, [data]);

  if (!data) {
    return (
      <main className="min-h-screen bg-emerald-950 text-emerald-50 p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-xl font-extrabold">振り返り</h1>
          <p className="text-sm text-emerald-50/80">結果データがありません。先にプレイしてね。</p>
          <Link className="underline text-emerald-200" href="/solo/speed">ルールへ</Link>
        </div>
      </main>
    );
  }

  const win =
    data.playerScore === data.cpuScore ? '引き分け' :
    data.playerScore > data.cpuScore ? 'あなたの勝ち' : 'CPUの勝ち';

  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">DIGIT SPEED 結果</h1>
          <Link className="underline text-emerald-200" href="/solo/speed">
            もう一回
          </Link>
        </header>

        <section className="bg-emerald-900/30 border border-emerald-700 rounded-2xl p-4">
          <div className="text-sm space-y-1">
            <div>難易度：<b>{diffLabel}</b></div>
            <div>あなた：<b className="text-emerald-200">{data.playerScore}</b></div>
            <div>CPU：<b className="text-rose-200">{data.cpuScore}</b></div>
            <div>結果：<b>{win}</b></div>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              className="px-3 py-2 rounded-full bg-emerald-400 text-emerald-950 font-extrabold"
              href={`/solo/speed/play?diff=${encodeURIComponent(data.diff || 'normal')}`}
            >
              同じ難易度で再戦
            </Link>
            <Link className="px-3 py-2 rounded-full border border-emerald-600 text-emerald-50 font-extrabold" href="/solo">
              ソロへ戻る
            </Link>
          </div>
        </section>

        <section className="bg-emerald-900/20 border border-emerald-700 rounded-2xl p-3">
          <div className="text-sm font-bold mb-2">問題の振り返り＆不備報告</div>
          <QuestionReviewAndReport
            questions={Array.isArray(data.history) ? data.history : []}
            sourceMode="solo-speed"
          />
        </section>
      </div>
    </main>
  );
}
