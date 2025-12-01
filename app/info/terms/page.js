// file: app/info/terms/page.js
'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-sky-50 text-sky-900 flex flex-col items-center">
      
      {/* ヘッダー */}
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">その他 / 利用規約</h1>
        <Link
          href="/"
          className="px-3 py-1 rounded-full text-sm font-bold border border-sky-500 bg-white text-sky-700 shadow-sm"
        >
          ホームへ戻る
        </Link>
      </header>

      {/* 本文 */}
      <main className="w-full max-w-md px-4 pb-10 mt-4 space-y-6">


        {/* アカウント作成 */}
        <section className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-2">アカウントの作成について</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>X（Twitter）IDが必要です。</p>
            <p>複数アカウントの作成はご遠慮ください。</p>
            <p>
              パスワードは運営側で確認できないため、
              <span className="font-semibold">必ず忘れないように保管してください。</span>
            </p>
            <p>
              ID または パスワードを忘れた場合、
              <span className="font-bold">アカウント消去 → 再登録</span>
              が必要になります。
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 pl-4">
              <li>対戦履歴・所持キャラなどはすべてリセット</li>
              <li>投稿した問題は残るが、誰が投稿したかは確認できなくなる</li>
            </ul>
          </div>
        </section>


        {/* BAN */}
        <section className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-2">アカウントのBANについて</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>
              複数アカウント利用は、同一IPからの使用や対戦履歴の偏りなどにより
              <span className="font-semibold">AI によるサブ垢判定</span>が行われ、
              <span className="font-bold">両アカウントがBAN</span>される可能性があります。
            </p>
            <p>
              誤BANが発生した場合は管理者までご連絡ください：
              <span className="font-bold"> @onepi_bapa</span>
            </p>
          </div>
        </section>


        {/* レート対戦について */}
        <section className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-2">レート対戦について</h2>
          <div className="text-sm leading-relaxed space-y-2">

            <p>
              レート戦の開始後は、
              <span className="font-bold">ホームへ戻るボタン以外の「戻る」は絶対に使用しないでください。</span>
            </p>

            <p>
              スマホの戻るボタンなどを使用すると
              <span className="font-bold">切断扱い</span>になる場合があります。
            </p>

            <p>
              チャレンジモードも同様で、
              <span className="font-bold">戻る</span>を押すと
              <span className="font-semibold">その日のチャレンジが終了</span>
              し、解答履歴やベリー獲得が消えることがあります。
            </p>

            <p>
              相手が切断した場合、相手が3問スルーすると勝利扱いになります。
              最大で <span className="font-semibold">約3分待ち</span>になります。
            </p>

            <p className="font-bold text-red-700">
              故意的な切断は絶対にやめてください。
            </p>

            <p>
              同じプレイヤーがあまりにも多く切断した場合、管理者にご連絡ください。
            </p>
          </div>
        </section>


        {/* レート変動 */}
        <section className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-2">レート対戦のレート変動について</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>レート変動には以下が影響します：</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>基本レート計算</li>
              <li>連勝ボーナス（最大 10連勝）</li>
              <li>点数差ボーナス</li>
            </ul>
            <p>
              格上に勝つほど、連勝が多いほど、点数差が大きいほど、
              <span className="font-bold">上昇するレートが増加</span>します。
            </p>
          </div>
        </section>


      </main>
    </div>
  );
}
