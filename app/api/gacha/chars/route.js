// file: app/api/gacha/chars/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db.js'; // better-sqlite3 のインスタンス

export async function GET() {
  try {
    // onepiece_gacha/chars.csv を読み込む
    const filePath = path.join(process.cwd(), 'onepiece_gacha', 'chars.csv');
    const text = fs.readFileSync(filePath, 'utf8');

    // 空行を除外
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // CSV → JS配列
    const chars = [];
    for (const line of lines) {
      // まずカンマで分割、それで足りなければタブ区切りも許容
      let cols = line.split(',');
      if (cols.length < 3) {
        cols = line.split('\t');
      }

      const [idStr, nameRaw, rarityStr] = cols;

      const id = Number(idStr);
      const baseRarity = Number(rarityStr);
      const name = (nameRaw ?? '').trim() || `ID${idStr}`;

      // 数字としておかしい行はスキップ
      if (!Number.isFinite(id) || !Number.isFinite(baseRarity)) continue;

      chars.push({ id, name, baseRarity });
    }

    // ==========================
    //  DB の characters テーブルに同期
    //  ・characters.char_no に CSV の id を入れる
    //  ・characters.base_rarity に CSV のレア度
    //  ・char_no は UNIQUE なので、ON CONFLICT で更新
    // ==========================
    const upsertStmt = db.prepare(`
      INSERT INTO characters (char_no, name, base_rarity)
      VALUES (?, ?, ?)
      ON CONFLICT(char_no) DO UPDATE SET
        name        = excluded.name,
        base_rarity = excluded.base_rarity
    `);

    const upsertAll = db.transaction((list) => {
      for (const c of list) {
        upsertStmt.run(c.id, c.name, c.baseRarity);
      }
    });

    // 一括で実行
    upsertAll(chars);

    // フロント用には CSV 由来の配列をそのまま返す
    return NextResponse.json({
      ok: true,
      chars: chars.map((c) => ({
        id: c.id,           // ← ガチャ側では「図鑑番号」として使う
        name: c.name,
        rarity: c.baseRarity,
      })),
    });
  } catch (e) {
    console.error('failed to read chars.csv', e);
    return NextResponse.json(
      { ok: false, error: 'FAILED_TO_READ_CHARS' },
      { status: 500 }
    );
  }
}
