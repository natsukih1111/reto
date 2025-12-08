// file: lib/titleAward.js
import db from './db.js';

/**
 * user_id と title の code 配列を受け取って、
 * まだ持っていない称号だけ user_titles に追加する。
 *
 * @param {number} userId
 * @param {string[]} codes
 * @returns {Promise<string[]>}  newlyAwardedCodes 付与された code の配列
 */
export async function awardTitlesForUser(userId, codes = []) {
  if (!userId || !Array.isArray(codes) || codes.length === 0) {
    return [];
  }

  // 重複コードはまとめておく
  const uniqueCodes = Array.from(new Set(codes));

  // 対象の titles を取得
  const titleRows = await db.query(
    `
      SELECT id, code
      FROM titles
      WHERE code = ANY($1::text[])
    `,
    [uniqueCodes]
  );

  if (!titleRows || titleRows.length === 0) {
    return [];
  }

  const newlyAwarded = [];

  // 1件ずつ user_titles を確認して、なければ INSERT
  for (const row of titleRows) {
    const titleId = row.id;
    const code = row.code;

    if (!titleId) continue;

    const exists = await db.get(
      `
        SELECT 1
        FROM user_titles
        WHERE user_id = $1 AND title_id = $2
      `,
      [userId, titleId]
    );

    if (!exists) {
      await db.run(
        `
          INSERT INTO user_titles (user_id, title_id)
          VALUES ($1, $2)
        `,
        [userId, titleId]
      );
      newlyAwarded.push(code);
    }
  }

  return newlyAwarded;
}
