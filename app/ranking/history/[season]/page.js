// file: app/ranking/history/[season]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

const tabContainerStyle = {
  display: 'flex',
  gap: '8px',
  marginTop: '8px',
  marginBottom: '16px',
};

const baseTab = {
  flex: 1,
  padding: '8px 0',
  borderRadius: '9999px',
  borderWidth: '1px',
  borderStyle: 'solid',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
};

const tabStyle = {
  ...baseTab,
  backgroundColor: '#e5e7eb',
  color: '#111827',
  borderColor: '#d1d5db',
};

const activeTabStyle = {
  ...baseTab,
  backgroundColor: '#111827',
  color: '#ffffff',
  borderColor: '#111827',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '8px',
  fontSize: '14px',
};

const thStyle = {
  textAlign: 'left',
  padding: '6px 4px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '12px',
  color: '#6b7280',
};

const tdStyle = {
  padding: '6px 4px',
  borderBottom: '1px solid #f3f4f6',
};

const tdRight = {
  ...tdStyle,
  textAlign: 'right',
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

export default function RankingHistorySeasonPage() {
  const params = useParams();
  const season = params?.season;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('challenge');

  useEffect(() => {
    if (!season) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/ranking/history/${season}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('ranking history season error', e);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [season]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>シーズン情報を読み込み中です...</div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p>シーズン情報を取得できませんでした。</p>
          <Link href="/ranking/history" style={homeButtonStyle}>
            過去シーズン一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const rateRanking = data.rateRanking ?? [];
  const challengeRanking = data.challengeRanking ?? [];

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
          {data.seasonLabel} ランキング
        </h1>

        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
          {data.ymLabel ? `${data.ymLabel} の記録` : '過去シーズンの記録'}
        </p>

        <div style={tabContainerStyle}>
          <button
            type="button"
            style={activeTab === 'rate' ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab('rate')}
          >
            レート戦
          </button>
          <button
            type="button"
            style={activeTab === 'challenge' ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab('challenge')}
          >
            チャレンジモード
          </button>
        </div>

        {/* ▼ レート戦タブ */}
        {activeTab === 'rate' && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
              レート戦 TOP10
            </h2>

            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>順位</th>
                  <th style={thStyle}>名前</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>レート</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>勝ち</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>負け</th>
                </tr>
              </thead>
              <tbody>
                {rateRanking.length === 0 && (
                  <tr>
                    <td style={tdStyle} colSpan={5}>
                      データなし
                    </td>
                  </tr>
                )}

                {rateRanking.map((u) => {
                  const name =
                    (u.display_name && u.display_name.trim().length > 0
                      ? u.display_name
                      : u.username) ||
                    u.name ||
                    '名無し';

                  return (
                    <tr key={u.user_id}>
                      <td style={tdStyle}>{u.rank}</td>
                      <td style={tdStyle}>{name}</td>
                      <td style={tdRight}>{u.rating}</td>
                      <td style={tdRight}>{u.wins ?? 0}</td>
                      <td style={tdRight}>{u.losses ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ▼ チャレンジモードタブ */}
        {activeTab === 'challenge' && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
              チャレンジモード TOP10
            </h2>

            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>順位</th>
                  <th style={thStyle}>名前</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>正解数</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>ミス</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>レート</th>
                </tr>
              </thead>
              <tbody>
                {challengeRanking.length === 0 && (
                  <tr>
                    <td style={tdStyle} colSpan={5}>
                      データなし
                    </td>
                  </tr>
                )}

                {challengeRanking.map((u) => (
                  <tr key={u.user_id}>
                    <td style={tdStyle}>{u.rank}</td>
                    <td style={tdStyle}>{u.name}</td>
                    <td style={tdRight}>{u.best_correct}</td>
                    <td style={tdRight}>{u.best_miss}</td>
                    <td style={tdRight}>{u.rating ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Link href="/ranking/history" style={homeButtonStyle}>
          過去シーズン一覧に戻る
        </Link>
      </div>
    </div>
  );
}
