// file: app/multi/meteor/result/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QuestionReviewAndReport from '@/components/QuestionReviewAndReport';

export default function MultiMeteorResultPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('meteor_multi_result');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setData(parsed);
    } catch {
      setData(null);
    }
  }, []);

  const winnerSide = data?.winnerSide ?? null;
  const youSide = data?.youSide ?? null;

  const youName = data?.players?.[youSide]?.name || '自分';
  const oppSide = youSide === 'A' ? 'B' : 'A';
  const oppName = data?.players?.[oppSide]?.name || '相手';

  const outcome =
    winnerSide && youSide
      ? winnerSide === youSide
        ? 'win'
        : 'lose'
      : 'draw';

  // QuestionReviewAndReport 互換に変換
  // 期待：[{ question_id, text, userAnswerText, correctAnswerText }]
  const questions = Array.isArray(data?.history)
    ? data.history.map((h) => ({
        question_id: h.question_id ?? null,
        text: h.text ?? '',
        userAnswerText: `${h.side === youSide ? '自分' : '相手'}: ${h.userAnswerText ?? ''}`,
        correctAnswerText: h.correctAnswerText ?? '',
      }))
    : [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h1 className="text-lg font-extrabold">マルチ隕石クラッシュ 結果</h1>
          <p className="text-sm text-slate-200 mt-1">
            {youName} vs {oppName}
          </p>
          <p className="text-2xl font-extrabold mt-3">
            {outcome === 'win' ? '勝利！' : outcome === 'lose' ? '敗北…' : '引き分け'}
          </p>

          <div className="mt-4 flex gap-3 flex-wrap">
            <Link href="/" className="px-4 py-2 rounded-full bg-sky-500 text-white text-sm font-semibold">
              ホームへ
            </Link>
            <Link href="/multi/meteor" className="px-4 py-2 rounded-full bg-slate-800 border border-slate-600 text-slate-100 text-sm font-semibold">
              もう一度（マルチ隕石）
            </Link>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-slate-100 mb-2">問題の振り返り / 不備報告</h2>
          <QuestionReviewAndReport questions={questions} sourceMode="multi-meteor" />
        </div>
      </div>
    </main>
  );
}
