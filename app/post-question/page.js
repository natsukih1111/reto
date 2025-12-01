// file: app/post-question/page.js
'use client';

import Link from 'next/link';

export default function PostQuestionPage() {
  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center text-sky-900">
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-widest text-sky-900">
          新しく問題を投稿
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
            問題投稿フォーム（準備中）
          </h2>
          <p className="text-sm text-sky-800 mb-2">
            ここに問題文や選択肢を入力するフォームを作っていきます。
          </p>
          <p className="text-xs text-sky-700">
            承認されるとベリーがもらえる仕組み（仕様9）と連携していきましょう。
          </p>
        </section>
      </main>
    </div>
  );
}
