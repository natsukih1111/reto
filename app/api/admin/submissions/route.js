import db from '@/lib/db.js';

export async function GET(request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status'); // 'pending' など

  let rows;
  if (status) {
    rows = db
      .prepare(
        'SELECT * FROM question_submissions WHERE status = ? ORDER BY created_at DESC'
      )
      .all(status);
  } else {
    rows = db
      .prepare(
        'SELECT * FROM question_submissions ORDER BY created_at DESC'
      )
      .all();
  }

  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
