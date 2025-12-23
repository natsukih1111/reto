// file: app/api/waza/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

function cleanCell(v) {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s === 'ー') return ''; // ★指定：ーのみは空欄扱い
  return s;
}

function looksLikeHeader(row) {
  const a = cleanCell(row?.[0]);
  const b = cleanCell(row?.[1]);
  // ヘッダっぽいのを雑に除外（必要なら増やしてOK）
  return (
    a.includes('技名') ||
    a === '技' ||
    b.includes('使用') ||
    b.includes('キャラ') ||
    a.includes('タイトル')
  );
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'waza.xlsx');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: `not found: ${filePath}` }, { status: 404 });
    }

    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });

    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) {
      return NextResponse.json({ ok: false, error: 'sheet not found' }, { status: 400 });
    }

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

    // A:技名 B:使用者 C:食らった D:話数 E:効果音 F:場所
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || [];

      // 先頭行ヘッダ除外（ヘッダが別の行にあるならここ調整）
      if (i === 0 && looksLikeHeader(row)) continue;

      const name = cleanCell(row[0]);
      const user = cleanCell(row[1]);
      const target = cleanCell(row[2]);  // C
      const chapter = cleanCell(row[3]); // D
      const sfx = cleanCell(row[4]);     // E
      const place = cleanCell(row[5]);   // F

      // 完全空行は捨てる
      if (!name && !user && !target && !chapter && !sfx && !place) continue;

      items.push({
        idx: items.length + 1,
        name,
        user,
        target,
        chapter,
        sfx,
        place,
      });
    }

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown error' }, { status: 500 });
  }
}
