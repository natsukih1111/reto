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

  // 自分の情報取得
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('failed to fetch /api/me');
        }
        const data = await res.json();
        setMe(data.user || null);
      } catch (e) {
        console.error(e);
        setErrorMessage('ユーザー情報の取得に失敗しました。時間をおいて再度お試しください。');
      } finally {
        setLoadingMe(false);
      }
    };

    fetchMe();
  }, []);

  const handleStart = async () => {
    if (!me || loadingStart) return;

    setErrorMessage('');
    setLoadingStart(true);

    try {
      const res = await fetch('/api/challenge/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: me.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        // 今日分は終わり
        setAlreadyPlayed(true);
        setErrorMessage(
          data.error || '今日はすでにチャレンジモードに挑戦しています。'
        );
        return;
      }

      if (!res.ok) {
        setErrorMessage(
          data.error ||
            'チャレンジの開始に失敗しました。時間をおいて再度お試しください。'
        );
        return;
      }

      // ここで問題リストをセッションストレージに保存しておく（次の画面で読む想定）
      if (data && data.questions) {
        try {
          const payload = {
            season: data.season,
            questions: data.questions,
            startedAt: Date.now(),
          };
          sessionStorage.setItem('challenge_session', JSON.stringify(payload));
        } catch (e) {
          console.warn('sessionStorage に保存できませんでした', e);
        }
      }

      // プレイ画面へ遷移（このページではスタートだけ）
      router.push('/challenge/play');
    } catch (e) {
      console.error(e);
      setErrorMessage(
        'サーバーエラーが発生しました。時間をおいて再度お試しください。'
      );
    } finally {
      setLoadingStart(false);
    }
  };

  const disabled = loadingMe || loadingStart || alreadyPlayed || !me;

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center text-sky-900">
      {/* ヘッダー */}
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/logo-skull.png"
            alt="ナレバト"
            className="w-8 h-8 object-contain"
          />
          <h1 className="text-xl md:text-2xl font-extrabold tracking-widest">
            チャレンジモード
          </h1>
        </div>
        {/* グローバルナビ：ホームへ戻る */}
        <Link
          href="/"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-sm font-bold text-sky-700 bg-white shadow-sm"
        >
          ホームへ
        </Link>
      </header>

      <main className="w-full max-w-md px-4 pb-10 mt-6 space-y-6">
        {/* 説明ブロック */}
        <section className="bg-white border border-sky-100 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-2 text-sky-800">
            ルール
          </h2>
          <ul className="list-disc list-inside text-sm space-y-1 text-slate-800">
            <li>1日1回だけ挑戦できます。</li>
            <li>全ての承認済み問題からランダムに出題されます。</li>
            <li>3問間違えた時点で終了です。</li>
            <li>1問正解するごとに 50 ベリー獲得できます。</li>
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            ※ 途中でページを閉じたりリロードした場合も、その日の挑戦は消費されます。
          </p>
        </section>

        {/* ステータス表示 */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <h2 className="text-base font-extrabold mb-2 text-sky-800">
            今日のチャレンジ
          </h2>
          {loadingMe && (
            <p className="text-sm text-slate-700">ユーザー情報を読み込み中…</p>
          )}
          {!loadingMe && me && !alreadyPlayed && (
            <p className="text-sm text-slate-800">
              プレイヤー：<span className="font-bold">{me.display_name ?? me.username}</span>
              <br />
              今日はまだチャレンジしていません。
            </p>
          )}
          {!loadingMe && alreadyPlayed && (
            <p className="text-sm font-bold text-rose-700">
              今日分のチャレンジは終了しました。
            </p>
          )}
          {!loadingMe && !me && (
            <p className="text-sm text-rose-700">
              ユーザー情報が取得できませんでした。いったんホームに戻ってください。
            </p>
          )}

          {/* エラーメッセージ */}
          {errorMessage && (
            <p className="mt-3 text-xs text-rose-600">{errorMessage}</p>
          )}

          {/* スタートボタン */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleStart}
              disabled={disabled}
              className={`w-full py-3 rounded-full text-sm font-bold shadow ${
                disabled
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-orange-400 hover:bg-orange-500 active:translate-y-[1px] text-white'
              }`}
            >
              {alreadyPlayed
                ? '今日のチャレンジは終了しています'
                : loadingStart
                ? 'チャレンジを準備中…'
                : 'チャレンジを始める'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
