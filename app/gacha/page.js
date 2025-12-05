// file: app/gacha/page.js
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const GACHA_COST = 500; // 1回あたりの消費ベリー


// ===============================
//  ガチャ演出用 HTML（iframe に流し込む）
//  ※ レア度ごとの枠色付き・横長カード版
// ===============================

const GACHA_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ガチャ演出（宝箱 → カード）</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #060712;
      color: #fff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .scene {
      position: relative;
      width: 460px;
      height: 320px;
      border-radius: 16px;
      background: radial-gradient(circle at 50% 0%, #555 0, #111 60%);
      overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.8);
    }

    .ground {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 35%;
      background: radial-gradient(circle at 50% -20%, #444 0, #111 60%);
    }

    .chest {
      position: absolute;
      bottom: 36px;
      left: 50%;
      transform: translateX(-50%);
      width: 170px;
      height: 120px;
      pointer-events: none;
      z-index: 5;
    }

    .chest-base {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 70%;
      background: linear-gradient(#7b4a16, #4e2e0d);
      border-radius: 0 0 18px 18px;
      border: 3px solid #321b07;
    }

    .chest-band {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 28px;
      height: 100%;
      background: linear-gradient(#d8b46a, #86601e);
    }

    .chest-lock {
      position: absolute;
      top: 35%;
      left: 50%;
      transform: translateX(-50%);
      width: 32px;
      height: 28px;
      border-radius: 0 0 12px 12px;
      background: #211106;
      border: 3px solid #d5b15f;
    }

    .chest-lid {
      position: absolute;
      bottom: 58px;
      left: 50%;
      transform-origin: bottom center;
      transform: translateX(-50%) rotate(0deg);
      width: 185px;
      height: 60px;
      background: linear-gradient(#8c571c, #5b3410);
      border-radius: 14px 14px 6px 6px;
      border: 3px solid #331c08;
    }

    .chest-lid-band {
      position: absolute;
      left: 50%;
      top: 0;
      transform: translateX(-50%);
      width: 30px;
      height: 100%;
      background: linear-gradient(#e1c076, #94712a);
    }

    /* ★6以上のダイヤ宝箱 */
    .chest-diamond .chest-base {
      background: linear-gradient(135deg, #b9f9ff, #ffffff, #ffe2ff);
      border-color: #ffffff;
      box-shadow: 0 0 16px rgba(255,255,255,0.9), 0 0 40px rgba(120,255,255,0.7);
    }

    .chest-diamond .chest-lid {
      background: linear-gradient(135deg, #c3ffff, #ffffff, #ffd4ff);
      border-color: #ffffff;
      box-shadow: 0 0 16px rgba(255,255,255,0.9), 0 0 36px rgba(120,255,255,0.7);
    }

    .chest-diamond .chest-band,
    .chest-diamond .chest-lid-band {
      background: linear-gradient(135deg, #ffe066, #ffd700, #fff4a8);
    }

    /* 横長カード本体 */
    .card {
      position: absolute;
      bottom: 72px;
      left: 50%;
      transform: translateX(-50%) translateY(60px) scale(0.9);
      width: 200px;
      height: 150px;
      background: #ffffff;
      border-radius: 14px;
      border: 4px solid #f5f5f5;
      box-shadow: 0 12px 24px rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      z-index: 10;
      box-sizing: border-box;
      padding: 10px 10px;
      text-align: center;
    }

    .card-stars {
      font-weight: 700;
      margin-bottom: 6px;
      color: #000;
      text-shadow: 0 1px 2px rgba(255,255,255,0.6);
      white-space: nowrap;
    }

    .card-name {
      font-size: 15px;
      font-weight: 600;
      color: #222;
      text-shadow: 0 1px 2px rgba(255,255,255,0.4);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    /* ★1〜6 は白背景、枠・光だけ変える */
    .card-r1 {
      border-color: #9e9e9e;
      background: linear-gradient(#ffffff, #f5f5f5);
      box-shadow: 0 6px 14px rgba(0,0,0,0.45);
    }

    .card-r2 {
      border-color: #4caf50;
      background: linear-gradient(#ffffff, #f5fff7);
      box-shadow: 0 7px 16px rgba(0,0,0,0.48);
    }

    .card-r3 {
      border-color: #e53935;
      background: linear-gradient(#ffffff, #ffecec);
      box-shadow: 0 7px 18px rgba(0,0,0,0.5);
    }

    .card-r4 {
      border-color: #d8d8d8;
      background: linear-gradient(#ffffff, #f7f7ff);
      box-shadow: 0 0 14px rgba(255,255,255,0.9), 0 0 26px rgba(210,210,255,0.8), 0 8px 20px rgba(0,0,0,0.65);
    }

    .card-r5 {
      border-color: #ffeb77;
      background: linear-gradient(#ffffff, #fff3c0);
      box-shadow: 0 0 18px rgba(255,230,150,1), 0 0 32px rgba(255,210,120,0.9), 0 10px 24px rgba(0,0,0,0.8);
    }

    /* ★6：白背景＋虹枠 */
    .card-r6 {
      border: 4px solid transparent;
      background-image:
        linear-gradient(#ffffff, #faf7ff),
        conic-gradient(from 0deg,#ff3366,#ffdd33,#33ff66,#33ddff,#9966ff,#ff33cc,#ff3366);
      background-origin: border-box;
      background-clip: padding-box, border-box;
      box-shadow: 0 0 16px rgba(255,255,255,0.9), 0 0 34px rgba(160,230,255,0.9), 0 12px 28px rgba(0,0,0,0.8);
    }

    /* ★7〜11：中身背景が銅〜ダイヤ、枠は虹 */
    .card-r7,
    .card-r8,
    .card-r9,
    .card-r10,
    .card-r11 {
      border: 4px solid transparent;
      background-origin: border-box;
      background-clip: padding-box, border-box;
      box-shadow: 0 0 20px rgba(255,255,255,0.95), 0 0 40px rgba(180,240,255,0.9), 0 14px 30px rgba(0,0,0,0.95);
    }

    .card-r7 {
      background-image:
        linear-gradient(135deg,#5a3214,#b97b3c),
        conic-gradient(from 0deg,#ff3366,#ffdd33,#33ff66,#33ddff,#9966ff,#ff33cc,#ff3366);
    }

    .card-r8 {
      background-image:
        linear-gradient(135deg,#f5f5f5,#c0c2c7),
        conic-gradient(from 0deg,#ff3366,#ffdd33,#33ff66,#33ddff,#9966ff,#ff33cc,#ff3366);
    }

    .card-r9 {
      background-image:
        linear-gradient(135deg,#fff7c8,#ffc93c),
        conic-gradient(from 0deg,#ff3366,#ffdd33,#33ff66,#33ddff,#9966ff,#ff33cc,#ff3366);
    }

    .card-r10 {
      background-image:
        linear-gradient(135deg,#f7fbff,#d3ddff),
        conic-gradient(from 0deg,#ff3366,#ffdd33,#33ff66,#33ddff,#9966ff,#ff33cc,#ff3366);
    }

    .card-r11 {
      background-image:
        radial-gradient(circle at 20% 0%,#ffffff,#e0ffff 40%,#ffe6ff 80%,#d0f7ff 100%),
        conic-gradient(from 0deg,#ff3366,#ffdd33,#33ff66,#33ddff,#9966ff,#ff33cc,#ff3366);
      box-shadow: 0 0 28px rgba(255,255,255,1), 0 0 64px rgba(160,255,255,0.98), 0 18px 36px rgba(0,0,0,1);
    }

    .glow {
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: 260px;
      height: 260px;
      opacity: 0;
      pointer-events: none;
      mix-blend-mode: screen;
      z-index: 3;
    }

    .glow-white {
      background: radial-gradient(circle,rgba(255,255,255,0.95),rgba(255,255,255,0) 70%);
      filter: blur(4px);
    }

    .glow-gold {
      background: radial-gradient(circle,rgba(255,230,150,1),rgba(255,230,150,0) 70%);
      filter: blur(4px);
    }

    .glow-rainbow {
      width: 440px;
      height: 440px;
      bottom: -40px;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 50%;
      opacity: 0;
      background-image:
        conic-gradient(from 270deg,rgba(255,0,120,0.95),rgba(255,150,0,0.95),rgba(255,255,0,0.95),
                       rgba(0,255,150,0.95),rgba(0,160,255,0.95),rgba(160,80,255,0.95),rgba(255,0,120,0.95)),
        repeating-conic-gradient(from 270deg,rgba(255,255,255,0.9) 0deg,rgba(255,255,255,0.0) 3deg,
                                 rgba(255,255,255,0.0) 10deg);
      filter: blur(5px);
      animation: rainbow-rays 1.2s ease-out forwards;
      box-shadow: 0 0 60px rgba(255,255,255,0.9), 0 0 120px rgba(255,255,200,0.8);
    }

    @keyframes rainbow-rays {
      0%   { opacity: 0; transform: translateX(-50%) scale(0.1); }
      35%  { opacity: 1; transform: translateX(-50%) scale(1.0); }
      100% { opacity: 0; transform: translateX(-50%) scale(1.4); }
    }

    @keyframes glow-pulse {
      0%   { transform: translateX(-50%) scale(0.7); opacity: 0; }
      20%  { opacity: 1; }
      60%  { transform: translateX(-50%) scale(1); }
      100% { opacity: 0.9; }
    }

    @keyframes chest-shake {
      0%   { transform: translateX(-50%) translateY(0); }
      25%  { transform: translateX(-52%) translateY(-2px); }
      50%  { transform: translateX(-48%) translateY(0); }
      75%  { transform: translateX(-51%) translateY(-1px); }
      100% { transform: translateX(-50%) translateY(0); }
    }

    @keyframes lid-open {
      0%   { transform: translateX(-50%) rotate(0deg); }
      40%  { transform: translateX(-50%) rotate(-25deg); }
      100% { transform: translateX(-50%) rotate(-55deg); }
    }

    .playing .chest-base {
      animation: chest-shake 0.6s ease-in-out 1;
    }

    .playing .chest-lid {
      animation: lid-open 0.7s ease-out forwards;
    }

    .playing.glow-white-mode .glow,
    .playing.glow-gold-mode  .glow {
      animation: glow-pulse 1.2s ease-out forwards;
    }

    @keyframes card-rise {
      0%   { opacity: 0; transform: translateX(-50%) translateY(60px) scale(0.9); }
      40%  { opacity: 1; transform: translateX(-50%) translateY(8px) scale(1); }
      100% { opacity: 1; transform: translateX(-50%) translateY(-6px) scale(1.04); }
    }

    .card.show {
      animation: card-rise 0.9s ease-out forwards;
    }
  </style>
</head>
<body>
  <div class="scene" id="scene">
    <div class="ground"></div>
    <div class="glow" id="glow"></div>

    <div class="card" id="card">
      <div class="card-stars" id="cardStars">★★★</div>
      <div class="card-name" id="cardName">キャラ名</div>
    </div>

    <div class="chest">
      <div class="chest-base">
        <div class="chest-band"></div>
        <div class="chest-lock"></div>
      </div>
      <div class="chest-lid">
        <div class="chest-lid-band"></div>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      const scene   = document.getElementById('scene');
      const glow    = document.getElementById('glow');
      const card    = document.getElementById('card');
      const chest   = document.querySelector('.chest');
      const starsEl = document.getElementById('cardStars');
      const nameEl  = document.getElementById('cardName');

      const rarityClasses = [];
      for (let i = 1; i <= 11; i++) rarityClasses.push('card-r' + i);

      let playing = false;

      function resetAnimation() {
        if (!scene) return;
        scene.classList.remove('playing', 'glow-white-mode', 'glow-gold-mode');
        glow.className = 'glow';
        card.classList.remove('show');
        chest.classList.remove('chest-diamond');
        rarityClasses.forEach(c => card.classList.remove(c));
      }

      function applyCardRarity(rarity) {
        let r = Math.max(1, Math.min(11, rarity | 0));
        rarityClasses.forEach(c => card.classList.remove(c));
        card.classList.add('card-r' + r);
      }

      function setupStarsStyle(stars) {
        if (stars <= 5) {
          starsEl.style.fontSize = "20px";
          starsEl.style.letterSpacing = "2px";
        } else if (stars <= 8) {
          starsEl.style.fontSize = "18px";
          starsEl.style.letterSpacing = "1.6px";
        } else {
          starsEl.style.fontSize = "16px";
          starsEl.style.letterSpacing = "1.2px";
        }
      }

      function playAnimationNormal(mode, stars, name) {
        if (playing) return;
        playing = true;

        stars = Math.max(1, Math.min(11, stars | 0));

        resetAnimation();
        applyCardRarity(stars);

        setupStarsStyle(stars);
        starsEl.textContent = "★".repeat(stars);
        nameEl.textContent  = name || ("★" + stars + "キャラ");

        let cardDelay = 450;
        let totalTime = 1600;

        if (mode === 'white') {
          glow.classList.add('glow-white');
          scene.classList.add('playing', 'glow-white-mode');
        } else if (mode === 'gold') {
          glow.classList.add('glow-gold');
          scene.classList.add('playing', 'glow-gold-mode');
        } else {
          glow.classList.add('glow-rainbow');
          scene.classList.add('playing');
          chest.classList.add('chest-diamond');
          cardDelay = 900;
          totalTime = 2100;
        }

        setTimeout(() => {
          card.classList.add('show');
        }, cardDelay);

        setTimeout(() => {
          playing = false;
          resetAnimation();
        }, totalTime);
      }

      function playAnimationStarUp(mode, fromStars, toStars, name) {
        if (playing) return;
        playing = true;

        fromStars = Math.max(1, Math.min(11, fromStars | 0));
        toStars   = Math.max(1, Math.min(11, toStars   | 0));
        if (toStars < fromStars) toStars = fromStars;

        resetAnimation();
        applyCardRarity(fromStars);

        setupStarsStyle(fromStars);
        starsEl.textContent = "★".repeat(fromStars);
        nameEl.textContent  = name || ("★" + toStars + "キャラ");

        let cardDelay = 450;
        let baseTime  = 1600;

        if (mode === 'white') {
          glow.classList.add('glow-white');
          scene.classList.add('playing', 'glow-white-mode');
        } else if (mode === 'gold') {
          glow.classList.add('glow-gold');
          scene.classList.add('playing', 'glow-gold-mode');
        } else {
          glow.classList.add('glow-rainbow');
          scene.classList.add('playing');
          chest.classList.add('chest-diamond');
          cardDelay = 900;
          baseTime  = 2100;
        }

        const starStepDelay = 220;
        const steps = Math.max(0, toStars - fromStars);

        setTimeout(() => {
          card.classList.add('show');
          if (steps > 0) {
            for (let s = fromStars + 1; s <= toStars; s++) {
              const value = s;
              setTimeout(() => {
                setupStarsStyle(value);
                starsEl.textContent = "★".repeat(value);
                if (value === toStars) {
                  applyCardRarity(toStars);
                }
              }, (value - fromStars) * starStepDelay);
            }
          }
        }, cardDelay);

        const totalTime = cardDelay + steps * starStepDelay + 800;
        setTimeout(() => {
          playing = false;
          resetAnimation();
        }, Math.max(baseTime, totalTime));
      }

      // 外部から呼ぶ API
      function playGacha(rarity, charName) {
        let mode = "white";
        if (rarity >= 3 && rarity <= 5) mode = "gold";
        if (rarity >= 6) mode = "rainbow";
        playAnimationNormal(mode, rarity, charName);
      }
      window.playGacha = playGacha;

      function playGachaStarUp(beforeStars, afterStars, charName) {
        let from = Math.max(1, Math.min(11, beforeStars | 0));
        let to   = Math.max(1, Math.min(11, afterStars  | 0));
        if (to < from) to = from;

        let mode = "white";
        if (from >= 3 && from <= 5) mode = "gold";
        if (from >= 6) mode = "rainbow";

        playAnimationStarUp(mode, from, to, charName);
      }
      window.playGachaStarUp = playGachaStarUp;
    });
  </script>
</body>
</html>`;


// ===============================
// レア度ごとの排出率（％）
// ===============================
const RARITY_WEIGHTS = {
  1: 40,
  2: 25,
  3: 15,
  4: 10,
  5: 6,
  6: 3,
  7: 1,
  8: 0,
  9: 0,
  10: 0,
  11: 0,
};

// 何枚で★+1にするか（暫定）
const STAR_UP_THRESHOLD = 1;

// 累積確率を作って、ルーレットでレア度を引く関数
function drawRarity() {
  const entries = Object.entries(RARITY_WEIGHTS);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const [rarityStr, weight] of entries) {
    acc += weight;
    if (r <= acc) return Number(rarityStr);
  }
  return Number(entries[entries.length - 1][0]);
}

export default function GachaPage() {
  const iframeRef = useRef(null);

  const [user, setUser] = useState(null);
  const [berries, setBerries] = useState(0);
  const [loadingUser, setLoadingUser] = useState(true);

  const [chars, setChars] = useState([]);
  const [loadingChars, setLoadingChars] = useState(true);

  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState(null);

  // 所持キャラ図鑑（ブラウザ側で保持）
  const [collection, setCollection] = useState({});

  // localStorage から所持情報読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('gachaCollection');
      if (raw) {
        setCollection(JSON.parse(raw));
      }
    } catch (e) {
      console.error('failed to load collection', e);
    }
  }, []);

  const saveCollection = (next) => {
    setCollection(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gachaCollection', JSON.stringify(next));
    }
  };

  // ユーザー情報取得（所持ベリー）
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        const u = data.user ?? null;
        setUser(u);
        setBerries(u?.berries ?? 0);
      } catch (e) {
        console.error('failed to load user', e);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  // キャラCSV読み込み
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/gacha/chars');
        const data = await res.json();
        if (data.ok && Array.isArray(data.chars)) {
          setChars(data.chars);
        } else {
          console.error('failed to load chars', data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingChars(false);
      }
    };
    load();
  }, []);

  // ★ここを async にして、サーバー側の図鑑登録＋ベリー消費もここでまとめてやる
  const handleDraw = async () => {
    if (spinning) return;

    if (loadingUser) {
      alert('ユーザー情報を読み込み中です。少し待ってからもう一度お試しください。');
      return;
    }
    if (!user) {
      alert('ガチャを引くにはログインが必要です。');
      return;
    }

    if (berries < GACHA_COST) {
      alert(
        `ベリーが足りません。\n所持：${berries} ベリー / 必要：${GACHA_COST} ベリー`
      );
      return;
    }

    if (loadingChars || chars.length === 0) {
      alert('キャラデータ読み込み中です。少し待ってからもう一度お試しください。');
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    const win = iframe.contentWindow;
    if (
      typeof win.playGacha !== 'function' &&
      typeof win.playGachaStarUp !== 'function'
    ) {
      console.warn('gacha animation functions are not ready');
      alert('ガチャ演出の読み込みに失敗しました。ページを再読み込みしてみてください。');
      return;
    }

    // 1. まずレア度を抽選
    const targetRarity = drawRarity();

    // 2. そのレア度のキャラからランダムに1体
    let pool = chars.filter((c) => c.rarity === targetRarity);

    let picked;
    if (pool.length > 0) {
      picked = pool[Math.floor(Math.random() * pool.length)];
    } else {
      picked = chars[Math.floor(Math.random() * chars.length)];
    }

    if (!picked) return;

    const baseRarity = picked.rarity;
    const name = picked.name;

    // ★アップ計算用の以前の状態（ローカルコレクションから）
    const prev = collection[picked.id];
    const prevCopies = prev?.copies ?? 0;
    const prevStars = prev?.stars ?? baseRarity;

    const newCopies = prevCopies + 1;

    const prevExtra = Math.floor(Math.max(0, prevCopies - 1) / STAR_UP_THRESHOLD);
    const newExtra = Math.floor(Math.max(0, newCopies - 1) / STAR_UP_THRESHOLD);

    let newStars = baseRarity + newExtra;
    if (newStars > 11) newStars = 11;

    const starUp = newStars > prevStars;

    const updatedRecord = {
      id: picked.id,
      name,
      baseRarity,
      copies: newCopies,
      stars: newStars,
    };

    const nextCollection = {
      ...collection,
      [picked.id]: updatedRecord,
    };

    // --------------- サーバー側：ベリー消費 + キャラ登録 ---------------
    try {
      const res = await fetch('/api/gacha/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charId: picked.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        console.error('gacha server error', data);
        alert(
          data.message ||
            data.error ||
            'ガチャ処理に失敗しました。時間をおいて再度お試しください。'
        );
        return;
      }

      // 成功 → サーバー側の最新所持ベリーを反映
      if (typeof data.berries === 'number') {
        setBerries(data.berries);
      }
    } catch (e) {
      console.error('failed to sync user characters / berries', e);
      alert('サーバーとの通信に失敗しました。ネットワーク状態を確認してください。');
      return;
    }

    // --------------- ローカル更新＆演出 ---------------
    saveCollection(nextCollection);

    setSpinning(true);
    setLast({ id: picked.id, name, rarity: newStars, copies: newCopies });

    if (starUp && typeof win.playGachaStarUp === 'function') {
      win.playGachaStarUp(prevStars, newStars, name);
    } else {
      win.playGacha(newStars, name);
    }

    setTimeout(() => setSpinning(false), 2600);
  };

  return (
    <main className="min-h-screen bg-sky-50 text-sky-900 flex flex-col items-center">
      {/* ヘッダー */}
      <header className="w-full max-w-3xl px-4 pt-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-widest">ガチャ</h1>
        <Link
          href="/mypage"
          className="text-sm font-bold text-sky-700 underline"
        >
          マイページへ戻る
        </Link>
      </header>

      <section className="w-full max-w-3xl px-4 mt-4 space-y-4 pb-10">
        {/* 所持ベリー＆説明 */}
        <div className="bg-white rounded-3xl shadow border border-sky-100 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">所持ベリー</div>
            <div className="text-2xl font-extrabold text-sky-800">
              {loadingUser ? '---' : berries}{' '}
              <span className="text-base font-bold">ベリー</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 text-right">
            1回 <b>{GACHA_COST} ベリー</b> で
            <br />
            キャラカードを1枚入手できます。
          </div>
        </div>

        {/* 演出エリア（タイトル文言は削除） */}
        <div className="bg-[#020617] rounded-[32px] shadow-xl px-6 py-6 flex flex-col items-center">
          <div className="w-full flex justify-center mb-5">
            <div className="w-[460px] max-w-full">
              <iframe
                ref={iframeRef}
                srcDoc={GACHA_HTML}
                title="gacha-animation"
                className="w-full h-[320px] border-0 rounded-2xl overflow-hidden bg-black"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleDraw}
            disabled={spinning || loadingChars || loadingUser}
            className="w-full max-w-xl py-3 rounded-full text-white font-bold text-sm
                       shadow-lg disabled:opacity-60
                       bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400"
          >
            {loadingChars || loadingUser
              ? '読み込み中…'
              : spinning
              ? '演出中…'
              : `${GACHA_COST} ベリーでガチャを引く`}
          </button>

          <p className="mt-3 text-[11px] text-slate-400 text-center">
            ※ ガチャを引くと 1 回につき {GACHA_COST} ベリー消費します。
          </p>
        </div>

        {/* 直近の結果 */}
        <div className="bg-white rounded-3xl shadow border border-sky-100 px-5 py-4">
          <h3 className="text-sm font-extrabold text-sky-900 mb-2">
            直近の結果
          </h3>
          {last ? (
            <p className="text-sm">
              {last.id != null && <>No.{last.id} ／ </>}
              {last.name} ／ {'★'.repeat(last.rarity)}
              {last.copies != null && <>（所持 {last.copies} 枚目）</>}
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              まだガチャを引いていません。
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
