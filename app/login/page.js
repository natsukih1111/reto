// file: app/login/page.js
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [mode, setMode] = useState('register'); // 'register' | 'login'

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // 新規登録用

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 成功時に nb_username クッキーを書き換える共通処理
  const setUsernameCookie = (username) => {
    if (!username) return;
    try {
      const encoded = encodeURIComponent(username);
      // 1年間有効
      document.cookie = `nb_username=${encoded}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch (e) {
      console.warn('failed to set nb_username cookie', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage('');

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login_id: loginId,
            password,
            display_name: displayName,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          setMessage(
            data.message ||
              '新規登録に失敗しました。時間をおいて再度お試しください。'
          );
          return;
        }

        // ★ 登録成功 → サーバーが返した username をクッキーに保存
        //   （例：ゲスト-12345）
        const cookieUsername = data.username || loginId;
        setUsernameCookie(cookieUsername);

        // 登録成功 → マイページへ
        window.location.href = '/mypage';
      } else {
        // ログイン
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login_id: loginId,
            password,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          setMessage(
            data.message ||
              'ログインに失敗しました。ログインIDとパスワードを確認してください。'
          );
          return;
        }

        // ★ ログイン成功 → サーバーが返した username をクッキーに保存
        const cookieUsername = data.username || loginId;
        setUsernameCookie(cookieUsername);

        window.location.href = '/mypage';
      }
    } catch (e) {
      console.error(e);
      setMessage('サーバーエラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 text-sky-900 flex flex-col items-center">
      {/* ヘッダー */}
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/logo-skull.png"
            alt="ナレバト"
            className="w-10 h-10 object-contain"
          />
          <h1 className="text-2xl font-extrabold tracking-widest">ナレバト</h1>
        </div>
        <Link
          href="/"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-sm font-bold text-sky-700 bg-white shadow-sm"
        >
          ホームへ
        </Link>
      </header>

      {/* カード本体 */}
      <main className="w-full max-w-md px-4 pb-10 mt-6">
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-3">ログイン / 新規登録</h2>

          {/* タブ */}
          <div className="flex mb-4 rounded-full overflow-hidden border border-sky-400">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold ${
                mode === 'register'
                  ? 'bg-sky-500 text-white'
                  : 'bg-white text-sky-700'
              }`}
              onClick={() => {
                setMode('register');
                setMessage('');
              }}
            >
              新規登録
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold ${
                mode === 'login'
                  ? 'bg-sky-500 text-white'
                  : 'bg-white text-sky-700'
              }`}
              onClick={() => {
                setMode('login');
                setMessage('');
              }}
            >
              ログイン
            </button>
          </div>

          {/* 説明文 */}
          {mode === 'register' ? (
            <p className="text-xs text-sky-800 mb-4 leading-relaxed">
              ログインIDには、X(Twitter)IDを使用してください。
              <br />
              X(Twitter)連携できていないアカウントでは対戦やチャレンジは出来ません
              <br />
              例）<span className="font-mono">narebato_taro</span>
              <br />
              BANされたIDは、管理者によるBAN後に本人が再登録することで上書きできます。
            </p>
          ) : (
            <p className="text-xs text-sky-800 mb-4 leading-relaxed">
              新規登録時に設定したログインIDとパスワードでログインできます。
              <br />
              ログインIDを忘れた場合は、管理者にお問い合わせください。
            </p>
          )}

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* ログインID */}
            <div className="text-sm">
              <label className="block mb-1 font-bold">
                ログインID{' '}
                <span className="text-[11px] text-sky-700">
                  (@なしで入力)
                </span>
              </label>
              <input
                className="w-full px-3 py-2 rounded border border-sky-400 bg-white text-sky-900"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="例）narebato_taro"
              />
            </div>

            {/* 表示名（新規登録の時だけ） */}
            {mode === 'register' && (
              <div className="text-sm">
                <label className="block mb-1 font-bold">
                  名前（サイト内で表示される名前）
                </label>
                <input
                  className="w-full px-3 py-2 rounded border border-sky-400 bg-white text-sky-900"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={20}
                  placeholder="例）ナレバト太郎"
                />
                <p className="mt-1 text-[11px] text-sky-700">
                  ※ 後から1度だけ変更できます。
                </p>
              </div>
            )}

            {/* パスワード */}
            <div className="text-sm">
              <label className="block mb-1 font-bold">パスワード</label>
              <input
                type="password"
                className="w-full px-3 py-2 rounded border border-sky-400 bg-white text-sky-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* メッセージ */}
            {message && (
              <div className="text-xs text-rose-600 bg-white border border-rose-200 rounded px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-full bg-sky-500 text-white font-bold text-sm disabled:opacity-60"
            >
              {loading
                ? '処理中…'
                : mode === 'register'
                ? 'この内容で新規登録する'
                : 'ログインする'}
            </button>
          </form>

          {/* サブアカ禁止の注意文（新規登録のときだけ表示） */}
          {mode === 'register' && (
            <p className="mt-4 text-[11px] leading-relaxed bg-rose-50 border border-rose-400 text-rose-800 font-bold rounded-md px-3 py-2">
              ※サブアカウントの作成は禁止しています。対戦ログなどからサブアカウントの使用が確認された場合、
              AIによる判断で関連するアカウントは全てBANされます。
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
