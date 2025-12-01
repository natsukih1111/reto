// file: app/my-questions/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function MyQuestionsPage() {
  const [user, setUser] = useState(null);
  const [season, setSeason] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [error, setError] = useState('');

  // ① /api/me から自分のユーザー情報を取る
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setSeason(d.season ?? '');
      })
      .catch((e) => {
        console.error(e);
        setUser(null);
      })
      .finally(() => setLoadingUser(false));
  }, []);

  // ② /api/my-questions を叩く
  useEffect(() => {
    setLoadingQuestions(true);

    fetch('/api/my-questions')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));

        if (r.status === 401) {
          throw new Error(data.error || 'ログインが必要です。');
        }

        if (!r.ok) {
          throw new Error(data.error || 'failed');
        }
        return data;
      })
      .then((data) => {
        setQuestions(data.questions || []);
        setError('');
      })
      .catch((e) => {
        console.error(e);
        setError(e.message || '投稿一覧の取得に失敗しました。');
        setQuestions([]);
      })
      .finally(() => setLoadingQuestions(false));
  }, []);

  // ③ ローディング中
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <p className="text-sky-700">読み込み中...</p>
      </div>
    );
  }

  // ④ ユーザー情報が無い
  if (!user) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center text-sky-900">
        <p className="mb-4 text-sky-800">
          投稿一覧を見るにはログインが必要です。
        </p>
        <Link
          href="/login"
          className="px-4 py-2 rounded-full bg-sky-500 text-white font-bold"
        >
          ログインへ
        </Link>
      </div>
    );
  }

  // ⑤ 通常表示
  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center text-sky-900">
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-widest text-sky-900">
          投稿した問題
        </h1>
        <Link
          href="/mypage"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-sm font-bold text-sky-700 bg-white shadow-sm"
        >
          マイページへ
        </Link>
      </header>

      <main className="w-full max-w-md px-4 pb-10 mt-4 space-y-4">
        {/* ユーザー情報の簡単な概要 */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <p className="text-sm text-sky-800">
            ユーザー名：<span className="font-bold">{user.username}</span>
          </p>
          {season && (
            <p className="text-xs text-sky-700 mt-1">
              現在のシーズン：{season}
            </p>
          )}
        </section>

        {/* 投稿一覧本体 */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-2 text-sky-700">
            投稿一覧
          </h2>

          {loadingQuestions && (
            <p className="text-sm text-sky-800">投稿を読み込み中です...</p>
          )}

          {!loadingQuestions && error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!loadingQuestions && !error && questions.length === 0 && (
            <p className="text-sm text-sky-800">
              まだ自分の投稿した問題がありません。
            </p>
          )}

          {!loadingQuestions && !error && questions.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-sky-200 text-sky-900">
                    <th className="px-2 py-1 border border-sky-300">ID</th>
                    <th className="px-2 py-1 border border-sky-300">状態</th>
                    <th className="px-2 py-1 border border-sky-300">種類</th>
                    <th className="px-2 py-1 border border-sky-300">投稿日時</th>
                    <th className="px-2 py-1 border border-sky-300">
                      問題文（先頭）
                    </th>
                    <th className="px-2 py-1 border border-sky-300">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => {
                    // 状態の表示
                    let statusLabel = q.status;
                    let statusClass = '';
                    if (q.status === 'pending') {
                      statusLabel = '承認待ち';
                      statusClass = 'text-gray-700';
                    } else if (q.status === 'approved') {
                      statusLabel = '承認済み';
                      statusClass = 'text-emerald-700 font-bold';
                    } else if (q.status === 'rejected') {
                      statusLabel = '却下';
                      statusClass = 'text-red-700 font-bold';
                    }

                    // 問題文
                    const fullText = q.question_text || q.question || '';
                    const shortQuestion =
                      fullText.length > 30
                        ? fullText.slice(0, 30) + '…'
                        : fullText;

                    return (
                      <tr key={q.id} className="bg-white">
                        <td className="px-2 py-1 border border-sky-200 text-center">
                          {q.id}
                        </td>
                        <td
                          className={
                            'px-2 py-1 border border-sky-200 text-center ' +
                            statusClass
                          }
                        >
                          {statusLabel}
                        </td>
                        <td className="px-2 py-1 border border-sky-200 text-center">
                          {q.type}
                        </td>
                        <td className="px-2 py-1 border border-sky-200">
                          {q.created_at || '-'}
                        </td>
                        <td className="px-2 py-1 border border-sky-200">
                          {shortQuestion}
                        </td>
                        <td className="px-2 py-1 border border-sky-200 text-center">
                          <Link
                            href={`/my-questions/${q.id}`}
                            className="text-xs text-sky-700 underline"
                          >
                            開く
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="mt-2 text-[10px] text-sky-700">
                ※ question_submissions テーブルから
                <code className="bg-sky-200 px-1 rounded mx-1">
                  status / type / created_at / question_text
                </code>
                などを表示しています。
              </p>
            </div>
          )}
        </section>

        {/* 新規投稿へボタン */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-3 shadow-sm">
          <div className="space-y-2">
            <Link
              href="/submit"
              className="block w-full text-center py-2 rounded-full bg-sky-500 text-white text-sm font-bold"
            >
              新しく問題を投稿する
            </Link>
            <Link
              href="/mypage"
              className="block w-full text-center py-2 rounded-full bg-white border border-sky-500 text-sky-700 text-sm font-bold"
            >
              マイページへ戻る
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
