// file: app/battle/page.js
'use client';

import { Suspense } from 'react';
import BattlePageInner from './page_inner';

export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-sky-50 text-sky-900 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow px-6 py-4 text-center">
            対戦画面を読み込み中…
          </div>
        </main>
      }
    >
      <BattlePageInner />
    </Suspense>
  );
}
