// file: lib/characters.js
import db from '@/lib/db.js';

// ------------------------------------
// 初期化：user_teams 作成 & 軽いマイグレーション
// ------------------------------------
function initCharacterTables() {
  // マイチーム（最大5体）
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_teams (
      user_id INTEGER NOT NULL,
      slot INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, slot),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    )
  `).run();

  // 古いDB → stars を足す
  try {
    const cols = db.prepare('PRAGMA table_info(user_characters);').all();
    const hasStars = cols.some((c) => c.name === 'stars');
    if (!hasStars) {
      db.exec(`
        ALTER TABLE user_characters
        ADD COLUMN stars INTEGER NOT NULL DEFAULT 1;
      `);
      console.log('[characters] added stars column to user_characters');
    }
  } catch (e) {
    console.error('[characters] migrate user_characters failed', e);
  }

  // characters.image_url が無ければ追加
  try {
    const cols2 = db.prepare('PRAGMA table_info(characters);').all();
    const hasImage = cols2.some((c) => c.name === 'image_url');
    if (!hasImage) {
      db.exec(`
        ALTER TABLE characters
        ADD COLUMN image_url TEXT;
      `);
      console.log('[characters] added image_url column to characters');
    }
  } catch (e) {
    console.error('[characters] migrate characters failed', e);
  }
}

// 初期化
initCharacterTables();

// ------------------------------------
// prepared statements
// ------------------------------------
const findCharacterByCharNoStmt = db.prepare(
  'SELECT id, base_rarity FROM characters WHERE char_no = ?'
);

const findCharacterByIdStmt = db.prepare(
  'SELECT id, base_rarity FROM characters WHERE id = ?'
);

const selectUserCharStmt = db.prepare(
  'SELECT id, stars FROM user_characters WHERE user_id = ? AND character_id = ?'
);

const insertUserCharStmt = db.prepare(
  'INSERT INTO user_characters (user_id, character_id, stars) VALUES (?, ?, ?)'
);

const updateUserCharStarsStmt = db.prepare(
  'UPDATE user_characters SET stars = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
);

// ------------------------------------
// キャラ付与（ガチャ）
// ------------------------------------
export function addCharactersToUser(userId, characterIds) {
  const tx = db.transaction((uid, ids) => {
    const uniqueIds = [
      ...new Set(ids.map((v) => Number(v)).filter((v) => Number.isFinite(v))),
    ];

    for (const rawId of uniqueIds) {
      // char_no で検索
      let ch = findCharacterByCharNoStmt.get(rawId);
      // 無ければ characters.id で検索
      if (!ch) ch = findCharacterByIdStmt.get(rawId);

      if (!ch) {
        console.warn('[addCharactersToUser] character not found:', rawId);
        continue;
      }

      const characterId = ch.id;
      const baseRarity = ch.base_rarity ?? 1;

      const existing = selectUserCharStmt.get(uid, characterId);

      if (!existing) {
        // 初ゲット → base_rarity
        insertUserCharStmt.run(uid, characterId, baseRarity);
      } else {
        // 2枚目以降 → 星 +1（最大 11）
        const newStars = Math.min((existing.stars ?? 1) + 1, 11);
        updateUserCharStarsStmt.run(newStars, existing.id);
      }
    }
  });

  tx(userId, characterIds);
}

// ------------------------------------
// 所持キャラ一覧
// ★ 修正ポイント：入手順（created_at の DESC）で返す
// ------------------------------------
export function getUserCharacters(userId) {
  const stmt = db.prepare(`
    SELECT
      uc.character_id,
      uc.stars,
      uc.created_at,
      c.char_no,
      c.name,
      c.base_rarity,
      c.image_url
    FROM user_characters uc
    LEFT JOIN characters c ON c.id = uc.character_id
    WHERE uc.user_id = ?
    ORDER BY uc.created_at DESC, uc.id DESC   -- ★ 入手順（新しい順）
  `);

  const rows = stmt.all(userId);

  return rows.map((row) => ({
    character_id: row.character_id,
    star: row.stars ?? 1,
    name: row.name || `キャラID:${row.character_id}`,
    rarity: row.base_rarity ?? 1,
    char_no: row.char_no ?? row.character_id,
    image_url: row.image_url || null,
    acquired_at: row.created_at || null, // ★ 追加済み
  }));
}

// ------------------------------------
// マイチーム取得
// ------------------------------------
export function getUserTeam(userId) {
  const stmt = db.prepare(`
    SELECT
      ut.slot,
      ut.character_id,
      uc.stars,
      c.char_no,
      c.name,
      c.base_rarity,
      c.image_url
    FROM user_teams ut
    JOIN user_characters uc
      ON uc.user_id = ut.user_id AND uc.character_id = ut.character_id
    LEFT JOIN characters c
      ON c.id = ut.character_id
    WHERE ut.user_id = ?
    ORDER BY ut.slot ASC
  `);

  const rows = stmt.all(userId);

  return rows.map((row) => ({
    slot: row.slot,
    character_id: row.character_id,
    star: row.stars ?? 1,
    name: row.name || `キャラID:${row.character_id}`,
    rarity: row.base_rarity ?? 1,
    char_no: row.char_no ?? row.character_id,
    image_url: row.image_url || null,
  }));
}

// ------------------------------------
// マイチーム保存（最大5）
// ------------------------------------
export function saveUserTeam(userId, characterIds) {
  if (!Array.isArray(characterIds)) {
    throw new Error('characterIds は配列である必要があります');
  }
  if (characterIds.length > 5) {
    throw new Error('マイチームは最大5体までです');
  }

  const deleteStmt = db.prepare('DELETE FROM user_teams WHERE user_id = ?');
  const insertStmt = db.prepare(
    'INSERT INTO user_teams (user_id, slot, character_id) VALUES (?, ?, ?)'
  );

  const tx = db.transaction((uid, cids) => {
    deleteStmt.run(uid);
    cids.forEach((cid, i) => insertStmt.run(uid, i, cid));
  });

  tx(userId, characterIds);
}
