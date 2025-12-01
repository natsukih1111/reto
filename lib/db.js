// file: lib/db.js
import Database from 'better-sqlite3';

const db = new Database('quiz.db');

// マイグレーションをまとめて実行
db.pragma('foreign_keys = ON');

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  twitter_id TEXT UNIQUE,
  twitter_handle TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- ★ 表示用レート / 内部レート
  rating INTEGER DEFAULT 1500,
  internal_rating REAL DEFAULT 1500,

  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,

  -- ★ ベリー（初期 500）
  berries INTEGER DEFAULT 500,

  -- 権限系
  is_admin INTEGER DEFAULT 0,
  is_author INTEGER DEFAULT 0,          -- 旧：公認作問者フラグ
  is_official_author INTEGER DEFAULT 0, -- 新：公認作問者フラグ（コード側はこちらを参照）

  banned INTEGER DEFAULT 0,

  -- デイリーミッション
  last_daily_mission_date TEXT,            -- "YYYY-MM-DD"
  daily_mission_1_done INTEGER DEFAULT 0,
  daily_mission_2_done INTEGER DEFAULT 0,
  daily_mission_3_done INTEGER DEFAULT 0,

  -- ★ ログイン / 表示名まわり（新規追加分）
  display_name TEXT,
  login_id TEXT,
  password_hash TEXT,
  twitter_url TEXT,
  name_change_used INTEGER DEFAULT 0
)
`).run();

/*
  既存DB向けマイグレーション（users に足りないカラムを後付け）
  既にカラムがあればエラーになるので、catch して無視
*/
try {
  db.prepare(`ALTER TABLE users ADD COLUMN rating INTEGER DEFAULT 1500`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN internal_rating REAL DEFAULT 1500`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN matches_played INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN best_streak INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN berries INTEGER DEFAULT 500`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN is_author INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN last_daily_mission_date TEXT`
  ).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN daily_mission_1_done INTEGER DEFAULT 0`
  ).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN daily_mission_2_done INTEGER DEFAULT 0`
  ).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN daily_mission_3_done INTEGER DEFAULT 0`
  ).run();
} catch (e) {}

// ★ 新ログイン仕様で必要なカラムたち
try {
  db.prepare(`ALTER TABLE users ADD COLUMN display_name TEXT`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN login_id TEXT`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN password_hash TEXT`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE users ADD COLUMN twitter_url TEXT`).run();
} catch (e) {}

// ★ ここが今回追加するマイグレーション（twitter_handle）
try {
  db.prepare(`ALTER TABLE users ADD COLUMN twitter_handle TEXT`).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN name_change_used INTEGER DEFAULT 0`
  ).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN is_official_author INTEGER DEFAULT 0`
  ).run();
} catch (e) {}

db.prepare(`
CREATE TABLE IF NOT EXISTS berries_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
`).run();

/*
question_type:
  'single'     単一選択
  'multi'      複数選択
  'text'       記述
  'order'      並び替え
status:
  'pending'    承認待ち
  'approved'   承認済み
  'rejected'   却下
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_type TEXT NOT NULL,
  question TEXT NOT NULL,
  options_json TEXT,
  correct_answer TEXT NOT NULL,
  alt_answers_json TEXT,
  tags_json TEXT,
  author_user_id INTEGER,
  is_official INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_user_id) REFERENCES users(id)
)
`).run();

/* ★既存DB向けマイグレーション（questions に足りないカラムを後付け） */
try {
  db.prepare(`ALTER TABLE questions ADD COLUMN author_user_id INTEGER`).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE questions ADD COLUMN is_official INTEGER DEFAULT 0`
  ).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE questions ADD COLUMN status TEXT DEFAULT 'pending'`
  ).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE questions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
  ).run();
} catch (e) {}

try {
  db.prepare(
    `ALTER TABLE questions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`
  ).run();
} catch (e) {}

