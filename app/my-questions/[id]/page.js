// file: app/my-questions/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`/api/my-questions/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'failed');
        }

        setQuestion(data.question);
      } catch (e) {
        console.error(e);
        setError('問題の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  const handleCancel = async () => {
    if (!question) return;
    if (question.status !== 'pending') return;

    if (!window.confirm('この投稿を取り消しますか？（承認待ちのみ削除可能）')) return;

    try {
      setCanceling(true);
      const res = await fetch(`/api/my-questions/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert('取り消しに失敗しました: ' + (data.error || 'unknown'));
        return;
      }

      alert('投稿を取り消しました。');
      router.push('/my-questions');
    } catch (e) {
      console.error(e);
      alert('通信エラーで取り消しに失敗しました。');
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center text-sky-900">
      {/* ヘッダー */}
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-widest text-sky-900">
          問題の詳細
        </h1>
        <Link
          href="/my-questions"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-sm font-bold text-sky-700 bg-white shadow-sm"
        >
          一覧へ戻る
        </Link>
      </header>

      <main className="w-full max-w-md px-4 pb-10 mt-4 space-y-4">
        {loading && (
          <p className="text-sm text-sky-800">読み込み中です...</p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && question && (
          <>
            {/* メタ情報 */}
            <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm text-sm space-y-1">
              <div>
                <span className="font-semibold">ID：</span>
                {question.id}
              </div>
              <div>
                <span className="font-semibold">状態：</span>
                {question.status === 'pending'
                  ? '承認待ち'
                  : question.status === 'approved'
                  ? '承認済み'
                  : question.status === 'rejected'
                  ? '却下'
                  : question.status}
              </div>
              <div>
                <span className="font-semibold">種類：</span>
                {question.type}
              </div>
              <div>
                <span className="font-semibold">作問者：</span>
                {question.created_by ||
                  (question.is_admin ? '（管理者）' : '（不明）')}
              </div>
              <div>
                <span className="font-semibold">投稿日時：</span>
                {question.created_at || '-'}
              </div>
              {question.updated_at && (
                <div>
                  <span className="font-semibold">最終更新：</span>
                  {question.updated_at}
                </div>
              )}
            </section>

            {/* 問題文・選択肢など */}
            <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm space-y-3 text-sm">
              <div>
                <div className="font-extrabold mb-1 text-sky-800">
                  問題文
                </div>
                <div className="bg-white rounded-xl border border-sky-200 px-3 py-2 whitespace-pre-wrap">
                  {question.question_text}
                </div>
              </div>

              {question.options && question.options.length > 0 && (
                <div>
                  <div className="font-extrabold mb-1 text-sky-800">
                    選択肢 / 並び替えパーツ
                  </div>
                  <ul className="space-y-1">
                    {question.options.map((o, idx) => (
                      <li
                        key={idx}
                        className="bg-white rounded-full border border-sky-200 px-3 py-1 inline-block"
                      >
                        {idx + 1}. {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {question.correct_answer && (
                <div>
                  <div className="font-extrabold mb-1 text-sky-800">
                    正解
                  </div>
                  <div className="bg-white rounded-xl border border-sky-200 px-3 py-1">
                    {question.correct_answer}
                  </div>
                </div>
              )}

              {question.alt_answers && question.alt_answers.length > 0 && (
                <div>
                  <div className="font-extrabold mb-1 text-sky-800">
                    別解
                  </div>
                  <ul className="flex flex-wrap gap-1 text-xs">
                    {question.alt_answers.map((a, idx) => (
                      <li
                        key={idx}
                        className="bg-white rounded-full border border-sky-200 px-2 py-0.5"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {question.tags && question.tags.length > 0 && (
                <div>
                  <div className="font-extrabold mb-1 text-sky-800">
                    タグ
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {question.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-white rounded-full border border-sky-200 px-2 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 操作エリア */}
            <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm space-y-2 text-xs">
              <p className="text-sky-800">
                ※ 修正したい場合は、このページの内容をコピーして
                「問題を投稿する」ページで編集し直して投稿してください。
              </p>

              <div className="flex flex-col gap-2">
                <Link
                  href="/submit"
                  className="w-full text-center py-2 rounded-full bg-sky-500 text-white font-bold"
                >
                  問題を投稿するページを開く
                </Link>

                <button
                  type="button"
                  disabled={question.status !== 'pending' || canceling}
                  onClick={handleCancel}
                  className={`w-full py-2 rounded-full font-bold border ${
                    question.status === 'pending'
                      ? 'bg-white text-red-700 border-red-400'
                      : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                  }`}
                >
                  {question.status === 'pending'
                    ? canceling
                      ? '取り消し中...'
                      : 'この投稿を取り消す（承認待ちのみ）'
                    : '承認待ち以外は取り消せません'}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
