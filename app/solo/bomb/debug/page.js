// file: app/solo/bomb/debug/page.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BOMB_VARIANTS } from '../config';

export default function BombDebugPage() {
  const [variants, setVariants] = useState(BOMB_VARIANTS);
  const [index, setIndex] = useState(0);
  const current = variants[index] || variants[0];

  const handleChange = (key, value) => {
    setVariants((prev) => {
      const next = [...prev];
      const v = { ...next[index], [key]: value };
      next[index] = v;
      return next;
    });
  };

  const timerText = '38:10'; // 見た目確認用のダミー

  const snippet = current
    ? `{
  src: '${current.src}',
  timerOffsetX: ${current.timerOffsetX},
  timerOffsetY: ${current.timerOffsetY},
  timerScale: ${current.timerScale},
},`
    : '';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-extrabold">
            💣 爆弾タイマー位置デバッグ
          </h1>
          <Link
            href="/solo/bomb"
            className="text-xs font-bold text-sky-300 underline hover:text-sky-200"
          >
            爆弾ゲームへ戻る
          </Link>
        </header>

        {/* コントロールパネル */}
        <div className="grid gap-4 md:grid-cols-[260px,1fr]">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 space-y-3">
            <div>
              <label className="block text-xs mb-1">
                爆弾画像番号（1〜21）
              </label>
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm"
                value={index}
                onChange={(e) => setIndex(Number(e.target.value))}
              >
                {variants.map((v, i) => (
                  <option key={i} value={i}>
                    {i + 1}: {v.src.split('/').pop()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1">
                timerOffsetX（px, +で右 / -で左）
              </label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm"
                value={current.timerOffsetX}
                onChange={(e) =>
                  handleChange('timerOffsetX', Number(e.target.value) || 0)
                }
              />
            </div>

            <div>
              <label className="block text-xs mb-1">
                timerOffsetY（px, +で下 / -で上）
              </label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm"
                value={current.timerOffsetY}
                onChange={(e) =>
                  handleChange('timerOffsetY', Number(e.target.value) || 0)
                }
              />
            </div>

            <div>
              <label className="block text-xs mb-1">
                timerScale（例: 0.8〜1.3）
              </label>
              <input
                type="number"
                step="0.05"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm"
                value={current.timerScale}
                onChange={(e) =>
                  handleChange(
                    'timerScale',
                    Number(e.target.value) || 1
                  )
                }
              />
            </div>

            <p className="text-[11px] text-slate-400">
              数値を変更すると右側のプレビューに即反映されます。
              調整が終わったら下のコードを <code>config.js</code>{' '}
              に貼り付けてください。
            </p>
          </div>

          {/* プレビュー */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-4">
            <div className="text-xs text-slate-300">
              プレビュー（爆弾{index + 1}）
            </div>
            <div className="relative mx-auto w-full max-w-md aspect-square flex items-center justify-center">
              {/* 爆弾 */}
              <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48 rounded-full">
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={current.src}
                    alt="bomb-preview"
                    className="max-w-full max-h-full drop-shadow-[0_0_18px_rgba(0,0,0,0.8)]"
                  />
                </div>
                {/* タイマー */}
                <div
                  className="absolute z-10 flex flex-col items-center justify-center rounded-lg bg-slate-950 border border-slate-200 shadow-[0_0_12px_rgba(15,23,42,0.9)]"
                  style={{
                    transform: `translate(${current.timerOffsetX}px, ${current.timerOffsetY}px) scale(${current.timerScale})`,
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
              </div>
            </div>

            {/* コピペ用スニペット */}
            <div>
              <div className="text-xs text-slate-300 mb-1">
                config.js に貼り付けるコード
              </div>
              <textarea
                readOnly
                className="w-full h-28 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-100"
                value={snippet}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
