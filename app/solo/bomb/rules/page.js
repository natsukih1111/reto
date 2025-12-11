// file: app/solo/bomb/rules/page.js
'use client';

import Link from 'next/link';

export default function BombRulesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-md mx-auto px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold">
            💣 爆弾解除（並び替え）ルール
          </h1>
          <Link
            href="/solo"
            className="text-xs font-bold text-sky-700 underline hover:text-sky-500"
          >
            ソロメニューへ戻る
          </Link>
        </header>

        <section className="text-[13px] space-y-3">
          <p>
            並び替え問題だけを使った爆弾解除モードです。
            正しい順でコードを切って、できるだけ多くの爆弾を解除しましょう。
          </p>

          <div>
            <h2 className="font-bold text-sm mb-1">◆ 基本ルール</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>画面上部に並び替え問題が表示されます。</li>
              <li>
                画面中央の爆弾にはカウントダウンが表示されています（1問40秒）。
              </li>
              <li>
                爆弾の周りに並び替えの選択肢が並びます。正しい順に対応するコードをタップして切ってください。
              </li>
              <li>
                正しい順だけをすべて切ると、その爆弾は解除成功です。
              </li>
              <li>
                1本でも間違ったコードを切るか、時間切れになると即爆発します。
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-sm mb-1">◆ ライフ・ゲームオーバー</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>ライフは3からスタートします。</li>
              <li>爆弾が爆発するたびにライフが1減ります。</li>
              <li>ライフが0になるとゲームオーバーです。</li>
              <li>
                5個の爆弾を解除するごとにライフが1回復します（最大3まで）。
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-sm mb-1">◆ 記録・不備報告</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                解除した爆弾の数が、このブラウザでの「自己ベスト」として保存されます。
              </li>
              <li>
                プレイ終了後は、解いた問題を一覧で振り返ることができます。
              </li>
              <li>
                問題に不備があった場合は、不備報告ボタンからコメント付きで報告できます。
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <Link
              href="/solo/bomb"
              className="inline-block px-4 py-2 rounded-full bg-fuchsia-500 text-white text-xs font-bold hover:bg-fuchsia-400"
            >
              爆弾解除をプレイする
            </Link>
          </div>

          <div className="mt-4">
            <Link
              href="/"
              className="text-xs underline text-sky-700 hover:text-sky-500"
            >
              ホームへ戻る
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
