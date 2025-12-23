// file: app/api/story/load/route.js
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import * as XLSX from 'xlsx';

function norm(v) {
  return String(v ?? '').replace(/\u3000/g, ' ').trim();
}

function normalizeChapterParam(raw) {
  const t = norm(raw).toLowerCase();
  // "chapter0" / "0" / "０" → "ch0"
  const num = Number(t.replace(/^chapter/, '').replace(/[^\d]/g, ''));
  if (Number.isFinite(num)) return `ch${num}`;
  if (t.startsWith('ch')) return t;
  return 'ch0';
}

function asNullIfEmpty(v) {
  const t = norm(v);
  return t ? t : null;
}

function parseJsonArray(cell) {
  // Excelセルに JSON 文字列で入れる想定: 例 ["flagA","flagB"]
  // 空なら []
  const t = norm(cell);
  if (!t) return [];
  try {
    const v = JSON.parse(t);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const chapter = normalizeChapterParam(searchParams.get('chapter') ?? 'ch0');

    // ★ ここ：1個のExcelに統一（このパスに置く想定）
    const xlsxPath = path.join(process.cwd(), 'app', 'story', 'data', 'story.xlsx');

    await fs.access(xlsxPath);
    const buf = await fs.readFile(xlsxPath);

    const wb = XLSX.read(buf, { type: 'buffer' });

    // ★ 1シート運用：優先的に "lines" を探し、無ければ先頭シート
    const sheetName = wb.SheetNames.find((n) => String(n).trim().toLowerCase() === 'lines') || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json(
        { ok: false, error: 'Excelシートが見つかりません', xlsxPath, sheetNames: wb.SheetNames },
        { status: 404 }
      );
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // chapter列で抽出
    const all = rows.map((r, i) => ({
      _i: i,
      chapter: norm(r.chapter),
      id: asNullIfEmpty(r.id) ?? String(i + 1),

      bg: asNullIfEmpty(r.bg) || 'black',
      left: asNullIfEmpty(r.left),
      center: asNullIfEmpty(r.center),
      right: asNullIfEmpty(r.right),
      speaker: asNullIfEmpty(r.speaker),
      text: String(r.text ?? ''),
      bigTitle: asNullIfEmpty(r.bigTitle),

      command: asNullIfEmpty(r.command),
      quiz_tag: asNullIfEmpty(r.quiz_tag),
      enemy: asNullIfEmpty(r.enemy),

      // バトル分岐（Excel列）
      win_to: asNullIfEmpty(r.win_to),
      lose_to: asNullIfEmpty(r.lose_to),
      draw_to: asNullIfEmpty(r.draw_to),

      sfx: asNullIfEmpty(r.sfx),
      shake: asNullIfEmpty(r.shake),
      wait_ms: (() => {
        const n = Number(norm(r.wait_ms));
        return Number.isFinite(n) ? n : null;
      })(),

      // もし将来使うなら（ExcelセルにJSONで入れる）
      needFlags: parseJsonArray(r.needFlags),
      setFlags: parseJsonArray(r.setFlags),
      choices: parseJsonArray(r.choices), // 例: [{"text":"A","to":"ch1_010"}]
      next: asNullIfEmpty(r.next),
    }));

    const story = all.filter((x) => (x.chapter || '').toLowerCase() === chapter.toLowerCase());

    if (!story.length) {
      const chapters = [...new Set(all.map((x) => x.chapter).filter(Boolean))];
      return NextResponse.json(
        { ok: false, error: `chapter=${chapter} の行がありません`, xlsxPath, sheetName, chapters },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, chapter, sheetName, story });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
