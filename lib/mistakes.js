// file: lib/mistakes.js
import db from './db.js';

/**
 * ユーザーが問題を間違えたときに記録する
 * ・同じ user_id + question_id があれば wrong_count++ & last_wrong_at 更新
 * ・なければ新規 INSERT
 */
export function addUserMistake(userId, questionId) {
  if (!userId || !questionId) return;

  const tx = db.transaction((uid, qid) => {
    const row = db
      .prepare(
        `SELECT id, wrong_count
           FROM user_mistakes
          WHERE user_id = ? AND question_id = ?`
      )
      .get(uid, qid);

    if (!row) {
      db.prepare(
        `INSERT INTO user_mistakes (user_id, question_id, wrong_count)
         VALUES (?, ?, 1)`
      ).run(uid, qid);
    } else {
      db.prepare(
        `UPDATE user_mistakes
            SET wrong_count = wrong_count + 1,
                last_wrong_at = CURRENT_TIMESTAMP
          WHERE id = ?`
      ).run(row.id);
    }
  });

  tx(userId, questionId);
}

/**
 * そのユーザーが最近間違えた問題を、問題文ごと取ってくる
 * ※ question_submissions と JOIN する
 */
export function getUserMistakesWithQuestions(userId, limit = 2000) {
  if (!userId) return [];

  const stmt = db.prepare(`
    SELECT
      um.id,
      um.question_id,
      um.wrong_count,
      um.last_wrong_at,
      qs.question_text,
      qs.question,
      qs.type          AS question_type,
      qs.options_json,
      qs.correct_answer,
      qs.tags_json
    FROM user_mistakes um
    JOIN question_submissions qs ON qs.id = um.question_id
    WHERE um.user_id = ?
    ORDER BY um.last_wrong_at DESC, um.id DESC
    LIMIT ?
  `);

  return stmt.all(userId, limit);
}
