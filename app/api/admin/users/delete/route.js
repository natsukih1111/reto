// file: app/api/admin/users/delete/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // フロント側が userId / user_id どっちも送ってくる可能性があるので両方見る
    const rawId = body.userId ?? body.user_id;
    const userId = rawId ? Number(rawId) : NaN;

    if (!rawId || Number.isNaN(userId)) {
      return NextResponse.json(
        { ok: false, message: 'userId が不正です' },
        { status: 400 }
      );
    }

    // ユーザー存在チェック
    const user = await db.get(
      'SELECT id, banned FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, message: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // BAN 中かどうか（サーバー側でも念のためチェック）
    if (!user.banned) {
      return NextResponse.json(
        { ok: false, message: 'BAN 中のユーザーのみ完全削除できます' },
        { status: 400 }
      );
    }

    // -----------------------------
    // 関連テーブルの削除
    // （テーブルやカラムが存在しない場合は握りつぶす）
    // -----------------------------
    const safeDelete = async (sql, params) => {
      try {
        await db.run(sql, params);
      } catch (e) {
        console.warn(
          '[admin/users/delete] ignore error on',
          sql.replace(/\s+/g, ' ').slice(0, 80),
          ':',
          e.message || e
        );
      }
    };

    // 対戦ログ系
    await safeDelete(
      'DELETE FROM battle_logs WHERE user_id = $1 OR opponent_user_id = $1',
      [userId]
    );
    await safeDelete(
      'DELETE FROM rate_matches WHERE user1_id = $1 OR user2_id = $1',
      [userId]
    );

    // チャレンジ系
    await safeDelete(
      'DELETE FROM challenge_logs WHERE user_id = $1',
      [userId]
    );
    await safeDelete(
      'DELETE FROM challenge_season_records WHERE user_id = $1',
      [userId]
    );
    await safeDelete(
      'DELETE FROM challenge_alltime_records WHERE user_id = $1',
      [userId]
    );

    // エンドレス・AI 学習系
    await safeDelete(
      'DELETE FROM endless_history WHERE user_id = $1',
      [userId]
    );
    await safeDelete(
      'DELETE FROM endless_logs WHERE user_id = $1',
      [userId]
    );
    await safeDelete(
      'DELETE FROM ai_learning_logs WHERE user_id = $1',
      [userId]
    );

    // ガチャ・キャラ系
    await safeDelete(
      'DELETE FROM user_characters WHERE user_id = $1',
      [userId]
    );
    await safeDelete(
      'DELETE FROM owned_characters WHERE user_id = $1',
      [userId]
    ); // あれば消す・なければ無視
    await safeDelete(
      'DELETE FROM character_stars WHERE user_id = $1',
      [userId]
    );
    await safeDelete(
      'DELETE FROM gacha_logs WHERE user_id = $1',
      [userId]
    );

    // ベリー関連ログ（あれば）
    await safeDelete(
      'DELETE FROM berry_logs WHERE user_id = $1',
      [userId]
    );

    // 問題投稿・不備報告など（ユーザーに紐づくもの）
    await safeDelete(
      'DELETE FROM question_submissions WHERE author_user_id = $1',
      [userId]
    );
    await safeDelete(
      'DELETE FROM question_reports WHERE reporter_user_id = $1',
      [userId]
    );

    // BAN ログ
    await safeDelete(
      'DELETE FROM ban_logs WHERE user_id = $1',
      [userId]
    );

    // 最後に users 本体を削除
    await db.run('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('/api/admin/users/delete POST error', e);
    return NextResponse.json(
      { ok: false, message: 'ユーザー削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
