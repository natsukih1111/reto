// file: app/admin/users/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [tab, setTab] = useState('ranking'); // ranking | users | banned
  const [ranking, setRanking] = useState([]);
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState('');

  const fetchRanking = () => {
    fetch('/api/admin/users?mode=ranking')
      .then((r) => r.json())
      .then((d) => setRanking(d.users ?? []))
      .catch(() => setRanking([]));
  };

  const fetchUsers = () => {
    const params = new URLSearchParams();
    params.set('mode', tab === 'banned' ? 'banned' : 'list');
    if (keyword) params.set('q', keyword);

    fetch(`/api/admin/users?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    if (tab === 'ranking') fetchRanking();
    else fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const searchUsers = () => {
    if (tab === 'ranking') fetchRanking();
    else fetchUsers();
  };

  const toggleBan = async (user) => {
    const action = user.banned ? 'unban' : 'ban';
    const reason =
      action === 'ban'
        ? window.prompt('BAN の理由（管理者用メモ）') || ''
        : '';

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id, reason }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || 'BAN 状態の更新に失敗しました');
        return;
      }

      if (tab === 'ranking') fetchRanking();
      else fetchUsers();
    } catch (e) {
      console.error(e);
      alert('BAN 状態の更新に失敗しました');
    }
  };

  const deleteUserCompletely = async (user) => {
    if (!user.banned) {
      alert('完全削除は BAN 中のユーザーのみ実行できます。');
      return;
    }

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        alert(data.message || 'ユーザーの完全削除に失敗しました');
        return;
      }

      alert('ユーザーを完全に削除しました。');
      if (tab === 'ranking') fetchRanking();
      else fetchUsers();
    } catch (e) {
      console.error(e);
      alert('サーバーエラーにより完全削除に失敗しました');
    }
  };

  const displayName = (u) => u.display_name || u.username || `ID:${u.id}`;

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900 flex flex-col items-center">
      {/* ヘッダー */}
      <header className="w-full max-w-4xl px-4 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">管理者ページ：ユーザー＆ランキング</h1>
          <p className="text-xs text-slate-600">
            レート / 戦績 / Twitterリンク をまとめて確認できます。
          </p>
        </div>
        <Link
          href="/"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-sm font-bold text-sky-700 bg-white shadow-sm"
        >
          ホームへ
        </Link>
      </header>

      <main className="w-full max-w-4xl px-4 pb-10 mt-4 space-y-4">
        {/* タブ */}
        <div className="flex gap-2 text-xs mb-2">
          <button
            className={`px-3 py-1 rounded-full border ${
              tab === 'ranking'
                ? 'bg-amber-500 text-black border-amber-400'
                : 'border-slate-600 bg-white'
            }`}
            onClick={() => setTab('ranking')}
          >
            レートランキング
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${
              tab === 'users'
                ? 'bg-sky-500 text-black border-sky-400'
                : 'border-slate-600 bg-white'
            }`}
            onClick={() => setTab('users')}
          >
            ユーザー一覧
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${
              tab === 'banned'
                ? 'bg-rose-500 text-black border-rose-400'
                : 'border-slate-600 bg-white'
            }`}
            onClick={() => setTab('banned')}
          >
            BANリスト
          </button>
        </div>

        {/* 検索 */}
        <div className="flex gap-2 text-sm mb-2">
          <input
            className="flex-1 px-2 py-1 rounded bg-white border border-slate-400"
            placeholder="プレイヤーネーム・ログインID・Twitter で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button
            className="px-3 py-1 rounded bg-sky-600 text-xs text-white"
            onClick={searchUsers}
          >
            🔍 検索
          </button>
        </div>

        {/* ランキングタブ */}
        {tab === 'ranking' && (
          <section className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-2 max-h-[70vh] overflow-y-auto">
            {ranking.map((u, idx) => (
              <div
                key={u.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-1 gap-1"
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 text-center font-bold">
                    {idx + 1}
                    位
                  </div>
                  <div>
                    <div className="font-bold">
                      <Link href={`/admin/users/${u.id}`} className="underline">
                        {displayName(u)}
                      </Link>
                      {u.banned ? (
                        <span className="ml-1 text-rose-500">（BAN中）</span>
                      ) : null}
                    </div>
                    <div className="text-slate-600">
                      {u.rankName} / {Math.round(u.rating ?? 0)}pt / {u.wins}勝 {u.losses}敗 / 最長連勝{' '}
                      {u.best_streak}
                    </div>
                    {u.twitter_url && (
                      <div className="text-slate-500">
                        Twitter:{' '}
                        <a
                          href={u.twitter_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline break-all"
                        >
                          {u.twitter_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end md:self-auto">
                  <button
                    className="px-2 py-1 rounded bg-slate-800 text-white"
                    onClick={() => toggleBan(u)}
                  >
                    {u.banned ? 'BAN解除' : 'BAN'}
                  </button>
                </div>
              </div>
            ))}
            {ranking.length === 0 && (
              <div className="text-slate-500">ランキング情報がありません。</div>
            )}
          </section>
        )}

        {/* ユーザー一覧 / BANリスト */}
        {(tab === 'users' || tab === 'banned') && (
          <section className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-2 max-h-[70vh] overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-1 gap-1"
              >
                <div>
                  <div className="font-bold">
                    <Link href={`/admin/users/${u.id}`} className="underline">
                      {displayName(u)}
                    </Link>
                    {u.banned ? (
                      <span className="ml-1 text-rose-500">（BAN中）</span>
                    ) : null}
                  </div>
                  <div className="text-slate-600">
                    レート {Math.round(u.rating ?? 0)} / {u.wins}勝 {u.losses}敗 / 対戦数{' '}
                    {u.matches_played}
                  </div>
                  {u.twitter_url && (
                    <div className="text-slate-500">
                      Twitter:{' '}
                      <a
                        href={u.twitter_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline break-all"
                      >
                        {u.twitter_url}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex gap-1 self-end md:self-auto">
                  {u.banned && (
                    <button
                      className="px-2 py-1 rounded bg-rose-600 text-white"
                      onClick={() => deleteUserCompletely(u)}
                    >
                      完全削除
                    </button>
                  )}
                  <button
                    className="px-2 py-1 rounded bg-slate-800 text-white"
                    onClick={() => toggleBan(u)}
                  >
                    {u.banned ? 'BAN解除' : 'BAN'}
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-slate-500">該当するユーザーはいません。</div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
