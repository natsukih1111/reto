// file: app/api/admin/users/delete/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

// 今は認証チェックなし（サイトに入れた人なら誰でもOK）

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = body.userId ?? body.user_id;
    const userId = Number(raw);

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: 'userId が必要です' },
        { status: 400 }
      );
    }

    const user = db
      .prepare('SELECT id, username, banned FROM users WHERE id = ?')
      .get(userId);

    if (!user) {
      return NextResponse.json(
        { ok: false, message: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // BAN してなくても消すなら、この if ブロックをコメントアウト
    if ((user.banned ?? 0) === 0) {
      return NextResponse.json(
        { ok: false, message: '先に BAN にしてから完全削除してください' },
        { status: 400 }
      );
    }

    const deleteSafe = (sql, params = []) => {
      try {
        db.prepare(sql).run(...params);
      } catch (e) {
        console.warn('[delete] failed:', sql, e.message || e);
      }
    };

    // ここは「ありそうなカラム名」で片っ端から削除しておく
    deleteSafe('DELETE FROM matches WHERE user_id = ? OR opponent_id = ?', [
      userId,
      userId,
    ]);
    deleteSafe(
      'DELETE FROM matches WHERE player1_id = ? OR player2_id = ?',
      [userId, userId]
    );
    deleteSafe(
      'DELETE FROM matches WHERE winner_user_id = ? OR loser_user_id = ?',
      [userId, userId]
    );

    deleteSafe('DELETE FROM challenge_runs WHERE user_id = ?', [userId]);
    deleteSafe(
      'DELETE FROM challenge_season_records WHERE user_id = ?',
      [userId]
    );
    deleteSafe(
      'DELETE FROM challenge_alltime_records WHERE user_id = ?',
      [userId]
    );
    deleteSafe('DELETE FROM user_characters WHERE user_id = ?', [userId]);
    deleteSafe('DELETE FROM user_team WHERE user_id = ?', [userId]);
    deleteSafe('DELETE FROM berries_log WHERE user_id = ?', [userId]);
    deleteSafe(
      'DELETE FROM question_submissions WHERE author_user_id = ?',
      [userId]
    );

    // ── 最後に users 本体を「外部キー OFF」で強制削除 ──
    try {
      db.exec('PRAGMA foreign_keys = OFF');
    } catch (e) {
      console.warn('[delete] PRAGMA foreign_keys=OFF failed', e.message || e);
    }

    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    } catch (e) {
      console.error('[delete] DELETE FROM users failed', e);
      // ここだけはちゃんとエラー返す（これで消えなかったら意味ないので）
      return NextResponse.json(
        { ok: false, message: 'users テーブルからの削除に失敗しました' },
        { status: 500 }
      );
    } finally {
      try {
        db.exec('PRAGMA foreign_keys = ON');
      } catch (e) {
        console.warn('[delete] PRAGMA foreign_keys=ON failed', e.message || e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/admin/users/delete POST error', e);
    return NextResponse.json(
      { ok: false, message: 'ユーザーの完全削除に失敗しました' },
      { status: 500 }
    );
  }
}
