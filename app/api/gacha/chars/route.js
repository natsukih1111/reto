// file: app/api/gacha/chars/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // まずは DB から取得
    let rows = await db.query(
      `
        SELECT
          id,
          char_no,
          name,
          base_rarity
        FROM characters
        ORDER BY char_no ASC, id ASC
      `,
      []
    );

    // DB が空のときだけ、ローカル開発用に CSV から読み込んで upsert を試みる
    if (!rows || rows.length === 0) {
      try {
        const filePath = path.join(process.cwd(), 'onepiece_gacha', 'chars.csv');
        const text = fs.readFileSync(filePath, 'utf8');

        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        const parsed = [];

        for (const line of lines) {
          let cols = line.split(',');
          if (cols.length < 3) cols = line.split('\t');

          const [idStr, nameRaw, rarityStr] = cols;
          const charNo = Number(idStr);
          const baseRarity = Number(rarityStr);
          const name = (nameRaw ?? '').trim() || `ID${idStr}`;

          if (!Number.isFinite(charNo) || !Number.isFinite(baseRarity)) continue;

          parsed.push({ charNo, name, baseRarity });
        }

        // DB へ upsert（char_no UNIQUE 前提）
        for (const c of parsed) {
          await db.run(
            `
              INSERT INTO characters (char_no, name, base_rarity)
              VALUES ($1, $2, $3)
              ON CONFLICT (char_no) DO UPDATE SET
                name        = EXCLUDED.name,
                base_rarity = EXCLUDED.base_rarity
            `,
            [c.charNo, c.name, c.baseRarity]
          );
        }

        // upsert 後に再取得
        rows = await db.query(
          `
            SELECT
              id,
              char_no,
              name,
              base_rarity
            FROM characters
            ORDER BY char_no ASC, id ASC
          `,
          []
        );
      } catch (csvErr) {
        console.warn('chars.csv からの初期読み込みに失敗:', csvErr);
      }
    }

    const chars = (rows || []).map((r) => ({
      // フロント側では「図鑑番号」として扱っているので char_no を id として返す
      id: r.char_no ?? Number(r.id),
      name: r.name,
      rarity: r.base_rarity,
    }));

    return NextResponse.json(
      {
        ok: true,
        chars,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('failed to load gacha chars', e);
    return NextResponse.json(
      { ok: false, error: 'FAILED_TO_LOAD_CHARS' },
      { status: 500 }
    );
  }
}
