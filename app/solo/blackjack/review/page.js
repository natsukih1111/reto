// file: app/solo/blackjack/review/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QuestionReviewAndReport from '@/components/QuestionReviewAndReport';

export default function BlackjackReviewPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('blackjack_last_result');
      if (raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen bg-emerald-950 text-emerald-50 p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-xl font-extrabold">振り返り（ブラックジャック）</h1>
          <p className="text-sm text-emerald-50/80">結果データがありません。先にプレイしてね。</p>
          <Link className="underline text-emerald-200" href="/solo/blackjack">
            ルールへ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">ブラックジャック 結果</h1>
          <Link className="underline text-emerald-200" href="/solo/blackjack/play">
            もう一回（所持金1000で）
          </Link>
        </header>

        <section className="bg-emerald-900/30 border border-emerald-700 rounded-2xl p-4">
          <div className="text-sm space-y-1">
            <div>賭け（開始時）：<b>{data.bet}</b></div>
            <div>所持金（終了時・表示用）：<b className="text-emerald-200">{data.bankroll}</b></div>
            <div>自己ベスト：<b>{data.bestBankroll}</b></div>
            <div className="opacity-80 text-xs">※ 数字を見せないゲームなので、結果の内訳はここでは出しません</div>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              className="px-3 py-2 rounded-full bg-emerald-400 text-emerald-950 font-extrabold"
              href="/solo/blackjack/play"
            >
              再戦
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
            sourceMode="solo-blackjack"
          />
        </section>
      </div>
    </main>
  );
}