/*
matches.mode:
  'rate'   レート戦
  'free'   フリー対戦
  'ai'     AIなつ戦
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT,
  mode TEXT NOT NULL,
  season INTEGER NOT NULL,
  user1_id INTEGER NOT NULL,
  user2_id INTEGER,
  score1 INTEGER DEFAULT 0,
  score2 INTEGER DEFAULT 0,
  winner_id INTEGER,
  rating_change1 INTEGER DEFAULT 0,
  rating_change2 INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  duration_ms INTEGER,
  FOREIGN KEY (user1_id) REFERENCES users(id),
  FOREIGN KEY (user2_id) REFERENCES users(id),
  FOREIGN KEY (winner_id) REFERENCES users(id)
)
`).run();

/*
チャレンジモード：1人で何問連続正解できたか
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS challenge_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  miss_count INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
`).run();

/*
チャレンジモード：1日1回挑戦制限
ユーザーごと & 日付ごとに1レコードだけ持つ
例: date = "2025-11-28"
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS challenge_daily_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
)
`).run();

/*
チャレンジモード：シーズン最高成績
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS challenge_season_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  best_correct INTEGER NOT NULL,
  best_miss INTEGER NOT NULL,
  best_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, season),
  FOREIGN KEY (user_id) REFERENCES users(id)
)
`).run();

/*
チャレンジモード：歴代最高成績
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS challenge_alltime_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  best_correct INTEGER NOT NULL,
  best_miss INTEGER NOT NULL,
  best_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
)
`).run();

/*
エンドレスモード：管理者が AI なつに教える用ログ
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS endless_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  is_correct INTEGER NOT NULL,
  answer_time_ms INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
)
`).run();

/*
キャラクター＆ガチャ
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  char_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  base_rarity INTEGER NOT NULL,
  UNIQUE(char_no)
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS user_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  character_id INTEGER NOT NULL,
  stars INTEGER NOT NULL DEFAULT 1,
  copies INTEGER NOT NULL DEFAULT 1,              -- ★ 追加
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  UNIQUE(user_id, character_id)
)
`).run();

/* 既存DB向け: user_characters に copies カラムを後付け */
try {
  db.prepare(
    `ALTER TABLE user_characters ADD COLUMN copies INTEGER NOT NULL DEFAULT 1`
  ).run();
} catch (e) {
  // 既にある場合は "duplicate column name" になるので無視
}

/*
BAN 変更ログ
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS ban_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  admin_user_id INTEGER NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (admin_user_id) REFERENCES users(id)
)
`).run();

/*
対戦相手ごとの戦績
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS vs_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  opponent_user_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  UNIQUE(user_id, opponent_user_id, season),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (opponent_user_id) REFERENCES users(id)
)
`).run();

/*
ユーザーごとに「間違えた問題」を記録
*/
db.prepare(`
CREATE TABLE IF NOT EXISTS user_mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  last_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  wrong_count INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id),
  UNIQUE(user_id, question_id)
)
`).run();

/*
問題投稿ごとのベリー付与などは berries_log で管理
*/

// ==== ユーティリティ関数 ====

// 現在が何シーズンか（S1, S2...）を整数で返す
export function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return year * 100 + month;
}

// シーズンコード（YYYYMM）から「S1, S2...」の表示ラベルを作る
export function getSeasonDisplayLabel(seasonCode) {
  const row = db
    .prepare('SELECT MIN(season) AS min_season FROM challenge_season_records')
    .get();

  const baseSeason = row?.min_season ?? seasonCode;

  const toMonthIndex = (code) => {
    const year = Math.floor(code / 100);
    const month = code % 100;
    return year * 12 + (month - 1);
  };

  const baseIndex = toMonthIndex(baseSeason);
  const currentIndex = toMonthIndex(seasonCode);
  const diff = currentIndex - baseIndex;

  const seasonNumber = diff + 1;
  if (seasonNumber < 1) return 'S1';

  return `S${seasonNumber}`;
}

