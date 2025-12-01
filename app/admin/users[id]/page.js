// app/admin/users/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [user, setUser] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/user-detail?id=${id}`);
        const data = await res.json();
        setUser(data.user ?? null);
        setRecentMatches(data.matches ?? []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const toggleBan = async () => {
    if (!user) return;
    const action = user.banned ? 'unban' : 'ban';
    const reason =
      action === 'ban'
        ? window.prompt('BAN 理由（メモ）') || ''
        : '';
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, userId: user.id, reason }),
    });
    if (res.ok) {
      setUser((u) => ({ ...u, banned: action === 'ban' }));
    } else {
      alert('失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="text-slate-200">読み込み中...</div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <p className="text-slate-200">ユーザーが見つかりません。</p>
        <button
          className="px-3 py-1 rounded bg-slate-800 text-xs"
          onClick={() => router.push('/admin/users')}
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-xl font-bold mb-2">
        ユーザー詳細 #{user.id} {user.username}
      </h1>

      <section className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-1">
        <div>Twitter ID：{user.twitter_id ?? '(未連携)'}</div>
        <div>Twitter @：{user.twitter_handle ?? '(未連携)'}</div>
        <div>登録日時：{user.created_at}</div>
        <div>
          レート：{user.rating}（内部 {user.internal_rating}） /{' '}
          {user.wins}勝 {user.losses}敗 / 対戦数 {user.matches_played}
        </div>
        <div>
          連勝：現在 {user.win_streak} / 最高 {user.max_win_streak}
        </div>
        <div>ベリー：{user.berries}</div>
        <div>
          権限：
          {user.is_admin ? '管理者 ' : ''}
          {user.is_author ? '公認作問者 ' : ''}
        </div>
        <div>BAN 状態：{user.banned ? 'BAN中' : '有効'}</div>

        <div className="pt-2 flex gap-2">
          <button
            className="px-3 py-1 rounded bg-slate-800"
            onClick={toggleBan}
          >
            {user.banned ? 'BAN解除' : 'BANにする'}
          </button>
          {user.twitter_handle && (
            <a
              href={`https://twitter.com/${user.twitter_handle.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 rounded bg-sky-600 text-black"
            >
              Twitterプロフィール
            </a>
          )}
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-1">
        <h2 className="font-bold mb-1">直近の対戦履歴（最大20件）</h2>
        {recentMatches.length === 0 && (
          <div className="text-slate-400">対戦履歴がありません。</div>
        )}
        {recentMatches.map((m) => (
          <div
            key={m.id}
            className="border-b border-slate-800 pb-1 mb-1 flex justify-between"
          >
            <div>
              <div>
                vs {m.opponent_name}（{m.mode}）
              </div>
              <div className="text-slate-400">
                {m.score_my} - {m.score_opp} /{' '}
                {m.is_win ? 'WIN' : m.is_draw ? 'DRAW' : 'LOSE'}
              </div>
            </div>
            <div className="text-right text-slate-500">
              {m.created_at}
              <br />
              Δレート {m.rating_change}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
