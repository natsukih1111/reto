import db from "@/lib/db.js";

export async function POST(req) {
  const body = await req.json();
  const { user1, user2, winner } = body;

  db.prepare(
    `INSERT INTO matches (user1_id, user2_id, winner_id)
     VALUES (?, ?, ?)`
  ).run(user1, user2, winner);

  return new Response("OK");
}
