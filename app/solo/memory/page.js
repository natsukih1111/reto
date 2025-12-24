// file: app/solo/memory/page.js
'use client';

import Link from 'next/link';

export default function MemoryRulePage() {
  return (
    <main className="min-h-screen bg-violet-950 text-violet-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold">🧠 神経衰弱（数字）</h1>
            <p className="text-xs text-violet-100/80 mt-1">スピード同様：問題→数字（桁）を内側で持つ</p>
          </div>
          <Link href="/solo/number" className="text-xs font-bold text-violet-200 underline">
            戻る
          </Link>
        </header>

        <section className="rounded-2xl border border-violet-400/30 bg-violet-900/20 p-4 space-y-2">
          <div className="text-sm font-extrabold">ルール</div>
          <ul className="text-xs text-violet-50/90 space-y-1 list-disc pl-5">
            <li>カードは全部で <b>20枚（10ペア）</b>。</li>
            <li>カードをめくると「問題文＋（◯の位）」が見える。</li>
            <li><b>同じ数字（0〜9）</b>のペアを当てたら成功。</li>
            <li>間違い（ミス）が <b>10回</b> になったら失敗。</li>
            <li>終了後に「振り返り＆不備報告」ができる（フルの答えも出る）。</li>
          </ul>
        </section>

        <Link
          href="/solo/memory/play"
          className="block text-center px-4 py-3 rounded-full bg-violet-300 text-violet-950 font-extrabold"
        >
          スタート
        </Link>

        <div className="text-center">
          <Link href="/" className="inline-block text-xs font-bold text-violet-200 underline">
            ホームへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
