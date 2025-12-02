// file: app/admin/endless/page.js
'use client';

import { useEffect, useState, useRef } from 'react';

// ===== ダミー問題（APIエラー時の保険） =====
const SAMPLE_QUESTIONS = [
  {
    id: 1001,
    type: 'single',
    text: 'ルフィが最初に仲間にした人物は？',
    choices: ['ゾロ', 'ナミ', 'ウソップ', 'サンジ'],
    correctIndexes: [0],
  },
  {
    id: 1002,
    type: 'multi',
    text: '「四皇」に含まれていた人物をすべて選べ。',
    choices: ['カイドウ', 'ビッグ・マム', '白ひげ', 'ジャック'],
    correctIndexes: [0, 1, 2],
  },
  {
    id: 1003,
    type: 'text',
    text: 'ロビンの出身地は？',
    choices: [],
    correctIndexes: [],
    answerText: 'オハラ',
    altAnswers: [],
  },
];

// タイプごとの基準制限時間（秒）
const TIME_LIMITS = {
  single: 30,
  multi: 40,
  order: 40,
  text: 60, // 実際は文字数で 60 / 80 に調整
};

const STATE_KEY = 'onepiece_endless_state';
const RESULT_KEY = 'onepiece_endless_results';

// battle の parseCorrectValues に近いやつ（文字列 or JSON を配列化）
function parseCorrectTokens(raw) {
  if (raw == null) return [];

  // すでに配列ならそのまま
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v).trim())
      .filter((s) => s !== '');
  }

  // 数値なら文字列1個
  if (typeof raw === 'number') {
    return [String(raw)];
  }

  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];

    // JSON配列の可能性
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => String(v).trim())
          .filter((ss) => ss !== '');
      }
    } catch {
      // JSON でなければ無視
    }

    // デリミタ（、 , ／ / → など）で分割
    return s
      .split(/[、,，／\/→\s]+/)
      .map((p) => p.trim())
      .filter((p) => p !== '');
  }

  return [];
}

