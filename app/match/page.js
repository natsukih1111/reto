'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

let socket; // ページ間で使い回す用

export default function MatchPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [rating, setRating] = useState(null);
  const [tier, setTier] = useState('');

  const [status, setStatus] = useState('ログイン確認中…');
  const [connecting, setConnecting] = useState(true);
  const [inQueue, setInQueue] = useState(false);

  // ① ログイン確認 & ソケット接続
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ★ ここが「Twitter登録してないと入れない」チェック
    const storedId =
      localStorage.getItem('userId') ||
      localStorage.getItem('currentUserId');
    const storedName =
      localStorage.getItem('username') ||
      localStorage.getItem('currentUser');

    if (!storedId || !storedName) {
      // 未ログインなら /login に飛ばして対戦させない
      router.replace('/login?from=match');
      return;
    }

    setUserId(Number(storedId));
    setUsername(storedName);
    setAuthChecked(true);
    setStatus('マッチングサーバーに接続中…');

    const url =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : `http://${window.location.hostname}:3001`;

    socket = io(url, { transports: ['websocket'] });

    socket.on('connect', () => {
      setConnecting(false);
      setStatus('「対戦を開始」を押すとマッチングを開始します。');
    });

    // キューに入ったとき
    socket.on('rate:queue-joined', (payload) => {
      // payload: { userId, username, rating, tier }
      if (payload) {
        setRating(payload.rating ?? null);
        setTier(payload.tier ?? '');
      }
      setInQueue(true);
      setStatus('相手を探しています…');
    });

    // マッチ成立
    socket.on('rate:match-found', (payload) => {
      // payload: { roomId, opponent: { username, rating, tier } }
      if (!payload) return;
      const { roomId, opponent } = payload;
      setStatus('対戦相手が見つかりました！ 対戦画面に移動します…');

      router.push(
        `/battle?room=${encodeURIComponent(
          roomId
        )}&opponent=${encodeURIComponent(opponent.username)}`
      );
    });

    // キュー離脱
    socket.on('rate:queue-left', () => {
      setInQueue(false);
      setStatus('待機をやめました。');
    });

    socket.on('rate:error', (payload) => {
      setInQueue(false);
      setStatus(payload?.message || 'エラーが発生しました');
    });

    socket.on('connect_error', () => {
      setConnecting(false);
      setStatus(
        'マッチングサーバーに接続できません。server.js が動いているか確認してください。'
      );
    });

    return () => {
      socket?.disconnect();
    };
  }, [router]);

  // ② 「対戦開始」ボタン
  const handleJoin = () => {
    if (!socket || !socket.connected) {
      setStatus('サーバーに接続されていません。');
      return;
    }
    if (!userId || !username) {
      setStatus('ログイン情報が取得できませんでした。もう一度ログインしてください。');
      router.replace('/login?from=match');
      return;
    }

    socket.emit('rate:join-queue', {
      userId,
      username,
    });

    setInQueue(true);
    setStatus('キューに参加しました。相手を探しています…');
  };

  // ③ 「待機をやめる」ボタン
  const handleLeave = () => {
    if (!socket || !socket.connected) return;
    socket.emit('rate:leave-queue');
    setInQueue(false);
    setStatus('待機をやめました。');
  };

  // まだログインチェックの途中
  if (!authChecked) {
    return (
      <div style={containerStyle}>
        <h1 style={titleStyle}>⚔ レート対戦 ⚔</h1>
        <p>ログイン確認中です…</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>⚔ レート対戦 ⚔</h1>

      <p>
        ログイン中ユーザー: <b>{username}</b>
      </p>
      {rating != null && (
        <p style={{ marginTop: 4 }}>
          レート: <b>{rating}</b>（{tier || 'ランク計測中'}）
        </p>
      )}

      <p style={{ marginTop: 16 }}>{status}</p>

      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <button
          onClick={handleJoin}
          disabled={connecting || inQueue}
          style={{
            padding: '10px 20px',
            backgroundColor: inQueue ? '#888' : '#00e0ff',
            color: '#000',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: 6,
            cursor: connecting || inQueue ? 'default' : 'pointer',
          }}
        >
          {inQueue ? 'マッチング中…' : '対戦を開始'}
        </button>

        <button
          onClick={handleLeave}
          disabled={!inQueue}
          style={{
            padding: '10px 16px',
            backgroundColor: '#444',
            color: '#fff',
            borderRadius: 6,
            border: '1px solid #777',
            cursor: inQueue ? 'pointer' : 'default',
          }}
        >
          待機をやめる
        </button>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: '#aaa' }}>
        ※ このページは Twitter ログイン済みユーザー専用です。
        <br />
        ログアウトした場合は再度 /login から入り直してください。
      </p>
    </div>
  );
}

// 共通スタイル
const containerStyle = {
  padding: 20,
  maxWidth: 600,
  margin: '0 auto',
  minHeight: '100vh',
  backgroundColor: '#000',
  color: '#fff',
  lineHeight: 1.6,
};

const titleStyle = {
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: 12,
};