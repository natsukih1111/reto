// file: app/solo/blackjack/page.js
'use client';

import Link from 'next/link';

export default function BlackjackRulePage() {
  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">ブラックジャック（問題カード）</h1>
          <Link className="underline text-emerald-200" href="/solo">
            ソロへ戻る
          </Link>
        </header>

        <section className="bg-emerald-900/30 border border-emerald-700 rounded-2xl p-4 space-y-2">
          <div className="text-sm text-emerald-50/90 leading-relaxed">
            <p className="font-extrabold">ルール</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>所持金はページに来るたび <b>1000</b> にリセット（自己ベストだけ記録）。</li>
              <li>賭け金は <b>最低100</b>、<b>100ごと</b>に増やせます。</li>
              <li>カードは数字ではなく <b>問題文</b> が表示され、<b>点数は見えません</b>（内部で判定）。</li>
              <li>21を超えず、ディーラーより高ければ勝ち。同点は引き分け。</li>
              <li>ディーラーは <b>16以下でヒット / 17以上でスタンド</b>（ソフト17もスタンド）。</li>
            </ul>

            <p className="font-extrabold mt-3">点数（内部）</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>A</b>：1 または 11（内部で最適化）</li>
              <li><b>0</b>：10</li>
              <li><b>2〜9</b>：数字通り</li>
              <li>※この実装では「digit=1」をA扱いにしています（表示は問題文なので見えません）。</li>
            </ul>

            <p className="font-extrabold mt-3">アクション</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>ヒット</b>：1枚引く</li>
              <li><b>スタンド</b>：引かずに勝負</li>
              <li><b>ダブル</b>：賭け金2倍で3枚目を引いて終了（その手札は3枚まで）</li>
              <li><b>スプリット</b>：最初の2枚が同じdigitの時に分割（同額を追加で賭ける）</li>
              <li><b>ブラックジャック</b>（A+10相当）は <b>1.5倍払い</b>（即勝ちではなく、スタンド等で決着まで保留）</li>
            </ul>
          </div>
        </section>

        <div className="flex gap-2 flex-wrap">
          <Link
            className="px-4 py-3 rounded-full bg-emerald-400 text-emerald-950 font-extrabold"
            href="/solo/blackjack/play"
          >
            プレイ開始
          </Link>
          <Link
            className="px-4 py-3 rounded-full border border-emerald-600 text-emerald-50 font-extrabold"
            href="/solo/blackjack/review"
          >
            前回の振り返り
          </Link>
        </div>

        <p className="text-xs text-emerald-50/70">
          ※ 不備報告は「振り返り」画面から行えます（スピードと同じコンポーネント使用）
        </p>
      </div>
    </main>
  );
}
