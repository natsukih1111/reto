// file: app/my-team/page.js
'use client';

import { useEffect, useState } from 'react';

export default function MyTeamPage() {
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState(null);

  const [characters, setCharacters] = useState([]); // 図鑑
  const [teamIds, setTeamIds] = useState([]);       // ['123','496', ...] 文字列で管理

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ===== 初期ロード =====
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        setMessage('');

        // 1) /api/me からログイン中ユーザー取得
        const meRes = await fetch('/api/me');
        const meJson = await meRes.json();

        if (!meRes.ok || !meJson.user) {
          setError('ログイン情報の取得に失敗しました。ログインし直してください。');
          setLoading(false);
          return;
        }

        const uid = Number(meJson.user.id);
        setUserId(uid);

        // 2) 所持キャラ & マイチームを並行取得
        const [charsRes, teamRes] = await Promise.all([
          fetch(`/api/user/characters?user_id=${uid}`),
          fetch(`/api/user/team?user_id=${uid}`),
        ]);

        const charsJson = await charsRes.json();
        const teamJson = await teamRes.json();

        if (!charsRes.ok) {
          throw new Error(charsJson.error || 'キャラ一覧の取得に失敗しました');
        }
        if (!teamRes.ok) {
          throw new Error(teamJson.error || 'マイチームの取得に失敗しました');
        }

        // 所持キャラ（Supabase 版）
        const ownedChars = charsJson.characters || [];
        setCharacters(ownedChars);

        // マイチーム（character_id を文字列にそろえて保存）
        const team = teamJson.team || [];
        const ids = team.map((t) => String(t.character_id));
        setTeamIds(ids);
      } catch (e) {
        console.error(e);
        setError(e.message || '読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // 図鑑キャラをクリック → マイチームに追加 / 削除
  const toggleCharacter = (characterIdRaw) => {
    setMessage('');
    setError('');

    const idStr = String(characterIdRaw);

    // すでに入っている → 外す
    if (teamIds.includes(idStr)) {
      setTeamIds(teamIds.filter((id) => id !== idStr));
      return;
    }

    // 5人まで
    if (teamIds.length >= 5) {
      setError('マイチームは最大5体までです');
      return;
    }

    setTeamIds([...teamIds, idStr]);
  };

  // 保存ボタン
  const saveTeam = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      // 文字列ID → 数値ID にして送る
      const numericIds = teamIds
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n));

      const res = await fetch('/api/user/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          character_ids: numericIds,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'マイチームの保存に失敗しました');
      }

      setMessage('マイチームを保存しました！');
    } catch (e) {
      console.error(e);
      setError(e.message || 'マイチームの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 編成リセット（DB 上も空にする）
  const resetTeam = async () => {
    setTeamIds([]);
    await saveTeam(); // 空配列で保存 → user_teams 全削除と同じ
  };

  // 図鑑の中で、このキャラがマイチームに選ばれているか
  const isSelected = (characterId) =>
    teamIds.includes(String(characterId));

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#d8f1ff', // 薄い水色
        color: '#222',
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
              const cidStr = teamIds[slot]; // '123' みたいな文字列
              const char =
                characters.find(
                  (c) => String(c.character_id) === cidStr
                ) || null;

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
                          color: '#111',
                        }}
                      >
                        {char.name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#444',
                        }}
                      >
                        {/* Supabase 版: base_rarity / stars を使う */}
                        レア度: {char.base_rarity} / ★{char.stars}
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

          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={saveTeam}
              disabled={saving || !userId}
              style={{
                padding: '10px 20px',
                borderRadius: '999px',
                border: 'none',
                cursor: saving || !userId ? 'default' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                background:
                  saving || teamIds.length === 0 || !userId
                    ? '#b0c7de'
                    : 'linear-gradient(90deg, #4a8dff, #5bc5ff)',
                color: '#ffffff',
                opacity: saving ? 0.8 : 1,
              }}
            >
              {saving ? '保存中...' : 'この編成で保存する'}
            </button>

            <button
              type="button"
              onClick={resetTeam}
              style={{
                padding: '10px 16px',
                borderRadius: '999px',
                border: '1px solid #888',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              編成をリセットする
            </button>
          </div>
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

                // レア度に応じて枠色（base_rarity）
                const borderColor =
                  ch.base_rarity >= 7
                    ? '#ffb400'
                    : ch.base_rarity >= 5
                    ? '#ff7a7a'
                    : ch.base_rarity >= 3
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
                      レア度: {ch.base_rarity}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#555',
                      }}
                    >
                      ★ {ch.stars}
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
