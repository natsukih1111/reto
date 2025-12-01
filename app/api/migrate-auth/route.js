// file: app/api/migrate-auth/route.js
import db from '@/lib/db.js';

export async function GET() {
  try {
    // --- users.login_id ---
    try {
      db.prepare('ALTER TABLE users ADD COLUMN login_id TEXT').run();
    } catch (e) {
      const msg = String(e.message || e);
      if (
        !msg.includes('duplicate column') &&
        !msg.includes('already exists')
      ) {
        throw e;
      }
    }

    // --- users.password_hash ---
    try {
      db.prepare('ALTER TABLE users ADD COLUMN password_hash TEXT').run();
    } catch (e) {
      const msg = String(e.message || e);
      if (
        !msg.includes('duplicate column') &&
        !msg.includes('already exists')
      ) {
        throw e;
      }
    }

    // --- users.banned ---
    try {
      db.prepare(
        'ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (
        !msg.includes('duplicate column') &&
        !msg.includes('already exists')
      ) {
        throw e;
      }
    }

    // --- users.is_official_author（公認作問者フラグ）---
    try {
      db.prepare(
        'ALTER TABLE users ADD COLUMN is_official_author INTEGER NOT NULL DEFAULT 0'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (
        !msg.includes('duplicate column') &&
        !msg.includes('already exists')
      ) {
        throw e;
      }
    }

    // --- question_submissions.author_user_id（念のため）---
    try {
      db.prepare(
        'ALTER TABLE question_submissions ADD COLUMN author_user_id INTEGER'
      ).run();
    } catch (e) {
      const msg = String(e.message || e);
      if (
        !msg.includes('duplicate column') &&
        !msg.includes('already exists')
      ) {
        throw e;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('migrate-auth error:', e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
