// file: app/solo/memory/play/page.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TOTAL_CARDS = 20;
const MAX_MISS = 10;

function shuffle(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 不備報告（振り返り）では「フルの答え」を正解として表示
function getFullAnswerText(card) {
  if (!card) return '';
  const v =
    card.answerNumber ??
    card.fullAnswer ??
    card.answerFull ??
    card.answer ??
    card.answerText ??
    card.correctAnswer ??
    card.valueFull ??
    card.value;

  return String(v ?? card.digit ?? '');
}

export default function MemoryPlayPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const [deck, setDeck] = useState([]); // 20
  const [flipped, setFlipped] = useState([]); // index[]
  const [matched, setMatched] = useState(() => new Set()); // index set
  const [miss, setMiss] = useState(0);
  const [pairs, setPairs] = useState(0);
  const [status, setStatus] = useState('loading'); // playing/finished
  const [message, setMessage] = useState('');

  // ★ 重複なしの「振り返り対象」だけを集める
  // card.id をキーに1回だけ入る
  const seenMapRef = useRef(new Map()); // id -> reviewItem
  const [seenList, setSeenList] = useState([]); // 画面更新用（配列）

  // ★ 2枚めくって、ミスで「裏返す待ち」中かどうか
  const [needHide, setNeedHide] = useState(false);

  // 初期ロード
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorText('');
      try {
        const r = await fetch('/api/solo/memory-questions', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || 'load failed');

        const d = shuffle(j.deck || []).slice(0, TOTAL_CARDS);
        if (d.length !== TOTAL_CARDS) throw new Error('デッキが20枚になりませんでした');

        setDeck(d);
        setFlipped([]);
        setMatched(new Set());
        setMiss(0);
        setPairs(0);
        setMessage('');
        setStatus('playing');
        setNeedHide(false);

        seenMapRef.current = new Map();
        setSeenList([]);
      } catch (e) {
        setErrorText(String(e?.message || e));
        setStatus('finished');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const matchedCount = useMemo(() => matched.size, [matched]);

  function addSeenOnce(card) {
    if (!card?.id) return;
    const m = seenMapRef.current;
    if (m.has(card.id)) return;

    const item = {
      question_id: card.id,
      text: `${card.text}（${card.place}）`,
      userAnswerText: '（めくった）',
      correctAnswerText: getFullAnswerText(card),
    };
    m.set(card.id, item);
    setSeenList(Array.from(m.values()));
  }

  // 終了
  function finishGame(reason) {
    if (status !== 'playing') return;

    const cleared = pairs >= 10; // 10ペア
    const failed = miss >= MAX_MISS;

    setStatus('finished');
    setMessage(reason || '終了');

    // ★ クリア時：デッキ20枚全部を振り返り対象にする（重複なし）
    // ★ 未クリア時：めくったものだけ（seenMap）
    const m = new Map(seenMapRef.current);
    if (cleared) {
      for (const c of deck) {
        if (!c?.id) continue;
        if (!m.has(c.id)) {
          m.set(c.id, {
            question_id: c.id,
            text: `${c.text}（${c.place}）`,
            userAnswerText: '（未クリアでもない：使用20枚）',
            correctAnswerText: getFullAnswerText(c),
          });
        }
      }
    }

    const historyUnique = Array.from(m.values());

    setTimeout(() => {
      const payload = {
        miss,
        pairs,
        cleared,
        failed,
        finishedAt: Date.now(),
        // ★ 不備報告に渡すのは重複なしの一覧だけ
        history: historyUnique,
      };

      try {
        localStorage.setItem('memory_last_result', JSON.stringify(payload));
      } catch {}

      router.push('/solo/memory/review');
    }, 0);
  }

  // クリック（めくる）
  function flipCard(i) {
    if (status !== 'playing') return;
    if (!deck[i]) return;
    if (matched.has(i)) return;
    if (flipped.includes(i)) return;

    // ★ 裏返す待ち中は追加でめくれない
    if (needHide) return;

    // 2枚めくってたら新しくはめくらない（ボタンで戻すまで固定）
    if (flipped.length >= 2) return;

    addSeenOnce(deck[i]);

    const next = [...flipped, i];
    setFlipped(next);

    // 2枚揃ったら判定
    if (next.length === 2) {
      const [a, b] = next;
      const ca = deck[a];
      const cb = deck[b];

      const ok = (ca?.digit ?? null) === (cb?.digit ?? null);

      if (ok) {
        setMessage('ペア！');

        setMatched((s) => {
          const ns = new Set(Array.from(s));
          ns.add(a);
          ns.add(b);
          return ns;
        });
        setPairs((p) => p + 1);

        // ★ ペアは戻さない（表のまま一致扱い）
        // ただし次の操作ができるように flipped は空にする
        setTimeout(() => {
          setFlipped([]);
        }, 200);
      } else {
        setMessage('ミス…「裏返す」で続行');
        setMiss((m) => m + 1);

        // ★ 自動で裏返さない：ボタン待ち
        setNeedHide(true);
      }
    }
  }

  function hideOpened() {
    if (status !== 'playing') return;
    if (!needHide) return;
    setFlipped([]);
    setNeedHide(false);
    setMessage('');
  }

  // 勝敗監視
  useEffect(() => {
    if (status !== 'playing') return;

    if (pairs >= 10) {
      finishGame('全ペア達成！クリア！');
      return;
    }
    if (miss >= MAX_MISS) {
      finishGame('ミス10回…失敗！');
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs, miss, status]);

  if (loading || status === 'loading') {
    return (
      <main className="min-h-screen bg-violet-950 text-violet-50 p-4">
        <div className="max-w-3xl mx-auto">読み込み中…</div>
      </main>
    );
  }

  if (status === 'finished') {
    return (
      <main className="min-h-screen bg-violet-950 text-violet-50 p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-xl font-extrabold">終了</h1>
          {errorText ? (
            <div className="text-rose-200">{errorText}</div>
          ) : (
            <div className="text-violet-50/90 text-sm">結果ページへ移動します…</div>
          )}
          <Link className="underline text-violet-200" href="/solo/memory">
            戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-violet-800 text-white p-3">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-sm font-extrabold">MEMORY（数字）</div>
            <div className="text-[12px] opacity-90 mt-1">
              ペア：<b>{pairs}</b>/10 ・ ミス：<b>{miss}</b>/{MAX_MISS} ・ 一致済み：<b>{matchedCount}</b>/20
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-xs font-bold underline text-violet-100" href="/solo/memory">
              ルール
            </Link>
            <Link className="text-xs font-bold underline text-violet-100" href="/solo/number">
              戻る
            </Link>
          </div>
        </header>

        <div className="flex items-center justify-center gap-2 mb-2">
          {message ? (
            <div className="text-center text-[12px] font-bold opacity-95">{message}</div>
          ) : (
            <div className="h-5" />
          )}

          {needHide && (
            <button
              onClick={hideOpened}
              className="px-3 py-2 rounded-full bg-white text-violet-950 font-extrabold text-[12px]"
            >
              裏返す
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {deck.map((c, i) => {
            const isOpen = flipped.includes(i) || matched.has(i);
            const isDone = matched.has(i);

            return (
              <button
                key={`${c?.id || 'x'}-${i}`}
                onClick={() => flipCard(i)}
                disabled={isDone || needHide}
                className={[
                  'rounded-2xl border p-2 text-left shadow-sm min-h-[120px]',
                  isOpen
                    ? 'bg-white text-violet-950 border-black/10'
                    : 'bg-violet-900/30 text-violet-50 border-white/15 hover:bg-violet-900/40',
                  isDone ? 'opacity-75' : '',
                  needHide && !isOpen ? 'opacity-80' : '',
                ].join(' ')}
                style={{ userSelect: 'none' }}
                title={isOpen ? c?.text : 'タップでめくる'}
              >
                {!isOpen ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-3xl font-black opacity-90">？</div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-between">
                    <div className="text-[11px] font-extrabold opacity-80">
                      {isDone ? '一致！' : '公開中'}
                    </div>
                    <div className="text-[12px] font-extrabold leading-tight whitespace-pre-wrap">
                      {c?.text}
                    </div>
                    <div className="text-[11px] font-extrabold opacity-80 text-right">（{c?.place}）</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="inline-block text-xs font-bold text-violet-100 underline">
            ホームへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
