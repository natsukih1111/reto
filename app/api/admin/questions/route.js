// file: app/api/admin/questions/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

// 共通：DB行 → APIレスポンス用に整形
function mapQuestionRow(row) {
  let options = [];
  let altAnswers = [];
  let tags = [];

  try {
    if (row.options_json) {
      const parsed = JSON.parse(row.options_json);
      if (Array.isArray(parsed)) options = parsed;
    }
  } catch {
    options = [];
  }

  try {
    if (row.alt_answers_json) {
      const parsed = JSON.parse(row.alt_answers_json);
      if (Array.isArray(parsed)) altAnswers = parsed;
    }
  } catch {
    altAnswers = [];
  }

  try {
    if (row.tags_json) {
      const parsed = JSON.parse(row.tags_json);
      if (Array.isArray(parsed)) tags = parsed;
    }
  } catch {
    tags = [];
  }

  return {
    id: row.id,
    // question_submissions ではカラム名が type
    question_type: row.question_type || row.type || 'single',
    // question / question_text のどっちか入っている想定
    question: row.question_text || row.question || '',
    options,
    // correct_answer / answer どちらか
    correct_answer: row.correct_answer || row.answer || '',
    alt_answers: altAnswers,
    tags,
    status: row.status || 'pending',
    // question_submissions には is_official はないので false 固定
    is_official: !!row.is_official || !!row.is_admin,
    author_user_id: row.author_user_id || null,
    // フロントで使う作問者情報（表示名優先）
    author_display_name: row.author_display_name || null,
    // users テーブルと LEFT JOIN した username or 旧 created_by
    author_username: row.author_username || row.created_by || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

// =====================
// GET /api/admin/questions
// =====================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null; // 'pending' | 'approved' | 'rejected' | null
    const keyword = searchParams.get('q') || '';
    const tag = searchParams.get('tag') || '';

    let sql = `
      SELECT
        q.*,
        u.username     AS author_username,
        u.display_name AS author_display_name
      FROM question_submissions q
      LEFT JOIN users u ON u.id = q.author_user_id
      WHERE 1 = 1
    `;
    const params = [];

    // ★ ステータスフィルタ
    if (status) {
      if (status === 'pending') {
        // 古いデータで status が NULL / '' のものも「承認待ち」として扱う
        sql += ` AND (q.status = ? OR q.status IS NULL OR q.status = '')`;
        params.push('pending');
      } else {
        sql += ` AND q.status = ?`;
        params.push(status);
      }
    }

    // キーワード検索
    if (keyword) {
      sql += `
        AND (
          q.question LIKE ?
          OR q.question_text LIKE ?
          OR q.correct_answer LIKE ?
          OR IFNULL(q.alt_answers_json, '') LIKE ?
          OR IFNULL(u.username, '') LIKE ?
          OR IFNULL(u.display_name, '') LIKE ?
          OR IFNULL(q.created_by, '') LIKE ?
        )
      `;
      const like = `%${keyword}%`;
      params.push(like, like, like, like, like, like, like);
    }

    // タグ検索
    if (tag) {
      // tags_json は ["東の海","SBS"] なので、JSON文字列に対して LIKE
      sql += ` AND IFNULL(q.tags_json, '') LIKE ?`;
      params.push(`%${tag}%`);
    }

    // id 降順
    sql += ` ORDER BY q.id DESC`;

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);

    const questions = rows.map(mapQuestionRow);

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('GET /api/admin/questions error:', err);
    return NextResponse.json(
      { error: '問題一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// =====================
// POST /api/admin/questions
// ・編集保存
// ・承認 / 却下
// =====================
export async function POST(request) {
  try {
    const body = await request.json();

    // 承認 / 却下アクション
    if (body.action === 'approve' || body.action === 'reject') {
      const id = body.id;
      if (!id) {
        return NextResponse.json(
          { error: 'id が指定されていません' },
          { status: 400 }
        );
      }

      const newStatus = body.action === 'approve' ? 'approved' : 'rejected';

      const stmt = db.prepare(`
        UPDATE question_submissions
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const info = stmt.run(newStatus, id);

      if (info.changes === 0) {
        return NextResponse.json(
          { error: '指定された問題が見つかりません' },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // 編集保存
    const {
      id,
      question,
      question_type,
      options = [],
      correct_answer,
      alt_answers = [],
      tags = [],
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '編集保存には id が必要です' },
        { status: 400 }
      );
    }

    const qText = (question || '').trim();
    const qType = question_type || 'single';

    // レガシー options 文字列（|| 区切り）も一応更新しておく
    const legacyOptions =
      options && options.length > 0 ? options.join('||') : '';

    const stmt = db.prepare(`
      UPDATE question_submissions
      SET
        type            = ?,
        question        = ?,
        question_text   = ?,
        options         = ?,
        options_json    = ?,
        correct_answer  = ?,
        alt_answers_json = ?,
        tags_json       = ?,
        updated_at      = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const info = stmt.run(
      qType,
      qText,
      qText,
      legacyOptions,
      options && options.length > 0 ? JSON.stringify(options) : null,
      correct_answer ?? '',
      alt_answers && alt_answers.length > 0
        ? JSON.stringify(alt_answers)
        : null,
      tags && tags.length > 0 ? JSON.stringify(tags) : null,
      id
    );

    if (info.changes === 0) {
      return NextResponse.json(
        { error: '指定された問題が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/questions error:', err);
    return NextResponse.json(
      { error: '問題の保存に失敗しました' },
      { status: 500 }
    );
  }
}

// =====================
// DELETE /api/admin/questions?id=123
// 却下済み問題を完全削除
// =====================
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');
    const id = idStr ? Number(idStr) : NaN;

    if (!idStr || Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'id が指定されていません' },
        { status: 400 }
      );
    }

    const row = db
      .prepare('SELECT status FROM question_submissions WHERE id = ?')
      .get(id);

    if (!row) {
      return NextResponse.json(
        { error: '指定された問題が見つかりません' },
        { status: 404 }
      );
    }

    if (row.status !== 'rejected') {
      return NextResponse.json(
        { error: '完全削除できるのは「却下済み」の問題のみです' },
        { status: 400 }
      );
    }

    const tx = db.transaction(() => {
      // 関連レコードを先に削除
      db.prepare('DELETE FROM question_reports WHERE question_id = ?').run(id);
      db.prepare('DELETE FROM user_mistakes  WHERE question_id = ?').run(id);
      db.prepare('DELETE FROM endless_logs   WHERE question_id = ?').run(id);

      // 本体を削除
      db.prepare('DELETE FROM question_submissions WHERE id = ?').run(id);
    });

    tx();

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error('DELETE /api/admin/questions error:', err);
    return NextResponse.json(
      { error: '問題の削除に失敗しました' },
      { status: 500 }
    );
  }
}
