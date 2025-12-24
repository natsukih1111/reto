// file: app/solo/memory/review/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QuestionReviewAndReport from '@/components/QuestionReviewAndReport';

export default function MemoryReviewPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('memory_last_result');
      if (raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
  }, []);

  const resultLabel = useMemo(() => {
    if (!data) return '';
    if (data.cleared) return 'クリア！';
    if (data.failed) return '失敗…';
    return '終了';
  }, [data]);

  // ★ 念のため重複除去（question_id単位）
  const uniqueQuestions = useMemo(() => {
    const src = Array.isArray(data?.history) ? data.history : [];
    const m = new Map();
    for (const q of src) {
      const key = String(q?.question_id ?? '');
      if (!key) continue;
      if (m.has(key)) continue;
      m.set(key, q);
    }
    return Array.from(m.values());
  }, [data]);

  if (!data) {
    return (
      <main className="min-h-screen bg-violet-950 text-violet-50 p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-xl font-extrabold">振り返り</h1>
          <p className="text-sm text-violet-50/80">結果データがありません。先にプレイしてね。</p>
          <Link className="underline text-violet-200" href="/solo/memory">
            ルールへ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-violet-950 text-violet-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">神経衰弱 結果</h1>
          <Link className="underline text-violet-200" href="/solo/memory">
            もう一回
          </Link>
        </header>

        <section className="bg-violet-900/30 border border-violet-700 rounded-2xl p-4">
          <div className="text-sm space-y-1">
            <div>
              結果：<b>{resultLabel}</b>
            </div>
            <div>
              ペア：<b className="text-violet-200">{data.pairs}</b>/10
            </div>
            <div>
              ミス：<b className="text-rose-200">{data.miss}</b>/10
            </div>
            <div className="text-[12px] opacity-85 mt-2">
              振り返り対象：<b>{uniqueQuestions.length}</b> 件（{data.cleared ? '使用20枚すべて' : 'めくった分のみ'}）
            </div>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              className="px-3 py-2 rounded-full bg-violet-300 text-violet-950 font-extrabold"
              href="/solo/memory/play"
            >
              もう一回（同条件）
            </Link>
            <Link
              className="px-3 py-2 rounded-full border border-violet-600 text-violet-50 font-extrabold"
              href="/solo"
            >
              ソロへ戻る
            </Link>
          </div>
        </section>

        <section className="bg-violet-900/20 border border-violet-700 rounded-2xl p-3">
          <div className="text-sm font-bold mb-2">問題の振り返り＆不備報告（重複なし）</div>
          <QuestionReviewAndReport questions={uniqueQuestions} sourceMode="solo-memory" />
        </section>
      </div>
    </main>
  );
}
