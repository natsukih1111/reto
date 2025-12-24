// file: app/api/solo/speed-questions/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ---------- utils ----------
function shuffle(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDigits(num) {
  const s = Math.abs(Math.trunc(num)).toString();
  const ones = Number(s.slice(-1));
  const tens = s.length >= 2 ? Number(s.slice(-2, -1)) : null;
  const hundreds = s.length >= 3 ? Number(s.slice(-3, -2)) : null;
  const thousands = s.length >= 4 ? Number(s.slice(-4, -3)) : null;
  return { ones, tens, hundreds, thousands, len: s.length };
}

function buildAllCards(rows) {
  const cards = [];
  for (let i = 0; i < rows.length; i++) {
    const base = rows[i];
    const d = getDigits(base.n);

    const push = (place, digit, suffix) => {
      cards.push({
        id: `r${i + 1}-${suffix}`,
        text: base.q,
        place,
        digit,
        // ★ フルの答え（振り返り用）
        answerNumber: base.n,
      });
    };

    push('一の位', d.ones, 'ones');
    if (d.tens != null) push('十の位', d.tens, 'tens');
    if (d.hundreds != null) push('百の位', d.hundreds, 'hundreds');
    if (d.thousands != null) push('千の位', d.thousands, 'thousands');
  }
  return cards;
}

function pickBalanced(cards, total = 50) {
  const buckets = Array.from({ length: 10 }, () => []);
  for (const c of cards) {
    if (c && typeof c.digit === 'number' && c.digit >= 0 && c.digit <= 9) {
      buckets[c.digit].push(c);
    }
  }
  for (let d = 0; d < 10; d++) buckets[d] = shuffle(buckets[d]);

  const picked = [];
  const used = new Set();

  let safety = 0;
  while (picked.length < total && safety < 20000) {
    safety++;
    let progressed = false;

    for (let d = 0; d < 10; d++) {
      if (picked.length >= total) break;

      while (buckets[d].length) {
        const c = buckets[d].pop();
        if (!c) break;
        if (used.has(c.id)) continue;
        used.add(c.id);
        picked.push(c);
        progressed = true;
        break;
      }
    }

    if (!progressed) break;
  }

  return picked;
}

function ensurePlayableOpeners(deck50) {
  const a = shuffle(deck50);
  let tries = 0;

  while (tries < 60) {
    tries++;
    const c1 = a[0];
    const c2 = a[1];
    if (!c1 || !c2) break;
    if (c1.digit !== c2.digit) break;

    const k = 2 + Math.floor(Math.random() * Math.min(20, a.length - 2));
    [a[1], a[k]] = [a[k], a[1]];
  }
  return a;
}

function readXlsxRows(filePath) {
  // npm i xlsx が必要
  // eslint-disable-next-line global-require
  const XLSX = require('xlsx');

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  const rows = [];
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!r || r.length < 2) continue;

    const q = String(r[0] ?? '').trim();
    if (!q) continue;

    const n = Number(r[1]);
    if (!Number.isFinite(n)) continue;

    rows.push({ q, n });
  }
  return rows;
}

// ---------- API ----------
export async function GET() {
  try {
    // ★ node: を使う + GET内で require（fsの解決エラー回避）
    // eslint-disable-next-line global-require
    const path = require('node:path');
    // eslint-disable-next-line global-require
    const fs = require('node:fs');

    const filePath = path.join(process.cwd(), 'data', 'number.xlsx');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { ok: false, error: 'data/number.xlsx が見つかりません（プロジェクト内 data/ に置いてください）' },
        { status: 404 }
      );
    }

    const rows = readXlsxRows(filePath);
    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: 'Excelから問題を読み取れませんでした（A列=問題、B列=数字）' },
        { status: 400 }
      );
    }

    const allCards = buildAllCards(rows);

    const picked50raw = pickBalanced(allCards, 50);
    if (picked50raw.length < 50) {
      return NextResponse.json(
        { ok: false, error: `カードが不足（${picked50raw.length}/50）。問題数 or 桁数を増やしてね。` },
        { status: 400 }
      );
    }

    const picked50 = ensurePlayableOpeners(picked50raw);

    let playerDeck = shuffle(picked50.slice(0, 25));
    let cpuDeck = shuffle(picked50.slice(25, 50));

    const centerA = playerDeck.pop();
    const centerB = cpuDeck.pop();

    return NextResponse.json({ ok: true, playerDeck, cpuDeck, center: [centerA, centerB] }, { status: 200 });
  } catch (e) {
    console.error('[speed-questions] error', e);
    return NextResponse.json({ ok: false, error: '内部エラー' }, { status: 500 });
  }
}
