'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`登録成功！ID: ${data.id} / 名前: ${data.username}`);
        setUsername('');
      } else {
        setMessage(`エラー: ${data.error}`);
      }
    } catch (err) {
      setMessage('通信エラーが発生しました');
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>プレイヤー登録</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="ユーザー名を入力"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ padding: 8, fontSize: 16 }}
        />
        <button type="submit" style={{ marginLeft: 10, padding: '8px 16px' }}>
          登録
        </button>
      </form>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  );
}