// レート階級名
export function getRankName(rating) {
  if (rating >= 1800) return '海賊王';
  if (rating >= 1750) return '四皇';
  if (rating >= 1700) return '七武海';
  if (rating >= 1650) return '超新星';
  if (rating >= 1600) return 'Level 新世界';
  if (rating >= 1550) return 'Level 偉大なる航路';
  if (rating >= 1500) return 'Level 東の海';
  return '海賊見習い';
}

// Elo + 点差補正でレート更新
export function updateRatings({
  userAId,
  userBId,
  scoreA,
  scoreB,
}) {
  const season = getCurrentSeason();
  const getUser = db.prepare('SELECT * FROM users WHERE id = ?');

  const userA = getUser.get(userAId);
  const userB = getUser.get(userBId);

  if (!userA || !userB) throw new Error('ユーザーが見つかりません');

  const Ra = userA.internal_rating ?? userA.rating;
  const Rb = userB.internal_rating ?? userB.rating;

  const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
  const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));

  const Sa = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
  const Sb = 1 - Sa;

  const margin = Math.abs(scoreA - scoreB);
  const maxScore = Math.max(scoreA, scoreB, 1);
  const marginRatio = Math.min(margin / maxScore, 1.0);

  const baseK = (userA.matches_played < 30 || userB.matches_played < 30) ? 40 : 20;
  const effectiveK = baseK * (0.5 + marginRatio);

  const newRa = Ra + effectiveK * (Sa - Ea);
  const newRb = Rb + effectiveK * (Sb - Eb);

  const ratingChangeA = Math.round(newRa - Ra);
  const ratingChangeB = Math.round(newRb - Rb);

  const updateUser = db.prepare(`
    UPDATE users
    SET
      internal_rating = ?,
      rating = ?,
      matches_played = matches_played + 1,
      wins = wins + ?,
      losses = losses + ?,
      current_streak = CASE
        WHEN ? = 1 THEN current_streak + 1
        WHEN ? = -1 THEN 0
        ELSE current_streak
      END,
      best_streak = CASE
        WHEN ? = 1 AND current_streak + 1 > best_streak
          THEN current_streak + 1
        ELSE best_streak
      END
    WHERE id = ?
  `);

  const winnerA = Sa === 1 ? 1 : Sa === 0 ? -1 : 0;
  const winnerB = Sb === 1 ? 1 : Sb === 0 ? -1 : 0;

  const newRatingAInt = Math.round(newRa);
  const newRatingBInt = Math.round(newRb);

  const tx = db.transaction(() => {
    updateUser.run(
      newRa,
      newRatingAInt,
      Sa === 1 ? 1 : 0,
      Sa === 0 ? 1 : 0,
      winnerA,
      winnerA,
      winnerA,
      userAId
    );
    updateUser.run(
      newRb,
      newRatingBInt,
      Sb === 1 ? 1 : 0,
      Sb === 0 ? 1 : 0,
      winnerB,
      winnerB,
      winnerB,
      userBId
    );

    const upsertVs = db.prepare(`
      INSERT INTO vs_stats (user_id, opponent_user_id, season, matches, wins, losses)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(user_id, opponent_user_id, season)
      DO UPDATE SET
        matches = matches + 1,
        wins    = wins + excluded.wins,
        losses  = losses + excluded.losses
    `);

    upsertVs.run(userAId, userBId, season, Sa === 1 ? 1 : 0, Sa === 0 ? 1 : 0);
    upsertVs.run(userBId, userAId, season, Sb === 1 ? 1 : 0, Sb === 0 ? 1 : 0);
  });

  tx();

  return {
    ratingChangeA,
    ratingChangeB,
    newRatingA: newRatingAInt,
    newRatingB: newRatingBInt,
  };
}

// 全ユーザーのレート＆シーズン用戦績をリセット
export function resetRatingsForNewSeason() {
  const stmt = db.prepare(`
    UPDATE users
    SET
      rating = 1500,
      internal_rating = 1500,
      matches_played = 0,
      wins = 0,
      losses = 0,
      current_streak = 0,
      best_streak = 0
  `);

  const tx = db.transaction(() => {
    stmt.run();
  });

  tx();
}

