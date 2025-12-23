// file: app/story/battle/page_inner.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * ストーリー用バトル
 * - 相手がタグ指定（quiz_tag）
 * - 10点先取
 * - 相手によって accuracy / speed / choicesPerTurn が違う
 * - 弱いほど 1ターンに出る問題数が多い（選んで解く）
 * - AI解答時間は「(自分の解答時間)±3秒以内」に収める
 * - 終了後：localStorage に outcome 保存 → /story/play に復帰して分岐
 */

/* =========================
   localStorage keys
========================= */
const LS_OUTCOME = 'story:lastOutcome';

/* =========================
   敵（強さ設定）
========================= */
const ENEMIES = {
  yankee: { name: '地元ヤンキー', accuracy: 0.35, choicesPerTurn: 4, speedFactor: 0.85 },
  ban: { name: 'バン', accuracy: 0.85, choicesPerTurn: 1, speedFactor: 0.75 },
  fuyu: { name: 'ふゆ', accuracy: 0.90, choicesPerTurn: 1, speedFactor: 0.72 },
  djsouth: { name: 'DJサウス', accuracy: 0.80, choicesPerTurn: 2, speedFactor: 0.78 },
  north: { name: 'ノースちゃん', accuracy: 0.92, choicesPerTurn: 1, speedFactor: 0.70 },
  // 必要ならどんどん増やしてOK
};

/* =========================
   問題タイプ別の制限時間（ms）
========================= */
const TIME_SINGLE = 30000;
const TIME_MULTI_ORDER = 40000;
const TIME_TEXT = 60000;
const TIME_TEXT_LONG = 80000;

/* =========================
   util
========================= */
function norm(v) {
  const t = String(v ?? '').replace(/\u3000/g, ' ').trim();
  return t ? t : null;
}

