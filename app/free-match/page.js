// app/free-match/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

let socket = null;

// WebSocket サーバーの URL を決める関数（開発中は 3001 に飛ばす）
function getSocketUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'https:' : 'http:';
  const host = loc.hostname; // 例: localhost / 192.168.11.15
  return `${protocol}//${host}:3001`;
}

export default function FreeMatchPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('サーバーに接続中...');
  const [connecting, setConnecting] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // ユーザー名確保
    if (typeof window !== 'undefined') {
      let name =
        localStorage.getItem('username') ||
        localStorage.getItem('currentUser') ||
        '';
      if (!name) {
        name = 'ゲスト-' + Math.floor(Math.random() * 100000);
        localStorage.setItem('username', name);
      }
      setUsername(name);
    }

    // Socket.io 接続
    const url = getSocketUrl();
    console.log('🔌 接続先 Socket.io URL:', url);
    socket = io(url, { transports: ['websocket'] });

    socket.on('connect', () => {
      setConnecting(false);
      setStatus('部屋IDを入力して「この部屋に入る」を押してください');
    });

    socket.on('waitingInRoom', (data) => {
      setJoining(true);
      setStatus(data.message || '相手を待っています…');
    });

    socket.on('matchFound', (data) => {
      setJoining(false);
      setStatus(`相手が見つかりました！ 相手: ${data.opponent}`);
      router.push(
        `/battle?room=${encodeURIComponent(
          data.roomId
        )}&opponent=${encodeURIComponent(data.opponent)}`
      );
    });

    socket.on('roomError', (data) => {
      setJoining(false);
      setStatus(data.message || 'エラーが発生しました');
    });

    socket.on('connect_error', () => {
      setStatus(
        'サーバーに接続できません。server.js が動いているか、ポート(3001)を確認してください。'
      );
      setConnecting(false);
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [router]);

  const joinRoom = () => {
    if (!roomId.trim()) {
      setStatus('部屋IDを入力してください。');
      return;
    }
    if (!socket || !socket.connected) {
      setStatus('サーバーに接続されていません。');
      return;
    }
    setJoining(true);
    const trimmed = roomId.trim();
    setStatus(`部屋「${trimmed}」に参加します…`);

    // フリーマッチ用のイベント
    socket.emit('joinCustomRoom', {
      roomId: trimmed,
      username,
    });
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>🔁 フリー対戦</h1>
      <p>
        ユーザー: <b>{username}</b>
      </p>

      <p style={{ marginTop: 12 }}>
        友達と同じ部屋IDを入力すると、その友達とマッチングします。
      </p>

      <div style={{ marginTop: 16 }}>
        <label>部屋ID：</label>
        <br />
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={inputStyle}
          placeholder="例: 1122"
        />
      </div>

      <button
        onClick={joinRoom}
        disabled={connecting || joining}
        style={{
          marginTop: 16,
          padding: '10px 20px',
          backgroundColor: joining ? '#888' : '#00e0ff',
          color: '#000',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: 6,
          cursor: connecting || joining ? 'default' : 'pointer',
        }}
      >
        {joining ? '参加中…' : 'この部屋に入る'}
      </button>

      <p style={{ marginTop: 16 }}>{status}</p>
    </div>
  );
}

const containerStyle = {
  padding: 16,
  maxWidth: 600,
  margin: '0 auto',
  minHeight: '100vh',
  backgroundColor: '#e6f3ff',
  color: '#004a7f',
};

const titleStyle = {
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: 4,
};

const inputStyle = {
  marginTop: 4,
  padding: 8,
  width: '100%',
  maxWidth: 280,
  backgroundColor: '#fff',
  color: '#000',
  borderRadius: 4,
  border: '1px solid #888',
};
