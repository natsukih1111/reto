// file: app/solo/waza-game/page.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * =========================
 * 判定ルール（ユーザー指定：技用）
 * =========================
 * 以下の文言/要素は「有無を問わない」＝判定から除外
 * - 必殺 / 緑星 / ゴムゴムの / 奥義 / 遠距離 / 曲技 / カラーズトラップ / オカマ拳法 / 居合 / ロープアクション
 * - 悪魔風脚 / 悪魔風 / 魔神風 / 武装 / 武装硬化 / 八衝拳 / 魚人空手 / 魚人柔術 / R・A
 * - 一刀流/二刀流/三刀流/四刀流/八刀流/九刀流
 * - 記号は「中黒・以外」すべて無視（・は判定する）
 * - っ / ッ 無視
 * - （）内の文 無視
 * - 半角全角 / 大文字小文字 / スペース 無視
 * - ～ / ー 無視
 * - ァ ィ ゥ ェ ォ 無視
 *
 * ★追加ルール
 * D: ④ 使われた場所から推測（2回以上使われた技／場所2個以上表示）
 * F: ⑤ 使われたキャラから推測（2回以上使われた技／使われたキャラ2人以上表示）
 * G: ⑥ 効果音 + 話数から推測
 *
 * ★Excel列
 * A: 技名 name
 * B: 使ったキャラ user
 * C: 使われたキャラ target
 * D: 話数 chapter
 * E: 効果音 sfx
 * F: 場所 place
 *
 * ★注意
 * C/D/E が "ー" のみなら空欄扱いでスルー
 */

const VER = 'WAZA v2025-12-23 (④⑤表示全件+判定修正)';

const RULES = [
  { key: 'A', name: '① 漢字1文字を含む技' },
  { key: 'B', name: '② 前後から推測（技名）' },
  { key: 'E', name: '② 前後から推測（イージー）' },
  { key: 'C', name: '③ 漢字4つから使用者' },

  { key: 'D', name: '④ 場所から推測（技名）' },
  { key: 'F', name: '⑤ 使われたキャラから推測（技名）' },
  { key: 'G', name: '⑥ 効果音＋話数から推測（技名）' },

  { key: 'M', name: 'ミックス' },
];

const DURATIONS = [
  { sec: 300, label: '5分' },
  { sec: 600, label: '10分' },
];

const REVEAL_MS = 3000;
const PENALTY_MS = 10000;

/* =========================
   小物ユーティリティ
========================= */

function cleanCell(v) {
  // "ー" だけは空欄扱い（指示）
  if (v == null) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s === 'ー') return '';
  return s;
}

