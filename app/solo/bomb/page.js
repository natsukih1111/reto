// file: app/solo/bomb/page.js
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import QuestionReviewAndReport from '@/components/QuestionReviewAndReport';

// 1問あたりの制限時間（40秒）
const BOMB_TIME_MS = 40 * 1000;
const INITIAL_LIFE = 3;
const MAX_LIFE = 3;
const LIFE_RECOVERY_INTERVAL = 5; // 5個解除ごとに +1 ライフ
const RESULT_DELAY_MS = 1500; // 正解／爆発後のインターバル

// 爆弾ごとの画像とタイマー位置・サイズ調整（px / 倍率）
const BOMB_VARIANTS = [
  { src: '/solo_bomb/bomb1.PNG', timerOffsetX: 0, timerOffsetY: 20, timerScale: 0.5 },
  { src: '/solo_bomb/bomb2.PNG', timerOffsetX: -2, timerOffsetY: 16, timerScale: 0.45 },
  { src: '/solo_bomb/bomb3.PNG', timerOffsetX: -5, timerOffsetY: 16, timerScale: 0.6 },
  { src: '/solo_bomb/bomb4.PNG', timerOffsetX: 0, timerOffsetY: 10, timerScale: 0.5 },
  { src: '/solo_bomb/bomb5.PNG', timerOffsetX: -1, timerOffsetY: 39, timerScale: 0.4 },
  { src: '/solo_bomb/bomb6.PNG', timerOffsetX: 3, timerOffsetY: 25, timerScale: 0.5 },
  { src: '/solo_bomb/bomb7.PNG', timerOffsetX: -4, timerOffsetY: 14, timerScale: 0.5 },
  { src: '/solo_bomb/bomb8.PNG', timerOffsetX: 3, timerOffsetY: 15, timerScale: 0.45 },
  { src: '/solo_bomb/bomb9.PNG', timerOffsetX: 0, timerOffsetY: 18, timerScale: 0.5 },
  { src: '/solo_bomb/bomb10.PNG', timerOffsetX: 0, timerOffsetY: 14, timerScale: 0.6 },
  { src: '/solo_bomb/bomb11.PNG', timerOffsetX: -3, timerOffsetY: 20, timerScale: 0.7 },
  { src: '/solo_bomb/bomb12.PNG', timerOffsetX: -11, timerOffsetY: 22, timerScale: 0.5 },
  { src: '/solo_bomb/bomb13.PNG', timerOffsetX: -6, timerOffsetY: 15, timerScale: 0.5 },
  { src: '/solo_bomb/bomb14.PNG', timerOffsetX: -4, timerOffsetY: 1, timerScale: 0.65 },
  { src: '/solo_bomb/bomb15.PNG', timerOffsetX: -8, timerOffsetY: 8, timerScale: 0.7 },
  { src: '/solo_bomb/bomb16.PNG', timerOffsetX: -10, timerOffsetY: 16, timerScale: 0.4 },
  { src: '/solo_bomb/bomb17.PNG', timerOffsetX: -3, timerOffsetY: 10, timerScale: 0.35 },
  { src: '/solo_bomb/bomb18.PNG', timerOffsetX: -21, timerOffsetY: 37, timerScale: 0.4 },
  { src: '/solo_bomb/bomb19.PNG', timerOffsetX: -7, timerOffsetY: 9, timerScale: 0.5 },
  { src: '/solo_bomb/bomb20.PNG', timerOffsetX: -14, timerOffsetY: 30, timerScale: 0.5 },
  { src: '/solo_bomb/bomb21.PNG', timerOffsetX: -19, timerOffsetY: 15, timerScale: 0.45 },
];

// コードの色
const WIRE_COLORS = ['#f97373', '#60a5fa', '#34d399', '#facc15', '#a855f7', '#fb923c'];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 選択肢数に応じて円形に配置する座標（0〜100 の正規化）
function getRadialPositions(count, radius) {
  if (count <= 0) return [];
  const centerX = 50;
  const centerY = 50;
  const step = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2; // 上からスタート

  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = startAngle + step * i;
    let x = centerX + radius * Math.cos(angle);
    let y = centerY + radius * Math.sin(angle);

    x = Math.min(90, Math.max(10, x));
    y = Math.min(90, Math.max(10, y));

    positions.push({ x, y });
  }
  return positions;
}

