// file: app/battle/page_inner.js
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import QuestionReviewAndReport from '@/components/QuestionReviewAndReport';

let socket;

// 問題タイプ別の制限時間（ミリ秒）
const TIME_SINGLE = 30000; // 単一選択
const TIME_MULTI_ORDER = 40000; // 複数選択 / 並び替え
const TIME_TEXT = 60000; // 記述（15文字以内）
const TIME_TEXT_LONG = 80000; // 記述（16文字以上）

// AI戦の最大問題数
const MAX_AI_QUESTIONS = 30;

// ==== roomIdから決定的な乱数を作るユーティリティ ====

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

// seed(数値)から0〜1の乱数
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 配列を決定的にシャッフル
function shuffleDeterministic(array, seedStr) {
  const seedMaker = xmur3(seedStr);
  const rng = mulberry32(seedMaker());
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 正解文字列をパース（JSON配列 or 区切り文字）
function parseCorrectValues(ans) {
  if (!ans) return [];
  try {
    const parsed = JSON.parse(ans);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v).trim()).filter(Boolean);
    }
  } catch {
    // 無視
  }
  return ans
    .split(/[、,／\/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 文字列のゆるめ正規化（記述用）
function normalizeText(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, '') // 全スペース削除
    .toLowerCase();
}

// 表示用の正解テキスト
function getDisplayAnswer(q) {
  if (!q) return '';
  const list = parseCorrectValues(q.answer);
  if (list.length === 0) return q.answer || '';
  return list.join(' / ');
}

// この問題のタイプ
function getQuestionType(q) {
  return q?.type || 'single';
}

function makeRoomId(prefix = 'room') {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {}
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ====== ここから追加：チーム表示ミニカード（rate-match と同等） ======
function TeamCardMini({ member }) {
  if (!member) {
    return <div className="w-20 h-12 rounded-lg border border-slate-300 bg-slate-50" />;
  }

  const rarity =
    member.rarity ??
    member.base_rarity ??
    member.baseRarity ??
    member.rarity_original ??
    1;

  const star =
    member.star ??
    member.stars ??
    member.current_star ??
    member.currentStar ??
    1;

  let borderClass = 'border-slate-400';
  let bgClass = 'bg-white';

  if (rarity === 1) borderClass = 'border-zinc-400';
  else if (rarity === 2) borderClass = 'border-emerald-500';
  else if (rarity === 3) borderClass = 'border-red-500';
  else if (rarity === 4) borderClass = 'border-slate-300';
  else if (rarity === 5) borderClass = 'border-yellow-400';
  else if (rarity === 6) borderClass = 'border-indigo-400';
  else if (rarity >= 7) {
    borderClass = 'border-indigo-400';
    if (rarity === 7) bgClass = 'bg-amber-200';
    else if (rarity === 8) bgClass = 'bg-slate-200';
    else if (rarity === 9) bgClass = 'bg-yellow-200';
    else if (rarity === 10) bgClass = 'bg-slate-100';
    else if (rarity === 11) bgClass = 'bg-cyan-100';
  }

  return (
    <div
      className={`relative w-20 h-12 rounded-lg border-2 ${borderClass} ${bgClass} flex items-center justify-center overflow-hidden`}
    >
      <span className="px-1 text-[9px] font-bold text-slate-900 text-center leading-tight">
        {member.name}
      </span>
      <span className="absolute left-0 top-0 px-1 text-[8px] font-bold text-slate-900 bg-white/80 rounded-br">
        R{rarity}
      </span>
      <span className="absolute right-0 bottom-0 px-1 text-[8px] font-bold text-amber-700 bg-white/80 rounded-tl">
        ★{star}
      </span>
    </div>
  );
}

function renderTeamRow(team) {
  const slots = Array.isArray(team) ? [...team] : [];
  while (slots.length < 5) slots.push(null);
  return (
    <div className="flex justify-center gap-2 mt-1">
      {slots.map((m, i) => (
        <TeamCardMini key={i} member={m} />
      ))}
    </div>
  );
}
// ====== ここまで追加 ======


function BattlePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const modeParam = searchParams.get('mode');
  const isAiMode = modeParam === 'ai';
  const isCpuMode = modeParam === 'cpu';

  // ★ room が無い(特にCPU/AI)と "default" 固定になって毎回同じ問題になるので、
  //   CPU/AIの時はクライアント側で一度だけランダム roomId を生成して使う
  const roomParam = searchParams.get('room');
  const [generatedRoomId, setGeneratedRoomId] = useState(null);

  useEffect(() => {
    if (roomParam) return;
    if (!(isAiMode || isCpuMode)) return;
    setGeneratedRoomId(makeRoomId(isCpuMode ? 'cpu' : 'ai'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomParam, isAiMode, isCpuMode]);

  const roomId = roomParam || generatedRoomId || (isAiMode || isCpuMode ? '' : 'default');

  const [me, setMe] = useState(null);
  const [socketId, setSocketId] = useState(null);

  // waiting / cpu-matching / question / waiting-opponent / finished
  const [phase, setPhase] = useState('waiting');

  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const [myScore, setMyScore] = useState(0);
  const [myTime, setMyTime] = useState(0);

  const [oppName, setOppName] = useState(isAiMode ? 'AIなつ' : isCpuMode ? 'CPU' : '相手待ち');
  const [cpuProfile, setCpuProfile] = useState(null); // CPU戦の相手プロファイル
const [myTeam, setMyTeam] = useState([]); // CPUマッチング画面用：自分のマイチーム
  const [oppScore, setOppScore] = useState(0);
  const [oppTime, setOppTime] = useState(0);

  // ★ CPUマッチングのカウントダウン
  const [cpuMatchLeft, setCpuMatchLeft] = useState(0);

  // AIの種類: 'natsu' or 'narekin'
  const [aiVariant, setAiVariant] = useState('natsu');

  const [selected, setSelected] = useState(null); // 単一選択
  const [multiSelected, setMultiSelected] = useState([]); // 複数選択
  const [orderSelected, setOrderSelected] = useState([]); // 並び替え
  const [textAnswer, setTextAnswer] = useState(''); // 記述

  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);

  // 不備報告用：各問題の履歴
  const [answerHistory, setAnswerHistory] = useState([]);

  // 判定表示用: { isCorrect: boolean, correctAnswer: string }
  const [judge, setJudge] = useState(null);

  const currentQuestion = questions[qIndex];
  const qType = getQuestionType(currentQuestion);

  const addLog = (msg) => setLog((prev) => [...prev, msg]);

  // ★ me のIDを統一
  const myUserId = me?.id ?? me?.user_id ?? me?.userId ?? null;

  // 不備報告用：履歴追加
  const pushHistory = (userAnswerText) => {
    if (!currentQuestion) return;
    setAnswerHistory((prev) => [
      ...prev,
      {
        question_id: currentQuestion.id,
        text: currentQuestion.text || '',
        userAnswerText,
        correctAnswerText: getDisplayAnswer(currentQuestion),
      },
    ]);
  };

  // ミス記録用: レート戦で不正解だった問題を /api/mistakes/add に送る
  const logMistake = (question) => {
    if (!question || !question.id) return;
    if (isAiMode) return; // AI戦はレート扱いにしない
    fetch('/api/mistakes/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id }),
    }).catch(() => {});
  };

  // 自分情報
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

// ★ CPUマッチング画面用：自分のマイチーム取得
useEffect(() => {
  if (!isCpuMode) return;
  if (!me?.id) return;

  fetch(`/api/user/team?user_id=${me.id}`)
    .then((r) => r.json())
    .then((d) => setMyTeam(Array.isArray(d.team) ? d.team : []))
    .catch(() => setMyTeam([]));
}, [isCpuMode, me?.id]);


  // 問題取得（PVP/AI/CPU共通）
  useEffect(() => {
    // CPU/AIで roomId 生成前は待つ（ここ重要）
    if ((isAiMode || isCpuMode) && !roomId) return;

    const fetchQuestions = async () => {
      try {
        const endpoint = isAiMode ? '/api/ai-questions' : '/api/questions';

        const res = await fetch(endpoint);
        const data = await res.json();

        const srcArray = Array.isArray(data)
          ? data
          : Array.isArray(data.questions)
          ? data.questions
          : [];

        // ① 重複除去
        const uniqueMap = new Map();
        for (const q of srcArray) {
          const key = `${q.question_text || q.question || ''}__${q.correct_answer ?? ''}`;
          if (!uniqueMap.has(key)) uniqueMap.set(key, q);
        }
        const uniqueQuestions = Array.from(uniqueMap.values());

        // ② シャッフル方法
        //   AI: 完全ランダム
        //   PVP/CPU: seed(roomId) で決定的。ただしCPUは roomId を毎回生成するので毎回順番は変わる
        let picked;
        if (isAiMode) {
          picked = [...uniqueQuestions].sort(() => Math.random() - 0.5).slice(0, MAX_AI_QUESTIONS);
        } else {
          picked = shuffleDeterministic(uniqueQuestions, roomId).slice(0, 30);
        }

        // ③ battle用に整形
        const normalized = picked.map((q, idx) => {
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

          const text = q.question_text || q.question || '';
          const answer = q.correct_answer ?? '';

          // altAnswers
          let altAnswers = [];
          try {
            if (Array.isArray(q.altAnswers)) altAnswers = q.altAnswers;
            else if (Array.isArray(q.alt_answers_json)) altAnswers = q.alt_answers_json;
            else if (typeof q.alt_answers_json === 'string') {
              const parsed = JSON.parse(q.alt_answers_json);
              if (Array.isArray(parsed)) altAnswers = parsed;
            }
          } catch {
            altAnswers = [];
          }

          // type
          const answerList = parseCorrectValues(answer);
          const rawType = (q.type || '').toString().toLowerCase();

          let type = 'single';

          if (!options || options.length === 0) {
            type = 'text';
          } else if (rawType) {
            if (
              rawType.includes('order') ||
              rawType.includes('ordering') ||
              rawType.includes('並') ||
              rawType.includes('順')
            ) {
              type = 'ordering';
            } else if (
              rawType.includes('multi') ||
              rawType.includes('multiple') ||
              rawType.includes('checkbox') ||
              rawType.includes('複数')
            ) {
              type = 'multi';
            } else if (
              rawType.includes('text') ||
              rawType.includes('written') ||
              rawType.includes('記述')
            ) {
              type = 'text';
            } else {
              type = answerList.length > 1 ? 'multi' : 'single';
            }
          } else {
            if (answerList.length > 1) {
              const t = text.replace(/\s/g, '');
              if (t.includes('順') || t.includes('並べ') || t.includes('順番')) type = 'ordering';
              else type = 'multi';
            } else {
              type = 'single';
            }
          }

          // options shuffle（roomId seed）
          if (options && options.length > 0) {
            const optSeed = `${roomId}-q-${q.id ?? idx}`;
            options = shuffleDeterministic(options, optSeed);
          }

          return { id: q.id ?? idx, text, type, options, answer, altAnswers };
        });

        setQuestions(normalized);
      } catch (e) {
        console.error(e);
        addLog('問題取得に失敗しました');
      }
    };

    fetchQuestions();
  }, [roomId, isAiMode, isCpuMode]);

  // ===== AIモードの初期開始（questions取得後）=====
  useEffect(() => {
    if (!isAiMode) return;
    if (questions.length === 0) return;
    if (phase !== 'waiting') return;

    const isSecretBoss = Math.random() < 0.1;
    setAiVariant(isSecretBoss ? 'narekin' : 'natsu');
    setOppName(isSecretBoss ? 'AIナレキン' : 'AIなつ');

    setPhase('question');
    setQIndex(0);
    setMyScore(0);
    setMyTime(0);
    setOppScore(0);
    setOppTime(0);
    setJudge(null);
    setSelected(null);
    setMultiSelected([]);
    setOrderSelected([]);
    setTextAnswer('');
    setAnswerHistory([]);

    addLog(
      isSecretBoss
        ? 'AIナレキンとの対戦を開始します（超高難度／30問 or スコア10まで）'
        : 'AIなつとの対戦を開始します（30問 or スコア10まで）'
    );
  }, [isAiMode, questions, phase]);

  // ★ CPU戦開始（マッチング→カウントダウン→開始）
  const startCpuBattle = () => {
    if (!isCpuMode) return;
    if (!cpuProfile) return;

    setPhase('question');
    setQIndex(0);
    setMyScore(0);
    setMyTime(0);
    setOppScore(0);
    setOppTime(0);
    setJudge(null);
    setSelected(null);
    setMultiSelected([]);
    setOrderSelected([]);
    setTextAnswer('');
    setAnswerHistory([]);

    addLog(`CPU戦開始: ${cpuProfile.name} (CPUレート=${cpuProfile.rating})`);
  };

  // CPUモードの初期開始（questions取得後）: いきなり開始せず cpu-matching にする
  useEffect(() => {
    if (!isCpuMode) return;
    if (questions.length === 0) return;
    if (phase !== 'waiting') return;
    if (!myUserId) return;

    const boot = async () => {
      try {
        const myRating = typeof me?.rating === 'number' ? me.rating : 1500;
        const res = await fetch(`/api/cpu/rival?my_rating=${myRating}`);
        const data = await res.json();

        if (!data?.ok || !data?.cpu) {
          addLog('CPU候補の取得に失敗しました');
          return;
        }

        setCpuProfile(data.cpu);
        setOppName(data.cpu.name || 'CPU');

        // ★ 対人マッチングっぽく「VS画面」を挟む
        setCpuMatchLeft(5);
        setPhase('cpu-matching');

        addLog(`CPUマッチング: ${data.cpu.name} (CPUレート=${data.cpu.rating})`);
      } catch (e) {
        console.error(e);
        addLog('CPU戦の開始に失敗しました');
      }
    };

    boot();
  }, [isCpuMode, questions, phase, myUserId, me?.rating]);

  // ★ CPUマッチングのカウントダウン制御
  useEffect(() => {
    if (!isCpuMode) return;
    if (phase !== 'cpu-matching') return;

    if (cpuMatchLeft <= 0) {
      startCpuBattle();
      return;
    }

    const t = setTimeout(() => setCpuMatchLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCpuMode, phase, cpuMatchLeft, cpuProfile]);

  // socket.io 初期化（PVPのみ）
  useEffect(() => {
    if (isAiMode) return;
    if (isCpuMode) return;
    if (!roomId) return;
    if (!me) return;

    if (!socket) {
      let SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

      if (!SOCKET_URL && typeof window !== 'undefined') {
        const host = window.location.hostname;
        const protocol = window.location.protocol;
        SOCKET_URL = `${protocol}//${host}:4000`;
      }

      if (!SOCKET_URL) {
        console.error('SOCKET_URL could not be resolved');
        return;
      }

      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });
    }

    const s = socket;

    const userId = me?.id ?? me?.user_id ?? me?.userId ?? null;

    const joinPayload = {
      roomId,
      playerName: me?.name || me?.username || 'プレイヤー',
      userId,
    };

    const doJoin = () => {
      setSocketId(s.id);
      addLog(`battle:join emit: socket=${s.id}, room=${roomId}, userId=${joinPayload.userId}`);
      s.emit('battle:join', joinPayload);
    };

    if (s.connected) doJoin();
    else s.on('connect', doJoin);

    const onStart = (payload) => {
      addLog(`対戦開始 相手: ${payload.opponentName}`);
      setOppName(payload.opponentName || '相手');

      setPhase('question');
      setQIndex(payload.currentQuestionIndex ?? 0);
      setMyScore(0);
      setMyTime(0);
      setOppScore(0);
      setOppTime(0);
      setJudge(null);
      setSelected(null);
      setMultiSelected([]);
      setOrderSelected([]);
      setTextAnswer('');
      setAnswerHistory([]);
    };

    const onNext = (payload) => {
      addLog(`次の問題へ index=${payload.nextQuestionIndex}`);

      if (socketId && Array.isArray(payload.scores)) {
        const self = payload.scores.find((p) => p.socketId === socketId);
        const opp = payload.scores.find((p) => p.socketId !== socketId);
        if (self) {
          setMyScore(self.score);
          setMyTime(self.totalTimeMs);
        }
        if (opp) {
          setOppScore(opp.score);
          setOppTime(opp.totalTimeMs);
        }
      }

      setSelected(null);
      setMultiSelected([]);
      setOrderSelected([]);
      setTextAnswer('');
      setJudge(null);
      setPhase('question');
      setQIndex(payload.nextQuestionIndex);
    };

    const onFinished = (payload) => {
      addLog('対戦終了');

      let outcome = 'draw';
      if (payload.self && payload.opponent) {
        const myScoreVal = Number(payload.self.score) || 0;
        const oppScoreVal = Number(payload.opponent.score) || 0;
        const myTimeVal = Number(payload.self.totalTimeMs) || 0;
        const oppTimeVal = Number(payload.opponent.totalTimeMs) || 0;

        if (myScoreVal > oppScoreVal) outcome = 'win';
        else if (myScoreVal < oppScoreVal) outcome = 'lose';
        else {
          if (myTimeVal < oppTimeVal) outcome = 'win';
          else if (myTimeVal > oppTimeVal) outcome = 'lose';
          else outcome = 'draw';
        }
      } else if (payload.outcome) {
        outcome = payload.outcome;
      }

      const fullResult = { ...payload, outcome };

      setPhase('finished');
      setResult(fullResult);
      setJudge(null);

      if (fullResult.self) {
        setMyScore(fullResult.self.score);
        setMyTime(fullResult.self.totalTimeMs);
      }
      if (fullResult.opponent) {
        setOppScore(fullResult.opponent.score);
        setOppTime(fullResult.opponent.totalTimeMs);
      }
    };

    const onError = (err) => {
      console.error(err);
      addLog('エラーが発生しました');
    };

    s.on('battle:start', onStart);
    s.on('battle:next', onNext);
    s.on('battle:finished', onFinished);
    s.on('battle:error', onError);

    return () => {
      s.off('connect', doJoin);
      s.off('battle:start', onStart);
      s.off('battle:next', onNext);
      s.off('battle:finished', onFinished);
      s.off('battle:error', onError);
    };
  }, [roomId, me, isAiMode, isCpuMode, socketId]);

  const calcTimeLimit = (q) => {
    if (!q) return TIME_SINGLE;
    const t = getQuestionType(q);

    if (t === 'single') return TIME_SINGLE;
    if (t === 'multi' || t === 'ordering') return TIME_MULTI_ORDER;

    const len = (q.answer || '').length;
    if (len > 15) return TIME_TEXT_LONG;
    return TIME_TEXT;
  };

  // タイマー制御
  useEffect(() => {
    if (phase !== 'question' || !currentQuestion) {
      setTimeLeft(0);
      return;
    }

    const limit = calcTimeLimit(currentQuestion);
    setTimeLeft(limit);

    const start = Date.now();
    const timerId = setInterval(() => {
      const elapsed = Date.now() - start;
      const remain = limit - elapsed;

      if (remain <= 0) {
        clearInterval(timerId);
        setTimeLeft(0);
        handleTimeout(limit);
      } else {
        setTimeLeft(remain);
      }
    }, 50);

    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex, currentQuestion]);

  const handleTimeout = (limit) => {
    if (phase !== 'question' || !currentQuestion) return;
    setPhase('waiting-opponent');
    addLog('時間切れ');

    setJudge({
      isCorrect: false,
      correctAnswer: getDisplayAnswer(currentQuestion),
    });

    pushHistory('（時間切れ）');
    logMistake(currentQuestion);

    sendAnswer(false, limit);
  };

  // ====== AIモード専用の進行 ======

  const finishAiBattle = (myScoreVal, myTimeVal, oppScoreVal, oppTimeVal) => {
    const myScoreNum = Number(myScoreVal) || 0;
    const oppScoreNum = Number(oppScoreVal) || 0;
    const myTimeNum = Number(myTimeVal) || 0;
    const oppTimeNum = Number(oppTimeVal) || 0;

    let outcome;
    if (myScoreNum > oppScoreNum) outcome = 'win';
    else if (myScoreNum < oppScoreNum) outcome = 'lose';
    else {
      if (myTimeNum < oppTimeNum) outcome = 'win';
      else if (myTimeNum > oppTimeNum) outcome = 'lose';
      else outcome = 'win'; // 同点同秒はユーザー勝ち
    }

    setPhase('finished');
    setResult({
      mode: 'ai',
      outcome,
      self: { score: myScoreNum, totalTimeMs: myTimeNum },
      opponent: { score: oppScoreNum, totalTimeMs: oppTimeNum },
      aiVariant,
    });

    if (outcome === 'win') {
      const rewardBerry = aiVariant === 'narekin' ? 3000 : 200;

      fetch('/api/ai-battle/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ berry: rewardBerry }),
      }).catch(() => {});
    }
  };

  const goNextQuestionAi = (myScoreVal, myTimeVal, oppScoreVal, oppTimeVal) => {
    const totalQuestions = Math.min(questions.length, MAX_AI_QUESTIONS);
    const nextIndex = qIndex + 1;
    const someoneReached10 = myScoreVal >= 10 || oppScoreVal >= 10;

    if (nextIndex >= totalQuestions || someoneReached10) {
      finishAiBattle(myScoreVal, myTimeVal, oppScoreVal, oppTimeVal);
    } else {
      setPhase('question');
      setQIndex(nextIndex);
      setSelected(null);
      setMultiSelected([]);
      setOrderSelected([]);
      setTextAnswer('');
      setJudge(null);
    }
  };

  const handleAiAnswer = (isCorrect, usedMs) => {
    if (!currentQuestion) return;

    const limit = calcTimeLimit(currentQuestion);
    const used = typeof usedMs === 'number' ? usedMs : 0;

    let aiCorrect;
    let aiUsed;

    if (aiVariant === 'narekin') {
      aiCorrect = Math.random() < 0.98;
      aiUsed = 15000;
    } else {
      const correctProb = 0.7;
      aiCorrect = Math.random() < correctProb;
      const minMs = limit * 0.3;
      const maxMs = limit * 0.9;
      aiUsed = Math.floor(minMs + (maxMs - minMs) * Math.random());
    }

    const nextMyScore = myScore + (isCorrect ? 1 : 0);
    const nextMyTime = myTime + used;
    const nextOppScore = oppScore + (aiCorrect ? 1 : 0);
    const nextOppTime = oppTime + aiUsed;

    setMyScore(nextMyScore);
    setMyTime(nextMyTime);
    setOppScore(nextOppScore);
    setOppTime(nextOppTime);

    setTimeout(() => {
      goNextQuestionAi(nextMyScore, nextMyTime, nextOppScore, nextOppTime);
    }, 2000);
  };

  // ====== CPUモード専用の進行 ======

  const finishCpuBattle = async (myScoreVal, myTimeVal, oppScoreVal, oppTimeVal) => {
    const myScoreNum = Number(myScoreVal) || 0;
    const oppScoreNum = Number(oppScoreVal) || 0;
    const myTimeNum = Number(myTimeVal) || 0;
    const oppTimeNum = Number(oppTimeVal) || 0;

    let outcome = 'draw';
    if (myScoreNum > oppScoreNum) outcome = 'win';
    else if (myScoreNum < oppScoreNum) outcome = 'lose';
    else {
      if (myTimeNum < oppTimeNum) outcome = 'win';
      else if (myTimeNum > oppTimeNum) outcome = 'lose';
      else outcome = 'draw';
    }

    setPhase('finished');
    setResult({
      mode: 'cpu',
      outcome,
      self: { score: myScoreNum, totalTimeMs: myTimeNum },
      opponent: { score: oppScoreNum, totalTimeMs: oppTimeNum },
      cpuProfile,
    });

    try {
      if (myUserId && cpuProfile) {
        await fetch('/api/cpu/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: myUserId,
            roomId,
            cpu: { name: cpuProfile.name, rating: cpuProfile.rating },
            scoreUser: myScoreNum,
            scoreCpu: oppScoreNum,
            totalTimeUser: myTimeNum,
            totalTimeCpu: oppTimeNum,
          }),
        });
      }
    } catch (e) {
      console.error('cpu finalize failed', e);
    }
  };

  const goNextQuestionCpu = (myScoreVal, myTimeVal, oppScoreVal, oppTimeVal) => {
    const totalQuestions = Math.min(questions.length, MAX_AI_QUESTIONS);
    const nextIndex = qIndex + 1;
    const someoneReached10 = myScoreVal >= 10 || oppScoreVal >= 10;

    if (nextIndex >= totalQuestions || someoneReached10) {
      finishCpuBattle(myScoreVal, myTimeVal, oppScoreVal, oppTimeVal);
    } else {
      setPhase('question');
      setQIndex(nextIndex);
      setSelected(null);
      setMultiSelected([]);
      setOrderSelected([]);
      setTextAnswer('');
      setJudge(null);
    }
  };

  const handleCpuAnswer = (isCorrect, usedMs) => {
    if (!currentQuestion) return;

    const used = typeof usedMs === 'number' ? usedMs : 0;

    // CPUの正解率と時間（avg ±5秒）
    const cpuAcc = typeof cpuProfile?.accuracy === 'number' ? cpuProfile.accuracy : 0.5;
    const cpuAvg = typeof cpuProfile?.avgTimeSec === 'number' ? cpuProfile.avgTimeSec : 50;

    const cpuCorrect = Math.random() < cpuAcc;

    const jitter = Math.random() * 10 - 5; // -5..+5
    const cpuUsedSec = Math.max(1, cpuAvg + jitter);
    const cpuUsedMs = Math.floor(cpuUsedSec * 1000);

    const nextMyScore = myScore + (isCorrect ? 1 : 0);
    const nextMyTime = myTime + used;
    const nextOppScore = oppScore + (cpuCorrect ? 1 : 0);
    const nextOppTime = oppTime + cpuUsedMs;

    setMyScore(nextMyScore);
    setMyTime(nextMyTime);
    setOppScore(nextOppScore);
    setOppTime(nextOppTime);

    setTimeout(() => {
      goNextQuestionCpu(nextMyScore, nextMyTime, nextOppScore, nextOppTime);
    }, 2000);
  };

  // ====== 回答送信（PVP / AI / CPU） ======

  const sendAnswer = (isCorrect, usedMs) => {
    const used = typeof usedMs === 'number' ? usedMs : 0;

    // AI
    if (isAiMode) {
      handleAiAnswer(isCorrect, used);
      return;
    }

    // CPU
    if (isCpuMode) {
      handleCpuAnswer(isCorrect, used);
      return;
    }

    // PVP（ソケット）
    setMyTime((t) => t + used);
    if (isCorrect) setMyScore((s) => s + 1);

    if (socket && roomId) {
      socket.emit('battle:answer', {
        roomId,
        questionIndex: qIndex,
        isCorrect,
        timeMs: Math.round(used),
      });
    }
  };

  // ====== 回答処理（各タイプ） ======

  const handleSelectSingle = (opt) => {
    if (phase !== 'question' || !currentQuestion) return;

    const limit = calcTimeLimit(currentQuestion);
    const used = Math.max(0, limit - timeLeft);

    const candidates = parseCorrectValues(currentQuestion.answer);

    let isCorrect = false;
    if (candidates.length === 0) {
      isCorrect = opt === (currentQuestion.answer || '');
    } else {
      isCorrect = candidates.includes(opt);
    }

    setSelected(opt);
    setPhase('waiting-opponent');
    setJudge({
      isCorrect,
      correctAnswer: getDisplayAnswer(currentQuestion),
    });

    pushHistory(opt);

    if (!isCorrect) {
      logMistake(currentQuestion);
    }

    sendAnswer(isCorrect, used);
  };

  const toggleMultiOption = (opt) => {
    if (phase !== 'question') return;
    setMultiSelected((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  };

  const submitMulti = () => {
    if (phase !== 'question' || !currentQuestion) return;

    const limit = calcTimeLimit(currentQuestion);
    const used = Math.max(0, limit - timeLeft);

    const candidates = parseCorrectValues(currentQuestion.answer);
    const sel = multiSelected;

    let isCorrect = false;
    if (candidates.length > 0 && sel.length === candidates.length) {
      const setA = new Set(sel);
      const setB = new Set(candidates);
      isCorrect = [...setA].every((v) => setB.has(v)) && [...setB].every((v) => setA.has(v));
    }

    setPhase('waiting-opponent');
    setJudge({
      isCorrect,
      correctAnswer: getDisplayAnswer(currentQuestion),
    });

    pushHistory(sel.join(' / '));

    if (!isCorrect) {
      logMistake(currentQuestion);
    }

    sendAnswer(isCorrect, used);
  };

  const toggleOrderOption = (opt) => {
    if (phase !== 'question') return;
    setOrderSelected((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  };

  const resetOrder = () => {
    setOrderSelected([]);
  };

  const submitOrder = () => {
    if (phase !== 'question' || !currentQuestion) return;

    const limit = calcTimeLimit(currentQuestion);
    const used = Math.max(0, limit - timeLeft);

    const candidates = parseCorrectValues(currentQuestion.answer);
    const sel = orderSelected;

    let isCorrect = false;
    if (candidates.length > 0 && sel.length === candidates.length) {
      isCorrect = candidates.every((v, i) => sel[i] === v);
    }

    setPhase('waiting-opponent');
    setJudge({
      isCorrect,
      correctAnswer: getDisplayAnswer(currentQuestion),
    });

    pushHistory(sel.join(' → '));

    if (!isCorrect) {
      logMistake(currentQuestion);
    }

    sendAnswer(isCorrect, used);
  };

  const submitText = () => {
    if (phase !== 'question' || !currentQuestion) return;

    const limit = calcTimeLimit(currentQuestion);
    const used = Math.max(0, limit - timeLeft);

    const inputRaw = textAnswer;
    const inputNorm = normalizeText(inputRaw);

    const baseCandidates = parseCorrectValues(currentQuestion.answer);
    const alt = Array.isArray(currentQuestion.altAnswers) && currentQuestion.altAnswers.length > 0
      ? currentQuestion.altAnswers
      : [];

    const allCandidates = [
      ...(baseCandidates.length > 0 ? baseCandidates : [currentQuestion.answer || '']),
      ...alt,
    ];

    let isCorrect = false;
    if (inputNorm !== '') {
      const normalizedList = allCandidates.map((s) => normalizeText(s)).filter((v) => v.length > 0);
      isCorrect = normalizedList.includes(inputNorm);
    }

    setPhase('waiting-opponent');
    setJudge({
      isCorrect,
      correctAnswer: getDisplayAnswer(currentQuestion),
    });

    pushHistory(inputRaw || '');

    if (!isCorrect) {
      logMistake(currentQuestion);
    }

    sendAnswer(isCorrect, used);
  };

  // ====== 表示用 ======

  const timeDisplay = useMemo(() => {
    if (phase !== 'question' || !currentQuestion || timeLeft <= 0) return '---';
    return (timeLeft / 1000).toFixed(1);
  }, [phase, currentQuestion, timeLeft]);

  const myTimeDisplay = useMemo(() => (myTime / 1000).toFixed(1), [myTime]);
  const oppTimeDisplay = useMemo(() => (oppTime / 1000).toFixed(1), [oppTime]);

  if ((isAiMode || isCpuMode) && !roomId) {
    // roomId生成待ち
    return (
      <main className="min-h-screen bg-sky-50 text-sky-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow px-6 py-4 text-center">
          対戦準備中…
        </div>
      </main>
    );
  }

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-sky-50 text-sky-900">
        <div className="bg-white rounded-2xl shadow px-6 py-4 text-center">
          <p className="mb-2">ルームIDが指定されていません。</p>
          <button
            className="px-4 py-2 rounded-full bg-sky-500 text-white text-sm font-bold"
            onClick={() => router.push('/')}
          >
            ホームへ戻る
          </button>
        </div>
      </main>
    );
  }

  const progress =
    currentQuestion && calcTimeLimit(currentQuestion) > 0
      ? Math.max(0, Math.min(1, timeLeft / (calcTimeLimit(currentQuestion) || 1)))
      : 0;

  const aiResultTitle = aiVariant === 'narekin' ? 'AIナレキン戦 結果' : 'AIなつ戦 結果';
  const opponentLabel = isAiMode ? (aiVariant === 'narekin' ? 'AIナレキン' : 'AIなつ') : oppName;

  return (
    <main className="min-h-screen bg-sky-50 text-sky-900 flex flex-col">
      {/* ヘッダー */}
      <header className="px-4 py-3 flex justify-between items-center bg-white shadow">
        <div>
          <p className="text-xs text-slate-500">ルームID</p>
          <p className="text-sm font-mono">{roomId}</p>
        </div>
        <div className="text-right text-xs text-slate-600">
          <p>
            あなた:{' '}
            <span className="font-bold">{me?.name ?? me?.username ?? 'プレイヤー'}</span>
          </p>
          <p>
            相手: <span className="font-bold">{oppName}</span>
          </p>
        </div>
      </header>

      {/* メイン */}
      <section className="flex-1 flex flex-col gap-3 px-4 py-3">
        {/* スコア */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white rounded-xl shadow p-2">
            <p className="font-bold mb-1">あなた</p>
            <p>スコア: {myScore}</p>
            <p>時間: {myTimeDisplay} 秒</p>
          </div>
          <div className="bg-white rounded-xl shadow p-2">
            <p className="font-bold mb-1">{oppName}</p>
            <p>スコア: {oppScore}</p>
            <p>時間: {oppTimeDisplay} 秒</p>
          </div>
        </div>

        {/* ★ CPUマッチング画面（相手チームまで出る VS 画面） */}
{isCpuMode && phase === 'cpu-matching' && cpuProfile && (
  <div className="bg-white rounded-2xl shadow p-4 text-center text-sky-900 space-y-4">
    <p className="font-bold">マッチングしました</p>

    {/* 相手（CPU） */}
    <div className="space-y-1 text-sm">
      <p className="font-semibold text-slate-700">相手</p>
      <p className="text-lg font-extrabold">{cpuProfile.name}</p>
      <p className="text-xs text-slate-700">レート: {cpuProfile.rating}</p>

      <p className="text-xs text-slate-600 mt-2">相手のマイチーム</p>
      {renderTeamRow(cpuProfile.team)}
    </div>

    <p className="font-bold text-slate-600">vs</p>

    {/* 自分 */}
    <div className="space-y-1 text-sm">
      <p className="font-semibold text-slate-700">自分</p>
      <p className="text-lg font-extrabold">{me?.display_name ?? me?.username ?? 'プレイヤー'}</p>
      <p className="text-xs text-slate-700">レート: {typeof me?.rating === 'number' ? me.rating : '---'}</p>

      <p className="text-xs text-slate-600 mt-2">自分のマイチーム</p>
      {renderTeamRow(myTeam)}
    </div>

    <p className="text-xs text-slate-600 mt-2">対戦開始まで…</p>
    <p className="text-2xl font-extrabold text-sky-700">{cpuMatchLeft}</p>

    <button
      className="w-full py-2 rounded-full bg-sky-600 text-white text-sm font-bold"
      onClick={() => setCpuMatchLeft(0)}
    >
      今すぐ開始
    </button>
  </div>
)}


        {/* 問題 or 結果 */}
        {(phase === 'question' || phase === 'waiting-opponent') && currentQuestion && (
          <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>
                {qIndex + 1}問目 / {isAiMode ? MAX_AI_QUESTIONS : questions.length}問
              </span>
              <span>残り時間: {timeDisplay} 秒</span>
            </div>

            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress * 100}%` }} />
            </div>

            <p className="text-sm font-semibold whitespace-pre-wrap text-slate-900">{currentQuestion.text}</p>

            {/* 問題タイプごとのUI */}
            <div className="mt-2 space-y-2">
              {/* 単一選択 */}
              {qType === 'single' && currentQuestion.options?.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {currentQuestion.options.map((opt, i) => {
                    let style = 'bg-slate-50 hover:bg-sky-50 border-slate-200 text-slate-900';

                    if (phase === 'question') {
                      if (selected === opt) style = 'bg-sky-600 text-white border-sky-600';
                    } else if (judge && phase !== 'question') {
                      const candidateList = parseCorrectValues(currentQuestion.answer);
                      const isCorrectOpt =
                        candidateList.length === 0
                          ? opt === (currentQuestion.answer || '')
                          : candidateList.includes(opt);

                      if (isCorrectOpt) style = 'bg-emerald-50 border-emerald-500 text-slate-900';
                      if (selected === opt && !judge.isCorrect) style = 'bg-red-50 border-red-500 text-slate-900';
                    }

                    return (
                      <button
                        key={i}
                        disabled={phase !== 'question'}
                        onClick={() => handleSelectSingle(opt)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 複数選択 */}
              {qType === 'multi' && currentQuestion.options?.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {currentQuestion.options.map((opt, i) => {
                      const isOn = multiSelected.includes(opt);
                      let style = 'bg-slate-50 hover:bg-sky-50 border-slate-200 text-slate-900';

                      if (phase !== 'question' && judge) {
                        const correctList = parseCorrectValues(currentQuestion.answer);
                        if (correctList.includes(opt)) style = 'bg-emerald-50 border-emerald-500 text-slate-900';
                        if (isOn && !judge.isCorrect) style = 'bg-red-50 border-red-500 text-slate-900';
                      } else if (isOn) {
                        style = 'bg-sky-600 text-white border-sky-600';
                      }

                      return (
                        <button
                          key={i}
                          disabled={phase !== 'question'}
                          onClick={() => toggleMultiOption(opt)}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${style}`}
                        >
                          <span className="mr-2">{isOn ? '☑' : '☐'}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {phase === 'question' && (
                    <button
                      onClick={submitMulti}
                      className="w-full mt-1 py-2 rounded-full bg-sky-600 text-white text-sm font-bold"
                    >
                      この選択で回答する
                    </button>
                  )}
                </div>
              )}

              {/* 並び替え */}
              {qType === 'ordering' && currentQuestion.options?.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {currentQuestion.options.map((opt, i) => {
                      const idx = orderSelected.indexOf(opt);
                      const selectedOrder = idx >= 0 ? idx + 1 : null;
                      let style = 'bg-slate-50 hover:bg-sky-50 border-slate-200 text-slate-900';

                      if (phase !== 'question' && judge) {
                        const correctList = parseCorrectValues(currentQuestion.answer);
                        const correctIdx = correctList.indexOf(opt);
                        if (correctIdx >= 0) style = 'bg-emerald-50 border-emerald-500 text-slate-900';
                        if (idx >= 0 && !judge.isCorrect) style = 'bg-red-50 border-red-500 text-slate-900';
                      } else if (selectedOrder) {
                        style = 'bg-sky-600 text-white border-sky-600';
                      }

                      return (
                        <button
                          key={i}
                          disabled={phase !== 'question'}
                          onClick={() => toggleOrderOption(opt)}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${style}`}
                        >
                          <span className="mr-2 text-xs">{selectedOrder ? `${selectedOrder}.` : '・'}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {phase === 'question' && (
                    <div className="flex gap-2">
                      <button
                        onClick={resetOrder}
                        className="flex-1 py-2 rounded-full bg-slate-200 text-slate-800 text-xs font-bold"
                      >
                        リセット
                      </button>
                      <button
                        onClick={submitOrder}
                        className="flex-1 py-2 rounded-full bg-sky-600 text-white text-xs font-bold"
                      >
                        この順番で回答
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 記述 */}
              {qType === 'text' && (
                <div className="space-y-2">
                  <textarea
                    disabled={phase !== 'question'}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    rows={2}
                    placeholder="ここに答えを入力"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                  />
                  {phase === 'question' && (
                    <button
                      onClick={submitText}
                      className="w-full py-2 rounded-full bg-sky-600 text-white text-sm font-bold"
                    >
                      この答えで回答する
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 判定＋正解表示 */}
            {judge && (
              <div className="mt-2 text-xs">
                <p className={judge.isCorrect ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                  {judge.isCorrect ? '◯ 正解！' : '× 不正解'}
                </p>

                <p className="text-slate-700 mt-1">
                  正解:&nbsp;
                  <span className="font-semibold">
                    {judge.correctAnswer && judge.correctAnswer.trim() !== '' ? judge.correctAnswer : '（正解データなし）'}
                  </span>
                </p>

                {/* PVPだけ表示（CPU/AIは待たない） */}
                {phase === 'waiting-opponent' && !isAiMode && !isCpuMode && (
                  <p className="text-amber-600 mt-1">相手の回答を待っています…</p>
                )}
              </div>
            )}

            {!judge && phase === 'waiting-opponent' && !isAiMode && !isCpuMode && (
              <p className="text-xs text-amber-600 mt-1">相手の回答を待っています…</p>
            )}
          </div>
        )}

        {phase === 'finished' && result && (
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-2xl shadow p-4 text-center space-y-3">
              <p className="text-xs text-slate-500 mb-1">{isAiMode ? aiResultTitle : '対戦結果'}</p>
              <p className="text-2xl font-extrabold text-slate-900">
                {result.outcome === 'win' ? '勝利！' : result.outcome === 'lose' ? '敗北…' : '引き分け'}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs text-left">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="font-bold mb-1">あなた</p>
                  <p>スコア: {result.self.score}</p>
                  <p>時間: {(result.self.totalTimeMs / 1000).toFixed(1)} 秒</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="font-bold mb-1">{opponentLabel}</p>
                  <p>スコア: {result.opponent.score}</p>
                  <p>時間: {(result.opponent.totalTimeMs / 1000).toFixed(1)} 秒</p>
                </div>
              </div>

              <button
                className="mt-2 px-4 py-2 rounded-full bg-sky-600 text-white text-sm font-bold"
                onClick={() => router.push('/')}
              >
                ホームへ戻る
              </button>
            </div>

            {/* 問題不備報告 */}
            <QuestionReviewAndReport questions={answerHistory} sourceMode={isAiMode ? 'rate-ai' : 'rate'} />
          </div>
        )}
      </section>

      {/* ログ */}
      {log.length > 0 && (
        <section className="px-4 pb-3">
          <details className="text-xs text-slate-500">
            <summary>ログ</summary>
            <ul className="mt-1 space-y-0.5">
              {log.map((l, i) => (
                <li key={i}>・{l}</li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </main>
  );
}

// 一番下に追加
export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-sky-50 text-sky-900 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow px-6 py-4 text-center">対戦画面を読み込み中…</div>
        </main>
      }
    >
      <BattlePageInner />
    </Suspense>
  );
}
