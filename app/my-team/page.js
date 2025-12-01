// file: app/my-team/page.js
'use client';

import { useEffect, useState } from 'react';

// 仮のユーザーID（ここはログイン中ユーザーのIDに置き換えてください）
const USER_ID = 1;

export default function MyTeamPage() {
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState([]); // 図鑑
  const [teamIds, setTeamIds] = useState([]);       // [character_id,...]
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // 図鑑 & マイチームの読み込み
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        setMessage('');

        const [charsRes, teamRes] = await Promise.all([
          fetch(`/api/user/characters?user_id=${USER_ID}`),
          fetch(`/api/user/team?user_id=${USER_ID}`),
        ]);

        const charsJson = await charsRes.json();
        const teamJson = await teamRes.json();

        if (!charsRes.ok) {
          throw new Error(charsJson.error || 'キャラ一覧の取得に失敗しました');
        }
        if (!teamRes.ok) {
          throw new Error(teamJson.error || 'マイチームの取得に失敗しました');
        }

        setCharacters(charsJson.characters || []);

        const team = teamJson.team || [];
        setTeamIds(team.map((t) => t.character_id));
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // 図鑑キャラをクリック → マイチームに追加 / 削除
  const toggleCharacter = (characterId) => {
    setMessage('');
    setError('');

    // すでに入っている → 外す
    if (teamIds.includes(characterId)) {
      setTeamIds(teamIds.filter((id) => id !== characterId));
      return;
    }

    // 5人まで
    if (teamIds.length >= 5) {
      setError('マイチームは最大5体までです');
      return;
    }

    setTeamIds([...teamIds, characterId]);
  };

  // 保存ボタン
  const saveTeam = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      const res = await fetch('/api/user/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          character_ids: teamIds,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'マイチームの保存に失敗しました');
      }

      setMessage('マイチームを保存しました！');
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // 図鑑の中で、このキャラがマイチームに選ばれているか
  const isSelected = (characterId) => teamIds.includes(characterId);

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#d8f1ff', // 薄い水色
        color: '#222',              // 濃い文字色で見やすく
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '16px',
          }}
        >
          マイチーム編成
        </h1>

        <p style={{ marginBottom: '16px', fontSize: '14px' }}>
          所持キャラ図鑑から、最大 5 体までマイチームとして選択できます。
          対戦時のマッチング画面に表示されます（能力には影響しません）。
        </p>

        {/* メッセージ */}
        {error && (
          <div
            style={{
              marginBottom: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#ffe5e5',
              color: '#a00000',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}
        {message && (
          <div
            style={{
              marginBottom: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#e5ffe9',
              color: '#0a7a2a',
              fontSize: '14px',
            }}
          >
            {message}
          </div>
        )}

        {/* マイチーム表示 */}
        <section
          style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '12px',
            }}
          >
            現在のマイチーム（最大5体）
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {[0, 1, 2, 3, 4].map((slot) => {
              const cid = teamIds[slot];
              const char = characters.find((c) => c.character_id === cid);
              return (
                <div
                  key={slot}
                  style={{
                    borderRadius: '10px',
                    border: '2px solid #99c9ff',
                    backgroundColor: '#f5f8ff',
                    padding: '8px',
                    minHeight: '72px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      marginBottom: '4px',
                      color: '#555',
                    }}
                  >
                    SLOT {slot + 1}
                  </div>
                  {char ? (
                    <>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          marginBottom: '2px',
                        }}
                      >
                        {char.name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666',
                        }}
                      >
                        レア度: {char.rarity} / ★{char.star}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#888',
                      }}
                    >
                      （未設定）
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={saveTeam}
            disabled={saving}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              background:
                saving || teamIds.length === 0
                  ? '#b0c7de'
                  : 'linear-gradient(90deg, #4a8dff, #5bc5ff)',
              color: '#ffffff',
              opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? '保存中...' : 'この編成で保存する'}
          </button>
        </section>

        {/* 図鑑一覧 */}
        <section
          style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '12px',
            }}
          >
            所持キャラ図鑑
          </h2>

          {loading ? (
            <div style={{ fontSize: '14px', color: '#555' }}>読み込み中...</div>
          ) : characters.length === 0 ? (
            <div style={{ fontSize: '14px', color: '#555' }}>
              まだキャラを所持していません。ガチャを引いてみましょう。
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px',
              }}
            >
              {characters.map((ch) => {
                const selected = isSelected(ch.character_id);

                // レア度に応じて枠を少し変える（派手すぎない程度に）
                const borderColor =
                  ch.rarity >= 7
                    ? '#ffb400'
                    : ch.rarity >= 5
                    ? '#ff7a7a'
                    : ch.rarity >= 3
                    ? '#7ab0ff'
                    : '#cccccc';

                return (
                  <button
                    key={ch.character_id}
                    onClick={() => toggleCharacter(ch.character_id)}
                    style={{
                      textAlign: 'left',
                      borderRadius: '10px',
                      border: selected
                        ? `3px solid #3b8cff`
                        : `2px solid ${borderColor}`,
                      backgroundColor: selected ? '#e5f1ff' : '#fdfdfd',
                      padding: '8px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        marginBottom: '4px',
                        color: '#222',
                      }}
                    >
                      {ch.name}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#555',
                        marginBottom: '2px',
                      }}
                    >
                      レア度: {ch.rarity}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#555',
                      }}
                    >
                      ★ {ch.star}
                    </div>
                    {selected && (
                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '11px',
                          color: '#0a5ec2',
                          fontWeight: 'bold',
                        }}
                      >
                        マイチームに選択中
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
