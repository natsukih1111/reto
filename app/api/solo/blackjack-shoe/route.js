// file: app/api/solo/blackjack-shoe/route.js
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
        id: `bj-r${i + 1}-${suffix}`,
        text: base.q,
        place,
        digit, // 0-9（内部判定用）
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

// digit(0-9) をできるだけ均等に pick
function pickBalanced(cards, total = 200) {
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
  while (picked.length < total && safety < 40000) {
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

    // BJは「山札（シュー）」として大きめに返す
    const shoeRaw = pickBalanced(allCards, 200);
    if (shoeRaw.length < 80) {
      return NextResponse.json(
        { ok: false, error: `カードが不足（${shoeRaw.length}枚）。問題数 or 桁数を増やしてね。` },
        { status: 400 }
      );
    }

    const shoe = shuffle(shoeRaw);

    return NextResponse.json({ ok: true, shoe }, { status: 200 });
  } catch (e) {
    console.error('[blackjack-shoe] error', e);
    return NextResponse.json({ ok: false, error: '内部エラー' }, { status: 500 });
  }
}
