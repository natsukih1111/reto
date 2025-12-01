// app/admin/page.js
'use client';

import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/admin/users?mode=stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-2">ダッシュボード</h1>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">登録ユーザー数</div>
          <div className="text-3xl font-bold">{stats?.userCount ?? '--'}</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">承認待ち問題</div>
          <div className="text-3xl font-bold">{stats?.pendingQuestions ?? '--'}</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">未対応の不備報告</div>
          <div className="text-3xl font-bold">{stats?.openReports ?? '--'}</div>
        </div>
      </section>

      <section className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-3">
        <h2 className="text-lg font-bold">ショートカット</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <a
            href="/admin/questions"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600"
          >
            📝 問題一覧・承認画面へ
          </a>
          <a
            href="/admin/reports"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600"
          >
            ⚠ 不備報告一覧へ
          </a>
          <a
            href="/admin/users"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600"
          >
            🏴‍☠️ ユーザー＆ランキングへ
          </a>
          <a
            href="/admin/endless"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600"
          >
            ♾ エンドレスモードを始める
          </a>
        </div>
      </section>
    </div>
  );
}
