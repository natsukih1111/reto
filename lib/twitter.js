// file: lib/twitter.js

// ログインID (= Twitter ID) が実在するかどうかをざっくりチェックする
// 存在する: true / 存在しない or エラーページ: false
export async function twitterUserExists(loginIdRaw) {
  const id = (loginIdRaw || '').toString().trim().replace(/^@/, '');
  if (!id) return false;

  const url = `https://x.com/${encodeURIComponent(id)}`;

  try {
    // HTML を実際に取得して、中身を見て判定する
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });

    // 404 / 410 → ほぼ確実に存在しない
    if (res.status === 404 || res.status === 410) {
      return false;
    }

    // 200 でも「問題が発生しました」ページの可能性があるので本文をチェック
    const html = await res.text();

    // 典型的なエラーメッセージを検出
    const errorPatterns = [
      /このページは存在しません/i,
      /このアカウントは存在しません/i,
      /アカウントは存在しません/i,
      /問題が発生しました/i,          // 日本語の「問題が発生しました」系
      /Something went wrong/i,          // 英語版
      /Try searching for another/i,
    ];

    for (const re of errorPatterns) {
      if (re.test(html)) {
        // エラーページっぽい → アカウントなし扱い
        return false;
      }
    }

    // ここまで引っかからなければ「存在する」とみなす
    return true;
  } catch (err) {
    console.error('twitterUserExists: fetch error', err);
    // ネットワークエラーなどは「判定不能」なので、一旦 true にしてユーザーをブロックしすぎない
    return true;
  }
}
