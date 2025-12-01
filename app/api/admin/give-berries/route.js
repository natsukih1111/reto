// file: app/api/admin/give-berries/route.js
import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

// quiz.db に UPDATE を投げる小さいヘルパー
function runQuery(sql, params = []) {
  const dbPath = path.join(process.cwd(), 'quiz.db');
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
      db.close();
    });
  });
}

// POST /api/admin/give-berries
export async function POST(req) {
  try {
    const { userId, amount } = await req.json();

    if (!userId || typeof amount !== 'number') {
      return NextResponse.json(
        { ok: false, message: 'userId と amount が必要です' },
        { status: 400 }
      );
    }

    // users テーブルの berries を amount に書き換え
    await runQuery(
      'UPDATE users SET berries = ? WHERE id = ?',
      [amount, Number(userId)]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('give-berries error', e);
    return NextResponse.json(
      { ok: false, message: 'サーバーエラー' },
      { status: 500 }
    );
  }
}
