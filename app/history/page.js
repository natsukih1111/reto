// file: app/history/page.js
'use client';

import Link from 'next/link';

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center text-sky-900">
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-widest text-sky-900">
          対戦履歴
        </h1>
        <Link
          href="/mypage"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-sm font-bold text-sky-700 bg-white shadow-sm"
        >
          マイページへ
        </Link>
      </header>

      <main className="w-full max-w-md px-4 pb-10 mt-4 space-y-4">
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-2 text-sky-700">
            対戦履歴一覧（準備中）
          </h2>
          <p className="text-sm text-sky-800 mb-2">
            ここに過去のレート戦・AIなつ戦の履歴を表示する予定です。
          </p>
          <p className="text-xs text-sky-700">
            あとで「いつ」「誰と」「何対何で」などをテーブル表示にしていきましょう。
          </p>
        </section>
      </main>
    </div>
  );
}
