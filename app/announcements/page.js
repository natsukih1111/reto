// file: app/announcements/page.js
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // お知らせ一覧を取得
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          setError(data.error || 'お知らせの取得に失敗しました。');
          setItems([]);
          return;
        }

        setItems(Array.isArray(data.announcements) ? data.announcements : []);
        setError('');
      } catch (e) {
        console.error(e);
        setError('お知らせの取得に失敗しました。');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // ページを開いたタイミングで「既読にする」
  useEffect(() => {
    fetch('/api/announcements/mark-read', {
      method: 'POST',
    }).catch(() => {
      // 既読更新失敗しても画面表示には影響させない
    });
  }, []);

  const formatDate = (s) => {
    if (!s) return '';
    try {
      const d = new Date(s);
      return d.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return s;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-sky-50 text-slate-900 flex items-center justify-center">
        <p className="text-sm">お知らせを読み込み中です...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sky-50 text-sky-900 flex flex-col items-center">
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📢</span>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-widest">
            運営からのお知らせ
          </h1>
        </div>
        <Link
          href="/"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-sm font-bold text-sky-700 bg-white shadow-sm hover:bg-sky-50"
        >
          ホームへ戻る
        </Link>
      </header>

      <section className="w-full max-w-md px-4 pb-10 mt-4">
        {error && (
          <p className="text-xs text-rose-600 mb-2 whitespace-pre-line">
            {error}
          </p>
        )}

        {items.length === 0 && !error && (
          <p className="text-sm text-slate-700">
            現在表示できるお知らせはありません。
          </p>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border border-sky-100 px-4 py-3 text-sm text-slate-900"
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-[15px] text-slate-900">
                    {item.title || '（タイトルなし）'}
                  </h2>
                  <time className="text-[10px] text-slate-500">
                    {formatDate(item.created_at)}
                  </time>
                </div>
                <p className="mt-1 text-xs whitespace-pre-wrap break-words leading-relaxed text-slate-800">
                  {item.message || '（本文なし）'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
