// file: app/admin/users/[id]/page.js
import Link from 'next/link';
import db, {
  getCurrentSeason,
  getUserChallengeSeasonBest,
  getUserChallengeAllTimeBest,
} from '@/lib/db.js';
import { getTitleFromRating } from '@/lib/title';
import DeleteUserButton from './DeleteUserButton';

// サーバーコンポーネント
export default async function AdminUserDetailPage(props) {
  const { id: idParam } = await props.params; // "1143" みたいな文字列
  const idNum = Number(idParam);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(idNum);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center">
        <div className="w-full max-w-md px-4 pt-6">
          <header className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">ユーザー詳細</h1>
            <Link
              href="/admin/users"
              className="px-3 py-1 rounded-full bg-sky-600 text-xs font-bold text-white"
            >
              ← ユーザー一覧に戻る
            </Link>
          </header>
          <p className="text-sm text-rose-300">
            ID {idParam ?? '(不明)'} のユーザーが見つかりませんでした。
          </p>
        </div>
      </div>
    );
  }

  // ===== ここから「マイページ相当の情報」を作る =====

  // レート・称号
  const rawRating = user.internal_rating ?? user.rating ?? 1500;
  const rating = Math.round(rawRating);
  const displayTitle = getTitleFromRating(rating);

  const seasonInt = getCurrentSeason();
  const seasonStr = String(seasonInt);

  const wins = user.wins ?? 0;
  const losses = user.losses ?? 0;
  const totalMatches =
    user.matches_played ?? (wins + losses > 0 ? wins + losses : 0);
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const berriesForView = user.berries ?? 0;
  const ownedCharsRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt
       FROM user_characters
       WHERE user_id = ?`
    )
    .get(user.id);
  const ownedUnique = ownedCharsRow?.cnt ?? 0;

  // チャレンジ成績
  const seasonRecord = getUserChallengeSeasonBest(user.id, seasonInt);
  const allTimeRecord = getUserChallengeAllTimeBest(user.id);

  const challengeSeasonBest = seasonRecord ? seasonRecord.best_correct : 0;
  const challengeAllTimeBest = allTimeRecord ? allTimeRecord.best_correct : 0;

  // Twitterリンク（マイページと同じ動き）
  let rawTwitter =
    user.twitter_url ||
    user.twitter_link ||
    user.twitter_screen_name ||
    user.login_id ||
    (user.username?.startsWith('ゲスト-') ? '' : user.username) ||
    '';

  let twitterUrl = '';
  if (rawTwitter) {
    if (rawTwitter.startsWith('http')) {
      twitterUrl = rawTwitter;
    } else {
      const handle = rawTwitter.replace(/^@/, '');
      twitterUrl = `https://x.com/${handle}`;
    }
  }

  const displayName = user.display_name || user.username;
  const nameChangeUsed = user.name_change_used ?? 0;

  // BAN / 管理者フラグなど（バッジ表示用）
  const isBanned = (user.banned ?? 0) === 1;
  const isAdmin = (user.is_admin ?? 0) === 1;
  const isAuthor = (user.is_author ?? user.official_author ?? 0) === 1;

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center text-sky-900">
      {/* 上部ヘッダー（管理者用） */}
      <header className="w-full max-w-md px-4 pt-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 mb-1">
            管理者ビュー：ユーザーのマイページ表示
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-widest">
              ナレバト
            </h1>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="border-2 border-sky-600 px-3 py-1 rounded-full text-xs font-bold text-sky-700 bg-white shadow-sm"
        >
          管理画面一覧へ
        </Link>
      </header>

      <main className="w-full max-w-md px-4 pb-10 mt-4 space-y-4">
        {/* プロフィール（ほぼ /mypage と同じ見た目） */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-3">
            プロフィール（ID: {user.id}）
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-sky-300 flex items-center justify-center text-2xl">
              🏴‍☠️
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold">{displayName}</p>
              <p className="text-xs">
                称号：{' '}
                <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-[11px] font-bold text-orange-700">
                  {displayTitle}
                </span>
              </p>
              <p className="text-xs text-sky-700">
                ログインID：{user.login_id || '（未登録）'}
              </p>
              <p className="text-xs text-sky-700">
                表示レート：
                <span className="font-bold">{rating}</span>
              </p>
              <p className="text-xs text-sky-700">
                現在のシーズン：{seasonStr || '-'}
              </p>

              <div className="flex flex-wrap gap-1 mt-1 text-[11px]">
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 border border-purple-300 text-purple-800">
                    管理者
                  </span>
                )}
                {isAuthor && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800">
                    公認作問者
                  </span>
                )}
                {isBanned && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800">
                    BAN中
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-sky-800">
            所持ベリー：{berriesForView} ベリー
          </p>

          {/* 名前変更回数（参考情報だけ。ここでは変更ボタン出さない） */}
          <div className="mt-4 text-xs">
            <p className="font-bold mb-1">名前の変更（1度まで）</p>
            {nameChangeUsed >= 1 ? (
              <p className="text-[11px] text-sky-700">
                すでに名前を変更済みのため、これ以上の変更はできません。
              </p>
            ) : (
              <p className="text-[11px] text-sky-700">
                ※ このユーザーはまだ名前を変更していません。（管理画面からは変更不可）
              </p>
            )}
          </div>

          {/* Twitterリンク表示（/mypage と同等） */}
          <div className="mt-4">
            <p className="text-sm font-bold">Twitterリンク</p>
            {twitterUrl ? (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-sky-700 underline break-all"
              >
                {twitterUrl}
              </a>
            ) : (
              <p className="text-sm text-sky-800">Twitter未連携</p>
            )}
            <p className="mt-1 text-[11px] text-sky-700">
              ※ 新規ログイン時のTwitter連携から自動で設定されます。
            </p>
          </div>
        </section>

        {/* レート戦・通算戦績 */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-2">レート戦・通算戦績</h2>
          <div className="text-sm space-y-1">
            <p>
              対戦数：{totalMatches} 戦 ／ 勝率：{winRate}%
            </p>
            <p>
              勝ち：{wins} 戦 ／ 負け：{losses} 戦
            </p>
            <p>最高連勝：{user.best_streak ?? 0} 連勝</p>
          </div>
        </section>

        {/* チャレンジモード成績 */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-2">チャレンジモード成績</h2>
          <div className="text-sm space-y-1">
            <p>
              シーズン最高：
              {challengeSeasonBest ?? 0} 問連続正解
            </p>
            <p>
              歴代最高：
              {challengeAllTimeBest ?? 0} 問連続正解
            </p>
          </div>
          <p className="mt-2 text-[11px] text-sky-700">
            ※ 詳細ログは challenge_runs / challenge_*_records テーブルを参照。
          </p>
        </section>

        {/* ガチャ＆キャラ図鑑サマリ */}
        <section className="bg-sky-100 border-2 border-sky-500 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-2">ガチャ / キャラ図鑑</h2>
          <p className="text-sm mb-2">
            所持キャラ数：{ownedUnique} 体（user_characters より）
          </p>
          <p className="text-xs text-sky-700">
            ※ 管理画面からはガチャ実行・編集はできません。
          </p>
        </section>

        {/* 管理アクション：BAN済ユーザーの完全削除 */}
        <section className="bg-rose-50 border-2 border-rose-400 rounded-3xl p-4 shadow-sm">
          <h2 className="text-lg font-extrabold mb-2 text-rose-900">
            管理アクション
          </h2>
          <p className="text-xs text-rose-900 mb-2">
            このユーザーを BAN 済の場合のみ、「ユーザーを完全削除」できます。
            対戦履歴・チャレンジ記録・ガチャキャラ・ベリー履歴など、
            ユーザーに紐づくデータはすべて削除されます（元に戻せません）。
          </p>

          <DeleteUserButton userId={user.id} banned={isBanned} />

          {!isBanned && (
            <p className="mt-2 text-[11px] text-rose-700">
              ※ まず BAN にしてからでないと完全削除は実行できません。
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