function splitJPList(raw) {
  const s = cleanCell(raw);
  if (!s) return [];
  return s
    .split(/[、,]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function stripParens(s) {
  if (!s) return '';
  return String(s).replace(/（[^）]*）|\([^)]*\)/g, '');
}

function normalizeCommon(raw) {
  if (!raw) return '';
  let s = String(raw);
  s = stripParens(s);
  s = s.normalize('NFKC');
  s = s.toLowerCase();
  return s;
}

// 技名用：指定の「無視ワード/無視要素」を全部落とす
function normalizeWazaName(raw) {
  if (!raw) return '';
  let s = normalizeCommon(raw);

  const dropTokens = [
    '必殺',
    '緑星',
    'ゴムゴムの',
    '奥義',
    '遠距離',
    '曲技',
    'カラーズトラップ',
    'オカマ拳法',
    '居合',
    'ロープアクション',
    '魚人空手',
    '魚人柔術',
    '悪魔風脚',
    '悪魔風',
    '魔神風',
    '武装硬化',
    '武装',
    '八衝拳',
    'r・a',
    'r.a',
    'ra',
    'おでん',
    '狐火流',
    'ラーメン拳法',
  ];
  for (const t of dropTokens) s = s.split(t).join('');

  // 一刀流〜九刀流 無視（スペース入りも想定）
  s = s.replace(/(一|二|三|四|八|九)\s*刀流/gu, '');

  // っ/ッ 無視
  s = s.replace(/[っッ]/g, '');

  // 小さい母音 無視
  s = s.replace(/[ァィゥェォ]/g, '');

  // ～ / ー 無視（技名内の長音は無視、ただし中黒は保持）
  s = s.replace(/[～ー]/g, '');

  // 中黒だけ保持、他記号は削除
  const DOT = '・';
  s = s.replaceAll(DOT, '__DOT__');
  s = s.replace(/[\p{P}\p{S}]/gu, '');
  s = s.replaceAll('__DOT__', DOT);

  // スペース無視
  s = s.replace(/\s+/g, '');

  return s;
}

// 使用者名用（ゆるめ）
function normalizeUserName(raw) {
  if (!raw) return '';
  let s = normalizeCommon(raw);
  s = s.replace(/[\p{P}\p{S}]/gu, '');
  s = s.replace(/\s+/g, '');
  return s;
}

function sample(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomIndex(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

// ★④⑤：2つに切らず「2以上なら全部出す」
function ensureAllDistinct(arr) {
  return uniq(arr);
}

/* =========================
   ベスト保存
========================= */

function bestKey(ruleKey, durationSec) {
  return `waza_best_${ruleKey}_${durationSec}`;
}
function loadBest(ruleKey, durationSec) {
  if (typeof window === 'undefined') return 0;
  const v = localStorage.getItem(bestKey(ruleKey, durationSec));
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function saveBest(ruleKey, durationSec, score) {
  if (typeof window === 'undefined') return false;
  const cur = loadBest(ruleKey, durationSec);
  if (score > cur) {
    localStorage.setItem(bestKey(ruleKey, durationSec), String(score));
    return true;
  }
  return false;
}

/* =========================
   答え表示生成（時間切れ対策）
========================= */
function buildRevealLinesFromQuestion(q) {
  if (!q) return [];

  // 技名を答える系
  if (q.type === 'A' || q.type === 'B' || q.type === 'E' || q.type === 'D' || q.type === 'F' || q.type === 'G') {
    // 同じ技が複数行あるので uniq して見やすく
    const names = (q.corrects || []).map((x) => x.name).filter(Boolean);
    return uniq(names);
  }

  // 使用者当て
  if (q.type === 'C') {
    const lines = [];
    lines.push(`【使用者】${q.user}`);
    if (Array.isArray(q.fromWaza)) {
      lines.push('【ヒントに使われた技】');
      for (const w of q.fromWaza) lines.push(`・${w.name}`);
    }
    return lines;
  }

  return [];
}

export default function WazaGamePage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);

  const [rule, setRule] = useState('A');
  const [durationSec, setDurationSec] = useState(300);

  const [phase, setPhase] = useState('ready'); // ready | playing | result
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [judgeFlash, setJudgeFlash] = useState(null);

  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [streak, setStreak] = useState(0);

  const [revealing, setRevealing] = useState(false);
  const revealTimerRef = useRef(null);

  const [timeLeftMs, setTimeLeftMs] = useState(durationSec * 1000);
  const endAtRef = useRef(0);
  const timerIdRef = useRef(null);

  const [bests, setBests] = useState({});
  const inputRef = useRef(null);

  // ★最新questionをrefに保持（時間切れの “古いquestion” 問題を潰す）
  const questionRef = useRef(null);
  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  // ★ゲーム終了時に最後の問題の答えを結果画面で見せる
  const [finalReveal, setFinalReveal] = useState(null);

  // データ読み込み
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadErr(null);

        const r = await fetch('/api/waza', { cache: 'no-store' });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) throw new Error(d.error || `load failed: ${r.status}`);

        const items = Array.isArray(d.items) ? d.items : [];

        // ★「ー」を空欄扱いにしたい列を掃除（C/D/E）
        const cleaned = items.map((it) => ({
          ...it,
          name: cleanCell(it.name),
          user: cleanCell(it.user),
          target: cleanCell(it.target), // C列
          chapter: cleanCell(it.chapter), // D列
          sfx: cleanCell(it.sfx), // E列
          place: cleanCell(it.place), // F列
        }));

        cleaned.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));

        if (!alive) return;
        setAll(cleaned);
      } catch (e) {
        if (!alive) return;
        setLoadErr(e?.message || 'unknown error');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // 漢字プール（技名から）
  const kanjiPool = useMemo(() => {
    const set = new Set();
    for (const it of all) {
      const s = normalizeWazaName(it.name);
      const m = s.match(/\p{Script=Han}/gu);
      if (m) for (const ch of m) set.add(ch);
    }
    return Array.from(set);
  }, [all]);

  // 使用者→技配列（③用）
  const byUser = useMemo(() => {
    const map = new Map();
    for (const it of all) {
      const u = cleanCell(it.user);
      if (!u) continue;
      if (!map.has(u)) map.set(u, []);
      map.get(u).push(it);
    }
    return map;
  }, [all]);

  /**
   * ④ 場所から推測
   * - 2回以上使われた「同一技名」グループ
   * - place（F列）が2種類以上あるグループだけ
   */
  const placeGroups = useMemo(() => {
    const map = new Map(); // normName -> { key, name, rows, places:Set }
    for (const it of all) {
      const name = cleanCell(it.name);
      if (!name) continue;
      const p = cleanCell(it.place);
      if (!p) continue;

      const key = normalizeWazaName(name);
      if (!key) continue;

      if (!map.has(key)) map.set(key, { key, name, rows: [], places: new Set() });
      const g = map.get(key);
      g.rows.push(it);
      g.places.add(p);
    }

    const out = [];
    for (const g of map.values()) {
      if (g.rows.length >= 2 && g.places.size >= 2) out.push(g);
    }
    return out;
  }, [all]);

  /**
   * ⑤ 使われたキャラから推測
   * - 2回以上使われた「同一技名」グループ
   * - target（C列）が2人以上（ユニーク2+）
   */
  const targetGroups = useMemo(() => {
    const map = new Map(); // normName -> { key, name, rows, targets:Set }
    for (const it of all) {
      const name = cleanCell(it.name);
      if (!name) continue;

      const targets = splitJPList(it.target);
      if (!targets.length) continue;

      const key = normalizeWazaName(name);
      if (!key) continue;

      if (!map.has(key)) map.set(key, { key, name, rows: [], targets: new Set() });
      const g = map.get(key);
      g.rows.push(it);
      for (const t of targets) g.targets.add(t);
    }

    const out = [];
    for (const g of map.values()) {
      if (g.rows.length >= 2 && g.targets.size >= 2) out.push(g);
    }
    return out;
  }, [all]);

  /**
   * ⑥ 効果音 + 話数から推測
   * - sfx(E列) と chapter(D列) が両方ある行だけ対象（"ー" は除外済み）
   * - 同じ (sfx,chapter) が複数技に当たる可能性もあるので group 化
   */
  const sfxChapterGroups = useMemo(() => {
    const map = new Map(); // `${chapter}__${sfx}` -> { chapter, sfx, corrects:[] }
    for (const it of all) {
      const name = cleanCell(it.name);
      const ch = cleanCell(it.chapter);
      const sfx = cleanCell(it.sfx);
      if (!name || !ch || !sfx) continue;

      const key = `${ch}__${sfx}`;
      if (!map.has(key)) map.set(key, { chapter: ch, sfx, corrects: [] });
      map.get(key).corrects.push(it);
    }
    return Array.from(map.values()).filter((g) => (g.corrects || []).length >= 1);
  }, [all]);

  // bests
  useEffect(() => {
    const obj = {};
    for (const rr of ['A', 'B', 'E', 'C', 'D', 'F', 'G', 'M']) {
      for (const dd of DURATIONS) obj[`${rr}_${dd.sec}`] = loadBest(rr, dd.sec);
    }
    setBests(obj);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && !revealing) inputRef.current?.focus?.();
  }, [phase, question, revealing]);

  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      timerIdRef.current = null;
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    };
  }, []);

  function stopTimer() {
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    timerIdRef.current = null;
  }

  function startTimer() {
    stopTimer();
    const now = Date.now();
    endAtRef.current = now + durationSec * 1000;
    setTimeLeftMs(durationSec * 1000);

    timerIdRef.current = setInterval(() => {
      const left = Math.max(0, endAtRef.current - Date.now());
      setTimeLeftMs(left);
      if (left <= 0) {
        stopTimer();
        finishGame(questionRef.current);
      }
    }, 100);
  }

  function applyPenaltyMs(ms) {
    endAtRef.current -= ms;
    const left = Math.max(0, endAtRef.current - Date.now());
    setTimeLeftMs(left);
    if (left <= 0) {
      stopTimer();
      finishGame(questionRef.current);
      return true;
    }
    return false;
  }

  /* =========================
     問題生成
  ========================= */

  function buildAnswersByContainsKanji(kanji) {
    const k = String(kanji || '');
    if (!k) return [];
    return all.filter((it) => normalizeWazaName(it.name).includes(k));
  }

  function makeQuestionFor(ruleKey) {
    if (!all.length) return null;

    // ① 漢字1文字を含む技
    if (ruleKey === 'A') {
      for (let t = 0; t < 60; t++) {
        const k = sample(kanjiPool.length ? kanjiPool : ['麦']);
        if (!k) continue;
        const corrects = buildAnswersByContainsKanji(k);
        if (corrects.length >= 1) return { type: 'A', kanji: k, corrects };
      }
      const k = kanjiPool[0] || '麦';
      return { type: 'A', kanji: k, corrects: buildAnswersByContainsKanji(k) };
    }

    // ② 前後から推測（頭/末）
    if (ruleKey === 'B') {
      if (all.length < 3) return null;
      const i = pickRandomIndex(1, all.length - 2);
      const prev = all[i - 1];
      const mid = all[i];
      const next = all[i + 1];

      const prevN = normalizeWazaName(prev.name);
      const nextN = normalizeWazaName(next.name);

      return {
        type: 'B',
        prev: { start: prevN ? prevN[0] : '', end: prevN ? prevN[prevN.length - 1] : '' },
        next: { start: nextN ? nextN[0] : '', end: nextN ? nextN[nextN.length - 1] : '' },
        corrects: [mid],
      };
    }

    // ②（イージー：前後全文）
    if (ruleKey === 'E') {
      if (all.length < 3) return null;
      const i = pickRandomIndex(1, all.length - 2);
      const prev = all[i - 1];
      const mid = all[i];
      const next = all[i + 1];

      return {
        type: 'E',
        prev: { full: prev?.name ?? '' },
        next: { full: next?.name ?? '' },
        corrects: [mid],
      };
    }

    // ③ 漢字4つから使用者
    if (ruleKey === 'C') {
      const candidates = [];
      for (const [u, list] of byUser.entries()) {
        if (Array.isArray(list) && list.length >= 4) candidates.push({ user: u, list });
      }
      if (candidates.length === 0) return null;

      for (let tries = 0; tries < 80; tries++) {
        const picked = sample(candidates);
        if (!picked) continue;

        const pool = [...picked.list];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const four = pool.slice(0, 4);
        if (four.length < 4) continue;

        const kanjis = [];
        const fromWaza = [];
        const used = new Set();

        for (const w of four) {
          const s = normalizeWazaName(w.name);
          const m = s.match(/\p{Script=Han}/gu) || [];
          const uniqHan = Array.from(new Set(m)).filter((ch) => !used.has(ch));
          if (uniqHan.length === 0) break;

          const ch = sample(uniqHan);
          if (!ch) break;

          used.add(ch);
          kanjis.push(ch);
          fromWaza.push(w);
        }

        if (kanjis.length === 4) {
          return {
            type: 'C',
            kanjis,
            user: picked.user,
            fromWaza,
            corrects: [{ user: picked.user }],
          };
        }
      }
      return null;
    }

    // ④ 場所から推測（技名）
    if (ruleKey === 'D') {
      if (placeGroups.length === 0) return null;
      const g = sample(placeGroups);
      if (!g) return null;

      // ★2つに切らない：3つ以上も全部表示
      const places = ensureAllDistinct(Array.from(g.places));

      return {
        type: 'D',
        places,
        // ★判定を安定させるため、技名グループの正解キーを持つ
        correctKey: g.key,
        corrects: g.rows, // 表示用
      };
    }

    // ⑤ 使われたキャラから推測（技名）
    if (ruleKey === 'F') {
      if (targetGroups.length === 0) return null;
      const g = sample(targetGroups);
      if (!g) return null;

      // ★2つに切らない：3つ以上も全部表示
      const targets = ensureAllDistinct(Array.from(g.targets));

      return {
        type: 'F',
        targets,
        correctKey: g.key,
        corrects: g.rows,
      };
    }

    // ⑥ 効果音 + 話数から推測（技名）
    if (ruleKey === 'G') {
      if (sfxChapterGroups.length === 0) return null;
      const g = sample(sfxChapterGroups);
      if (!g) return null;

      return {
        type: 'G',
        chapter: g.chapter,
        sfx: g.sfx,
        corrects: g.corrects,
      };
    }

    return null;
  }

  function newQuestion() {
    const pool = ['A', 'B', 'E', 'C', 'D', 'F', 'G'];
    const picked = rule === 'M' ? sample(pool) : rule;

    if (!picked) {
      setQuestion(null);
      setAnswer('');
      setJudgeFlash({ ok: false, msg: 'データ準備中…もう一回STARTしてね' });
      return;
    }

    const q = makeQuestionFor(picked);
    if (!q) {
      setQuestion(null);
      setAnswer('');
      setJudgeFlash({ ok: false, msg: '問題生成に失敗…（データ不足かも）' });
      return;
    }

    setQuestion(q);
    setAnswer('');
    setJudgeFlash(null);
  }

  function startGame() {
    if (!all.length) return;

    setFinalReveal(null);

    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
    setRevealing(false);

    setCorrectCount(0);
    setAnsweredCount(0);
    setStreak(0);
    setPhase('playing');
    newQuestion();
    startTimer();
  }

  function finishGame(qSnapshot) {
    const q = qSnapshot || null;

    if (q) {
      const title = q.type === 'C' ? '最後の問題の答え（使用者）' : '最後の問題の答え';
      const lines = buildRevealLinesFromQuestion(q);
      setFinalReveal(lines.length ? { title, lines } : null);
    } else {
      setFinalReveal(null);
    }

    setPhase('result');
    setRevealing(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
  }

  useEffect(() => {
    if (phase !== 'result') return;

    const improved = saveBest(rule, durationSec, correctCount);

    const obj = {};
    for (const rr of ['A', 'B', 'E', 'C', 'D', 'F', 'G', 'M']) {
      for (const dd of DURATIONS) obj[`${rr}_${dd.sec}`] = loadBest(rr, dd.sec);
    }
    setBests(obj);

    if (improved) {
      setJudgeFlash({ ok: true, msg: '🏆 自己ベスト更新！' });
      setTimeout(() => setJudgeFlash(null), 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function beginRevealThenNext() {
    setRevealing(true);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      setRevealing(false);
      if (phase === 'playing') newQuestion();
    }, REVEAL_MS);
  }

  function judgeAnswer(q, userRaw) {
    if (!q) return { ok: false };

    // 技名を答える系（A/B/E/D/F/G）
    if (q.type === 'A' || q.type === 'B' || q.type === 'E' || q.type === 'D' || q.type === 'F' || q.type === 'G') {
      const ua = normalizeWazaName(userRaw);
      if (!ua) return { ok: false, empty: true };

      // ★④⑤：グループ判定（同条件の技なら確実に正解）
      if ((q.type === 'D' || q.type === 'F') && q.correctKey) {
        return { ok: ua === q.correctKey };
      }

      const ok = (q.corrects || []).some((ans) => normalizeWazaName(ans.name) === ua);
      return { ok };
    }

    // 使用者当て（C）
    if (q.type === 'C') {
      const ua = normalizeUserName(userRaw);
      if (!ua) return { ok: false, empty: true };
      const ok = normalizeUserName(q.user) === ua;
      return { ok };
    }

    return { ok: false };
  }

  function doJudge() {
    if (!question || phase !== 'playing' || revealing) return;

    const judged = judgeAnswer(question, answer);
    if (judged.empty) {
      setJudgeFlash({ ok: false, msg: '入力が空だよ！' });
      setTimeout(() => setJudgeFlash(null), 650);
      return;
    }

    setAnsweredCount((v) => v + 1);

    if (judged.ok) {
      setCorrectCount((v) => v + 1);
      setStreak((v) => v + 1);
      setJudgeFlash({ ok: true, msg: '✅ 正解！' });
    } else {
      setStreak(0);
      const ended = applyPenaltyMs(PENALTY_MS);
      if (ended) return;
      setJudgeFlash({ ok: false, msg: '❌ 不正解…（-10秒）' });
    }

    beginRevealThenNext();
  }

  function doSkip() {
    if (!question || phase !== 'playing' || revealing) return;

    setAnsweredCount((v) => v + 1);
    setStreak(0);

    const ended = applyPenaltyMs(PENALTY_MS);
    if (ended) return;

    setJudgeFlash({ ok: false, msg: '⏭ スキップ（-10秒）' });
    beginRevealThenNext();
  }

  function formatMs(ms) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  const timeLeftText = formatMs(timeLeftMs);
  const totalMs = durationSec * 1000;
  const progress = totalMs > 0 ? Math.max(0, Math.min(1, timeLeftMs / totalMs)) : 0;

  const revealLines = useMemo(() => buildRevealLinesFromQuestion(question), [question]);

  // UI
  const card = {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
    padding: 14,
  };

  const neon = {
    background: 'linear-gradient(135deg, rgba(30,136,229,0.18), rgba(0,188,212,0.12))',
    border: '1px solid rgba(13,71,161,0.20)',
  };

  const btn = (primary, disabled) => ({
    width: '100%',
    border: 'none',
    borderRadius: 16,
    padding: '12px 14px',
    fontWeight: 900,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: primary ? 'linear-gradient(135deg, #1565c0, #1e88e5)' : 'rgba(227,242,253,0.95)',
    color: primary ? '#fff' : '#0d47a1',
    boxShadow: primary ? '0 10px 18px rgba(21,101,192,0.22)' : 'none',
    opacity: disabled ? 0.55 : 1,
  });

  const pill = (active) => ({
    borderRadius: 999,
    border: active ? '2px solid rgba(13,71,161,0.65)' : '1px solid rgba(0,0,0,0.15)',
    background: active ? 'rgba(227,242,253,0.95)' : 'rgba(255,255,255,0.75)',
    padding: '10px 12px',
    fontWeight: 900,
    cursor: 'pointer',
    color: '#0d47a1',
    whiteSpace: 'nowrap',
  });

  const badge = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontWeight: 950,
    background: 'rgba(227,242,253,0.85)',
    border: '1px solid rgba(13,71,161,0.18)',
  };

  const small = { fontSize: 12, opacity: 0.85 };

  const ruleLabel = useMemo(() => {
    const r = RULES.find((x) => x.key === rule);
    return r ? r.name : rule;
  }, [rule]);

  return (
    <div
      className="gameBG"
      style={{
        minHeight: '100vh',
        padding: 14,
        color: '#0b1b2a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景：レイアウトに影響しない fixed */}
      <div className="bgClouds" style={{ position: 'fixed', inset: 0, zIndex: -2, pointerEvents: 'none' }} />
      <div className="bgSea" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }} />

      <div style={{ maxWidth: 780, margin: '0 auto', display: 'grid', gap: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: 0.2 }}>技ミニゲーム</div>
            <div style={{ ...small }}>
              技名は“有無を問わない”要素を全部無視（・だけ判定）／（）内無視／全角半角無視／大小無視
            </div>
            <div style={{ ...small, marginTop: 4 }}>VER: {VER}</div>
          </div>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(0,0,0,0.12)',
              padding: '10px 12px',
              borderRadius: 14,
              fontWeight: 900,
              color: '#0d47a1',
              whiteSpace: 'nowrap',
            }}
          >
            ホームへ
          </Link>
        </div>

        {/* Load */}
        <div style={{ ...card, ...neon }}>
          {loading ? (
            <div style={{ fontWeight: 900 }}>Excelから読み込み中…</div>
          ) : loadErr ? (
            <div>
              <div style={{ fontWeight: 950, color: '#b71c1c', fontSize: 16 }}>読み込み失敗</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>{loadErr}</div>
              <div style={{ marginTop: 10, ...small }}>✅ `data/waza.xlsx` があるか確認してね（APIは `/api/waza`）</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <div style={{ fontWeight: 950 }}>収録：</div>
                <div style={{ fontWeight: 900 }}>{all.length} 件</div>
                <div style={{ marginLeft: 'auto', ...small }}>
                  今：<b>{ruleLabel}</b> ／ <b>{durationSec === 300 ? '5分' : '10分'}</b>
                </div>
              </div>

              {phase === 'playing' && (
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 950 }}>残り時間</div>
                    <div style={{ fontWeight: 950, fontSize: 18 }}>{timeLeftText}</div>
                  </div>

                  <div
                    style={{
                      height: 14,
                      borderRadius: 999,
                      background: 'rgba(13,71,161,0.10)',
                      border: '1px solid rgba(13,71,161,0.18)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round(progress * 100)}%`,
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, rgba(21,101,192,0.95), rgba(0,188,212,0.85))',
                        transition: 'width 80ms linear',
                      }}
                    />
                  </div>

                  <div style={{ ...small }}>
                    ※ 不正解 or スキップで <b>残り -10秒</b>（時間が0なら終了）
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ ...card, padding: 10, background: 'rgba(255,255,255,0.85)' }}>
                  <div style={{ ...small }}>正解数</div>
                  <div style={{ fontWeight: 950, fontSize: 20 }}>{correctCount}</div>
                </div>
                <div style={{ ...card, padding: 10, background: 'rgba(255,255,255,0.85)' }}>
                  <div style={{ ...small }}>解答数</div>
                  <div style={{ fontWeight: 950, fontSize: 20 }}>{answeredCount}</div>
                </div>
                <div style={{ ...card, padding: 10, background: 'rgba(255,255,255,0.85)' }}>
                  <div style={{ ...small }}>連続</div>
                  <div style={{ fontWeight: 950, fontSize: 20 }}>{streak}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ready */}
        {phase === 'ready' && !loading && !loadErr && (
          <div style={{ ...card }}>
            <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 10 }}>モード選択</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {RULES.map((r) => (
                <button key={r.key} type="button" style={pill(rule === r.key)} onClick={() => setRule(r.key)}>
                  {r.name}
                </button>
              ))}
            </div>

            <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 10 }}>時間</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {DURATIONS.map((d) => (
                <button
                  key={d.sec}
                  type="button"
                  style={{ ...pill(durationSec === d.sec), flex: 1 }}
                  onClick={() => setDurationSec(d.sec)}
                >
                  {d.label}モード
                </button>
              ))}
            </div>

            <div style={{ ...card, ...neon, padding: 12 }}>
              <div style={{ fontWeight: 950, marginBottom: 8 }}>自己ベスト（正解数）</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {['A', 'B', 'E', 'C', 'D', 'F', 'G', 'M'].map((rk) => (
                  <div
                    key={rk}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 8,
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.70)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: 14,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontWeight: 950 }}>{RULES.find((x) => x.key === rk)?.name}</div>
                    <div style={{ ...small }}>
                      5分：<b>{bests[`${rk}_300`] ?? 0}</b>
                    </div>
                    <div style={{ ...small }}>
                      10分：<b>{bests[`${rk}_600`] ?? 0}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button type="button" style={btn(true, false)} onClick={startGame}>
                ▶ START（{ruleLabel} / {durationSec === 300 ? '5分' : '10分'}）
              </button>
              <div style={{ marginTop: 8, ...small }}>※ エンターキーでも判定できます（プレイ中）</div>
            </div>
          </div>
        )}

        {/* Playing */}
        {phase === 'playing' && (
          <div style={{ ...card }}>
            {!question ? (
              <div>問題を生成できません。</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ ...card, ...neon, padding: 12 }}>
                  {question.type === 'A' && (
                    <>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>①「{question.kanji}」を含む技名を答えよ</div>
                      <div style={{ ...small, marginTop: 6 }}>※ 条件を満たすものは複数。どれでも正解。</div>
                    </>
                  )}

                  {question.type === 'B' && (
                    <>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>② 前後の情報から「間に入る技名」を答えよ</div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.70)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 950 }}>前</div>
                          <div style={{ marginTop: 2 }}>
                            先頭「<b>{question.prev.start}</b>」／末尾「<b>{question.prev.end}</b>」
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.70)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 950 }}>後</div>
                          <div style={{ marginTop: 2 }}>
                            先頭「<b>{question.next.start}</b>」／末尾「<b>{question.next.end}</b>」
                          </div>
                        </div>
                      </div>
                      <div style={{ ...small, marginTop: 6 }}>※ ここは基本1つだけ正解。</div>
                    </>
                  )}

                  {question.type === 'E' && (
                    <>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>②（イージー）前後の技名から「間に入る技名」を答えよ</div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.70)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 950 }}>前</div>
                          <div style={{ marginTop: 2, fontWeight: 900, whiteSpace: 'pre-wrap' }}>{question.prev.full}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.70)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 950 }}>後</div>
                          <div style={{ marginTop: 2, fontWeight: 900, whiteSpace: 'pre-wrap' }}>{question.next.full}</div>
                        </div>
                      </div>
                      <div style={{ ...small, marginTop: 6 }}>※ ここは基本1つだけ正解。</div>
                    </>
                  )}

                  {question.type === 'C' && (
                    <>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>③ 漢字4つから「使用者」を当てよ</div>
                      <div style={{ ...small, marginTop: 6 }}>※ 4つの漢字は「同じキャラの別々の技」から抽出</div>
                      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {question.kanjis.map((k, i) => (
                          <div
                            key={`${k}_${i}`}
                            style={{
                              background: 'rgba(255,255,255,0.80)',
                              border: '1px solid rgba(13,71,161,0.15)',
                              borderRadius: 16,
                              padding: '14px 10px',
                              textAlign: 'center',
                              fontWeight: 1000,
                              fontSize: 22,
                            }}
                          >
                            {k}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {question.type === 'D' && (
                    <>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>④ 使われた場所から「技名」を答えよ</div>
                      <div style={{ ...small, marginTop: 6 }}>※ 2回以上使われた技から出題（場所が複数ある技のみ）。</div>
                      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(question.places || []).map((p) => (
                          <span key={p} style={badge}>
                            📍 {p}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {question.type === 'F' && (
                    <>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>⑤ 使われたキャラから「技名」を答えよ</div>
                      <div style={{ ...small, marginTop: 6 }}>※ 2回以上使われた技から出題（使われたキャラが複数いる技のみ）。</div>
                      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(question.targets || []).map((t) => (
                          <span key={t} style={badge}>
                            🎯 {t}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {question.type === 'G' && (
                    <>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>⑥ 効果音＋話数から「技名」を答えよ</div>
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        <div style={{ ...badge, justifyContent: 'flex-start', gap: 8 }}>
                          <span style={{ fontWeight: 1000 }}>話数</span>
                          <span>{question.chapter}</span>
                        </div>
                        <div style={{ ...badge, justifyContent: 'flex-start', gap: 8 }}>
                          <span style={{ fontWeight: 1000 }}>効果音</span>
                          <span style={{ whiteSpace: 'pre-wrap' }}>{question.sfx}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {rule === 'M' && (
                    <div style={{ marginTop: 10, ...small }}>
                      🎲 ミックス：今の問題タイプは <b>{question.type}</b>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <input
                    ref={inputRef}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') doJudge();
                    }}
                    placeholder={question.type === 'C' ? '使用者（キャラ名）を入力' : '技名を入力'}
                    disabled={revealing}
                    style={{
                      width: '100%',
                      padding: '14px 12px',
                      fontSize: 16,
                      borderRadius: 16,
                      border: '1px solid rgba(0,0,0,0.18)',
                      outline: 'none',
                      background: revealing ? 'rgba(240,240,240,0.9)' : '#fff',
                      color: '#0b1b2a',
                      boxShadow: '0 8px 18px rgba(0,0,0,0.06)',
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button type="button" style={btn(true, revealing)} onClick={doJudge} disabled={revealing}>
                      判定！
                    </button>
                    <button type="button" style={btn(false, revealing)} onClick={doSkip} disabled={revealing}>
                      スキップ
                    </button>
                  </div>

                  {judgeFlash && (
                    <div
                      style={{
                        borderRadius: 16,
                        padding: '10px 12px',
                        border: judgeFlash.ok ? '2px solid rgba(46,125,50,0.35)' : '2px solid rgba(198,40,40,0.35)',
                        background: judgeFlash.ok ? 'rgba(46,125,50,0.10)' : 'rgba(198,40,40,0.10)',
                        fontWeight: 950,
                        textAlign: 'center',
                      }}
                    >
                      {judgeFlash.msg}
                    </div>
                  )}

                  {revealing && (
                    <div
                      style={{
                        borderRadius: 16,
                        padding: '12px 12px',
                        border: '1px solid rgba(0,0,0,0.10)',
                        background: 'rgba(255,255,255,0.86)',
                      }}
                    >
                      <div style={{ fontWeight: 950, marginBottom: 8 }}>{question.type === 'C' ? '正解（使用者）' : '正解になり得る答え'}</div>
                      <div style={{ maxHeight: 180, overflow: 'auto', display: 'grid', gap: 6 }}>
                        {revealLines.map((t, idx) => (
                          <div
                            key={`${idx}_${t}`}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 12,
                              background: 'rgba(227,242,253,0.75)',
                              border: '1px solid rgba(13,71,161,0.10)',
                              fontWeight: 800,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {t}
                          </div>
                        ))}
                      </div>
                      <div style={{ ...small, marginTop: 8 }}>3秒後に次の問題へ…</div>
                    </div>
                  )}

                  <button
                    type="button"
                    style={{
                      ...btn(false, false),
                      background: 'rgba(255,255,255,0.80)',
                      border: '1px solid rgba(0,0,0,0.12)',
                      color: '#37474f',
                    }}
                    onClick={() => {
                      stopTimer();
                      setPhase('ready');
                      setQuestion(null);
                      setAnswer('');
                      setJudgeFlash(null);
                      setRevealing(false);
                      setFinalReveal(null);
                      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
                      revealTimerRef.current = null;
                      setTimeLeftMs(durationSec * 1000);
                    }}
                  >
                    やめる（記録しない）
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {phase === 'result' && (
          <div style={{ ...card }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 1000, fontSize: 22 }}>⏱ 終了！</div>

              {finalReveal && Array.isArray(finalReveal.lines) && finalReveal.lines.length > 0 && (
                <div style={{ ...card, ...neon, padding: 12 }}>
                  <div style={{ fontWeight: 950, marginBottom: 8 }}>{finalReveal.title}</div>
                  <div style={{ maxHeight: 220, overflow: 'auto', display: 'grid', gap: 6 }}>
                    {finalReveal.lines.map((t, idx) => (
                      <div
                        key={`final_${idx}_${t}`}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 12,
                          background: 'rgba(227,242,253,0.75)',
                          border: '1px solid rgba(13,71,161,0.10)',
                          fontWeight: 800,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ ...card, ...neon, padding: 12 }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>自己ベスト</div>
                <div style={{ ...small }}>
                  このモードのベスト： <b>{loadBest(rule, durationSec)}</b>
                </div>
                {judgeFlash?.msg && <div style={{ marginTop: 8, fontWeight: 950 }}>{judgeFlash.msg}</div>}
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <button
                  type="button"
                  style={btn(true, false)}
                  onClick={() => {
                    setPhase('ready');
                    setQuestion(null);
                    setAnswer('');
                    setJudgeFlash(null);
                    setCorrectCount(0);
                    setAnsweredCount(0);
                    setStreak(0);
                    setRevealing(false);
                    setFinalReveal(null);
                    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
                    revealTimerRef.current = null;
                    setTimeLeftMs(durationSec * 1000);
                  }}
                >
                  モード選択へ
                </button>

                <button
                  type="button"
                  style={btn(false, false)}
                  onClick={() => {
                    setPhase('ready');
                    setQuestion(null);
                    setAnswer('');
                    setJudgeFlash(null);
                    setCorrectCount(0);
                    setAnsweredCount(0);
                    setStreak(0);
                    setRevealing(false);
                    setFinalReveal(null);
                    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
                    revealTimerRef.current = null;
                    setTimeLeftMs(durationSec * 1000);
                    setTimeout(() => startGame(), 50);
                  }}
                >
                  同じ設定でリトライ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ ...card, fontSize: 12, opacity: 0.9 }}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>遊び方</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>5分/10分の制限時間で、正解数を競うタイムアタックです。</li>
            <li>不正解 or スキップで「残り時間 -10秒」になります。</li>
            <li>回答/スキップ後、正解（または正解候補）を3秒表示して次の問題へ進みます。</li>
            <li>自己ベストはブラウザ（localStorage）に保存されます。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
