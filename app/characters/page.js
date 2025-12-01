// file: app/characters/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ============================================================
   ★ 枠（★1〜5）はガチャ演出の card-r1〜card-r5 を完全再現
   ★6〜11 は虹枠 + 背景（銅/銀/金/プラチナ/ダイヤ）を完全再現
============================================================ */

// ★テキスト＆フォント（ガチャ演出と完全一致）
function getStarVisual(starsRaw) {
  const s = Math.max(1, Math.min(starsRaw ?? 1, 11));
  const stars = '★'.repeat(s);

  let sizeClass = 'text-base tracking-[0.2em]';
  if (s >= 6 && s <= 8) sizeClass = 'text-[13px] tracking-[0.16em]';
  if (s >= 9) sizeClass = 'text-[11px] tracking-[0.12em]';

  return { s, stars, sizeClass };
}

// ★1〜5 の枠（ガチャの card-r1〜5）
function getNormalCardClass(stars, selected) {
  const base =
    'relative rounded-3xl px-4 py-3 flex flex-col justify-between ' +
    'border-4 bg-white shadow-md transition-transform cursor-pointer ' +
    'hover:-translate-y-[1px]';

  const sel = selected
    ? ' ring-2 ring-sky-400 ring-offset-2 ring-offset-sky-50'
    : '';

  if (stars === 1)
    return (
      base +
      ' border-[#9e9e9e] bg-gradient-to-b from-[#ffffff] to-[#f5f5f5] ' +
      'shadow-[0_6px_14px_rgba(0,0,0,0.45)]' +
      sel
    );

  if (stars === 2)
    return (
      base +
      ' border-[#4caf50] bg-gradient-to-b from-[#ffffff] to-[#f5fff7] ' +
      'shadow-[0_7px_16px_rgba(0,0,0,0.48)]' +
      sel
    );

  if (stars === 3)
    return (
      base +
      ' border-[#e53935] bg-gradient-to-b from-[#ffffff] to-[#ffecec] ' +
      'shadow-[0_7px_18px_rgba(0,0,0,0.5)]' +
      sel
    );

  if (stars === 4)
    return (
      base +
      ' border-[#d8d8d8] bg-gradient-to-b from-[#ffffff] to-[#f7f7ff] ' +
      'shadow-[0_0_14px_rgba(255,255,255,0.9),0_0_26px_rgba(210,210,255,0.8),0_8px_20px_rgba(0,0,0,0.65)]' +
      sel
    );

  if (stars === 5)
    return (
      base +
      ' border-[#ffeb77] bg-gradient-to-b from-[#ffffff] to-[#fff3c0] ' +
      'shadow-[0_0_18px_rgba(255,230,150,1),0_0_32px_rgba(255,210,120,0.9),0_10px_24px_rgba(0,0,0,0.8)]' +
      sel
    );

  return base + sel;
}

// ★6〜11 の背景カラー（ガチャと完全一致）
function getRainbowInnerBg(stars) {
  if (stars === 6) return 'linear-gradient(#ffffff, #faf7ff)';
  if (stars === 7) return 'linear-gradient(135deg, #5a3214, #b97b3c)';
  if (stars === 8) return 'linear-gradient(135deg, #f5f5f5, #c0c2c7)';
  if (stars === 9) return 'linear-gradient(135deg, #fff7c8, #ffc93c)';
  if (stars === 10) return 'linear-gradient(135deg, #f7fbff, #d3ddff)';
  if (stars === 11)
    return 'radial-gradient(circle at 20% 0%, #ffffff, #e0ffff 40%, #ffe6ff 80%, #d0f7ff 100%)';
  return '';
}

