// file: app/solo/blackjack/play/page.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

const START_BANKROLL = 1000;
const BET_STEP = 100;
const BET_MIN = 100;

function shuffle(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// フル答え（表示用）
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

// digit → BJの値（内部）
// 1はAce扱い（A）、0は10
function cardValueDigit(digit) {
  const d = Number(digit);
  if (!Number.isFinite(d)) return { isAce: false, val: 0 };
  if (d === 1) return { isAce: true, val: 1 }; // A
  if (d === 0) return { isAce: false, val: 10 };
  if (d >= 2 && d <= 9) return { isAce: false, val: d };
  return { isAce: false, val: 0 };
}

function calcBestTotal(cards) {
  let sum = 0;
  let aces = 0;
  for (const c of cards || []) {
    const { isAce, val } = cardValueDigit(c?.digit);
    sum += val;
    if (isAce) aces += 1;
  }
  let best = sum;
  while (aces > 0 && best + 10 <= 21) {
    best += 10;
    aces -= 1;
  }
  return best;
}

function isBlackjack(cards) {
  if (!cards || cards.length !== 2) return false;
  const a = cardValueDigit(cards[0]?.digit);
  const b = cardValueDigit(cards[1]?.digit);
  const hasAce = a.isAce || b.isAce;
  if (!hasAce) return false;
  const other = a.isAce ? b : a;
  return other.val === 10;
}

function canSplit(cards) {
  if (!cards || cards.length !== 2) return false;
  const d0 = Number(cards[0]?.digit);
  const d1 = Number(cards[1]?.digit);
  return Number.isFinite(d0) && Number.isFinite(d1) && d0 === d1;
}

function labelResultShort(r) {
  if (r === 'win') return 'WIN';
  if (r === 'lose') return 'LOSE';
  if (r === 'push') return 'PUSH';
  if (r === 'bjwin') return 'BLACKJACK WIN';
  return '';
}

function labelResultJa(r) {
  if (r === 'win') return '勝ち';
  if (r === 'lose') return '負け';
  if (r === 'push') return '引き分け';
  if (r === 'bjwin') return 'ブラックジャック勝ち（1.5倍）';
  return '進行中';
}

export default function BlackjackPlayPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  // 所持金：ページに来るたび1000（自己ベストのみ保持）
  const [bankroll, setBankroll] = useState(START_BANKROLL);
  const [bestBankroll, setBestBankroll] = useState(START_BANKROLL);

  const [bet, setBet] = useState(BET_MIN);

  // shoe（実体はref）
  const [shoe, setShoe] = useState([]);
  const shoeRef = useRef([]);

  // hands: [{ cards, bet, doubled, done, result }]
  const [hands, setHands] = useState([]);
  const handsRef = useRef([]);
  useEffect(() => {
    handsRef.current = hands;
  }, [hands]);

  const [activeHand, setActiveHand] = useState(0);

  // dealer
  const [dealerCards, setDealerCards] = useState([]);
  const dealerRef = useRef([]);
  useEffect(() => {
    dealerRef.current = dealerCards;
  }, [dealerCards]);

  // phase: bet | playing | dealer | result
  const [phase, setPhase] = useState('bet');
  const [msg, setMsg] = useState('');

  // 結果後：答えをカードに表示
  const revealAnswers = phase === 'result';

  // モーダル
  const [openCard, setOpenCard] = useState(null);

  // 初期化＆shoe読み込み
  useEffect(() => {
    setBankroll(START_BANKROLL);
    setBet(BET_MIN);
    setHands([]);
    setDealerCards([]);
    setPhase('bet');
    setMsg('');
    setActiveHand(0);

    try {
      const raw = localStorage.getItem('blackjack_best_bankroll');
      const v = raw ? Number(raw) : START_BANKROLL;
      if (Number.isFinite(v) && v > 0) setBestBankroll(v);
    } catch {}

    (async () => {
      setLoading(true);
      setErrorText('');
      try {
        const r = await fetch('/api/solo/blackjack-shoe', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || 'load failed');

        const s = shuffle(j.shoe || []);
        shoeRef.current = s;
        setShoe(s);
      } catch (e) {
        setErrorText(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ベスト更新
  useEffect(() => {
    if (bankroll > bestBankroll) {
      setBestBankroll(bankroll);
      try {
        localStorage.setItem('blackjack_best_bankroll', String(bankroll));
      } catch {}
    }
  }, [bankroll, bestBankroll]);

  const maxBet = useMemo(() => {
    const m = Math.floor(bankroll / BET_STEP) * BET_STEP;
    return Math.max(BET_MIN, m);
  }, [bankroll]);

  useEffect(() => {
    setBet((b) => {
      const nb = Math.min(Math.max(BET_MIN, b), maxBet);
      return Math.floor(nb / BET_STEP) * BET_STEP;
    });
  }, [maxBet]);

  function drawOne() {
    const a = shoeRef.current || [];
    const card = a.shift() || null;
    shoeRef.current = a;
    setShoe([...a]);
    return card;
  }

  function resetRoundKeepBankroll() {
    setHands([]);
    setDealerCards([]);
    setActiveHand(0);
    setPhase('bet');
    setMsg('次の賭け金を選んでください');
  }

  function startDeal() {
    if (phase !== 'bet') return;
    if (bankroll < bet) {
      setMsg('所持金が足りない');
      return;
    }
    if ((shoeRef.current || []).length < 20) {
      setMsg('山札が少ないので再読み込みしてください');
      return;
    }

    setMsg('配布！');
    setPhase('playing');

    const p1 = drawOne();
    const d1 = drawOne();
    const p2 = drawOne();
    const d2 = drawOne();

    setHands([{ cards: [p1, p2].filter(Boolean), bet, doubled: false, done: false, result: null }]);
    setDealerCards([d1, d2].filter(Boolean));
    setActiveHand(0);
  }

  function currentHandObj() {
    return hands[activeHand] || null;
  }

  // ===== 自動遷移：playing中、手札が全部doneならdealerへ =====
  useEffect(() => {
    if (phase !== 'playing') return;
    if (!hands.length) return;

    const cur = hands[activeHand];
    if (cur && !cur.done) return;

    const nextIdx = hands.findIndex((h) => !h.done);
    if (nextIdx >= 0) {
      setActiveHand(nextIdx);
      return;
    }

    setPhase('dealer');
  }, [hands, phase, activeHand]);

  // ===== dealer処理 =====
  useEffect(() => {
    if (phase !== 'dealer') return;

    let dCards = [...(dealerRef.current || [])];
    let guard = 0;

    while (guard < 20) {
      guard++;
      const total = calcBestTotal(dCards);
      if (total >= 17) break;
      const c = drawOne();
      if (!c) break;
      dCards.push(c);
    }

    setDealerCards(dCards);

    const dealerTotal = calcBestTotal(dCards);
    const dealerBust = dealerTotal > 21;
    const dBJ = isBlackjack(dCards);

    let delta = 0;

    const resolvedHands = (handsRef.current || []).map((h) => {
      const pTotal = calcBestTotal(h.cards);
      const pBust = pTotal > 21;
      const pBJ = isBlackjack(h.cards);

      if (pBust) {
        delta -= h.bet;
        return { ...h, done: true, result: 'lose' };
      }

      if (dealerBust) {
        if (pBJ) {
          delta += Math.floor(h.bet * 1.5);
          return { ...h, done: true, result: 'bjwin' };
        }
        delta += h.bet;
        return { ...h, done: true, result: 'win' };
      }

      if (pBJ && dBJ) return { ...h, done: true, result: 'push' };
      if (pBJ && !dBJ) {
        delta += Math.floor(h.bet * 1.5);
        return { ...h, done: true, result: 'bjwin' };
      }
      if (!pBJ && dBJ) {
        delta -= h.bet;
        return { ...h, done: true, result: 'lose' };
      }

      if (pTotal > dealerTotal) {
        delta += h.bet;
        return { ...h, done: true, result: 'win' };
      }
      if (pTotal < dealerTotal) {
        delta -= h.bet;
        return { ...h, done: true, result: 'lose' };
      }
      return { ...h, done: true, result: 'push' };
    });

    setHands(resolvedHands);
    setBankroll((b) => b + delta);
    setPhase('result');

    const summary =
      resolvedHands.length === 1
        ? `${labelResultShort(resolvedHands[0].result)}（${labelResultJa(resolvedHands[0].result)}）`
        : resolvedHands.map((h, i) => `H${i + 1} ${labelResultShort(h.result)}`).join(' / ');
    setMsg(summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // -------------------------
  // actions
  // -------------------------
  function hit() {
    if (phase !== 'playing') return;
    const h = currentHandObj();
    if (!h || h.done) return;

    if (h.doubled) {
      setMsg('ダブル後はこれ以上引けない');
      return;
    }

    const c = drawOne();
    if (!c) return;

    setHands((prev) => {
      const a = [...prev];
      const cur = a[activeHand];
      if (!cur || cur.done) return a;

      const nextCards = [...cur.cards, c];
      const total = calcBestTotal(nextCards);

      a[activeHand] = {
        ...cur,
        cards: nextCards,
        done: total > 21 ? true : cur.done,
        result: total > 21 ? 'lose' : cur.result,
      };
      return a;
    });

    setMsg('ヒット');
  }

  function stand() {
    if (phase !== 'playing') return;
    const h = currentHandObj();
    if (!h || h.done) return;

    setHands((prev) => {
      const a = [...prev];
      const cur = a[activeHand];
      if (!cur) return a;
      a[activeHand] = { ...cur, done: true };
      return a;
    });

    setMsg(`スタンド（手札${activeHand + 1}）`);
  }

  function doubleDown() {
    if (phase !== 'playing') return;
    const h = currentHandObj();
    if (!h || h.done) return;

    if (h.cards.length !== 2) {
      setMsg('ダブルは最初の2枚のときだけ');
      return;
    }
    if (bankroll < h.bet) {
      setMsg('所持金が足りない（ダブル不可）');
      return;
    }

    setBankroll((b) => b - h.bet);

    const c = drawOne();
    if (!c) return;

    setHands((prev) => {
      const a = [...prev];
      const cur = a[activeHand];
      if (!cur || cur.done) return a;

      const nextCards = [...cur.cards, c];
      const total = calcBestTotal(nextCards);

      a[activeHand] = {
        ...cur,
        bet: cur.bet * 2,
        doubled: true,
        cards: nextCards,
        done: true,
        result: total > 21 ? 'lose' : cur.result,
      };
      return a;
    });

    setMsg(`ダブル（手札${activeHand + 1}）`);
  }

  function split() {
    if (phase !== 'playing') return;
    const h = currentHandObj();
    if (!h || h.done) return;

    if (!canSplit(h.cards)) {
      setMsg('スプリットは最初の2枚が同じときだけ');
      return;
    }
    if (hands.length !== 1 || activeHand !== 0) {
      setMsg('この実装は最初の手札のみスプリット対応');
      return;
    }
    if (bankroll < h.bet) {
      setMsg('所持金が足りない（スプリット不可）');
      return;
    }

    setBankroll((b) => b - h.bet);

    const c0 = h.cards[0];
    const c1 = h.cards[1];

    const add0 = drawOne();
    const add1 = drawOne();

    const h1 = { cards: [c0, add0].filter(Boolean), bet: h.bet, doubled: false, done: false, result: null };
    const h2 = { cards: [c1, add1].filter(Boolean), bet: h.bet, doubled: false, done: false, result: null };

    setHands([h1, h2]);
    setActiveHand(0);
    setMsg('スプリット！手札1から進行');
  }

  // -------------------------
  // UI helpers
  // -------------------------
  const h = currentHandObj();

  const splitOK = useMemo(() => {
    if (phase !== 'playing') return false;
    if (!h) return false;
    return canSplit(h.cards) && hands.length === 1 && activeHand === 0 && bankroll >= h.bet;
  }, [phase, h, hands.length, activeHand, bankroll]);

  const doubleOK = useMemo(() => {
    if (phase !== 'playing') return false;
    if (!h) return false;
    if (h.cards.length !== 2) return false;
    if (h.doubled) return false;
    return bankroll >= h.bet;
  }, [phase, h, bankroll]);

  const hitOK = useMemo(() => {
    if (phase !== 'playing') return false;
    if (!h) return false;
    if (h.doubled) return false;
    return true;
  }, [phase, h]);

  const standOK = phase === 'playing' && !!h;

  const dealerTotalShown = revealAnswers ? calcBestTotal(dealerCards) : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-emerald-950 text-emerald-50 p-4">
        <div className="max-w-3xl mx-auto">読み込み中…</div>
      </main>
    );
  }
  if (errorText) {
    return (
      <main className="min-h-screen bg-emerald-950 text-emerald-50 p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-xl font-extrabold">エラー</h1>
          <div className="text-rose-200 text-sm">{errorText}</div>
          <Link className="underline text-emerald-200" href="/solo/blackjack">
            ルールへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden bj-nozoom">
      <style jsx global>{`
        @media (max-width: 640px) {
          .bj-nozoom input,
          .bj-nozoom textarea,
          .bj-nozoom select {
            font-size: 16px !important;
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,.45),rgba(4,120,87,.95),rgba(2,44,34,1))]" />

      <div className="relative max-w-5xl mx-auto p-2 sm:p-3 text-emerald-50">
        <header className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-sm font-extrabold tracking-wide drop-shadow">BLACKJACK（問題カード）</div>
            <div className="text-[11px] opacity-90 drop-shadow">
              所持金：<b className="font-extrabold">{bankroll}</b> / 自己ベスト：<b>{bestBankroll}</b>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <Link className="underline text-emerald-100/90 font-extrabold" href="/solo/blackjack">
              ルール
            </Link>
            <Link className="underline text-emerald-100/90 font-extrabold" href="/solo">
              ソロ
            </Link>
          </div>
        </header>

        {/* BIG RESULT BAR（余計な注釈なし） */}
        {phase === 'result' ? (
          <div className="mb-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-center">
            <div className="text-[18px] font-black tracking-wide">{msg || 'RESULT'}</div>
          </div>
        ) : null}

        <div className="rounded-[26px] border border-white/15 bg-black/15 shadow-[0_30px_80px_rgba(0,0,0,.35)] overflow-hidden">
          {/* dealer */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold opacity-95">ディーラー</div>
              {revealAnswers ? (
                <div className="text-[11px] font-extrabold opacity-95">
                  合計：<b>{dealerTotalShown}</b>
                </div>
              ) : (
                <div className="text-[10px] opacity-85">数字は表示されません</div>
              )}
            </div>

            <div className="mt-2 flex gap-2 flex-wrap justify-center">
              {dealerCards.map((c) => (
                <button
                  key={c.id}
                  className="bg-transparent p-0 border-0"
                  onClick={() => setOpenCard({ owner: 'ディーラー', text: c.text, place: c.place, card: c })}
                >
                  <QCard card={c} reveal={revealAnswers} />
                </button>
              ))}
              {dealerCards.length === 0 ? <GhostCard /> : null}
            </div>
          </div>

          {/* center banner */}
          <div className="px-3 py-2">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-center">
              <div className="text-[10px] font-extrabold opacity-90">BLACK JACK PAYS 3 TO 2 / DEALER STANDS ON 17</div>
              <div className="text-[12px] font-black tracking-[.25em] opacity-90">DOUBLE EXPOSURE</div>
            </div>
          </div>

          {/* player */}
          <div className="px-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold opacity-95">
                あなた {hands.length >= 2 ? `（手札${activeHand + 1}/${hands.length}）` : ''}
              </div>
              <div className="text-[11px] opacity-95">
                賭け：<b className="font-extrabold">{phase === 'bet' ? bet : h?.bet ?? bet}</b>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hands.length === 0 ? (
                <div className="flex justify-center">
                  <GhostCard />
                </div>
              ) : (
                hands.map((hh, idx) => {
                  const total = revealAnswers ? calcBestTotal(hh.cards) : null;

                  return (
                    <div
                      key={idx}
                      className={[
                        'rounded-2xl border px-2 py-2',
                        idx === activeHand && phase === 'playing'
                          ? 'border-emerald-200/70 bg-emerald-200/10'
                          : 'border-white/10 bg-black/10',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-extrabold opacity-95">
                          手札{idx + 1}
                          {hh.result ? `：${labelResultShort(hh.result)}` : ''}
                          <span className="ml-2 opacity-90">{hh.result ? `(${labelResultJa(hh.result)})` : ''}</span>
                        </div>

                        <div className="text-[11px] opacity-95 flex items-center gap-3">
                          {revealAnswers ? (
                            <span>
                              合計：<b>{total}</b>
                            </span>
                          ) : null}
                          <span>
                            賭け：<b>{hh.bet}</b>
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap justify-center">
                        {hh.cards.map((c) => (
                          <button
                            key={c.id}
                            className="bg-transparent p-0 border-0"
                            onClick={() =>
                              setOpenCard({ owner: `あなた（手札${idx + 1}）`, text: c.text, place: c.place, card: c })
                            }
                          >
                            <QCard card={c} reveal={revealAnswers} />
                          </button>
                        ))}
                        {hh.cards.length === 0 ? <GhostCard /> : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* controls */}
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-2">
              {phase === 'bet' ? (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <div className="text-[11px] opacity-95">
                    賭け金（100刻み）：<b className="ml-2">{bet}</b>
                    <span className="ml-2 opacity-80">（最大 {maxBet}）</span>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center justify-end">
                    <ChipBtn onClick={() => setBet((b) => Math.max(BET_MIN, b - BET_STEP))}>-100</ChipBtn>
                    <ChipBtn onClick={() => setBet((b) => Math.min(maxBet, b + BET_STEP))}>+100</ChipBtn>
                    <button
                      className="px-4 py-2 rounded-full bg-emerald-200 text-emerald-950 font-extrabold shadow"
                      onClick={startDeal}
                    >
                      DEAL
                    </button>
                  </div>
                </div>
              ) : phase === 'result' ? (
                <div className="flex flex-wrap gap-2 items-center justify-center">
                  <button
                    className="px-4 py-2 rounded-full bg-emerald-200 text-emerald-950 font-extrabold shadow"
                    onClick={resetRoundKeepBankroll}
                  >
                    次の勝負へ（賭け選択）
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 items-center justify-center">
                  <ActionBtn disabled={!hitOK} onClick={hit}>
                    ヒット
                  </ActionBtn>
                  <ActionBtn disabled={!standOK} onClick={stand}>
                    スタンド
                  </ActionBtn>
                  <ActionBtn disabled={!doubleOK} onClick={doubleDown}>
                    ダブル
                  </ActionBtn>
                  <ActionBtn disabled={!splitOK} onClick={split}>
                    スプリット
                  </ActionBtn>
                </div>
              )}

              {msg && phase !== 'result' ? <div className="mt-2 text-center text-[12px] opacity-95">{msg}</div> : null}
            </div>
          </div>
        </div>
      </div>

      {/* モーダル（結果後なら答えも見える） */}
      {openCard && (
        <div
          className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4"
          onClick={() => setOpenCard(null)}
        >
          <div
            className="w-full max-w-[560px] rounded-2xl border border-white/15 bg-[rgba(8,20,18,.96)] p-3 shadow-[0_20px_60px_rgba(0,0,0,.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="font-extrabold">{openCard.owner}</div>
              <button
                className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 font-extrabold"
                onClick={() => setOpenCard(null)}
              >
                ×
              </button>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
              <div className="text-sm font-extrabold whitespace-pre-wrap leading-snug">{openCard.text}</div>
              <div className="mt-2 text-right text-xs font-extrabold opacity-90">（{openCard.place}）</div>

              {revealAnswers && openCard.card ? (
                <div className="mt-3 rounded-2xl border border-white/15 bg-black/20 p-3 text-center">
                  <div className="text-[22px] font-black tracking-wide">{getFullAnswerText(openCard.card)}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ChipBtn({ children, onClick }) {
  return (
    <button onClick={onClick} className="px-3 py-2 rounded-full border border-white/25 bg-white/10 text-white font-extrabold">
      {children}
    </button>
  );
}

function ActionBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-full font-extrabold shadow border border-white/15"
      style={{
        background: disabled ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.92)',
        color: disabled ? 'rgba(255,255,255,.70)' : '#052e25',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

// カード：通常は問題文だけ、result後は「答え」を下に出す
function QCard({ card, reveal }) {
  if (!card) return null;

  return (
    <div
      style={{
        width: 120,
        height: 160,
        borderRadius: 14,
        background: 'rgba(255,255,255,.92)',
        color: '#062b23',
        border: '2px solid rgba(0,0,0,.12)',
        padding: 10,
        boxShadow: '0 10px 18px rgba(0,0,0,.18)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      title={card.text}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          fontSize: 12,
          fontWeight: 1000,
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          paddingRight: 4,
        }}
      >
        {card.text}
      </div>

      <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.85, textAlign: 'right', marginTop: 6 }}>
        （{card.place}）
      </div>

      {reveal ? (
        <div
          style={{
            marginTop: 8,
            borderRadius: 12,
            padding: '6px 8px',
            background: 'rgba(5,46,37,.08)',
            border: '1px solid rgba(5,46,37,.12)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 1000 }}>{getFullAnswerText(card)}</div>
        </div>
      ) : null}
    </div>
  );
}

function GhostCard() {
  return (
    <div
      style={{
        width: 120,
        height: 160,
        borderRadius: 14,
        border: '2px dashed rgba(255,255,255,.30)',
        background: 'rgba(0,0,0,.10)',
      }}
    />
  );
}
