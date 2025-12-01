// file: app/api/gacha/draw/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';
import { cookies } from 'next/headers';

const GACHA_COST = 500;

export async function POST(req) {
  try {
    // リクエストボディ（フロントから送っている charId）
    const body = await req.json().catch(() => ({}));
    const charNo = Number(body.charId);

    if (!Number.isFinite(charNo)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_CHAR_ID' },
        { status: 400 }
      );
    }

    // ログインユーザー取得（nb_username クッキー）
    const cookieStore = await cookies();
    const username = cookieStore.get('nb_username')?.value || null;

    if (!username) {
      return NextResponse.json(
        { ok: false, error: 'NOT_LOGGED_IN' },
        { status: 401 }
      );
    }

    const user = db
      .prepare('SELECT id, berries FROM users WHERE username = ?')
      .get(username);

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

    // ★ ここが重要：csv の番号(charNo) から DB の characters.id を引く
    const character = db
      .prepare(
        `SELECT id, char_no, name, base_rarity
         FROM characters
         WHERE char_no = ?`
      )
      .get(charNo);

    if (!character) {
      return NextResponse.json(
        { ok: false, error: 'CHARACTER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 実際に登録 & ベリー消費（トランザクション）
    const tx = db.transaction((userId, characterId) => {
      // ベリー減算
      db.prepare(
        `UPDATE users
           SET berries = COALESCE(berries, 0) - ?
         WHERE id = ?`
      ).run(GACHA_COST, userId);

      // user_characters へ登録
      // （とりあえず stars は base_rarity を初期値として入れておく）
      db.prepare(
        `
        INSERT INTO user_characters (user_id, character_id, stars)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, character_id) DO UPDATE SET
          updated_at = CURRENT_TIMESTAMP
      `
      ).run(userId, characterId, character.base_rarity);
    });

    tx(user.id, character.id);

    // 更新後ベリー
    const updated = db
      .prepare('SELECT berries FROM users WHERE id = ?')
      .get(user.id);

    return NextResponse.json({
      ok: true,
      berries: updated.berries ?? 0,
    });
  } catch (e) {
    console.error('gacha/draw error', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
