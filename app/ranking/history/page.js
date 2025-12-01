// file: app/ranking/history/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const pageStyle = {
  minHeight: '100vh',
  backgroundColor: '#f3f4f6',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: '24px',
};

const cardStyle = {
  width: '100%',
  maxWidth: '800px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
  padding: '16px 20px 24px',
  color: '#111827',
};

const seasonItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  borderRadius: '10px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#e5e7eb',
  textDecoration: 'none',
  color: '#111827',
  backgroundColor: '#f9fafb',
};

const homeButtonStyle = {
  display: 'inline-block',
  marginTop: '20px',
  padding: '8px 16px',
  borderRadius: '9999px',
  backgroundColor: '#111827',
  color: '#ffffff',
  fontSize: '14px',
  textDecoration: 'none',
};

export default function RankingHistoryListPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ranking/history', { cache: 'no-store' });
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('ranking history list error', e);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>過去シーズン一覧を読み込み中です...</div>
      </div>
    );
  }

  if (!data || !Array.isArray(data.seasons)) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p>過去シーズン情報を取得できませんでした。</p>
          <Link href="/" style={homeButtonStyle}>
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  const seasons = data.seasons;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '4px',
          }}
        >
          過去シーズン一覧
        </h1>

        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
          見たいシーズンを選ぶと、そのシーズンの
          <span style={{ fontWeight: 600 }}>チャレンジモード</span>
          ランキングが見られます。
          <br />
          （レート戦の過去シーズンランキングは後日対応予定）
        </p>

        {seasons.length === 0 && (
          <p style={{ fontSize: '14px' }}>まだ記録のあるシーズンがありません。</p>
        )}

        <div style={{ marginTop: '8px', display: 'grid', gap: '8px' }}>
          {seasons.map((s) => (
            <Link
              key={s.seasonCode}
              href={`/ranking/history/${s.seasonCode}`}
              style={seasonItemStyle}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                  {s.seasonLabel}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  シーズンコード: {s.seasonCode}
                </div>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#2563eb',
                  fontWeight: 600,
                }}
              >
                ランキングを見る →
              </div>
            </Link>
          ))}
        </div>

        <Link href="/" style={homeButtonStyle}>
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
