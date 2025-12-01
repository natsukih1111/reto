// file: app/admin/db-questions/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DBQuestionsPage() {
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');

  // -------------------------------------------------------
  // DB から全問題を取得
  // -------------------------------------------------------
  const load = async () => {
    setLoadingList(true);
    setError('');
    try {
      const res = await fetch('/api/admin/db-questions', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '読み込み失敗');
      setList(data.questions || []);
    } catch (e) {
      console.error(e);
      setError('問題一覧の読み込みに失敗しました。');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // -------------------------------------------------------
  // 削除処理
  // -------------------------------------------------------
  const deleteQuestion = async (id) => {
    if (!confirm(`問題ID ${id} を削除しますか？`)) return;

    try {
      const res = await fetch('/api/admin/delete-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '削除失敗');

      alert('削除しました');
      load();
    } catch (e) {
      console.error(e);
      alert('削除中にエラーが発生しました');
    }
  };

  // -------------------------------------------------------
  // レンダー
  // -------------------------------------------------------
  return (
    <div className="min-h-screen bg-sky-50 text-slate-900 px-4 py-6">
      <header className="flex justify-between items-center max-w-3xl mx-auto mb-6">
        <h1 className="text-xl font-extrabold">DB 生データ（questions）</h1>
        <Link href="/" className="border border-sky-600 px-3 py-1 rounded-full text-sm">
          ホーム
        </Link>
      </header>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow p-4 border border-slate-200">
        <h2 className="text-lg font-bold mb-4">questions（全件）</h2>

        {loadingList && <p className="text-sm">読み込み中…</p>}

        <div className="space-y-4">
          {list.map((q) => (
            <div key={q.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="text-xs text-slate-500 mb-1">
                ID: {q.id} ／ 状態: {q.status} ／ タイプ: {q.question_type}
              </div>

              <p className="text-sm whitespace-pre-wrap">{q.question}</p>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold hover:bg-rose-600"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>

        {!loadingList && list.length === 0 && (
          <p className="text-sm text-slate-600">問題が0件です。</p>
        )}
      </div>
    </div>
  );
}
