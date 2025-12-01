// file: scripts/migrate-user.js
// ゲストユーザーのデータを、ログインIDのユーザーに引っ越しするスクリプト
// 使い方:
//  1) 下の FROM_USERNAME / TO_USERNAME を書き換える
//  2) プロジェクトルートで `node scripts/migrate-user.js` を実行

import Database from 'better-sqlite3';

// === ここを書き換える ========================
const FROM_USERNAME = 'ゲスト-XXXX';  // 例: 'ゲスト-90591'
const TO_USERNAME = 'your_login_id'; // 例: 'onepi_bapa'
// =============================================

const db = new Database('quiz.db');
db.pragma('foreign_keys = ON');

function main() {
  if (!FROM_USERNAME || !TO_USERNAME) {
    console.error('FROM_USERNAME / TO_USERNAME を設定してください');
    process.exit(1);
  }

  if (FROM_USERNAME === TO_USERNAME) {
    console.error('FROM_USERNAME と TO_USERNAME が同じです');
    process.exit(1);
  }

  const getUser = db.prepare('SELECT * FROM users WHERE username = ?');

  const fromUser = getUser.get(FROM_USERNAME);
  const toUser = getUser.get(TO_USERNAME);

  if (!fromUser) {
    console.error('FROM_USERNAME のユーザーが見つかりません:', FROM_USERNAME);
    process.exit(1);
  }

  console.log('元ユーザー (FROM):', fromUser);
  console.log('先ユーザー (TO):', toUser || 'まだ存在しません');

  const tx = db.transaction(() => {
    // もし TO_USERNAME のユーザーがすでにいて、
    // ほぼ何もしていない「空のアカウント」なら削除してしまう
    if (toUser) {
      const hasMatches = (toUser.matches_played ?? 0) > 0;
      const hasChars = db
        .prepare('SELECT COUNT(*) AS c FROM user_characters WHERE user_id = ?')
        .get(toUser.id).c > 0;

      if (!hasMatches && !hasChars) {
        console.log('TOユーザーは空アカウントなので削除します:', toUser.id);
        db.prepare('DELETE FROM users WHERE id = ?').run(toUser.id);
      } else {
        throw new Error(
          'TO_USERNAME のユーザーに既にデータがあります。安全のため中止しました。'
        );
      }
    }

    // FROM の username を TO_USERNAME に変更
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(
      TO_USERNAME,
      fromUser.id
    );
  });

  tx();

  const after = getUser.get(TO_USERNAME);
  console.log('引っ越し後のユーザー:', after);
  console.log('完了しました！');
}

try {
  main();
} catch (e) {
  console.error('エラーが発生しました:', e);
  process.exit(1);
}
