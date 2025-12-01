// file: app/admin/users/[id]/DeleteUserButton.js
'use client';

import { useState } from 'react';

export default function DeleteUserButton({ userId, banned }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!banned) {
      alert('BAN 中のユーザーのみ完全削除できます。');
      return;
    }
    if (loading) return;

    const ok = window.confirm(
      'このユーザーを完全に削除します。\n' +
        '対戦履歴・チャレンジ記録・ガチャキャラなども全て消えます。\n\n' +
        '本当に実行しますか？（元に戻せません）'
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        alert(data.message || '削除に失敗しました。');
        setLoading(false);
        return;
      }

      alert('ユーザーを完全に削除しました。');
      // 一覧に戻す
      window.location.href = '/admin/users';
    } catch (e) {
      console.error(e);
      alert('サーバーエラーにより削除できませんでした。');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading || !banned}
        className={`px-3 py-2 rounded-full text-xs font-bold ${
          banned
            ? 'bg-rose-600 text-white disabled:opacity-60'
            : 'bg-slate-300 text-slate-600 cursor-not-allowed'
        }`}
      >
        {loading ? '削除実行中…' : 'このユーザーを完全削除する'}
      </button>
      <span className="text-[11px] text-rose-800">
        ※ BAN中ユーザーのみ有効です。
      </span>
    </div>
  );
}
