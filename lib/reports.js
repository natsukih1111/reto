// file: lib/reports.js
import db from './db.js';

// ==============================
// テーブル初期化（存在しなければ作成）
// ==============================
function initQuestionReportsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      reported_by_user_id INTEGER,        -- 報告者（nullなら匿名）
      source_mode TEXT,                   -- 'rate' | 'free' | 'challenge' など
      battle_id INTEGER,                  -- レート戦 / フリー戦ID
      challenge_run_id INTEGER,           -- チャレンジモード挑戦ID
      comment TEXT NOT NULL,              -- プレイヤーの報告内容
      status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'resolved' | 'ignored'
      admin_note TEXT,                    -- 管理者メモ
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

initQuestionReportsTable();

// ==============================
// プレイヤー側：不備報告の新規作成
// ==============================
export function createQuestionReport({
  question_id,
  reported_by_user_id = null,
  source_mode = null,
  battle_id = null,
  challenge_run_id = null,
  comment,
}) {
  const stmt = db.prepare(`
    INSERT INTO question_reports
      (question_id, reported_by_user_id, source_mode, battle_id, challenge_run_id, comment)
    VALUES
      (?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    question_id,
    reported_by_user_id,
    source_mode,
    battle_id,
    challenge_run_id,
    comment
  );

  const selectStmt = db.prepare(`
    SELECT *
    FROM question_reports
    WHERE id = ?
  `);

  return selectStmt.get(info.lastInsertRowid);
}

// ==============================
// 共通：DBステータス <-> 画面ステータス
// ==============================

// 画面 (管理画面タブ): 'open' / 'fixed' / 'dismissed'
// DB: 'pending' | 'resolved' | 'ignored'
function statusKeyToRawStatus(key) {
  switch (key) {
    case 'open':
      return 'pending';
    case 'fixed':
      return 'resolved';
    case 'dismissed':
      return 'ignored';
    case 'all':
      return null;
    default:
      return 'pending';
  }
}

function rawStatusToStatusKey(raw) {
  switch (raw) {
    case 'pending':
      return 'open';
    case 'resolved':
      return 'fixed';
    case 'ignored':
      return 'dismissed';
    default:
      return 'open';
  }
}

// ==============================
// 管理者用：一覧取得
// ==============================
export function listQuestionReportsForAdmin({
  statusKey = 'open',
  limit = 100,
  offset = 0,
} = {}) {
  const rawStatus = statusKeyToRawStatus(statusKey);

  let sql = `
    SELECT
      qr.*,
      q.question_text AS question_text,
      q.correct_answer AS correct_answer,
      q.options_json AS options_json
    FROM question_reports qr
    LEFT JOIN questions q ON q.id = qr.question_id
  `;

  const params = [];

  if (rawStatus) {
    sql += ` WHERE qr.status = ?`;
    params.push(rawStatus);
  }

  sql += `
    ORDER BY qr.created_at DESC
    LIMIT ?
    OFFSET ?
  `;
  params.push(limit, offset);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);

  return rows.map((r) => ({
    id: r.id,
    question_id: r.question_id,
    reporter_user_id: r.reported_by_user_id,
    question_text: r.question_text || '',
    comment: r.comment,
    admin_note: r.admin_note || '',
    raw_status: r.status,
    status_key: rawStatusToStatusKey(r.status),
    created_at: r.created_at,
    updated_at: r.updated_at,
    // ここから問題側の追加情報
    correct_answer: r.correct_answer || '',
    options_json: r.options_json || null,
  }));
}

// ==============================
// 管理者用：ステータス更新 ＋ 管理メモ
// ==============================
export function updateQuestionReportForAdmin({
  id,
  statusKey,
  adminNote = '',
}) {
  const rawStatus = statusKeyToRawStatus(statusKey) || 'pending';

  const stmt = db.prepare(`
    UPDATE question_reports
    SET status = ?, admin_note = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(rawStatus, adminNote, id);

  const selectStmt = db.prepare(`
    SELECT
      qr.*,
      q.question_text AS question_text,
      q.correct_answer AS correct_answer,
      q.options_json AS options_json
    FROM question_reports qr
    LEFT JOIN questions q ON q.id = qr.question_id
    WHERE qr.id = ?
  `);

  const r = selectStmt.get(id);
  if (!r) return null;

  return {
    id: r.id,
    question_id: r.question_id,
    reporter_user_id: r.reported_by_user_id,
    question_text: r.question_text || '',
    comment: r.comment,
    admin_note: r.admin_note || '',
    raw_status: r.status,
    status_key: rawStatusToStatusKey(r.status),
    created_at: r.created_at,
    updated_at: r.updated_at,
    correct_answer: r.correct_answer || '',
    options_json: r.options_json || null,
  };
}
