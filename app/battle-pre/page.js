// file: app/battle-pre/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function BattlePrePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomId = searchParams.get('room');
  const opponentName = searchParams.get('opponent') || '相手';

  const [me, setMe] = useState(null);
  const [count, setCount] = useState(5);

  // 自分の情報取得（名前とか）
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  // 5秒カウントダウン → /battle に遷移
  useEffect(() => {
    if (!roomId) return;

    if (count <= 0) {
      router.push(`/battle?room=${roomId}`);
      return;
    }

    const id = setTimeout(() => {
      setCount((c) => c - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [count, roomId, router]);

  const myName = me?.name ?? me?.username ?? 'あなた';

  return (
    <main className="min-h-screen bg-slate-900 text-sky-50 flex flex-col items-center justify-center px-4">
      <p className="text-xs text-slate-400 mb-2">ルームID: {roomId}</p>
      <p className="text-sm text-slate-300 mb-4">マッチングしました！</p>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-lg p-4 border border-sky-500/40">
        {/* プレイヤー情報 */}
        <div className="flex items-center justify-between mb-4">
          {/* 自分 */}
          <div className="flex-1 text-center">
            <p className="text-[10px] text-slate-400 mb-1">あなた</p>
            <p className="text-lg font-bold">{myName}</p>
            {/* 称号はあとで本物に差し替え */}
            <p className="text-[11px] text-amber-300 mt-1">称号：未設定</p>
          </div>

          <div className="w-10 text-center text-xl font-extrabold text-rose-400">
            VS
          </div>

          {/* 相手 */}
          <div className="flex-1 text-center">
            <p className="text-[10px] text-slate-400 mb-1">相手</p>
            <p className="text-lg font-bold">{opponentName}</p>
            <p className="text-[11px] text-amber-300 mt-1">称号：未設定</p>
          </div>
        </div>

        {/* マイチーム枠（いまはダミー。あとでキャラ差し替え） */}
        <div className="grid grid-cols-5 gap-1 text-[10px] text-center text-slate-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-md bg-slate-700/80 border border-slate-600 flex items-center justify-center"
            >
              ?
            </div>
          ))}
        </div>

        {/* カウントダウン */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-300 mb-1">対戦開始まで…</p>
          <p className="text-4xl font-extrabold text-sky-300 tracking-widest">
            {count}
          </p>
        </div>
      </div>
    </main>
  );
}