/* ============================================================
   ページ本体
============================================================ */
export default function CharactersPage() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [teamIds, setTeamIds] = useState([]);
  const [sortMode, setSortMode] = useState('acquired'); // acquired | rarity | no

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /* ------------------------------
     ログインユーザー取得
  ------------------------------ */
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/me');
        const j = await r.json();
        setUser(j.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    load();
  }, []);

  /* ------------------------------
     キャラ & チーム取得
  ------------------------------ */
  useEffect(() => {
    if (!user) {
      setCharacters([]);
      setTeamIds([]);
      setLoadingData(false);
      return;
    }

    const load = async () => {
      try {
        setLoadingData(true);

        const uid = user.id;
        const [cR, tR] = await Promise.all([
          fetch(`/api/user/characters?user_id=${uid}`),
          fetch(`/api/user/team?user_id=${uid}`),
        ]);

        const cj = await cR.json();
        const tj = await tR.json();

        setCharacters(cj.characters || []);
        setTeamIds((tj.team || []).map((t) => t.character_id));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [user]);

  /* ------------------------------
     キャラクリック → マイチーム切替
  ------------------------------ */
  const toggleCharacter = (id) => {
    setError('');
    setMessage('');

    if (teamIds.includes(id)) {
      setTeamIds(teamIds.filter((x) => x !== id));
      return;
    }

    if (teamIds.length >= 5) {
      setError('マイチームは最大5体までです');
      return;
    }

    setTeamIds([...teamIds, id]);
  };

  /* ------------------------------
     マイチーム保存
  ------------------------------ */
  const saveTeam = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const r = await fetch('/api/user/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          character_ids: teamIds,
        }),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j.error || '保存に失敗');

      setMessage('マイチームを保存しました！');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------
     ソート後の配列
  ------------------------------ */
  const sorted = [...characters].sort((a, b) => {
    if (sortMode === 'rarity') {
      return b.star - a.star;
    }
    if (sortMode === 'no') {
      return (a.char_no ?? a.character_id) - (b.char_no ?? b.character_id);
    }
    // acquired（登録順） → id の昇順
    return a.id - b.id;
  });

  const isSelected = (id) => teamIds.includes(id);

  /* ============================================================
     UIレンダリング
  ============================================================ */

  if (loadingUser)
    return (
      <div className="min-h-screen flex items-center justify-center">
        読み込み中…
      </div>
    );
  if (!user) return <div className="p-10">ログインが必要です</div>;

  return (
    <div className="min-h-screen bg-sky-50 text-sky-900 flex flex-col items-center">
      <header className="w-full max-w-md px-4 pt-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-widest">キャラ図鑑</h1>
        <div className="flex gap-2">
          <Link
            href="/mypage"
            className="px-3 py-1 border border-sky-600 rounded-full bg-white"
          >
            マイページへ
          </Link>
          <Link
            href="/"
            className="px-3 py-1 border border-sky-600 rounded-full bg-white"
          >
            ホームへ
          </Link>
        </div>
      </header>

      <main className="w-full max-w-md px-4 pb-10 mt-4 space-y-6">
        {/* -------------------
            マイチーム（★先に表示）
        ------------------- */}
        <section className="bg-sky-100 border border-sky-500 p-4 rounded-3xl">
          <h2 className="font-bold text-lg mb-3">マイチーム（最大5体）</h2>

          {error && (
            <div className="bg-red-200 text-red-800 px-3 py-1 rounded mb-2">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-200 text-green-800 px-3 py-1 rounded mb-2">
              {message}
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 mb-3">
            {[0, 1, 2, 3, 4].map((i) => {
              const id = teamIds[i];
              const ch = characters.find((x) => x.character_id === id);

              return (
                <div
                  key={i}
                  className="rounded-xl border bg-white text-center px-1 py-2 text-[11px]"
                >
                  <div className="text-sky-600 mb-1">SLOT {i + 1}</div>
                  {ch ? (
                    <>
                      <div className="font-bold line-clamp-2">{ch.name}</div>
                      <div className="text-slate-600">
                        R{ch.rarity} / ★{ch.star}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500">未設定</div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={saveTeam}
            disabled={saving || teamIds.length === 0}
            className={`w-full py-2 rounded-full text-white font-bold ${
              saving || teamIds.length === 0
                ? 'bg-sky-300'
                : 'bg-sky-600 hover:brightness-110'
            }`}
          >
            {saving ? '保存中…' : 'この編成で保存する'}
          </button>
        </section>

        {/* -------------------
            所持キャラ + ソート
        ------------------- */}
        <section className="bg-sky-100 border border-sky-500 p-4 rounded-3xl">
          <h2 className="font-bold text-lg">所持キャラー一覧</h2>
          <p className="text-xs text-slate-600 mt-1">
            所持キャラ数：{characters.length} 体
          </p>

          {/* ソート切り替え */}
          <div className="flex gap-2 mt-3 text-sm">
            <button
              onClick={() => setSortMode('acquired')}
              className={`px-3 py-1 rounded-full border ${
                sortMode === 'acquired'
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-sky-700'
              }`}
            >
              入手順
            </button>
            <button
              onClick={() => setSortMode('rarity')}
              className={`px-3 py-1 rounded-full border ${
                sortMode === 'rarity'
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-sky-700'
              }`}
            >
              レア度順
            </button>
            <button
              onClick={() => setSortMode('no')}
              className={`px-3 py-1 rounded-full border ${
                sortMode === 'no'
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-sky-700'
              }`}
            >
              キャラNo.順
            </button>
          </div>

          {/* キャラ一覧 */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {sorted.map((ch) => {
              const { s, stars, sizeClass } = getStarVisual(ch.star);
              const selected = isSelected(ch.character_id);

              // ★6以上 → 虹枠専用
              if (s >= 6) {
                const innerBg = getRainbowInnerBg(s);
                return (
                  <div
                    key={ch.character_id}
                    onClick={() => toggleCharacter(ch.character_id)}
                    className="cursor-pointer"
                  >
                    <div
                      className={
                        'rounded-3xl p-[2px] shadow-md hover:-translate-y-[1px] transition-transform' +
                        (selected
                          ? ' ring-2 ring-sky-400 ring-offset-2 ring-offset-sky-50'
                          : '')
                      }
                      style={{
                        backgroundImage:
                          'conic-gradient(#ff3366,#ffdd33,#33ff66,#33ddff,#9966ff,#ff33cc,#ff3366)',
                      }}
                    >
                      <div
                        className="rounded-[22px] px-4 py-3 flex flex-col justify-between"
                        style={{ backgroundImage: innerBg }}
                      >
                        <div>
                          <div className="text-[11px] text-slate-600 mb-1">
                            No.{ch.char_no ?? ch.character_id}
                          </div>
                          <div className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">
                            {ch.name}
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between mt-2">
                          <span
                            className={
                              sizeClass +
                              ' font-bold text-amber-400 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]'
                            }
                          >
                            {stars}
                          </span>
                          <div className="text-[11px] text-right text-slate-600">
                            <div>元レア度：{ch.rarity}</div>
                            <div>現在★：{s}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ★1〜5（普通枠）
              const cardClass = getNormalCardClass(s, selected);

              return (
                <div
                  key={ch.character_id}
                  className={cardClass}
                  onClick={() => toggleCharacter(ch.character_id)}
                >
                  <div>
                    <div className="text-[11px] text-slate-600 mb-1">
                      No.{ch.char_no ?? ch.character_id}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">
                      {ch.name}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-2">
                    <span
                      className={
                        sizeClass +
                        ' font-bold text-amber-400 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]'
                      }
                    >
                      {stars}
                    </span>
                    <div className="text-[11px] text-right text-slate-600">
                      <div>元レア度：{ch.rarity}</div>
                      <div>現在★：{s}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
