// file: lib/db.js
// Supabase（Postgres）向けの DB ラッパー
// SQLite 風の API（get/query/run）+ いくつかユーティリティ関数を提供

import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';

const { Pool } = pkg;

// プロジェクトルート（node server.js / Vercel runtime のカレントディレクトリ）
const ROOT_DIR = process.cwd();

// まず .env.local を読む
dotenv.config({ path: path.join(ROOT_DIR, '.env.local') });

// それでも無ければ .env も試す
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(ROOT_DIR, '.env') });
}

// ★ デバッグ：ここで必ず値の有無をチェック
if (!process.env.DATABASE_URL) {
  console.error(
    '[db] ERROR: DATABASE_URL is not set. Check .env.local or .env'
  );
  throw new Error('DATABASE_URL is not defined in .env.local/.env');
} else {
  console.log(
    '[db] DATABASE_URL loaded:',
    process.env.DATABASE_URL.slice(0, 40) + '...'
  );
}

// =============================================
//  プール作成（★同時接続をかなり絞る）
//  - max: 1 → 各 Node プロセスにつき 1 接続だけ
//  - Supabase 側のコネクション上限「MaxClients〜」対策
// =============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Supabase 用のおまじない
  },
  // ★ここが一番大事
  max: 1, // 各プロセスで DB 同時接続は 1 本に制限
  idleTimeoutMillis: 10_000, // 10秒使われなければ切る
  connectionTimeoutMillis: 5_000, // 5秒つながらなかったら諦める
});

// ====== 生クエリ（内部用） ======
async function rawQuery(text, params = []) {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(text, params);
    return res;
  } catch (err) {
    console.error('[db] query error:', {
      message: err?.message,
      code: err?.code,
      severity: err?.severity,
    });
    throw err;
  } finally {
    if (client) client.release();
  }
}

// ====== SQLite っぽいラッパ ======
const db = {
  // 複数行取得
  async query(sql, params = []) {
    const res = await rawQuery(sql, params);
    return res.rows;
  },

  // 1行だけ取得（なければ null）
  async get(sql, params = []) {
    const res = await rawQuery(sql, params);
    return res.rows[0] || null;
  },

  // INSERT / UPDATE / DELETE 用
  async run(sql, params = []) {
    const res = await rawQuery(sql, params);
    return res;
  },
};

export default db;

// ====================================================
// ここからユーティリティ関数（シーズン制御）
// ====================================================

// 現在が何シーズンか（YYYYMM の整数）
export function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return year * 100 + month; // 202512 みたいな形
}

// 直前のシーズンコード（YYYYMM）
// 例: 202501 → 202412
export function getPreviousSeason(seasonCode) {
  const year = Math.floor(seasonCode / 100);
  const month = seasonCode % 100;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return prevYear * 100 + prevMonth;
}

// シーズンコード（YYYYMM）から「S1, S2...」の表示ラベル
const FIRST_SEASON_CODE = 202512;

export function getSeasonDisplayLabel(seasonCode) {
  const toMonthIndex = (code) => {
    const year = Math.floor(code / 100);
    const month = code % 100;
    return year * 12 + (month - 1);
  };

  const baseIndex = toMonthIndex(FIRST_SEASON_CODE);
  const currentIndex = toMonthIndex(seasonCode);
  const diff = currentIndex - baseIndex;

  const seasonNumber = diff + 1;
  if (seasonNumber < 1) return 'S1';
  return `S${seasonNumber}`;
}

// ユーザーのチャレンジモード シーズン最高成績
export async function getUserChallengeSeasonBest(userId, season) {
  return await db.get(
    `
      SELECT *
      FROM challenge_season_records
      WHERE user_id = $1 AND season = $2
    `,
    [userId, season]
  );
}

// ユーザーのチャレンジモード 歴代最高成績
export async function getUserChallengeAllTimeBest(userId) {
  return await db.get(
    `
      SELECT *
      FROM challenge_alltime_records
      WHERE user_id = $1
    `,
    [userId]
  );
}

// レート戦を新シーズン用にリセット
// ・rating / internal_rating を 1500 に
// ・戦績カウンタも 0 に戻す
export async function resetRatingsForNewSeason() {
  await db.run(
    `
      UPDATE users
      SET
        rating          = 1500,
        internal_rating = 1500,
        matches_played  = 0,
        wins            = 0,
        losses          = 0,
        current_streak  = 0,
        best_streak     = 0
      WHERE banned = 0
    `,
    []
  );
}