// ==== チャレンジモード用ユーティリティ関数 ====
export function hasChallengeAttemptToday(userId) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const stmt = db.prepare(`
    SELECT 1 FROM challenge_daily_attempts
    WHERE user_id = ? AND date = ?
    LIMIT 1
  `);
  const row = stmt.get(userId, dateStr);
  return !!row;
}

export function markChallengeAttemptToday(userId) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO challenge_daily_attempts (user_id, date)
    VALUES (?, ?)
  `);
  stmt.run(userId, dateStr);
}

export function saveChallengeResult({
  userId,
  correctCount,
  missCount,
  durationMs,
}) {
  const season = getCurrentSeason();

  const insertRun = db.prepare(`
    INSERT INTO challenge_runs (user_id, season, correct_count, miss_count, duration_ms)
    VALUES (?, ?, ?, ?, ?)
  `);

  const getSeasonRecord = db.prepare(`
    SELECT * FROM challenge_season_records
    WHERE user_id = ? AND season = ?
  `);

  const insertSeasonRecord = db.prepare(`
    INSERT INTO challenge_season_records (user_id, season, best_correct, best_miss)
    VALUES (?, ?, ?, ?)
  `);

  const updateSeasonRecord = db.prepare(`
    UPDATE challenge_season_records
    SET best_correct = ?, best_miss = ?, best_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND season = ?
  `);

  const getAllTimeRecord = db.prepare(`
    SELECT * FROM challenge_alltime_records
    WHERE user_id = ?
  `);

  const insertAllTimeRecord = db.prepare(`
    INSERT INTO challenge_alltime_records (user_id, best_correct, best_miss)
    VALUES (?, ?, ?)
  `);

  const updateAllTimeRecord = db.prepare(`
    UPDATE challenge_alltime_records
    SET best_correct = ?, best_miss = ?, best_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);

  const tx = db.transaction(() => {
    insertRun.run(userId, season, correctCount, missCount, durationMs ?? null);

    const seasonRow = getSeasonRecord.get(userId, season);
    const isBetterSeason =
      !seasonRow ||
      correctCount > seasonRow.best_correct ||
      (correctCount === seasonRow.best_correct && missCount < seasonRow.best_miss);

    if (!seasonRow) {
      insertSeasonRecord.run(userId, season, correctCount, missCount);
    } else if (isBetterSeason) {
      updateSeasonRecord.run(correctCount, missCount, userId, season);
    }

    const allTimeRow = getAllTimeRecord.get(userId);
    const isBetterAllTime =
      !allTimeRow ||
      correctCount > allTimeRow.best_correct ||
      (correctCount === allTimeRow.best_correct && missCount < allTimeRow.best_miss);

    if (!allTimeRow) {
      insertAllTimeRecord.run(userId, correctCount, missCount);
    } else if (isBetterAllTime) {
      updateAllTimeRecord.run(correctCount, missCount, userId);
    }
  });

  tx();
}

export function getChallengeSeasonRanking(season, limit = 10) {
  const stmt = db.prepare(`
    SELECT csr.user_id, csr.best_correct, csr.best_miss
    FROM challenge_season_records csr
    WHERE csr.season = ?
    ORDER BY csr.best_correct DESC, csr.best_miss ASC, csr.best_at ASC
    LIMIT ?
  `);
  return stmt.all(season, limit);
}

export function getUserChallengeSeasonBest(userId, season) {
  const stmt = db.prepare(`
    SELECT * FROM challenge_season_records
    WHERE user_id = ? AND season = ?
  `);
  return stmt.get(userId, season);
}

export function getUserChallengeAllTimeBest(userId) {
  const stmt = db.prepare(`
    SELECT * FROM challenge_alltime_records
    WHERE user_id = ?
  `);
  return stmt.get(userId);
}

export default db;
