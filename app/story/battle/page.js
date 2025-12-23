// file: app/story/battle/page.js
'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const LS_OUTCOME = 'story:lastOutcome';

function norm(v) {
  const t = String(v ?? '').replace(/\u3000/g, ' ').trim();
  return t ? t : null;
}

function setOutcome(v) {
  try {
    localStorage.setItem(LS_OUTCOME, v);
  } catch {}
}

export default function StoryBattlePage() {
  const sp = useSearchParams();
  const router = useRouter();

  const chapter = norm(sp.get('chapter')) ?? 'ch0';
  const from = norm(sp.get('from')) ?? null;

  const tag = norm(sp.get('tag')) ?? '';
  const enemy = norm(sp.get('enemy')) ?? 'enemy';

  const win_to = norm(sp.get('win_to')) ?? '';
  const lose_to = norm(sp.get('lose_to')) ?? '';
  const draw_to = norm(sp.get('draw_to')) ?? '';

  const tags_select = norm(sp.get('tags_select')) ?? ''; // 例: "技,セリフ,サブタイトル"

  const tags = useMemo(() => {
    if (!tags_select) return [];
    return tags_select
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [tags_select]);

  function backToStory(jumpId) {
    const jump = norm(jumpId) ?? from ?? '';
    router.push(`/story/play?chapter=${encodeURIComponent(chapter)}${jump ? `&jump=${encodeURIComponent(jump)}` : ''}`);
  }

  function finish(outcome) {
    setOutcome(outcome);

    const to =
      outcome === 'win' ? win_to :
      outcome === 'lose' ? lose_to :
      outcome === 'draw' ? draw_to :
      '';

    backToStory(to || from);
  }

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 背景（仮） */}
      <div className="absolute inset-0">
        <div className="w-full h-full bg-gradient-to-b from-slate-900 to-black" />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      <div className="relative z-10 px-4 pt-4 flex items-center justify-between">
        <div className="text-xs font-extrabold text-white/80">
          ストーリー対戦（{chapter}{from ? ` / from:${from}` : ''}）
        </div>
        <button
          type="button"
          onClick={() => backToStory(from)}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-extrabold"
        >
          戻る
        </button>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-6 pt-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold">VS {enemy}</h1>
              <p className="mt-1 text-sm text-white/75 font-bold">
                タグ：{tag ? tag : '（未指定）'}
              </p>
              {tags.length > 0 ? (
                <p className="mt-2 text-xs text-white/60 font-bold">
                  選択タグ候補：{tags.join(' / ')}
                </p>
              ) : null}
            </div>

            <div className="text-right">
              <div className="text-xs text-white/60 font-bold">※ここはUI雛形</div>
              <div className="mt-1 text-xs text-white/60 font-bold">
                （あとで本物の出題に繋ぐ）
              </div>
            </div>
          </div>

          {/* カード */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="text-sm font-extrabold">あなた</div>
              <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[100%] bg-emerald-500/80" />
              </div>
              <div className="mt-2 text-xs text-white/70 font-bold">HP: 100</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="text-sm font-extrabold">{enemy}</div>
              <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[100%] bg-rose-500/75" />
              </div>
              <div className="mt-2 text-xs text-white/70 font-bold">HP: 100</div>
            </div>
          </div>

          {/* 行動 */}
          <div className="mt-5">
            <div className="text-xs text-white/70 font-bold">
              まずは「勝敗を確定」ボタンで、ストーリー分岐が動くか確認しよう。
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => finish('win')}
                className="px-4 py-3 rounded-2xl bg-emerald-500/80 hover:bg-emerald-500 border border-emerald-200/20 font-extrabold"
              >
                勝った（win）
              </button>

              <button
                type="button"
                onClick={() => finish('lose')}
                className="px-4 py-3 rounded-2xl bg-rose-500/80 hover:bg-rose-500 border border-rose-200/20 font-extrabold"
              >
                負けた（lose）
              </button>

              <button
                type="button"
                onClick={() => finish('draw')}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-extrabold"
              >
                引き分け（draw）
              </button>
            </div>

            {/* 将来：タグ選択→対策・出題へ */}
            {tags.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-extrabold">タグ選択（将来用）</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        // ここは後で「対策10問」フローに接続する
                        alert(`（仮）タグ「${t}」で対策開始（あとで実装）`);
                      }}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-extrabold hover:bg-white/15"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
