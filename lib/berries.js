// file: lib/berries.js
// ★ 注意: server.js から直接呼ばれるので、相対パスで ./db.js を読む
import db from './db.js';

/**
 * username ベースでベリーを加算（古いところ用の互換）
 */
export function addBerries(username, amount, reason = '') {
  if (!username || !Number.isFinite(amount) || amount === 0) return;

  db.prepare(
    `UPDATE users
       SET berries = COALESCE(berries, 0) + ?
     WHERE username = ?`
  ).run(amount, username);

  // 必要ならここで username ベースのログを追加してもOK
  // console.log('[berries] addBerries username=', username, 'amount=', amount, 'reason=', reason);
}

/**
 * ★ user_id ベースでベリーを加算（こちらを基本に使う）
 */
export function addBerriesByUserId(userId, amount, reason = '') {
  if (!userId || !Number.isFinite(amount) || amount === 0) return;

  const tx = db.transaction((uid, amt, rsn) => {
    // users の所持ベリー更新
    db.prepare(
      `UPDATE users
         SET berries = COALESCE(berries, 0) + ?
       WHERE id = ?`
    ).run(amt, uid);

    // ログに残す（challenge/finish と同じ berries_log 想定）
    db.prepare(
      `
      INSERT INTO berries_log (user_id, amount, reason)
      VALUES (?, ?, ?)
    `
    ).run(uid, amt, rsn);
  });

  tx(userId, amount, reason);

  // デバッグ用ログ
  console.log('[berries] addBerriesByUserId uid=', userId, 'amount=', amount, 'reason=', reason);
}
