import db from "@/lib/db.js";

export async function POST(req) {
  const body = await req.json();
  const { winnerId, loserId } = body;

  // ELOレート計算
  const getRating = db.prepare("SELECT rating FROM users WHERE id = ?");
  const update = db.prepare("UPDATE users SET rating = ? WHERE id = ?");

  const r1 = getRating.get(winnerId).rating;
  const r2 = getRating.get(loserId).rating;

  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (r2 - r1) / 400));
  const newR1 = Math.round(r1 + K * (1 - expected));
  const newR2 = Math.round(r2 - K * (1 - expected));

  update.run(newR1, winnerId);
  update.run(newR2, loserId);

  return new Response("OK");
}
