// file: app/solo/number/page.js
'use client';

import Link from 'next/link';

export default function NumberHubPage() {
  const items = [
    {
      key: 'speed',
      title: 'スピード（数字）',
      desc: '問題で0〜9を導いて、場札と±1なら出せるスピード勝負。',
      href: '/solo/speed',
      status: 'playable',
      accent: 'sky',
    },
    {
      key: 'blackjack',
      title: 'ブラックジャック',
      desc: '数字を使って21を目指す。A(1)は1/11、0は10点。',
      href: '/solo/blackjack',
      status: 'playable',
      accent: 'amber',
    },
    {
      key: 'memory',
      title: '神経衰弱',
      desc: '数字カードを覚えて揃える（20枚 / 10ミスで失敗）',
      href: '/solo/memory',
      status: 'playable', // ★ playable
      accent: 'violet',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold">🔢 ナンバーゲーム</h1>
            <p className="text-[12px] text-slate-200 mt-1">数字を使ったミニゲーム集（順次追加）</p>
          </div>
          <Link
            href="/solo"
            className="text-xs font-bold text-sky-200 underline underline-offset-2 hover:text-sky-100"
          >
            ソロへ戻る
          </Link>
        </header>

        <div className="space-y-3">
          {items.map((it) => (
            <GameCard key={it.key} item={it} />
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-full border border-slate-700 bg-slate-900 text-xs font-bold text-slate-100 hover:bg-slate-800"
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}

function GameCard({ item }) {
  const isPlayable = item.status === 'playable';

  const accent =
    item.accent === 'sky'
      ? {
          border: 'border-sky-500/70',
          bg: 'bg-sky-500/10',
          hover: 'hover:bg-sky-500/15',
          title: 'text-sky-200',
          badge: 'bg-sky-400/20 text-sky-100 border-sky-300/30',
          link: 'text-sky-200 hover:text-sky-100',
        }
      : item.accent === 'amber'
      ? {
          border: 'border-amber-500/70',
          bg: 'bg-amber-500/10',
          hover: 'hover:bg-amber-500/15',
          title: 'text-amber-200',
          badge: 'bg-amber-400/20 text-amber-100 border-amber-300/30',
          link: 'text-amber-200 hover:text-amber-100',
        }
      : {
          border: 'border-violet-500/70',
          bg: 'bg-violet-500/10',
          hover: 'hover:bg-violet-500/15',
          title: 'text-violet-200',
          badge: 'bg-violet-400/20 text-violet-100 border-violet-300/30',
          link: 'text-violet-200 hover:text-violet-100',
        };

  const Badge = () => (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold border',
        accent.badge,
      ].join(' ')}
    >
      {isPlayable ? 'PLAY' : '準備中'}
    </span>
  );

  const Inner = (
    <div
      className={[
        'rounded-2xl border px-3 py-3 shadow-sm',
        accent.border,
        accent.bg,
        isPlayable ? accent.hover : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={['text-sm font-extrabold', accent.title].join(' ')}>{item.title}</p>
          <p className="text-[11px] text-slate-200 leading-tight mt-1">{item.desc}</p>
        </div>
        <Badge />
      </div>

      <div className="mt-2 flex items-center justify-end text-[11px]">
        {isPlayable ? (
          <span className={['underline font-bold', accent.link].join(' ')}>開く</span>
        ) : (
          <span className="text-slate-400 font-bold">近日追加</span>
        )}
      </div>
    </div>
  );

  if (!isPlayable) return Inner;

  return (
    <Link href={item.href} className="block">
      {Inner}
    </Link>
  );
}
