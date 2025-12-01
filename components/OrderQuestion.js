// components/OrderQuestion.js
'use client';

import { useState, useEffect } from 'react';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 並び替え問題用コンポーネント
 * props:
 *  - options: 正解順の配列（['ルフィ','ゾロ', ...]）
 *  - onChange(orderArray): ユーザーが選んだ順番を返す
 */
export default function OrderQuestion({ options, onChange }) {
  const [shuffled, setShuffled] = useState([]);
  const [order, setOrder] = useState([]);

  // 初回 & options 変更時にシャッフル
  useEffect(() => {
    setShuffled(shuffle(options));
    setOrder([]);
  }, [JSON.stringify(options)]);

  const toggle = (opt) => {
    let next;
    if (order.includes(opt)) {
      // もう一度押したら解除
      next = order.filter((o) => o !== opt);
    } else {
      next = [...order, opt];
    }
    setOrder(next);
    onChange?.(next);
  };

  const reset = () => {
    setOrder([]);
    onChange?.([]);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-300">
        上から順にタップして並び順を指定してください（もう一度タップで解除）
      </div>

      <div className="space-y-2">
        {shuffled.map((opt) => {
          const idx = order.indexOf(opt);
          const selected = idx !== -1;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full flex justify-between items-center px-4 py-2 rounded-lg border text-left
                ${
                  selected
                    ? 'bg-sky-500 text-white border-sky-400'
                    : 'bg-slate-800 text-slate-50 border-slate-600'
                }`}
            >
              <span>{opt}</span>
              <span className="text-sm opacity-80">
                {selected ? idx + 1 : '　'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-xs text-slate-300">
        <span>現在の順番: {order.join(' → ') || '未選択'}</span>
        <button
          type="button"
          onClick={reset}
          className="px-2 py-1 rounded bg-slate-700"
        >
          リセット
        </button>
      </div>
    </div>
  );
}