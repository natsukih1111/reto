// file: app/battle/page.js
'use client';

import { Suspense } from 'react';
import BattlePageInner from './page_inner';

export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f4f7fb',
            color: '#222',
            fontSize: '16px',
          }}
        >
          読み込み中…
        </div>
      }
    >
      <BattlePageInner />
    </Suspense>
  );
}
