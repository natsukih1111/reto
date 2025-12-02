// file: app/api/gacha/draw/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';
import { cookies } from 'next/headers';

const GACHA_COST = 500;
const STAR_UP_THRESHOLD = 1;

// db.query が Pool そのものか、rows 配列だけ返すラッパか分からないので、どちらでも動くように
async function queryRows(sql, params = []) {
  const res = await db.query(sql, params);
  return Array.isArray(res) ? res : res.rows;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const charNo = Number(body.charId);

    if (!Number.isFinite(charNo)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_CHAR_ID' },
        { status: 400 }
      );
    }

    // ログインユーザー取得
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    if (!username) {
      return NextResponse.json(
        { ok: false, error: 'NOT_LOGGED_IN' },
        { status: 401 }
      );
    }

    const userRows = await queryRows(
      'SELECT id, berries FROM users WHERE username = $1',
      [username]
    );
    const user = userRows[0];

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentBerries = user.berries ?? 0;
    if (currentBerries < GACHA_COST) {
      return NextResponse.json(
        { ok: false, error: 'NOT_ENOUGH_BERRIES', berries: currentBerries },
        { status: 400 }
      );
    }

    // char_no から characters 行を取得
    const charRows = await queryRows(
      `
      SELECT id, char_no, name, base_rarity
        FROM characters
       WHERE char_no = $1
      `,
      [charNo]
    );
    const character = charRows[0];

    if (!character) {
      return NextResponse.json(
        { ok: false, error: 'CHARACTER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 1) ベリー減算（足りない場合は更新されないように保険で WHERE berries >= COST）
    const updatedUserRows = await queryRows(
      `
      UPDATE users
         SET berries = COALESCE(berries, 0) - $1
       WHERE id = $2
         AND COALESCE(berries, 0) >= $1
       RETURNING berries
      `,
      [GACHA_COST, user.id]
    );

    if (updatedUserRows.length === 0) {
      // ここに来るのはレースコンディション時くらい
      return NextResponse.json(
        {
          ok: false,
          error: 'NOT_ENOUGH_BERRIES',
          berries: currentBerries,
        },
        { status: 400 }
      );
    }

    const updatedBerries = updatedUserRows[0].berries ?? 0;

    // ベリーログ
    await queryRows(
      `
      INSERT INTO berries_log (user_id, amount, reason)
      VALUES ($1, $2, $3)
      `,
      [user.id, -GACHA_COST, 'ガチャ']
    );

    // 2) user_characters の stars / copies 更新
    const ownedRows = await queryRows(
      `
      SELECT stars, copies
        FROM user_characters
       WHERE user_id = $1
         AND character_id = $2
      `,
      [user.id, character.id]
    );

    let prevStars = character.base_rarity;
    let newStars = character.base_rarity;
    let newCopies = 1;

    if (ownedRows.length === 0) {
      // 初取得
      await queryRows(
        `
        INSERT INTO user_characters (user_id, character_id, stars, copies)
        VALUES ($1, $2, $3, $4)
        `,
        [user.id, character.id, newStars, newCopies]
      );
    } else {
      const current = ownedRows[0];
      const prevCopies = current.copies ?? 0;
      prevStars = current.stars ?? character.base_rarity;

      newCopies = prevCopies + 1;

      const prevExtra = Math.floor(
        Math.max(0, prevCopies - 1) / STAR_UP_THRESHOLD
      );
      const newExtra = Math.floor(
        Math.max(0, newCopies - 1) / STAR_UP_THRESHOLD
      );

      newStars = character.base_rarity + newExtra;
      if (newStars > 11) newStars = 11;

      await queryRows(
        `
        UPDATE user_characters
           SET copies = $1,
               stars  = $2,
               updated_at = NOW()
         WHERE user_id = $3
           AND character_id = $4
        `,
        [newCopies, newStars, user.id, character.id]
      );
    }

    // レスポンス
    return NextResponse.json({
      ok: true,
      berries: updatedBerries,
      char: {
        charNo,
        baseRarity: character.base_rarity,
        prevStars,
        newStars,
        copies: newCopies,
      },
    });
  } catch (e) {
    console.error('gacha/draw error', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
