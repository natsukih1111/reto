// app/admin/layout.js
export const metadata = {
  title: 'ナレバト 管理者ページ',
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row">
        {/* サイドバー */}
        <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-700 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-sky-400 rounded-full" />
            <div>
              <div className="text-lg font-bold">ナレバト</div>
              <div className="text-xs text-slate-400">管理コンソール</div>
            </div>
          </div>
          <nav className="space-y-2 text-sm">
            <a href="/admin" className="block px-3 py-2 rounded hover:bg-slate-800">
              ダッシュボード
            </a>
            <a href="/admin/questions" className="block px-3 py-2 rounded hover:bg-slate-800">
              問題一覧・承認
            </a>
            <a href="/admin/reports" className="block px-3 py-2 rounded hover:bg-slate-800">
              不備報告
            </a>
            <a href="/admin/users" className="block px-3 py-2 rounded hover:bg-slate-800">
              ユーザー＆ランキング
            </a>
            <a href="/admin/endless" className="block px-3 py-2 rounded hover:bg-slate-800">
              エンドレスモード
            </a>
          </nav>
          <div className="text-xs text-slate-500 pt-4 border-t border-slate-800">
            <a href="/" className="underline">
              一般ユーザー画面へ戻る
            </a>
          </div>
        </aside>

        {/* メイン */}
        <main className="flex-1 bg-slate-950/60 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}