export default function EndlessAdminPage() {
  const [questions, setQuestions] = useState([]);
  const [deck, setDeck] = useState([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [current, setCurrent] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [baseLimit, setBaseLimit] = useState(0);
  const [statusText, setStatusText] = useState('状態を確認中…');
  const [feedback, setFeedback] = useState('');

  // selected:
  // single/multi: 選択中 index の集合
  // order: クリックした順番の index 配列（[2,0,1] みたいな）
  const [selected, setSelected] = useState([]);

  const [disabledAnswer, setDisabledAnswer] = useState(false);
  const [textAnswerInput, setTextAnswerInput] = useState(''); // 記述用入力

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // ===== ① 初回起動：承認済み問題を API から取得 =====
  useEffect(() => {
    const fetchApproved = async () => {
      try {
        const res = await fetch('/api/admin/questions?status=approved', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('failed to fetch approved questions');

        const data = await res.json();

        const approved = (data.questions || []).map((q, idx) => {
          // --- 問題文 ---
          const text = q.question_text ?? q.question ?? '';

          // --- 選択肢を options / options_json から取り出す ---
          let originalChoices = [];
          try {
            if (Array.isArray(q.options)) {
              // 旧API: options がそのまま配列で入っているパターン
              originalChoices = q.options;
            } else if (Array.isArray(q.options_json)) {
              // Supabase: jsonb[] で返ってくるパターン
              originalChoices = q.options_json;
            } else if (typeof q.options_json === 'string') {
              // 文字列で JSON が入っている古いデータ用
              const parsed = JSON.parse(q.options_json);
              if (Array.isArray(parsed)) originalChoices = parsed;
            }
          } catch {
            originalChoices = [];
          }

          const choices = [...originalChoices];

          const correctAnswer = q.correct_answer ?? '';

          // alt_answers / alt_answers_json どちらでも拾う
          const altAnswersRaw = q.alt_answers ?? q.alt_answers_json ?? [];

          // --- type を DB の値は信じず、battle と同じロジックで判定 ---
          const tokens = parseCorrectTokens(correctAnswer);

          let type = 'single';
          if (!choices || choices.length === 0) {
            type = 'text';
          } else if (tokens.length > 1) {
            const t = (text || '').replace(/\s/g, '');
            if (t.includes('順') || t.includes('並') || t.includes('順番')) {
              type = 'order';
            } else {
              type = 'multi';
            }
          } else {
            type = 'single';
          }

          // --- altAnswers を配列に正規化 ---
          let altAnswers = [];
          if (Array.isArray(altAnswersRaw)) {
            altAnswers = altAnswersRaw
              .map((v) => String(v).trim())
              .filter((s) => s !== '');
          } else if (typeof altAnswersRaw === 'string') {
            try {
              const parsedAlt = JSON.parse(altAnswersRaw);
              if (Array.isArray(parsedAlt)) {
                altAnswers = parsedAlt
                  .map((v) => String(v).trim())
                  .filter((s) => s !== '');
              } else if (altAnswersRaw.trim() !== '') {
                altAnswers = [altAnswersRaw.trim()];
              }
            } catch {
              if (altAnswersRaw.trim() !== '') {
                altAnswers = [altAnswersRaw.trim()];
              }
            }
          }

          // --- 正解インデックスを作る ---
          let correctIndexes = []; // single/multi 用（昇順）
          let orderIndexes = []; // 並び替え用（順番どおり）

          if (choices.length > 0 && tokens.length > 0) {
            if (type === 'order') {
              const idxSeq = [];
              for (const token of tokens) {
                const num = Number(token);
                if (
                  !Number.isNaN(num) &&
                  Number.isInteger(num) &&
                  num >= 0 &&
                  num < choices.length &&
                  token === String(num)
                ) {
                  idxSeq.push(num);
                } else {
                  const idxChoice = choices.indexOf(token);
                  if (idxChoice >= 0) idxSeq.push(idxChoice);
                }
              }
              orderIndexes = idxSeq;
            } else if (type === 'single' || type === 'multi') {
              const idxSet = new Set();
              for (const token of tokens) {
                const num = Number(token);
                if (
                  !Number.isNaN(num) &&
                  Number.isInteger(num) &&
                  num >= 0 &&
                  num < choices.length &&
                  token === String(num)
                ) {
                  idxSet.add(num);
                } else {
                  const idxChoice = choices.indexOf(token);
                  if (idxChoice >= 0) idxSet.add(idxChoice);
                }
              }
              correctIndexes = Array.from(idxSet).sort((a, b) => a - b);
            }
          }

          // --- 記述問題の正解テキスト ---
          let answerText = '';
          if (type === 'text') {
            if (typeof correctAnswer === 'string') {
              answerText = correctAnswer.trim();
            } else if (
              Array.isArray(correctAnswer) &&
              correctAnswer.length > 0
            ) {
              answerText = String(correctAnswer[0]).trim();
            }
          }

          // === ここから選択肢シャッフル ===
          let shuffledChoices = choices;
          let shuffledCorrectIndexes = correctIndexes;
          let shuffledOrderIndexes = orderIndexes;

          if (choices.length > 0 && type !== 'text') {
            // 0..n-1 のインデックス配列を作ってシャッフル
            const indexArr = choices.map((_, i) => i);
            for (let i = indexArr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [indexArr[i], indexArr[j]] = [indexArr[j], indexArr[i]];
            }

            // 新しい choices
            shuffledChoices = indexArr.map((origIdx) => choices[origIdx]);

            // 元index → 新index のマップ
            const remap = new Map();
            indexArr.forEach((origIdx, newIdx) => {
              remap.set(origIdx, newIdx);
            });

            if (type === 'order' && orderIndexes.length > 0) {
              // 並び替え：順番そのままで新しい index に変換
              shuffledOrderIndexes = orderIndexes
                .map((origIdx) => remap.get(origIdx))
                .filter((v) => v != null);
            } else if (correctIndexes.length > 0) {
              // single / multi：集合としてリマップしてソート
              const tmp = correctIndexes
                .map((origIdx) => remap.get(origIdx))
                .filter((v) => v != null);
              shuffledCorrectIndexes = tmp.sort((a, b) => a - b);
            }
          }

          return {
            id: q.id ?? idx,
            type,
            text:
              text || `（問題文が取得できませんでした: id=${q.id ?? idx}）`,
            choices: shuffledChoices,
            correctIndexes: shuffledCorrectIndexes,
            orderIndexes: shuffledOrderIndexes,
            answerText,
            altAnswers,
          };
        });

        if (!approved.length) {
          console.warn('承認済み問題が0件だったのでサンプル問題を使用します');
          setQuestions(SAMPLE_QUESTIONS);
        } else {
          setQuestions(approved);
        }
      } catch (e) {
        console.error('承認済み問題の取得に失敗したのでサンプル問題を使います', e);
        setQuestions(SAMPLE_QUESTIONS);
      }
    };

    fetchApproved();
  }, []);

  // ===== ② 問題取得後に状態復元 or 新デッキ開始 =====
  useEffect(() => {
    if (questions.length === 0) return;

    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STATE_KEY)
        : null;

    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (
          typeof window !== 'undefined' &&
          window.confirm('前回のエンドレスモードの続きから再開しますか？')
        ) {
          restoreState(s);
          return;
        } else if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STATE_KEY);
        }
      } catch (e) {
        console.warn('状態の復元に失敗', e);
      }
    }

    startNewDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  // ===== 共通関数 =====
  const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getTextTimeLimit = (q) => {
    const base = q.answerText || '';
    // 正解文字列が15文字超えなら80秒、それ以外は60秒
    return base.length > 15 ? 80 : 60;
  };

  const initQuestionTimer = (q) => {
    clearTimer();

    let limitSec;
    if (q.type === 'text') {
      limitSec = getTextTimeLimit(q);
    } else {
      limitSec = TIME_LIMITS[q.type] ?? 30;
    }

    setBaseLimit(limitSec);
    setRemaining(limitSec);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearTimer();
          handleAnswer(true); // タイムアウト
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const saveState = (question, d, idx) => {
    if (typeof window === 'undefined') return;
    const state = {
      currentQuestionId: question.id,
      deck: d,
      deckIndex: idx,
    };
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  };

  const restoreState = (s) => {
    if (!s || !Array.isArray(s.deck) || questions.length === 0) {
      startNewDeck();
      return;
    }
    const d = s.deck;
    const idx = Math.min(s.deckIndex ?? 0, d.length);
    const qId = s.currentQuestionId;
    const q = questions.find((qq) => qq.id === qId) ?? questions[d[0]];

    setDeck(d);
    setDeckIndex(idx);
    setCurrent(q);
    setSelected([]);
    setTextAnswerInput('');
    setFeedback('');
    setStatusText(
      `前回の続きから再開しました（この周 ${idx}/${d.length}問目・ID: ${q.id}）`
    );
    initQuestionTimer(q);
  };

  const startNewDeck = () => {
    const d = [...Array(questions.length).keys()];
    shuffleArray(d);
    setDeck(d);
    setDeckIndex(0);
    setStatusText(`新しい周を開始しました（全${questions.length}問）`);

    const firstIdx = d[0];
    const q = questions[firstIdx];
    setDeckIndex(1);
    setCurrent(q);
    initQuestionTimer(q);
    setSelected([]);
    setTextAnswerInput('');
    setFeedback('');
    saveState(q, d, 1);
  };

  const nextQuestion = () => {
    clearTimer();
    setFeedback('');
    setSelected([]);
    setTextAnswerInput('');
    setDisabledAnswer(false);

    if (deck.length === 0 || questions.length === 0) return;

    let idx = deckIndex;
    let d = deck;

    if (idx >= d.length) {
      d = [...Array(questions.length).keys()];
      shuffleArray(d);
      idx = 0;
    }

    const qIndex = d[idx];
    const q = questions[qIndex];

    setDeck(d);
    setDeckIndex(idx + 1);
    setCurrent(q);
    initQuestionTimer(q);
    saveState(q, d, idx + 1);
  };

  const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const getSelectedIndexesSorted = () => selected.slice().sort((a, b) => a - b);

  // localStorage 保存 ＋ サーバ API 送信
  const saveResultLog = (log) => {
    // ① ブラウザ側のローカル保存（今まで通り）
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(RESULT_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push(log);
        window.localStorage.setItem(RESULT_KEY, JSON.stringify(arr));
      } catch (e) {
        console.warn('結果ログ保存エラー(localStorage)', e);
      }
    }

    // ② サーバ API へ送信（テーブルが無くても 200 で返すよう route 側で握りつぶす）
    try {
      fetch('/api/admin/endless/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: log.questionId,
          correct: log.correct,
          answerMs: log.answerMs,
          timestamp: log.timestamp,
        }),
      }).catch((e) => {
        console.warn('結果ログ保存エラー(API)', e);
      });
    } catch (e) {
      console.warn('結果ログ保存エラー(API throw)', e);
    }
  };

  const normalize = (s) => s.trim(); // 必要ならここで全角半角変換など

  const handleAnswer = (fromTimeout) => {
    if (!current) return;
    setDisabledAnswer(true);
    clearTimer();

    const now = Date.now();
    let ms = startTimeRef.current ? now - startTimeRef.current : 0;
    if (ms < 0) ms = 0;

    let limitSec;
    if (current.type === 'text') {
      limitSec = getTextTimeLimit(current);
    } else {
      limitSec = TIME_LIMITS[current.type] ?? 30;
    }
    const limitMs = limitSec * 1000;
    if (ms > limitMs) ms = limitMs;

    let isCorrect = false;
    let correctTextForFeedback = '';

    if (current.type === 'text') {
      const user = normalize(textAnswerInput);
      const main = normalize(current.answerText || '');
      const alts = (current.altAnswers || []).map(normalize);

      isCorrect =
        !fromTimeout &&
        user.length > 0 &&
        (user === main || alts.includes(user));

      correctTextForFeedback = [current.answerText, ...(current.altAnswers || [])]
        .filter((s) => s && s !== '')
        .join(' / ');
    } else if (current.type === 'order') {
      // 並び替え：selected がクリック順の index 配列
      const userOrder = selected;
      const correctOrder = current.orderIndexes || [];

      isCorrect =
        !fromTimeout &&
        userOrder.length > 0 &&
        arraysEqual(userOrder, correctOrder);

      correctTextForFeedback = (correctOrder || [])
        .map((i) => current.choices?.[i])
        .join(' → ');
    } else {
      // single / multi
      const selectedIdx = getSelectedIndexesSorted();
      const correctIdx = (current.correctIndexes || []).slice().sort(
        (a, b) => a - b
      );

      isCorrect =
        !fromTimeout &&
        selectedIdx.length > 0 &&
        arraysEqual(selectedIdx, correctIdx);

      correctTextForFeedback = (current.correctIndexes || [])
        .map((i) => current.choices?.[i])
        .join(' / ');
    }

    const log = {
      questionId: current.id,
      correct: isCorrect,
      answerMs: ms,
      timestamp: new Date().toISOString(),
    };
    saveResultLog(log);

    if (isCorrect) {
      setFeedback(
        `✅ 正解！（${(Math.round(ms / 100) / 10).toFixed(
          1
        )}秒） / 正解：${correctTextForFeedback}`
      );
    } else if (fromTimeout) {
      setFeedback(`⏰ 時間切れ / 正解：${correctTextForFeedback}`);
    } else {
      setFeedback(`❌ 不正解 / 正解：${correctTextForFeedback}`);
    }

    setTimeout(() => {
      nextQuestion();
    }, 1200);
  };

  const handlePause = () => {
    clearTimer();
    if (current && deck.length > 0) {
      saveState(current, deck, deckIndex);
    }
    if (typeof window !== 'undefined') {
      alert(
        '中断しました。このページを閉じてもOKです。\n次回このページを開くと、同じ問題から制限時間フルで再開します。'
      );
    }
  };

  const resetOrderSelection = () => {
    setSelected([]);
  };

  const toggleChoice = (idx) => {
    if (!current || current.type === 'text') return;

    if (current.type === 'single') {
      setSelected([idx]);
    } else if (current.type === 'multi') {
      setSelected((prev) =>
        prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
      );
    } else if (current.type === 'order') {
      // クリック順に並べる。もう一度クリックで解除
      setSelected((prev) => {
        const pos = prev.indexOf(idx);
        if (pos >= 0) {
          const copy = [...prev];
          copy.splice(pos, 1);
          return copy;
        }
        return [...prev, idx];
      });
    }
  };

  // ===== 画面描画 =====
  if (!current) {
    return (
      <div style={{ padding: 24, color: '#e5e7eb', background: '#020617' }}>
        <h2>エンドレスモード（管理者用）</h2>
        <p>問題を読み込み中です…</p>
      </div>
    );
  }

  const typeLabel =
    current.type === 'multi'
      ? '複数選択問題'
      : current.type === 'text'
      ? '記述問題'
      : current.type === 'order'
      ? '並び替え問題'
      : '単一選択問題';

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 900,
        margin: '0 auto',
        background: '#020617',
        minHeight: '100vh',
        color: '#e5e7eb',
      }}
    >
      <h2 style={{ fontSize: 22, marginBottom: 4, fontWeight: 700 }}>
        エンドレスモード（管理者用）
      </h2>
      <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 12 }}>
        ・全問題をシャッフルして1周するまで同じ問題は出ません。
        <br />
        ・中断すると次回同じ問題から制限時間フルで再開します。
      </p>

      <div
        style={{
          marginBottom: 10,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          fontSize: 12,
        }}
      >
        <div
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(15,23,42,0.9)',
            color: '#e5e7eb',
          }}
        >
          {statusText}
          <br />
          問題ID: {current.id} ／ この周 {deckIndex}/
          {deck.length || questions.length}
        </div>
        <div
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(15,23,42,0.9)',
            color: '#e5e7eb',
          }}
        >
          制限時間: {baseLimit} 秒 ／ 残り{' '}
          <span style={{ fontWeight: 'bold' }}>{remaining}</span> 秒
        </div>
      </div>

      <div
        style={{
          background: 'rgba(3,8,23,0.95)',
          padding: '14px 16px',
          borderRadius: 12,
          border: '1px solid rgba(148,163,184,0.6)',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.8,
            marginBottom: 4,
            color: '#cbd5f5',
          }}
        >
          {typeLabel}
        </div>
        <div
          style={{
            fontSize: 15,
            marginBottom: 8,
            lineHeight: 1.6,
            color: '#f9fafb',
          }}
        >
          {current.text}
        </div>

        {current.type === 'text' ? (
          <div style={{ marginTop: 4 }}>
            <input
              type="text"
              value={textAnswerInput}
              onChange={(e) => setTextAnswerInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.9)',
                background: 'rgba(15,23,42,0.9)',
                color: '#f9fafb',
                fontSize: 14,
              }}
              placeholder="ここに解答を入力"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {current.choices?.map((choice, idx) => {
              const checked = selected.includes(idx);
              const orderNumber =
                current.type === 'order' ? selected.indexOf(idx) : -1;

              return (
                <label
                  key={idx}
                  onClick={() => toggleChoice(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 8px',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.7)',
                    background:
                      current.type === 'order'
                        ? orderNumber >= 0
                          ? 'rgba(59,130,246,0.25)'
                          : 'rgba(15,23,42,0.9)'
                        : checked
                        ? 'rgba(34,197,94,0.25)'
                        : 'rgba(15,23,42,0.9)',
                    cursor: 'pointer',
                    color: '#e5e7eb', // 文字色
                  }}
                >
                  {current.type === 'order' ? (
                    <span
                      style={{
                        width: 20,
                        textAlign: 'center',
                        fontSize: 12,
                        opacity: orderNumber >= 0 ? 1 : 0.4,
                        color: '#e5e7eb',
                      }}
                    >
                      {orderNumber >= 0 ? orderNumber + 1 : '・'}
                    </span>
                  ) : (
                    <input
                      type={current.type === 'multi' ? 'checkbox' : 'radio'}
                      readOnly
                      checked={checked}
                      style={{ margin: 0 }}
                    />
                  )}
                  <span style={{ color: '#f9fafb' }}>{choice}</span>
                </label>
              );
            })}
          </div>
        )}

        {current.type === 'order' && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              opacity: 0.9,
              color: '#cbd5f5',
            }}
          >
            ※ クリックした順番が 1 → 2 → 3… の順番になります。もう一度クリックで解除。
            <br />
            <button
              onClick={resetOrderSelection}
              style={{
                marginTop: 4,
                borderRadius: 999,
                padding: '4px 10px',
                border: '1px solid rgba(148,163,184,0.8)',
                background: 'rgba(15,23,42,0.9)',
                color: '#e5e7eb',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              順番リセット
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div>
          <button
            onClick={() => handleAnswer(false)}
            disabled={disabledAnswer}
            style={{
              borderRadius: 999,
              padding: '6px 14px',
              border: 'none',
              cursor: disabledAnswer ? 'default' : 'pointer',
              background: disabledAnswer
                ? 'rgba(34,197,94,0.5)'
                : 'linear-gradient(135deg,#22c55e,#16a34a)',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            解答する
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => handleAnswer(false)}
            style={{
              borderRadius: 999,
              padding: '6px 12px',
              border: '1px solid rgba(148,163,184,0.8)',
              background: 'rgba(15,23,42,0.9)',
              color: '#e5e7eb',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            スキップ
          </button>
          <button
            onClick={handlePause}
            style={{
              borderRadius: 999,
              padding: '6px 12px',
              border: '1px solid rgba(248,113,113,0.8)',
              background: 'rgba(248,113,113,0.16)',
              color: '#fecaca',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            中断する
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, minHeight: '1.2em', color: '#fbbf24' }}>
        {feedback}
      </div>

      <p
        style={{
          fontSize: 11,
          opacity: 0.8,
          marginTop: 8,
          color: '#9ca3af',
        }}
      >
        AIなつ用ログはブラウザ localStorage の
        <code> {RESULT_KEY} </code>
        に保存されています（question_id / 正誤 / 解答時間ミリ秒）。
      </p>
    </div>
  );
}
