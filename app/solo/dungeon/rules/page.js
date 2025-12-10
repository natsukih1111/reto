// file: app/solo/dungeon/rules/page.js
'use client';

import Link from 'next/link';

export default function DungeonRulesPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold">ダンジョン（ソロ）ルール</h1>
          <Link href="/solo" className="text-teal-300 hover:text-teal-200 underline text-xs sm:text-sm">
            ソロゲームに戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:py-8 space-y-5 text-sm sm:text-base">
        <section className="rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-4 sm:px-5 sm:py-5">
          <h2 className="text-lg font-semibold mb-2 text-slate-50">基本ルール</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-100">
            <li>複数選択クイズだけを使うソロモードです。</li>
            <li>完全回答のみが正解となり、モンスターに攻撃します。</li>
            <li>選択肢をタップすると選択肢が選択され、再度タップで取り消せます。</li>
            <li>「攻撃する（🪄）」ボタンを押すと、選択結果が確定します。</li>
          </ul>
        </section>

        <section className="rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-4 sm:px-5 sm:py-5">
          <h2 className="text-lg font-semibold mb-2 text-slate-50">得点・ダメージ</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-100">
            <li>正解（すべての正解を選び、誤答を含まない）なら <strong className="text-emerald-200">+1点</strong>。</li>
            <li>間違えた場合（選び漏れ・誤答を含む・時間切れ）は、プレイヤーに
              <strong className="text-rose-200">100ダメージ</strong> が入ります。
            </li>
            <li>プレイヤーのHPは <strong>500</strong>。つまり <strong>5回ミスでゲームオーバー</strong> です。</li>
          </ul>
        </section>

        <section className="rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-4 sm:px-5 sm:py-5">
          <h2 className="text-lg font-semibold mb-2 text-slate-50">制限時間</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-100">
            <li>1問あたりの制限時間は <strong className="text-sky-200">30秒</strong> です。</li>
            <li>時間切れになった場合も「不正解扱い」となり、100ダメージを受けます。</li>
          </ul>
        </section>

        <section className="rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-4 sm:px-5 sm:py-5">
          <h2 className="text-lg font-semibold mb-2 text-slate-50">HP仕様</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-100">
            <li>HPは500でモンスターは10問正解すると倒せます。</li>
            <li>モンスターを倒すとHPが100回復します。</li>
            <li>HPが0になるまで無限に続きます。</li>
          </ul>
        </section>

        <div className="pt-2">
          <Link
            href="/solo"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm sm:text-base
              bg-slate-100 text-slate-900 font-semibold shadow hover:bg-white"
          >
            ソロゲームに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
