// file: app/challenge/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ChallengeStartPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingStart, setLoadingStart] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const data = await res.json();
        setMe(data.user || null);

        // 投稿状況を確認して「15問投稿で復活」を反映する
        const stats = await fetch('/api/my-questions/stats').then((r) =>
          r.json()
        );

        if (stats.usedToday && stats.todayPosts < 15) {
          setAlreadyPlayed(true);
        } else {
          setAlreadyPlayed(false);
        }
      } catch {
        setMe(null);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  const handleStart = async () => {
    if (!me || loadingStart) return;
    setErrorMessage('');
    setLoadingStart(true);

    try {
      const res = await fetch('/api/challenge/start', {
        method: 'POST',
        body: JSON.stringify({ user_id: me.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || '開始できませんでした');
        return;
      }

      sessionStorage.setItem(
        'challenge_session',
        JSON.stringify({
          questions: data.questions,
          startedAt: Date.now(),
        })
      );

      router.push('/challenge/play');
    } catch {
      setErrorMessage('サーバーエラーが発生しました。');
    } finally {
      setLoadingStart(false);
    }
  };

  const disabled = loadingMe || loadingStart || !me || alreadyPlayed;

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center text-sky-900">
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-widest">
          チャレンジモード
        </h1>
        <Link
          href="/"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-sm font-bold text-sky-700 bg-white shadow-sm"
        >
          ホームへ
        </Link>
      </header>

      <main className="w-full max-w-md px-4 pb-10 mt-6 space-y-6">
        {/* ルール */}
        <section className="bg-white border border-sky-100 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-2 text-sky-800">ルール</h2>
          <ul className="list-disc list-inside text-sm space-y-1 text-slate-800">
            <li>基本的に1日1回挑戦できます。</li>
            <li>その日に問題を15問投稿するとチャレンジ権が復活します。</li>
            <li>投稿による復活は翌日へ持ち越せません（1日1回のみ）。</li>
            <li>全承認済み問題からランダム出題。</li>
            <li>3問ミスしたら終了。</li>
            <li>正解ごとに 50 ベリー獲得。</li>
          </ul>
        </section>

        {/* ステータス */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          {alreadyPlayed ? (
            <p className="text-sm text-rose-700 font-bold">
              ● 今日のチャレンジは既に挑戦済みです（15問投稿で復活）
            </p>
          ) : (
            <p className="text-sm text-emerald-700 font-bold">
              ● 今日はまだ挑戦できます
            </p>
          )}

          {errorMessage && (
            <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
          )}

          <div className="mt-4">
            <button
              type="button"
              disabled={disabled}
              onClick={handleStart}
              className={`w-full py-3 rounded-full text-sm font-bold shadow ${
                disabled
                  ? 'bg-slate-300 text-slate-500'
                  : 'bg-orange-400 hover:bg-orange-500 text-white'
              }`}
            >
              {disabled ? '挑戦できません' : 'チャレンジを始める'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
