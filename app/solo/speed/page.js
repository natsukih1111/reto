// file: app/solo/speed/page.js
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SpeedTopPage() {
  const router = useRouter();

  const go = (diff) => {
    router.push(`/solo/speed/play?diff=${encodeURIComponent(diff)}`);
  };

  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-50 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">DIGIT SPEED（ソロ）</h1>
          <Link className="text-emerald-200 underline" href="/solo">
            ソロへ戻る
          </Link>
        </header>

        <section className="bg-emerald-900/40 border border-emerald-700 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold">ルール（超要点）</h2>
          <ul className="text-sm space-y-1 text-emerald-50/90">
            <li>・カードは「問題＋位」が書いてある。答えて 0〜9 の数字を確定させる。</li>
            <li>・中央の台札（2枚）の数字と「同じ / ±1」なら、その台札に出せる。</li>
            <li>・出したら手札は自動で補充（最大4枚）。</li>
            <li>・詰まったら「更新」で中央をめくる（各山札から1枚ずつ）。</li>
            <li>・制限時間終了時、出した枚数が多い方が勝ち。</li>
            <li>・同じカードは1ゲームで2回出てこない（50枚固定）。</li>
          </ul>
        </section>

        <section className="bg-emerald-900/40 border border-emerald-700 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold">難易度</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button className="btn" onClick={() => go('weak')}>弱い</button>
            <button className="btn" onClick={() => go('normal')}>普通</button>
            <button className="btn" onClick={() => go('hard')}>強い</button>
            <button className="btn" onClick={() => go('extra')}>EXTRA</button>
          </div>
          <p className="text-xs text-emerald-50/70">
            ※ CPUは答えを知ってる前提で、反応速度・連続出し・妨害意識が強くなる。
          </p>
        </section>
      </div>

      <style jsx>{`
        .btn{
          background: rgba(16,185,129,.95);
          color: #052e2b;
          font-weight: 900;
          border-radius: 14px;
          padding: 10px 8px;
        }
        .btn:hover{ filter: brightness(1.05); }
      `}</style>
    </main>
  );
}
