// file: app/info/berries/page.js
'use client';

import Link from 'next/link';

export default function BerriesInfoPage() {
  return (
    <div className="min-h-screen bg-sky-50 text-sky-900 flex flex-col items-center">
      {/* ヘッダー */}
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">ベリーの獲得方法</h1>
        {/* ホームに戻るボタン（グローバルナビ） */}
        <Link
          href="/"
          className="px-3 py-1 rounded-full text-sm font-bold border border-sky-500 bg-white text-sky-700 shadow-sm"
        >
          ホームへ戻る
        </Link>
      </header>

      {/* 本文 */}
      <main className="w-full max-w-md px-4 pb-10 mt-4 space-y-4">
        <section className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-2">基本的なベリー獲得</h2>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>
              <span className="font-semibold">問題投稿：</span>1問投稿ごとに
              <span className="font-bold"> 100 ベリー</span>
            </li>
            <li>
              <span className="font-semibold">投稿した問題が承認：</span>
              <span className="font-bold"> 200 ベリー</span> 追加
            </li>
            <li>
              <span className="font-semibold">公認作問者が問題投稿：</span>
              承認を飛ばして即承認扱いで
              <span className="font-bold"> 1問につき 300 ベリー</span>
            </li>
          </ul>
        </section>

        <section className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-2">対戦・チャレンジでの獲得</h2>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>
              <span className="font-semibold">レート戦で勝利：</span>
              <span className="font-bold"> 300 ベリー</span>
            </li>
            <li>
              <span className="font-semibold">AI なつに勝利：</span>
              <span className="font-bold"> 200 ベリー</span>
            </li>
            <li>
              <span className="font-semibold">チャレンジモード：</span>
              1問正解ごとに
              <span className="font-bold"> 50 ベリー</span>
            </li>
          </ul>
        </section>

        <section className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-2">ランキング報酬</h2>
          <p className="text-sm mb-2">
            レート戦・チャレンジモードそれぞれで、シーズン終了時のランキングに応じてベリーがもらえます。
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-sky-200">
                <th className="py-1 text-left">順位</th>
                <th className="py-1 text-right">報酬ベリー</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sky-50">
                <td className="py-1">1位</td>
                <td className="py-1 text-right font-semibold">10,000</td>
              </tr>
              <tr className="border-b border-sky-50">
                <td className="py-1">2位</td>
                <td className="py-1 text-right font-semibold">5,000</td>
              </tr>
              <tr className="border-b border-sky-50">
                <td className="py-1">3位</td>
                <td className="py-1 text-right font-semibold">4,000</td>
              </tr>
              <tr className="border-b border-sky-50">
                <td className="py-1">4位</td>
                <td className="py-1 text-right font-semibold">3,000</td>
              </tr>
              <tr className="border-b border-sky-50">
                <td className="py-1">5位</td>
                <td className="py-1 text-right font-semibold">2,500</td>
              </tr>
              <tr className="border-b border-sky-50">
                <td className="py-1">6位</td>
                <td className="py-1 text-right font-semibold">2,000</td>
              </tr>
              <tr className="border-b border-sky-50">
                <td className="py-1">7位</td>
                <td className="py-1 text-right font-semibold">1,500</td>
              </tr>
              <tr className="border-b border-sky-50">
                <td className="py-1">8位</td>
                <td className="py-1 text-right font-semibold">1,000</td>
              </tr>
              <tr className="border-b border-sky-50">
                <td className="py-1">9位</td>
                <td className="py-1 text-right font-semibold">500</td>
              </tr>
              <tr>
                <td className="py-1">10位</td>
                <td className="py-1 text-right font-semibold">500</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs mt-2 text-sky-800">
            ※レート戦とチャレンジモードのランキング報酬は、両方とも受け取り可能です。
          </p>
        </section>
      </main>
    </div>
  );
}