export default function BombSoloPage() {
  const [status, setStatus] = useState('loading'); // loading | playing | resolving | finished
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [cutFlags, setCutFlags] = useState([]);
  const [cuttingIndex, setCuttingIndex] = useState(null); // 今まさに「チョキン！」中の線

  const [life, setLife] = useState(INITIAL_LIFE);
  const [clearedCount, setClearedCount] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const [remainingMs, setRemainingMs] = useState(BOMB_TIME_MS);
  const [lastResult, setLastResult] = useState(null);
  const [message, setMessage] = useState('');

  const [answerHistory, setAnswerHistory] = useState([]);
  const [errorText, setErrorText] = useState('');

  const [bombVariant, setBombVariant] = useState(null);
  const [bombAnim, setBombAnim] = useState('idle'); // idle | cut | defuse | explode
  const [isMobile, setIsMobile] = useState(false);

  // 爆弾巡回（画像は21種を一巡するまで被らない）
  const bombCycleIndexRef = useRef(0);

  const getNextBombVariant = () => {
    if (!BOMB_VARIANTS.length) return null;
    const idx = bombCycleIndexRef.current % BOMB_VARIANTS.length;
    bombCycleIndexRef.current = (idx + 1) % BOMB_VARIANTS.length;
    return BOMB_VARIANTS[idx];
  };

  // 画面幅でモバイル判定
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      setIsMobile(window.innerWidth < 480);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 自己ベスト読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('bomb_best_score');
      const n = raw ? Number(raw) : 0;
      if (!Number.isNaN(n) && n > 0) setBestScore(n);
    } catch {
      // 無視
    }
  }, []);

  // 問題取得
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch('/api/solo/bomb-questions', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));

        if (!data.ok) {
          setErrorText(data.error || '問題の取得に失敗しました。');
          setStatus('finished');
          return;
        }
        if (!data.questions || data.questions.length === 0) {
          setErrorText('使える問題がありません。');
          setStatus('finished');
          return;
        }

        // ★ 最初に一度シャッフルしておく
        const list = shuffle(data.questions);
        setQuestions(list);
        setupBomb(list, 0); // 1問目もランダムになる
        setLife(INITIAL_LIFE);
        setClearedCount(0);
        setAnswerHistory([]);
        setMessage('');
        setStatus('playing');
      } catch (e) {
        console.error('[bomb] fetch error', e);
        setErrorText('問題の取得に失敗しました。');
        setStatus('finished');
      }
    };

    fetchQuestions();
  }, []);

  const setupBomb = (list, index) => {
    const qCount = list.length;
    if (qCount === 0) return;

    const safeIndex = ((index % qCount) + qCount) % qCount;
    const q = list[safeIndex];

    const shuffled = shuffle(
      q.options.map((text, originalIndex) => ({
        text,
        originalIndex,
      })),
    );

    setCurrentIndex(safeIndex);
    setShuffledOptions(shuffled);
    setStepIndex(0);
    setCutFlags(new Array(shuffled.length).fill(false));
    setCuttingIndex(null);
    setRemainingMs(BOMB_TIME_MS);
    setLastResult(null);
    setBombVariant(getNextBombVariant());
    setBombAnim('idle');
  };

  // タイマー
  useEffect(() => {
    if (status !== 'playing') return;
    if (!questions.length) return;

    const id = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 25;
        if (next <= 0) {
          clearInterval(id);
          handleBombEnd(false, '時間切れ！爆弾が爆発した…', true);
          return 0;
        }
        return next;
      });
    }, 25);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, questions, currentIndex]);

  const handleBombEnd = (success, msg, isTimeout = false) => {
    if (status !== 'playing') return;

    const q = questions[currentIndex];
    if (!q) return;

    setStatus('resolving');
    setLastResult(success ? 'success' : 'fail');
    setMessage(msg);
    setBombAnim(success ? 'defuse' : 'explode');

    const correctOrderText = q.options.join(' → ');
    let userOrderText = '';
    if (success) {
      userOrderText = q.options.join(' → ');
    } else if (isTimeout) {
      userOrderText = '（時間切れ）';
    } else {
      userOrderText = '（誤ったコードを切った）';
    }

    setAnswerHistory((prev) => [
      ...prev,
      {
        question_id: q.id,
        text: q.text,
        userAnswerText: userOrderText,
        correctAnswerText: correctOrderText,
      },
    ]);

    if (success) {
      setClearedCount((prev) => {
        const next = prev + 1;
        if (next > 0 && next % LIFE_RECOVERY_INTERVAL === 0) {
          setLife((lifePrev) => Math.min(MAX_LIFE, lifePrev + 1));
        }
        return next;
      });
    } else {
      setLife((prevLife) => {
        const nextLife = prevLife - 1;
        if (nextLife <= 0) return 0;
        return nextLife;
      });
    }

    // ★ 次の問題は「今の index+1」を使う（問題リストを一周するまで被らない）
    const nextIndex = (currentIndex + 1) % questions.length;

    setTimeout(() => {
      setRemainingMs(BOMB_TIME_MS);

      setLife((currentLife) => {
        if (currentLife <= 0 && !success) {
          finishGame();
          return currentLife;
        }

        setupBomb(questions, nextIndex);
        setStatus('playing');
        setMessage('');
        setLastResult(null);
        return currentLife;
      });
    }, RESULT_DELAY_MS);
  };

  const finishGame = () => {
    setStatus('finished');

    setBestScore((prev) => {
      const next = clearedCount > prev ? clearedCount : prev;
      if (next > prev && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('bomb_best_score', String(next));
        } catch {
          // 無視
        }
      }
      return next;
    });

    fetch('/api/solo/titles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'bomb', value: clearedCount }),
    }).catch(() => {});
  };

  // ★ ここがさっき抜けてた restartGame
  const restartGame = () => {
    if (!questions.length) {
      if (typeof window !== 'undefined') {
        window.location.href = '/solo/bomb';
      }
      return;
    }
    const reshuffled = shuffle(questions);
    setQuestions(reshuffled);
    setLife(INITIAL_LIFE);
    setClearedCount(0);
    setAnswerHistory([]);
    setMessage('');
    setRemainingMs(BOMB_TIME_MS);
    setLastResult(null);
    setupBomb(reshuffled, 0); // 1問目も毎回ランダム
    setStatus('playing');
  };

  const handleOptionClick = (index) => {
    if (status !== 'playing') return;
    const q = questions[currentIndex];
    if (!q) return;

    const option = shuffledOptions[index];
    if (!option || cutFlags[index]) return;

    const isCorrect = option.originalIndex === stepIndex;
    if (!isCorrect) {
      handleBombEnd(false, '違うコードを切ってしまった…！');
      return;
    }

    // 正しいコードを切った → 線を「チョキン！」演出してから消す
    setBombAnim('cut');
    setCuttingIndex(index);

    const newFlags = [...cutFlags];
    newFlags[index] = true;
    setCutFlags(newFlags);

    // アニメ後に cuttingIndex をリセット → 線が完全に消える
    setTimeout(() => {
      setCuttingIndex((curr) => (curr === index ? null : curr));
    }, 260);

    const nextStep = stepIndex + 1;
    if (nextStep >= shuffledOptions.length) {
      handleBombEnd(true, '爆弾解除成功！');
    } else {
      setStepIndex(nextStep);
    }
  };

  const totalCentis = Math.max(0, Math.floor(remainingMs / 10));
  const seconds = Math.floor(totalCentis / 100);
  const centis = totalCentis % 100;
  const timerText = `${seconds.toString().padStart(2, '0')}:${centis
    .toString()
    .padStart(2, '0')}`;

  const bombGlowClass =
    bombAnim === 'explode'
      ? 'bomb-glow-explode'
      : bombAnim === 'defuse'
      ? 'bomb-glow-defuse'
      : bombAnim === 'cut'
      ? 'bomb-glow-cut'
      : 'bomb-glow-idle';

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-md mx-auto px-4 py-8">
          <p className="text-sm">問題を読み込み中...</p>
          <div className="mt-4">
            <Link
              href="/"
              className="text-xs underline text-sky-300 hover:text-sky-200"
            >
              ホームへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'finished') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="w-full max-w-5xl mx-auto px-3 pb-8 space-y-4 pt-6">
          <div className="max-w-md mx-auto bg-slate-900/85 border border-slate-600 rounded-2xl shadow-xl p-4 sm:p-6 text-slate-50">
            <h2 className="text-lg sm:text-xl font-bold mb-2">
              爆弾解除（並び替え） 結果
            </h2>

            {errorText ? (
              <p className="text-sm text-red-300 mb-2">{errorText}</p>
            ) : (
              <p className="text-sm text-slate-100 mb-3">
                ライフが0になったため、今回の爆弾解除は終了です。
              </p>
            )}

            <div className="space-y-1 text-sm">
              <p>
                解除した爆弾：{' '}
                <span className="font-semibold text-amber-300">
                  {clearedCount} 個
                </span>
              </p>
              <p>
                このブラウザでの自己ベスト：{' '}
                <span className="font-semibold text-emerald-300">
                  {bestScore}
                </span>
              </p>
            </div>

            {message && (
              <p className="text-xs text-slate-300 mt-2">{message}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={restartGame}
                className="px-4 py-2 rounded-full bg-fuchsia-500 text-white text-sm font-semibold hover:bg-fuchsia-400"
              >
                もう一度挑戦
              </button>
              <Link
                href="/solo"
                className="px-4 py-2 rounded-full border border-slate-500 bg-slate-800 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                ソロメニューへ戻る
              </Link>
              <Link
                href="/solo/bomb/rules"
                className="px-4 py-2 rounded-full border border-slate-500 bg-slate-800 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                ルールを見る
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded-full border border-slate-500 bg-slate-800 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                ホームへ戻る
              </Link>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <QuestionReviewAndReport
              questions={answerHistory}
              sourceMode="solo-bomb"
            />
          </div>
        </div>
      </main>
    );
  }

  const currentQuestion = questions[currentIndex];
  const timerOffsetX = bombVariant?.timerOffsetX ?? 0;
  const timerOffsetY = bombVariant?.timerOffsetY ?? 0;
  const timerScale = bombVariant?.timerScale ?? 1;

  const radius = isMobile ? 36 : 42;
  const radialPositions = getRadialPositions(shuffledOptions.length, radius);
  const centerX = 50;
  const centerY = 50;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-3xl mx-auto px-3 py-4 sm:py-6">
        {/* 上部バー */}
        <div className="flex items-center justify-between text-xs text-slate-200 mb-2">
          <Link
            href="/"
            className="underline text-sky-300 hover:text-sky-200"
          >
            ホームへ戻る
          </Link>
          <div className="flex items-center gap-3">
            <span>
              ライフ:{' '}
              <span className="text-rose-300 font-semibold">
                {'💣'.repeat(life)}
              </span>
            </span>
            <span>
              解除数:{' '}
              <span className="font-semibold text-amber-300">
                {clearedCount}
              </span>
            </span>
            <span>
              ベスト:{' '}
              <span className="font-semibold text-emerald-300">
                {bestScore}
              </span>
            </span>
          </div>
        </div>

        {/* 問題文 */}
        <div className="bg-slate-900 border border-slate-600 rounded-2xl px-3 py-2 mb-3">
          {lastResult === 'fail' ? (
            <>
              <p className="text-xs font-bold text-rose-300 mb-1">
                ❌ 正解はこちら
              </p>
              <p className="text-xs text-slate-100">
                {currentQuestion?.options.join(' → ') ?? ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-slate-200 mb-1">
                並び替え問題
              </p>
              <p className="text-sm text-slate-50">
                {currentQuestion?.text || ''}
              </p>
            </>
          )}
        </div>

        {/* 爆弾＋コード＋選択肢 */}
        <div className="relative mx-auto mt-4 mb-4 w-full max-w-xl aspect-square">
          {/* コード（背面） */}
          <svg
            className="pointer-events-none absolute inset-0 z-0"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {shuffledOptions.map((_, idx) => {
              const pos = radialPositions[idx];
              if (!pos) return null;

              const isCut = cutFlags[idx];

              // 完全に切れていて、アニメも終わっている → 一切描画しない
              if (isCut && cuttingIndex !== idx) {
                return null;
              }

              const dx = pos.x - centerX;
              const dy = pos.y - centerY;
              const baseLen = Math.hypot(dx, dy) || 1;

              const startFactor = 0.25;
              const endFactor = 0.9;
              const t1 = 0.45;
              const t2 = 0.8;

              const sx = centerX + (dx / baseLen) * baseLen * startFactor;
              const sy = centerY + (dy / baseLen) * baseLen * startFactor;
              const ex = centerX + (dx / baseLen) * baseLen * endFactor;
              const ey = centerY + (dy / baseLen) * baseLen * endFactor;

              const perpSign = idx % 2 === 0 ? 1 : -1;
              const amp1 = isCut ? 2 : 4;
              const amp2 = isCut ? 1.5 : 3;

              const bx1 = centerX + (dx / baseLen) * baseLen * t1;
              const by1 = centerY + (dy / baseLen) * baseLen * t1;
              const bx2 = centerX + (dx / baseLen) * baseLen * t2;
              const by2 = centerY + (dy / baseLen) * baseLen * t2;

              const perpX = (-dy / baseLen) * perpSign;
              const perpY = (dx / baseLen) * perpSign;

              const cx1 = bx1 + perpX * amp1;
              const cy1 = by1 + perpY * amp1;
              const cx2 = bx2 + perpX * amp2;
              const cy2 = by2 + perpY * amp2;

              const pathD = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
              const color = WIRE_COLORS[idx % WIRE_COLORS.length];
              const isCutting = cuttingIndex === idx;

              return (
                <g key={idx}>
                  {/* 影 */}
                  <path
                    d={pathD}
                    stroke="rgba(15,23,42,0.9)"
                    strokeWidth={4}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.9}
                  />
                  {/* 本体（カット時に dash アニメ） */}
                  <path
                    d={pathD}
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    fill="none"
                    className={isCutting ? 'wire-cutting' : ''}
                  />
                  {/* ハイライト */}
                  <path
                    d={pathD}
                    stroke="rgba(248,250,252,0.7)"
                    strokeWidth={1}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.7}
                    className={isCutting ? 'wire-cutting' : ''}
                  />
                  {/* チョキン！の火花 */}
                  {isCutting && (
                    <circle
                      cx={ex}
                      cy={ey}
                      r={2.3}
                      className="wire-spark"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* 爆弾（位置・サイズは固定） */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48 rounded-full ${bombGlowClass} z-20`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {bombVariant ? (
                <img
                  src={bombVariant.src}
                  alt="bomb"
                  className="max-w-full max-h-full drop-shadow-[0_0_18px_rgba(0,0,0,0.8)]"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-800 border-4 border-fuchsia-500" />
              )}
            </div>

            {/* タイマー */}
            <div
              className="absolute z-30 flex flex-col items-center justify-center rounded-lg bg-slate-950 border border-slate-200 shadow-[0_0_12px_rgba(15,23,42,0.9)]"
              style={{
                transform: `translate(${timerOffsetX}px, ${timerOffsetY}px) scale(${timerScale})`,
                padding: '0.4rem 1rem',
              }}
            >
              <div className="text-[10px] text-slate-200 mb-0.5 tracking-[0.2em]">
                TIME
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold">
                {timerText}
              </div>
            </div>

            {bombAnim === 'explode' && (
              <>
                <div className="absolute inset-0 rounded-full explosion-flash pointer-events-none" />
                <div className="absolute -top-6 w-16 h-16 smoke-cloud pointer-events-none" />
              </>
            )}
          </div>

          {/* 選択肢（円形配置） */}
          {shuffledOptions.map((opt, idx) => {
            const isCut = cutFlags[idx];
            const pos = radialPositions[idx] || { x: 50, y: 90 };

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleOptionClick(idx)}
                disabled={status !== 'playing' || isCut || !currentQuestion}
                className={`absolute -translate-x-1/2 -translate-y-1/2 text-xs sm:text-sm px-4 py-2 rounded-2xl border text-center z-30
                  ${
                    isCut
                      ? 'bg-emerald-600 border-emerald-400 text-slate-50 opacity-85'
                      : 'bg-slate-900 border-slate-600 text-slate-50 hover:bg-slate-800'
                  }
                  ${
                    status !== 'playing'
                      ? 'opacity-60 cursor-default'
                      : ''
                  }
                `}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  minWidth: isMobile ? '100px' : '120px',
                  maxWidth: isMobile ? '140px' : '170px',
                  whiteSpace: 'normal',
                }}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        {message && (
          <p className="text-xs text-slate-200 mb-2">{message}</p>
        )}

        <p className="text-[11px] text-slate-400">
          正しい順にコードを切って爆弾を解除しよう。間違ったコードを1本でも切ると、その場で爆発します。
        </p>

        {/* 演出用CSS */}
        <style jsx>{`
          .bomb-glow-idle {
            box-shadow: 0 0 24px rgba(236, 72, 153, 0.4);
            transition: box-shadow 0.2s ease, transform 0.2s ease;
          }
          .bomb-glow-cut {
            box-shadow: 0 0 24px rgba(52, 211, 153, 0.7);
            transition: box-shadow 0.2s ease, transform 0.2s ease;
          }
          .bomb-glow-explode {
            animation: bombExplode 0.45s ease-out;
          }
          .bomb-glow-defuse {
            animation: bombDefuse 0.55s ease-out;
          }
          .explosion-flash {
            background: radial-gradient(
              circle,
              rgba(252, 211, 77, 0.95) 0%,
              rgba(248, 113, 113, 0.85) 30%,
              rgba(15, 23, 42, 0) 70%
            );
            animation: explosionFlash 0.4s ease-out;
          }
          .smoke-cloud {
            background: radial-gradient(
              circle,
              rgba(148, 163, 184, 0.9) 0%,
              rgba(148, 163, 184, 0.4) 40%,
              rgba(15, 23, 42, 0) 80%
            );
            opacity: 0;
            animation: smokeRise 0.8s ease-out forwards;
          }

          /* 線をチョキン！と切るアニメーション */
          .wire-cutting {
            stroke-dasharray: 120;
            stroke-dashoffset: 0;
            animation: wireCut 0.25s ease-out forwards;
          }
          .wire-spark {
            fill: #fef3c7;
            stroke: #fbbf24;
            stroke-width: 0.4;
            animation: sparkFlash 0.25s ease-out forwards;
          }

          @keyframes wireCut {
            0% {
              stroke-dashoffset: 0;
              opacity: 1;
            }
            100% {
              stroke-dashoffset: 130;
              opacity: 0;
            }
          }
          @keyframes sparkFlash {
            0% {
              opacity: 1;
              transform: scale(1);
            }
            100% {
              opacity: 0;
              transform: scale(1.8);
            }
          }

          @keyframes explosionFlash {
            0% {
              opacity: 1;
              transform: scale(0.8);
            }
            100% {
              opacity: 0;
              transform: scale(1.3);
            }
          }
          @keyframes bombExplode {
            0% {
              transform: scale(1);
              box-shadow: 0 0 24px rgba(248, 113, 113, 0.9);
            }
            60% {
              transform: scale(1.22);
              box-shadow: 0 0 60px rgba(248, 113, 113, 1);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 rgba(0, 0, 0, 0);
            }
          }
          @keyframes bombDefuse {
            0% {
              transform: scale(1);
              box-shadow: 0 0 30px rgba(52, 211, 153, 0.9);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 rgba(0, 0, 0, 0);
            }
          }
          @keyframes smokeRise {
            0% {
              opacity: 0.8;
              transform: translateY(10px) scale(0.8);
            }
            100% {
              opacity: 0;
              transform: translateY(-20px) scale(1.2);
            }
          }
        `}</style>
      </div>
    </main>
  );
}
