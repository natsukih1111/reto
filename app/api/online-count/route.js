// file: app/api/online-count/route.js

export async function GET() {
  try {
    // Socket.IO サーバーの HTTP エンドポイントに問い合わせる
    const res = await fetch('http://localhost:4000/online-count');
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    const count =
      typeof data.count === 'number' ? data.count : 0;

    return new Response(
      JSON.stringify({ count }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (e) {
    console.error('/api/online-count error', e);
    // 失敗したときも 200 で count=0 を返す（UI側で × にしてるのでOK）
    return new Response(
      JSON.stringify({ count: 0 }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