function parseCorrectValues(ans) {
  if (!ans) return [];
  try {
    const parsed = JSON.parse(ans);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {}
  return String(ans)
    .split(/[、,／\/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeText(s) {
  return String(s ?? '').trim().replace(/\s+/g, '').toLowerCase();
}

function getQuestionType(q) {
  return q?.type || 'single';
}

function calcTimeLimit(q) {
  if (!q) return TIME_SINGLE;
  const t = getQuestionType(q);
  if (t === 'single') return TIME_SINGLE;
  if (t === 'multi' || t === 'ordering') return TIME_MULTI_ORDER;

  const len = (q.answer || '').length;
  return len > 15 ? TIME_TEXT_LONG : TIME_TEXT;
}

// questions APIの返りがバラけてても吸収
function normalizeQuestionRow(q, idx) {
  let options = [];
  try {
    if (Array.isArray(q.options)) options = q.options;
    else if (Array.isArray(q.options_json)) options = q.options_json;
    else if (typeof q.options_json === 'string') {
      const parsed = JSON.parse(q.options_json);
      if (Array.isArray(parsed)) options = parsed;
    }
  } catch {
    options = [];
  }

  const text = q.question_text || q.question || q.text || '';
  const answer = q.correct_answer ?? q.answer ?? '';
  const rawType = (q.type || '').toString().toLowerCase();

  let type = 'single';
  const answerList = parseCorrectValues(answer);

  if (!options || options.length === 0) {
    type = 'text';
  } else if (rawType.includes('order') || rawType.includes('並') || rawType.includes('順')) {
    type = 'ordering';
  } else if (rawType.includes('multi') || rawType.includes('複数')) {
    type = 'multi';
  } else if (rawType.includes('text') || rawType.includes('記述')) {
    type = 'text';
  } else if (answerList.length > 1) {
    const t = text.replace(/\s/g, '');
    type = t.includes('順') || t.includes('並') ? 'ordering' : 'multi';
  } else {
    type = 'single';
  }

  return {
    id: q.id ?? String(idx),
    text,
    type,
    options,
    answer,
  };
}

function chooseRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/* =========================
   main
========================= */
export default function StoryBattleInner() {
  const sp = useSearchParams();
  const router = useRouter();

  // from StoryPlay
  const tag = norm(sp.get('tag')) || '';
  const enemyKey = norm(sp.get('enemy')) || 'yankee';
  const chapter = norm(sp.get('chapter')) || 'ch0';
  const returnFromId = norm(sp.get('from')) || null;

  const winTo = norm(sp.get('win_to'));
  const loseTo = norm(sp.get('lose_to'));
  const drawTo = norm(sp.get('draw_to'));

  const tagsSelectRaw = norm(sp.get('tags_select')); // "A|B|C"
  const selectableTags = useMemo(() => {
    if (!tagsSelectRaw) return [];
    return tagsSelectRaw.split('|').map((s) => s.trim()).filter(Boolean);
  }, [tagsSelectRaw]);

  const enemy = ENEMIES[enemyKey] || ENEMIES.yankee;

  const [phase, setPhase] = useState('loading'); // loading | pickTag | pickQuestion | answering | result
  const [pickedTag, setPickedTag] = useState(tag);

  const [pool, setPool] = useState([]); // 全問題
  const [turnSet, setTurnSet] = useState([]); // このターンに出る候補（choicesPerTurn）
  const [current, setCurrent] = useState(null); // 選んだ問題
  const [timeLeft, setTimeLeft] = useState(0);

  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [myTime, setMyTime] = useState(0);
  const [oppTime, setOppTime] = useState(0);

  // answer states
  const [selected, setSelected] = useState(null);
  const [multiSelected, setMultiSelected] = useState([]);
  const [orderSelected, setOrderSelected] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');

  const [judge, setJudge] = useState(null); // {isCorrect, correctAnswer}
  const timerRef = useRef(null);

  // load questions
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setPhase('loading');

        const r = await fetch('/api/questions', { cache: 'no-store' });
        const d = await r.json().catch(() => ({}));
        const arr = Array.isArray(d) ? d : Array.isArray(d.questions) ? d.questions : [];
        const normalized = arr.map(normalizeQuestionRow);

        if (cancelled) return;
        setPool(normalized);

        // タグ選択があるなら先に選ばせる
        if (selectableTags.length > 0 && !pickedTag) {
          setPhase('pickTag');
        } else {
          setPickedTag(pickedTag || tag || selectableTags[0] || '');
          setPhase('pickQuestion');
        }
      } catch {
        if (!cancelled) {
          setPool([]);
          setPhase('pickQuestion');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pool -> tag filter
  const filtered = useMemo(() => {
    const t = norm(pickedTag);
    if (!t) return pool;

    // いろんなタグ形を吸収（tag / tags / tags_json）
    return pool.filter((q) => {
      const raw = q?.tag || q?.tags || q?.tags_json || '';
      if (!raw) return false;
      const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
      return s.includes(t);
    });
  }, [pool, pickedTag]);

  function resetAnswerUI() {
    setSelected(null);
    setMultiSelected([]);
    setOrderSelected([]);
    setTextAnswer('');
    setJudge(null);
  }

  function setupTurn() {
    resetAnswerUI();
    setCurrent(null);

    const n = clamp(enemy.choicesPerTurn || 1, 1, 6);
    const src = filtered.length > 0 ? filtered : pool;

    const set = [];
    const used = new Set();
    while (set.length < n && src.length > 0) {
      const q = chooseRandom(src);
      if (!q) break;
      if (used.has(q.id)) continue;
      used.add(q.id);
      set.push(q);
    }

    setTurnSet(set);

    // 1問しかないなら自動選択
    if (set.length === 1) {
      setCurrent(set[0]);
      setPhase('answering');
    } else {
      setPhase('pickQuestion');
    }
  }

  // 初回ターン作成
  useEffect(() => {
    if (phase !== 'pickQuestion') return;
    if (turnSet.length > 0) return;
    setupTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // timer for answering
  useEffect(() => {
    if (phase !== 'answering' || !current) {
      setTimeLeft(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    const limit = calcTimeLimit(current);
    setTimeLeft(limit);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remain = limit - elapsed;
      if (remain <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setTimeLeft(0);
        handleTimeout(limit);
      } else {
        setTimeLeft(remain);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current?.id]);

  function getDisplayAnswer(q) {
    const list = parseCorrectValues(q?.answer);
    return list.length > 0 ? list.join(' / ') : String(q?.answer ?? '');
  }

  function handleTimeout(limit) {
    if (phase !== 'answering' || !current) return;
    setJudge({ isCorrect: false, correctAnswer: getDisplayAnswer(current) });
    resolveTurn(false, limit);
  }

  function resolveTurn(isCorrect, usedMs) {
    const used = Math.max(0, Math.round(usedMs || 0));
    const myUsed = used;

    // 相手の挙動
    const oppCorrect = Math.random() < (enemy.accuracy ?? 0.5);

    // 相手時間：自分時間±3秒に収める
    // speedFactorで強いほど速めに寄せる
    const base = myUsed * (enemy.speedFactor ?? 0.8);
    const jitter = (Math.random() * 6000) - 3000; // ±3000
    let oppUsed = base + jitter;

    // “±3秒以内”を厳密に守る（自分時間との差を±3000にクランプ）
    oppUsed = clamp(oppUsed, myUsed - 3000, myUsed + 3000);
    oppUsed = Math.max(800, Math.round(oppUsed));

    // update totals
    const nextMyScore = myScore + (isCorrect ? 1 : 0);
    const nextOppScore = oppScore + (oppCorrect ? 1 : 0);

    setMyScore(nextMyScore);
    setOppScore(nextOppScore);
    setMyTime((t) => t + myUsed);
    setOppTime((t) => t + oppUsed);

    // 10点先取で終了
    const finished = nextMyScore >= 10 || nextOppScore >= 10;
    setTimeout(() => {
      if (finished) {
        const outcome =
          nextMyScore > nextOppScore ? 'win' : nextMyScore < nextOppScore ? 'lose' : 'draw';

        try {
          localStorage.setItem(LS_OUTCOME, outcome);
        } catch {}

        // 分岐先id
        const jump =
          outcome === 'win' ? winTo : outcome === 'lose' ? loseTo : drawTo;

        // 安全：飛び先がなければ from の次に戻す（とりあえず）
        const jumpParam = jump ? `&jump=${encodeURIComponent(jump)}` : '';

        router.replace(
          `/story/play?chapter=${encodeURIComponent(chapter)}${jumpParam}&from=${encodeURIComponent(returnFromId || '')}`
        );
        return;
      }

      // 次ターンへ
      resetAnswerUI();
      setTurnSet([]);
      setupTurn();
    }, 900);
  }

  // UI handlers
  function pickQuestion(q) {
    setCurrent(q);
    setPhase('answering');
    resetAnswerUI();
  }

  function handleSelectSingle(opt) {
    if (!current) return;
    const limit = calcTimeLimit(current);
    const used = Math.max(0, limit - timeLeft);

    const candidates = parseCorrectValues(current.answer);
    const isCorrect = candidates.length > 0 ? candidates.includes(opt) : opt === (current.answer || '');

    setSelected(opt);
    setJudge({ isCorrect, correctAnswer: getDisplayAnswer(current) });

    resolveTurn(isCorrect, used);
  }

  function toggleMulti(opt) {
    setMultiSelected((prev) => (prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]));
  }
  function submitMulti() {
    if (!current) return;
    const limit = calcTimeLimit(current);
    const used = Math.max(0, limit - timeLeft);

    const candidates = parseCorrectValues(current.answer);
    const sel = multiSelected;

    let isCorrect = false;
    if (candidates.length > 0 && sel.length === candidates.length) {
      const A = new Set(sel);
      const B = new Set(candidates);
      isCorrect = [...A].every((v) => B.has(v)) && [...B].every((v) => A.has(v));
    }

    setJudge({ isCorrect, correctAnswer: getDisplayAnswer(current) });
    resolveTurn(isCorrect, used);
  }

  function toggleOrder(opt) {
    setOrderSelected((prev) => (prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]));
  }
  function resetOrder() {
    setOrderSelected([]);
  }
  function submitOrder() {
    if (!current) return;
    const limit = calcTimeLimit(current);
    const used = Math.max(0, limit - timeLeft);

    const candidates = parseCorrectValues(current.answer);
    const sel = orderSelected;

    const isCorrect = candidates.length > 0 && sel.length === candidates.length
      ? candidates.every((v, i) => sel[i] === v)
      : false;

    setJudge({ isCorrect, correctAnswer: getDisplayAnswer(current) });
    resolveTurn(isCorrect, used);
  }

  function submitText() {
    if (!current) return;
    const limit = calcTimeLimit(current);
    const used = Math.max(0, limit - timeLeft);

    const input = normalizeText(textAnswer);
    const candidates = parseCorrectValues(current.answer).map(normalizeText);

    const isCorrect = input !== '' && candidates.includes(input);

    setJudge({ isCorrect, correctAnswer: getDisplayAnswer(current) });
    resolveTurn(isCorrect, used);
  }

  // render
  const timeDisplay = useMemo(() => {
    if (phase !== 'answering' || !current || timeLeft <= 0) return '---';
    return (timeLeft / 1000).toFixed(1);
  }, [phase, current, timeLeft]);

  const qType = getQuestionType(current);

  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm font-extrabold">対戦準備中...</p>
      </main>
    );
  }

  if (phase === 'pickTag') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
          <h1 className="text-lg font-extrabold">タグを選んでください</h1>
          <p className="text-xs text-white/70">相手が「この中から選べ」と言ってきた</p>
          <div className="grid grid-cols-1 gap-2">
            {selectableTags.map((t) => (
              <button
                key={t}
                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-sm font-extrabold hover:bg-white/15"
                onClick={() => {
                  setPickedTag(t);
                  setPhase('pickQuestion');
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* header */}
      <header className="px-4 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/60">ストーリー対戦</p>
          <p className="text-sm font-extrabold">{enemy.name} vs あなた</p>
          <p className="text-[11px] text-white/60 mt-0.5">タグ: {pickedTag || '（指定なし）'}</p>
        </div>
        <div className="text-right text-xs">
          <div className="font-extrabold">あなた {myScore} - {oppScore} {enemy.name}</div>
          <div className="text-white/70">残り: {timeDisplay}s</div>
        </div>
      </header>

      <section className="flex-1 px-4 py-4">
        {/* pick question */}
        {phase === 'pickQuestion' && turnSet.length > 1 && (
          <div className="max-w-3xl mx-auto space-y-3">
            <h2 className="text-sm font-extrabold">問題を選べ（{turnSet.length}問）</h2>
            <p className="text-xs text-white/70">
              弱い相手ほど、選べる問題が多い（強敵は1問固定）
            </p>

            <div className="grid grid-cols-1 gap-2">
              {turnSet.map((q) => (
                <button
                  key={q.id}
                  onClick={() => pickQuestion(q)}
                  className="text-left px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10"
                >
                  <div className="text-xs text-white/60 mb-1">タイプ: {q.type}</div>
                  <div className="font-bold">{q.text}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* answering */}
        {phase === 'answering' && current && (
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="text-xs text-white/60 flex justify-between">
                <span>タイプ: {current.type}</span>
                <span>制限: {(calcTimeLimit(current) / 1000).toFixed(0)}s</span>
              </div>

              <p className="text-base font-extrabold whitespace-pre-wrap">{current.text}</p>

              {/* single */}
              {qType === 'single' && current.options?.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {current.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectSingle(opt)}
                      disabled={!!judge}
                      className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-left font-bold hover:bg-white/15 disabled:opacity-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* multi */}
              {qType === 'multi' && current.options?.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {current.options.map((opt, i) => {
                      const on = multiSelected.includes(opt);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleMulti(opt)}
                          disabled={!!judge}
                          className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-left font-bold hover:bg-white/15 disabled:opacity-50"
                        >
                          <span className="mr-2">{on ? '☑' : '☐'}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={submitMulti}
                    disabled={!!judge}
                    className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 font-extrabold disabled:opacity-50"
                  >
                    この選択で回答
                  </button>
                </div>
              )}

              {/* ordering */}
              {qType === 'ordering' && current.options?.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {current.options.map((opt, i) => {
                      const idx = orderSelected.indexOf(opt);
                      const order = idx >= 0 ? idx + 1 : null;
                      return (
                        <button
                          key={i}
                          onClick={() => toggleOrder(opt)}
                          disabled={!!judge}
                          className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-left font-bold hover:bg-white/15 disabled:opacity-50"
                        >
                          <span className="mr-2 text-xs">{order ? `${order}.` : '・'}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetOrder}
                      disabled={!!judge}
                      className="flex-1 py-3 rounded-2xl bg-white/10 border border-white/10 font-extrabold disabled:opacity-50"
                    >
                      リセット
                    </button>
                    <button
                      onClick={submitOrder}
                      disabled={!!judge}
                      className="flex-1 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 font-extrabold disabled:opacity-50"
                    >
                      この順番で回答
                    </button>
                  </div>
                </div>
              )}

              {/* text */}
              {qType === 'text' && (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={textAnswer}
                    disabled={!!judge}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    className="w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-white"
                    placeholder="答えを入力"
                  />
                  <button
                    onClick={submitText}
                    disabled={!!judge}
                    className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 font-extrabold disabled:opacity-50"
                  >
                    この答えで回答
                  </button>
                </div>
              )}

              {judge && (
                <div className="pt-2 text-sm">
                  <p className={judge.isCorrect ? 'text-emerald-300 font-extrabold' : 'text-rose-300 font-extrabold'}>
                    {judge.isCorrect ? '◯ 正解！' : '× 不正解'}
                  </p>
                  <p className="text-white/80 mt-1">
                    正解: <span className="font-bold">{judge.correctAnswer || '（不明）'}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <footer className="px-4 pb-4 text-[11px] text-white/50">
        10点先取 / 相手の強さで「選べる問題数」が変化
      </footer>
    </main>
  );
}
