// file: lib/berries.js
// ★ 注意: server.js から直接呼ばれるので、相対パスで ./db.js を読む
import db from './db.js';

/**
 * username ベースでベリーを加算（古いところ用の互換）
 */
export async function addBerries(username, amount, reason = '') {
  if (!username || !Number.isFinite(amount) || amount === 0) return;

  // users の所持ベリー更新
  const res = await db.run(
    `
      UPDATE users
      SET berries = COALESCE(berries, 0) + $1
      WHERE username = $2
    `,
    [amount, username]
  );

  console.log(
    '[berries] addBerries username=',
    username,
    'amount=',
    amount,
    'reason=',
    reason,
    'rowCount=',
    res?.rowCount
  );

  // ログテーブル（存在しない場合は無視）
  try {
    await db.run(
      `
        INSERT INTO berries_log (user_id, amount, reason)
        SELECT id, $1, $2
        FROM users
        WHERE username = $3
      `,
      [amount, reason, username]
    );
  } catch (e) {
    console.warn('[berries] addBerries log insert failed:', e?.message || e);
  }
}

/**
 * ★ user_id ベースでベリーを加算（こちらを基本に使う）
 */
export async function addBerriesByUserId(userId, amount, reason = '') {
  if (!userId || !Number.isFinite(amount) || amount === 0) return;

  try {
    // 1) users の所持ベリー更新
    const resUpdate = await db.run(
      `
        UPDATE users
        SET berries = COALESCE(berries, 0) + $1
        WHERE id = $2
      `,
      [amount, userId]
    );

    // 2) ベリーログを残す（berries_log が無ければスキップ）
    try {
      const resLog = await db.run(
        `
          INSERT INTO berries_log (user_id, amount, reason)
          VALUES ($1, $2, $3)
        `,
        [userId, amount, reason]
      );
      console.log(
        '[berries] berries_log inserted, rowCount=',
        resLog?.rowCount
      );
    } catch (logErr) {
      console.warn(
        '[berries] addBerriesByUserId log insert failed:',
        logErr?.message || logErr
      );
    }

    // デバッグ用ログ
    console.log(
      '[berries] addBerriesByUserId uid=',
      userId,
      'amount=',
      amount,
      'reason=',
      reason,
      'updateRowCount=',
      resUpdate?.rowCount
    );
  } catch (e) {
    console.error('[berries] addBerriesByUserId failed:', e);
    throw e;
  }
}
