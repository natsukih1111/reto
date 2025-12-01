// file: scripts/reset-for-release.js
import db from '../lib/db.js';

// =============================
//  本番公開前リセットスクリプト
//  ・管理者以外のユーザーを削除
//  ・戦績 / チャレンジ / エンドレスログ / ガチャ結果などを削除
//  ・問題（questions）とキャラマスタ（characters）は残す
// =============================
function resetForRelease() {
  const tx = db.transaction(() => {
    // 対戦相手ごとの戦績
    db.prepare('DELETE FROM vs_stats').run();

    // ユーザーごとの間違えた問題
    db.prepare('DELETE FROM user_mistakes').run();

    // BAN 変更ログ
    db.prepare('DELETE FROM ban_logs').run();

    // ベリー履歴
    db.prepare('DELETE FROM berries_log').run();

    // チャレンジ：1日1回挑戦の記録
    db.prepare('DELETE FROM challenge_daily_attempts').run();

    // チャレンジ：各挑戦の履歴
    db.prepare('DELETE FROM challenge_runs').run();

    // チャレンジ：シーズン記録
    db.prepare('DELETE FROM challenge_season_records').run();

    // チャレンジ：歴代記録
    db.prepare('DELETE FROM challenge_alltime_records').run();

    // エンドレスモードのログ（AIなつ学習用）
    db.prepare('DELETE FROM endless_logs').run();

    // 対戦（レート戦 / フリー / AI戦 共通）
    db.prepare('DELETE FROM matches').run();

    // 所持キャラ（ガチャ結果）
    db.prepare('DELETE FROM user_characters').run();

    // 管理者以外のユーザー全削除
    db.prepare('DELETE FROM users WHERE is_admin = 0').run();
  });

  tx();

  // DB を軽くする（トランザクション外で実行）
  db.exec('VACUUM');

  console.log('✅ 本番公開前リセットが完了しました');
}

resetForRelease();
